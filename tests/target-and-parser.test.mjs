import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { parseCli } from '../src/cli-parser.mjs';
import { sourceFiles } from '../src/core/inventory.mjs';
import { resolveTarget } from '../src/core/target-resolver.mjs';
import { hideCredentials, parseGitLabSource, resolveSource } from '../src/core/source-resolver.mjs';
import { gitlabProvider } from '../src/providers/gitlab-provider.mjs';

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function writeFakeCommand(binDir, name, script) {
  const filePath = path.join(binDir, process.platform === 'win32' ? `${name}.cmd` : name);
  const body = process.platform === 'win32' ? `@echo off\r\n${script}\r\n` : `#!/usr/bin/env sh\n${script}\n`;
  fs.writeFileSync(filePath, body, 'utf8');
  if (process.platform !== 'win32') fs.chmodSync(filePath, 0o755);
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
    cloneUrl: 'https://gitlab.example.com/group/subgroup/project.git',
    useGlab: true
  });
});

test('gitlab provider source parses explicit HTTPS URLs without glab', () => {
  assert.deepEqual(parseGitLabSource('gitlab:https://gitlab.example.com/group/project'), {
    host: 'gitlab.example.com',
    repoPath: 'group/project',
    display: 'gitlab:gitlab.example.com/group/project',
    cloneUrl: 'https://gitlab.example.com/group/project.git',
    useGlab: false
  });
  assert.deepEqual(parseGitLabSource('gitlab:https://gitlab.example.com/group/subgroup/project.git'), {
    host: 'gitlab.example.com',
    repoPath: 'group/subgroup/project',
    display: 'gitlab:gitlab.example.com/group/subgroup/project',
    cloneUrl: 'https://gitlab.example.com/group/subgroup/project.git',
    useGlab: false
  });
});

test('gitlab provider source sanitizes URL credentials and requires project path', () => {
  assert.deepEqual(parseGitLabSource('gitlab:https://user:pass@gitlab.example.com/group/project.git?private_token=abc#main'), {
    host: 'gitlab.example.com',
    repoPath: 'group/project',
    display: 'gitlab:gitlab.example.com/group/project',
    cloneUrl: 'https://gitlab.example.com/group/project.git',
    useGlab: false
  });
  assert.throws(() => parseGitLabSource('gitlab:https://gitlab.example.com/group'), /GitLab source must be/);
  assert.equal(parseGitLabSource('https://gitlab.example.com/group/project'), null);
});

test('gitlab URL-form sources bypass glab before git clone', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-gitlab-provider-'));
  const binDir = path.join(root, 'bin');
  const glabMarker = path.join(root, 'glab-used.txt');
  fs.mkdirSync(binDir, { recursive: true });
  writeFakeCommand(binDir, 'glab', process.platform === 'win32' ? 'echo glab > "%GLAB_MARKER%"' : 'printf glab > "$GLAB_MARKER"');
  const provider = gitlabProvider();
  const tempRoots = [];
  try {
    let error;
    const env = {
      ...process.env,
      PATH: binDir,
      Path: binDir,
      GLAB_MARKER: glabMarker,
      VNPT_HARNESS_TOKEN: 'vnpt-token-redacted-check',
      CI_JOB_TOKEN: 'job-token-redacted-check'
    };
    assert.throws(
      () => provider.resolve({
        source: 'gitlab:https://gitlab.example.com/group/project',
        ref: 'latest',
        env,
        makeTempRoot: () => {
          const tempRoot = fs.mkdtempSync(path.join(root, 'clone-'));
          tempRoots.push(tempRoot);
          return tempRoot;
        },
        removeTempRoot: (target) => fs.rmSync(target, { recursive: true, force: true })
      }),
      (err) => {
        error = err;
        return /git clone failed for gitlab:gitlab\.example\.com\/group\/project/.test(err.message);
      }
    );
    assert.doesNotMatch(error.message, /vnpt-token-redacted-check|job-token-redacted-check/);
    assert.ok(!fs.existsSync(glabMarker));
  } finally {
    for (const tempRoot of tempRoots) fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source validation reports all missing managed sources together', () => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-source-missing-'));
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-target-missing-'));
  try {
    assert.throws(
      () => sourceFiles(sourceRoot, projectRoot, [
        { source: 'plans/templates', target: 'plans/templates' },
        { source: 'scripts/bin', target: 'scripts/bin' }
      ], []),
      /Required source paths missing: plans\/templates, scripts\/bin/
    );
  } finally {
    fs.rmSync(sourceRoot, { recursive: true, force: true });
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
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
