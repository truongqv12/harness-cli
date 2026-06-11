import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { sourceFiles } from '../src/core/inventory.mjs';
import { buildReconcilePlan } from '../src/core/reconcile.mjs';
import { sha256File } from '../src/core/hash.mjs';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-reconcile-test-'));
}

test('protected basename patterns exclude copied secrets anywhere in managed roots', () => {
  const root = tempDir();
  const source = path.join(root, 'source');
  const target = path.join(root, 'target');
  fs.mkdirSync(path.join(source, 'claude'), { recursive: true });
  fs.writeFileSync(path.join(source, 'claude', '.env'), 'secret');
  fs.writeFileSync(path.join(source, 'claude', 'safe.md'), 'safe');
  const files = sourceFiles(source, target, [{ source: 'claude', target: '.claude' }], ['.env']);
  assert.deepEqual(files.map((file) => file.targetRel), ['.claude/safe.md']);
  fs.rmSync(root, { recursive: true, force: true });
});

test('narrow force reinstalls deleted unchanged managed file', () => {
  const root = tempDir();
  const sourcePath = path.join(root, 'source.txt');
  const targetPath = path.join(root, 'target.txt');
  fs.writeFileSync(sourcePath, 'same');
  const hash = sha256File(sourcePath);
  const ops = buildReconcilePlan({
    files: [{ sourcePath, targetPath, targetRel: 'target.txt', sourceHash: hash }],
    managed: { 'target.txt': hash },
    projectRoot: root,
    force: true,
    forceNarrow: true
  });
  assert.equal(ops[0].action, 'force-reinstall');
  fs.rmSync(root, { recursive: true, force: true });
});

test('narrow force overwrites target edits only when source is unchanged', () => {
  const root = tempDir();
  const sourcePath = path.join(root, 'source.txt');
  const targetPath = path.join(root, 'target.txt');
  fs.writeFileSync(sourcePath, 'base');
  const baseHash = sha256File(sourcePath);
  fs.writeFileSync(targetPath, 'user edit');
  const ops = buildReconcilePlan({
    files: [{ sourcePath, targetPath, targetRel: 'target.txt', sourceHash: baseHash }],
    managed: { 'target.txt': baseHash },
    projectRoot: root,
    force: true,
    forceNarrow: true
  });
  assert.equal(ops[0].action, 'force-overwrite');
  fs.rmSync(root, { recursive: true, force: true });
});

test('narrow force still conflicts when source and target both changed', () => {
  const root = tempDir();
  const oldSource = path.join(root, 'old.txt');
  const sourcePath = path.join(root, 'source.txt');
  const targetPath = path.join(root, 'target.txt');
  fs.writeFileSync(oldSource, 'base');
  fs.writeFileSync(sourcePath, 'new source');
  fs.writeFileSync(targetPath, 'user edit');
  const ops = buildReconcilePlan({
    files: [{ sourcePath, targetPath, targetRel: 'target.txt', sourceHash: sha256File(sourcePath) }],
    managed: { 'target.txt': sha256File(oldSource) },
    projectRoot: root,
    force: true,
    forceNarrow: true
  });
  assert.equal(ops[0].action, 'conflict');
  fs.rmSync(root, { recursive: true, force: true });
});

test('merge-managed files stay mergeable even after they are tracked', () => {
  const root = tempDir();
  const sourcePath = path.join(root, 'managed.md');
  const targetPath = path.join(root, 'target.md');
  fs.writeFileSync(sourcePath, 'managed block');
  fs.writeFileSync(targetPath, 'user content');
  const hash = sha256File(sourcePath);
  const ops = buildReconcilePlan({
    files: [{ sourcePath, targetPath, targetRel: 'target.md', sourceHash: hash, merge: true }],
    managed: { 'target.md': hash },
    projectRoot: root
  });
  assert.equal(ops[0].action, 'merge-user');
  fs.rmSync(root, { recursive: true, force: true });
});

test('codex migrate pruning deletes clean stale managed files', () => {
  const root = tempDir();
  const stalePath = path.join(root, '.codex', 'agents', 'old.toml');
  fs.mkdirSync(path.dirname(stalePath), { recursive: true });
  fs.writeFileSync(stalePath, 'old agent');
  const ops = buildReconcilePlan({
    files: [],
    managed: { '.codex/agents/old.toml': sha256File(stalePath) },
    projectRoot: root,
    pruneMissingManaged: true
  });
  assert.equal(ops[0].action, 'delete-clean-stale');
  fs.rmSync(root, { recursive: true, force: true });
});
