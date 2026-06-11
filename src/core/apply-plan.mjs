import fs from 'node:fs';
import { copyFile, removeEmptyParents } from './path-utils.mjs';

const COPY_ACTIONS = new Set(['copy-new', 'update-clean', 'overwrite-conflict', 'force-reinstall', 'force-overwrite', 'merge-user']);

export function applyReconcilePlan(ops, managed, projectRoot) {
  const nextManaged = { ...managed };
  for (const op of ops) {
    const file = op.file;
    if (COPY_ACTIONS.has(op.action)) {
      copyFile(file.sourcePath, file.targetPath);
      nextManaged[file.targetRel] = file.sourceHash;
    } else if (op.action === 'adopt-clean') {
      nextManaged[file.targetRel] = file.sourceHash;
    } else if (op.action === 'delete-clean-stale') {
      fs.unlinkSync(file.targetPath);
      removeEmptyParents(file.targetPath, projectRoot);
      delete nextManaged[file.targetRel];
    }
  }
  return nextManaged;
}
