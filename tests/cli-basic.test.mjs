import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const cli = 'src/main.mjs';

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', ...options });
}

test('help prints available commands', () => {
  const result = run(['help']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /vnpt-harness init/);
  assert.match(result.stdout, /doctor/);
});

test('version prints package version', () => {
  const result = run(['version']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^vnpt-harness-cli 0\.4\.0\s*$/);
});

test('version flag prints package version', () => {
  const result = run(['--version']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^vnpt-harness-cli 0\.4\.0\s*$/);
});

test('init without a bundle source fails clearly', () => {
  const result = run(['init', '--yes']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Source is required/);
});

test('init uses configured default source when source flag is omitted', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-config-source-'));
  try {
    const bundle = path.join(root, 'bundle');
    const target = path.join(root, 'target');
    const configPath = path.join(root, 'config.json');
    fs.mkdirSync(path.join(bundle, 'claude'), { recursive: true });
    fs.writeFileSync(path.join(bundle, 'claude', 'safe.md'), 'managed\n');
    fs.writeFileSync(
      path.join(bundle, 'harness-manifest.json'),
      JSON.stringify(
        {
          name: 'fixture',
          version: '1.0.0',
          stateFile: '.claude/vnpt-harness-state.json',
          managedTargets: [{ source: 'claude', target: '.claude' }],
          protectedPatterns: []
        },
        null,
        2
      )
    );

    const env = { ...process.env, VNPT_HARNESS_CONFIG: configPath };
    const config = run(['config', 'set', 'source', bundle], { env });
    assert.equal(config.status, 0, config.stderr || config.stdout);

    const init = run(['init', '--directory', target, '--version', 'local', '--yes'], { env });
    assert.equal(init.status, 0, init.stderr || init.stdout);
    assert.equal(fs.readFileSync(path.join(target, '.claude', 'safe.md'), 'utf8'), 'managed\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
