import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './hash.mjs';
import { isProtected } from './protected-paths.mjs';
import { ensureInside, joinRel, normalizeRel, walkFiles } from './path-utils.mjs';

export function managedTargets(manifest, args = {}) {
  return (manifest.managedTargets || []).flatMap((item) => {
    if (item.flag === 'docs' && args.noDocs) return [];
    if (item.flag === 'planTemplates' && args.noPlanTemplates) return [];
    const target = item.flag === 'docs' && args.docsDir ? args.docsDir : item.target;
    return [{ source: normalizeRel(item.source), target: normalizeRel(target) }];
  });
}

export function existingManagedRoots(projectRoot, targets) {
  return targets
    .map((target) => target.target)
    .filter((target) => fs.existsSync(ensureInside(projectRoot, path.join(projectRoot, target))));
}

export function sourceFiles(sourceRoot, projectRoot, targets, patterns) {
  const files = [];
  for (const target of targets) {
    const sourcePath = path.join(sourceRoot, target.source);
    if (!fs.existsSync(sourcePath)) throw new Error(`Required source path missing: ${target.source}`);
    const sourceStat = fs.statSync(sourcePath);
    const candidates = sourceStat.isFile() ? [sourcePath] : walkFiles(sourcePath);
    for (const filePath of candidates) {
      const relSource = sourceStat.isFile() ? path.basename(sourcePath) : normalizeRel(path.relative(sourcePath, filePath));
      const targetRel = joinRel(target.target, relSource);
      if (isProtected(targetRel, patterns)) continue;
      const targetPath = ensureInside(projectRoot, path.join(projectRoot, targetRel));
      files.push({ sourcePath: filePath, targetPath, targetRel, sourceHash: sha256File(filePath) });
    }
  }
  return files;
}
