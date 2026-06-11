import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(dirname, '..');

function npmInvocation(args) {
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (fs.existsSync(npmCli)) return { command: process.execPath, args: [npmCli, ...args] };
  return { command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args };
}

test('npm package allowlist excludes private bundle payload', () => {
  const invocation = npmInvocation(['pack', '--dry-run', '--json']);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: cliRoot,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const [{ files }] = JSON.parse(result.stdout);
  const packed = files.map((item) => item.path).sort();

  assert.ok(packed.includes('README.md'));
  assert.ok(packed.includes('src/main.mjs'));
  assert.ok(!packed.some((item) => item.startsWith('tests/')));
  assert.ok(!packed.some((item) => item.startsWith('claude/')));
  assert.ok(!packed.some((item) => item.startsWith('plans/')));
  assert.ok(!packed.includes('harness-manifest.json'));

  for (const rel of packed) {
    const full = path.join(cliRoot, rel);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
    const text = fs.readFileSync(full, 'utf8');
    assert.doesNotMatch(text, /scm\.devops\.vnpt\.vn/i, rel);
    assert.doesNotMatch(text, /scm\.kv1\.it/i, rel);
    assert.doesNotMatch(text, /vnpt_it_harness/i, rel);
    assert.doesNotMatch(text, /D:\\rd_ai/i, rel);
  }
});
