import fs from 'node:fs';
import path from 'node:path';
import { isProtected } from './protected-paths.mjs';
import { copyFile, ensureInside, joinRel, normalizeRel, walkFiles } from './path-utils.mjs';

export function createBackup(projectRoot, targets, manifest) {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')}-${process.pid}-${Math.random().toString(16).slice(2, 10)}`;
  const backupRoot = ensureInside(projectRoot, path.join(projectRoot, normalizeRel(manifest.backupRoot)));
  const backupDir = path.join(backupRoot, stamp);
  fs.mkdirSync(backupDir, { recursive: true });

  for (const target of targets) {
    const targetPath = ensureInside(projectRoot, path.join(projectRoot, target.target));
    if (!fs.existsSync(targetPath)) continue;
    const stat = fs.statSync(targetPath);
    const files = stat.isFile() ? [targetPath] : walkFiles(targetPath);
    for (const filePath of files) {
      const relSource = stat.isFile() ? path.basename(targetPath) : normalizeRel(path.relative(targetPath, filePath));
      const targetRel = joinRel(target.target, relSource);
      if (isProtected(targetRel, manifest.protectedPatterns)) continue;
      copyFile(filePath, path.join(backupDir, targetRel));
    }
  }
  return backupDir;
}
