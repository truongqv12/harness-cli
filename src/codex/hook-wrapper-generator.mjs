import path from 'node:path';

export function wrapperSource({ event, scriptRel }) {
  const scriptJson = JSON.stringify(scriptRel);
  const eventJson = JSON.stringify(event);
  return `#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function parseJson(value) {
  try { return value.trim() ? JSON.parse(value) : null; } catch { return null; }
}

function normalizeStdout(stdout, eventName) {
  const parsed = parseJson(stdout);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return stdout;
  const next = { ...parsed };
  if (typeof next.additionalContext === 'string') {
    next.hookSpecificOutput = {
      ...(next.hookSpecificOutput && typeof next.hookSpecificOutput === 'object' ? next.hookSpecificOutput : {}),
      hookEventName: eventName,
      additionalContext: next.additionalContext
    };
    delete next.additionalContext;
  } else if (next.hookSpecificOutput && typeof next.hookSpecificOutput === 'object' && !next.hookSpecificOutput.hookEventName) {
    next.hookSpecificOutput = { ...next.hookSpecificOutput, hookEventName: eventName };
  }
  if (typeof next.permissionDecision === 'string') {
    next.hookSpecificOutput = {
      ...(next.hookSpecificOutput && typeof next.hookSpecificOutput === 'object' ? next.hookSpecificOutput : {}),
      hookEventName: eventName,
      permissionDecision: next.permissionDecision
    };
    delete next.permissionDecision;
  }
  return JSON.stringify(next) + '\\n';
}

function reasonFromOutput(stdout) {
  const parsed = parseJson(stdout);
  if (!parsed || typeof parsed !== 'object') return '';
  return parsed.reason || parsed.message || parsed.hookSpecificOutput?.reason || '';
}

const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  const raw = Buffer.concat(chunks).toString('utf8');
  let input = {};
  try { input = raw.trim() ? JSON.parse(raw) : {}; } catch { input = {}; }
  const eventName = ${eventJson};
  const payload = {
    ...input,
    hook_event_name: input.hook_event_name || input.event || eventName,
    tool_name: input.tool_name || input.toolName || input.tool?.name || '',
    tool_input: input.tool_input || input.toolInput || input.tool?.input || input.input || {},
    cwd: input.cwd || process.cwd()
  };
  const hooksRoot = path.resolve(__dirname, '..', 'claude');
  const target = path.resolve(hooksRoot, ${scriptJson});
  if (!target.startsWith(hooksRoot + path.sep)) {
    console.error('Hook target escapes managed hook root.');
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [target], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: Number(process.env.VNPT_CODEX_HOOK_TIMEOUT_MS || 30000),
    maxBuffer: 10 * 1024 * 1024,
    cwd: process.cwd(),
    env: { ...process.env, CODEX_HOOK_EVENT: eventName }
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  const stdout = normalizeStdout(result.stdout || '', eventName);
  const stderr = result.stderr || '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  const status = result.status ?? 1;
  if (status === 2 && !stderr.trim()) {
    console.error(reasonFromOutput(stdout) || 'Hook blocked the action.');
  }
  process.exit(status);
});
`;
}

export function wrapperName(event, groupIndex, hookIndex, scriptRel) {
  const safe = `${event}-${groupIndex}-${hookIndex}-${path.basename(scriptRel, path.extname(scriptRel))}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  return `${safe}.cjs`;
}
