import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildCodexInventory } from '../src/codex/codex-inventory.mjs';
import { wrapperSource } from '../src/codex/hook-wrapper-generator.mjs';

function tempDir(prefix = 'vnpt-codex-hooks-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeHook(root, name, content = 'process.exit(0);\n') {
  const filePath = path.join(root, 'claude', 'hooks', name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('codex inventory skips generated context hooks and prunes old managed registrations', () => {
  const root = tempDir();
  const sourceRoot = path.join(root, 'source');
  const projectRoot = path.join(root, 'project');
  const tempRoot = path.join(root, 'temp');
  try {
    fs.mkdirSync(path.join(sourceRoot, 'claude'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '.codex'), { recursive: true });
    for (const name of ['privacy-block.cjs', 'session-init.cjs', 'session-state.cjs', 'simplify-gate.cjs', 'usage-quota-cache-refresh.cjs']) {
      writeHook(sourceRoot, name);
    }
    fs.writeFileSync(
      path.join(sourceRoot, 'claude', 'settings.json'),
      JSON.stringify({
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'node ".claude/hooks/session-init.cjs"' }] }],
          UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node ".claude/hooks/simplify-gate.cjs"', statusMessage: 'Simplify' }] }],
          PreToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: 'node ".claude/hooks/privacy-block.cjs"' }] }],
          PostToolUse: [{ hooks: [{ type: 'command', command: 'node ".claude/hooks/session-state.cjs"' }] }]
        }
      }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(projectRoot, '.codex', 'hooks.json'),
      JSON.stringify({
        hooks: {
          PreToolUse: [{ hooks: [{ type: 'command', command: 'echo user-hook' }, { type: 'command', command: 'node ".codex/hooks/vnpt-managed/old.cjs"' }] }],
          SessionStart: [{ hooks: [{ type: 'command', command: 'node ".codex/hooks/vnpt-managed/sessionstart-0-0-session-init.cjs"' }] }]
        }
      }),
      'utf8'
    );

    const inventory = buildCodexInventory({ sourceRoot, tempRoot, projectRoot });
    const hooksJson = JSON.parse(fs.readFileSync(path.join(tempRoot, '.codex', 'hooks.json'), 'utf8'));
    const serialized = JSON.stringify(hooksJson);

    assert.deepEqual(Object.keys(inventory.generatedHooks).sort(), ['PreToolUse', 'UserPromptSubmit']);
    assert.match(serialized, /privacy-block/);
    assert.match(serialized, /simplify-gate/);
    assert.match(serialized, /echo user-hook/);
    assert.doesNotMatch(serialized, /session-init|session-state|usage-quota-cache-refresh|old\.cjs/);
    assert.ok(fs.existsSync(path.join(tempRoot, '.codex', 'hooks', 'claude', 'privacy-block.cjs')));
    assert.ok(!fs.existsSync(path.join(tempRoot, '.codex', 'hooks', 'claude', 'session-init.cjs')));
    assert.ok(!fs.existsSync(path.join(tempRoot, '.codex', 'hooks', 'claude', 'session-state.cjs')));
    assert.ok(!fs.existsSync(path.join(tempRoot, '.codex', 'hooks', 'claude', 'usage-quota-cache-refresh.cjs')));
    assert.ok(fs.existsSync(path.join(tempRoot, '.codex', 'hooks', 'vnpt-managed', 'pretooluse-0-0-privacy-block.cjs')));
    assert.ok(fs.existsSync(path.join(tempRoot, '.codex', 'hooks', 'vnpt-managed', 'userpromptsubmit-0-0-simplify-gate.cjs')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('codex hook wrapper normalizes context output and preserves block status', () => {
  const root = tempDir();
  const managedDir = path.join(root, '.codex', 'hooks', 'vnpt-managed');
  const claudeDir = path.join(root, '.codex', 'hooks', 'claude');
  const wrapperPath = path.join(managedDir, 'privacy-block.cjs');
  const targetPath = path.join(claudeDir, 'privacy-block.cjs');
  try {
    fs.mkdirSync(managedDir, { recursive: true });
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(wrapperPath, wrapperSource({ event: 'PreToolUse', scriptRel: 'privacy-block.cjs' }), 'utf8');
    fs.writeFileSync(targetPath, "console.log(JSON.stringify({ additionalContext: 'ctx', permissionDecision: 'allow' }));\n", 'utf8');

    const allow = spawnSync(process.execPath, [wrapperPath], {
      input: JSON.stringify({ event: 'PreToolUse', tool: { name: 'Read', input: { file_path: 'a.txt' } } }),
      encoding: 'utf8'
    });
    assert.equal(allow.status, 0, allow.stderr || allow.stdout);
    assert.deepEqual(JSON.parse(allow.stdout), {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: 'ctx',
        permissionDecision: 'allow'
      }
    });

    fs.writeFileSync(targetPath, "console.log(JSON.stringify({ continue: false, decision: 'block', reason: 'deny' })); process.exit(2);\n", 'utf8');
    const block = spawnSync(process.execPath, [wrapperPath], { input: '{}', encoding: 'utf8' });
    assert.equal(block.status, 2);
    assert.match(block.stderr, /deny/);
    assert.equal(JSON.parse(block.stdout).reason, 'deny');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
