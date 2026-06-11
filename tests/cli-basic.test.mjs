import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const cli = 'src/main.mjs';

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
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
