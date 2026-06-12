import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const cli = 'src/main.mjs';

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('update dry-run prints package update command without invoking npm', () => {
  const result = run(['update', '--dry-run', '--release', '0.4.0']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Updating vnpt-harness-cli CLI package \(0\.4\.0\)/);
  assert.match(result.stdout, /Dry run: npm install -g github:truongqv12\/harness-cli#0\.4\.0 --install-links=true/);
});

test('update check dry-run prints registry-aware npm view command', () => {
  const result = run(['update', '--check', '--dry-run', '--registry', 'https://registry.example.test/']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Dry run: npm view vnpt-harness-cli version --registry https:\/\/registry\.example\.test\//);
});

test('update check uses configured git source without querying npm registry by default', () => {
  const result = run(['update', '--check']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Current vnpt-harness-cli version: 0\.4\.0/);
  assert.match(result.stdout, /Update source: github:truongqv12\/harness-cli/);
});

test('update dry-run can use an explicit git source and ref', () => {
  const result = run(['update', '--dry-run', '--source', 'git+ssh://git@github.com/truongqv12/harness-cli.git', '--release', 'main']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Dry run: npm install -g git\+ssh:\/\/git@github\.com\/truongqv12\/harness-cli\.git#main --install-links=true/);
});
