import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './hash.mjs';
import { isProtected } from './protected-paths.mjs';
import { ensureInside, joinRel } from './path-utils.mjs';

function add(ops, action, file, reason) {
  ops.push({ action, file, reason });
}

function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*')
    .replace(/\\\?/g, '[^/]');
  return new RegExp(`^${escaped}$`, 'i');
}

function desiredDeletions(metadata, fresh, managed, desired, pruneMissingManaged) {
  const patterns = (metadata?.deletions || []).map((item) => joinRel('.claude', item).replace(/\*\*/g, '*'));
  if (fresh || pruneMissingManaged) {
    for (const managedPath of Object.keys(managed)) {
      if (!desired.has(managedPath)) patterns.push(managedPath);
    }
  }
  return patterns;
}

export function buildReconcilePlan(options) {
  const { files, managed = {}, patterns = [], metadata = null, projectRoot, fresh = false } = options;
  const overwrite = Boolean(options.overwrite);
  const force = Boolean(options.force);
  const forceNarrow = Boolean(options.forceNarrow);
  const pruneMissingManaged = Boolean(options.pruneMissingManaged);
  const ops = [];
  const desired = new Set();

  for (const file of files) {
    desired.add(file.targetRel);
    if (file.merge) {
      add(ops, 'merge-user', file, 'merge managed block without clobbering user content');
      continue;
    }
    const hasBase = Object.hasOwn(managed, file.targetRel);
    if (!fs.existsSync(file.targetPath)) {
      if (forceNarrow && hasBase && managed[file.targetRel] !== file.sourceHash) {
        add(ops, 'conflict', file, 'target deleted and source changed');
      } else if (forceNarrow && hasBase && force) {
        add(ops, 'force-reinstall', file, 'target deleted and source unchanged; force requested');
      } else {
        add(ops, 'copy-new', file, 'target missing');
      }
      continue;
    }
    const currentHash = sha256File(file.targetPath);
    if (hasBase) {
      const baseHash = managed[file.targetRel];
      if (currentHash === baseHash) {
        add(ops, fresh ? 'update-clean' : currentHash === file.sourceHash ? 'already-current' : 'update-clean', file, 'managed file clean');
      } else if (forceNarrow && baseHash === file.sourceHash && force) {
        add(ops, 'force-overwrite', file, 'target changed but source unchanged; force requested');
      } else if (forceNarrow) {
        add(ops, 'conflict', file, 'target and source both changed');
      } else if (overwrite) {
        add(ops, 'overwrite-conflict', file, 'managed file modified; overwrite requested');
      } else {
        add(ops, 'skip-conflict', file, 'managed file modified');
      }
    } else if (currentHash === file.sourceHash) {
      add(ops, 'adopt-clean', file, 'existing file matches source and can be tracked');
    } else {
      add(ops, 'preserve-user', file, 'existing file is not VNPT-managed');
    }
  }

  for (const managedPath of Object.keys(managed)) {
    for (const pattern of desiredDeletions(metadata, fresh, managed, desired, pruneMissingManaged)) {
      if (!globToRegExp(pattern).test(managedPath)) continue;
      if (isProtected(managedPath, patterns)) continue;
      const targetPath = ensureInside(projectRoot, path.join(projectRoot, managedPath));
      if (!fs.existsSync(targetPath)) continue;
      const file = { sourcePath: null, targetPath, targetRel: managedPath, sourceHash: null };
      add(ops, sha256File(targetPath) === managed[managedPath] ? 'delete-clean-stale' : 'skip-modified-stale', file, 'stale managed file');
    }
  }
  return ops;
}

export const WRITE_ACTIONS = new Set(['copy-new', 'update-clean', 'overwrite-conflict', 'delete-clean-stale', 'force-reinstall', 'force-overwrite', 'merge-user']);
export const STATE_ACTIONS = new Set([...WRITE_ACTIONS, 'adopt-clean']);
export const CONFLICT_ACTIONS = new Set(['skip-conflict', 'preserve-user', 'skip-modified-stale', 'conflict']);
