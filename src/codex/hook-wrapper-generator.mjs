import path from 'node:path';

export function wrapperSource({ event, scriptRel }) {
  const scriptJson = JSON.stringify(scriptRel);
  const eventJson = JSON.stringify(event);
  return `#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

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
  const target = path.join(__dirname, '..', 'claude', ${scriptJson});
  const result = spawnSync(process.execPath, [target], {
    input: JSON.stringify(payload),
    stdio: ['pipe', 'inherit', 'inherit'],
    cwd: process.cwd(),
    env: { ...process.env, CODEX_HOOK_EVENT: eventName }
  });
  process.exit(result.status ?? 1);
});
`;
}

export function wrapperName(event, groupIndex, hookIndex, scriptRel) {
  const safe = `${event}-${groupIndex}-${hookIndex}-${path.basename(scriptRel, path.extname(scriptRel))}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  return `${safe}.cjs`;
}
