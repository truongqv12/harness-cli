import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { parseCli } from '../src/cli-parser.mjs';
import { resolveTarget } from '../src/core/target-resolver.mjs';
import { hideCredentials, parseGitLabSource, resolveSource } from '../src/core/source-resolver.mjs';

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('parser defaults to init and accepts source aliases', () => {
  const parsed = parseCli(['--kit-path', 'bundle', '-r', 'latest', '-y']);
  assert.equal(parsed.command, 'init');
  assert.equal(parsed.args.kitPath, 'bundle');
  assert.equal(parsed.args.release, 'latest');
  assert.equal(parsed.args.version, 'latest');
  assert.equal(parsed.args.yes, true);
});

test('parser maps global help and version flags before init defaults', () => {
  assert.equal(parseCli(['--help']).command, 'help');
  assert.equal(parseCli(['-h']).command, 'help');
  assert.equal(parseCli(['--version']).command, 'version');
  assert.equal(parseCli(['-v']).command, 'version');
});

test('parser accepts migrate directory alias and short force', () => {
  const parsed = parseCli(['migrate', '--agent', 'codex', '--directory', 'repo', '-f', '--dry-run']);
  assert.equal(parsed.command, 'migrate');
  assert.equal(parsed.args.agent, 'codex');
  assert.equal(parsed.args.directory, 'repo');
  assert.equal(parsed.args.force, true);
  assert.equal(parsed.args.dryRun, true);
});

test('init resolves nearest parent state from subdirectory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-target-test-'));
  const subdir = path.join(root, 'a', 'b');
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.mkdirSync(subdir, { recursive: true });
  fs.writeFileSync(path.join(root, '.claude', 'vnpt-harness-state.json'), '{}');
  const oldCwd = process.cwd();
  process.chdir(subdir);
  try {
    const resolved = resolveTarget('init', {}, { stateFile: '.claude/vnpt-harness-state.json' }, {});
    assert.equal(resolved, root);
  } finally {
    process.chdir(oldCwd);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source URL redaction removes userinfo and secret query values', () => {
  const redacted = hideCredentials('https://user:pass@example.test/group/repo.git?private_token=abc&ref=main');
  assert.equal(redacted, 'https://***@example.test/group/repo.git?private_token=***&ref=main');
});

test('gitlab provider source parses host and repo path without defaults', () => {
  assert.deepEqual(parseGitLabSource('gitlab:gitlab.example.com/group/subgroup/project'), {
    host: 'gitlab.example.com',
    repoPath: 'group/subgroup/project',
    display: 'gitlab:gitlab.example.com/group/subgroup/project',
    cloneUrl: 'https://gitlab.example.com/group/subgroup/project.git'
  });
});

test('generic git source clones default branch for latest', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-git-source-'));
  const repo = path.join(root, 'bundle-repo');
  fs.mkdirSync(repo, { recursive: true });
  fs.writeFileSync(
    path.join(repo, 'harness-manifest.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0', managedTargets: [], protectedPatterns: [] }, null, 2)
  );
  git(['init'], repo);
  git(['config', 'user.email', 'test@example.invalid'], repo);
  git(['config', 'user.name', 'Test User'], repo);
  git(['add', 'harness-manifest.json'], repo);
  git(['commit', '-m', 'init fixture'], repo);

  const sourceInfo = resolveSource({ source: pathToFileURL(repo).href, version: 'latest', localManifest: {} });
  try {
    assert.ok(fs.existsSync(path.join(sourceInfo.root, 'harness-manifest.json')));
    assert.equal(sourceInfo.version, 'latest');
  } finally {
    sourceInfo.cleanup();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
