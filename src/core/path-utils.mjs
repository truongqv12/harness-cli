import fs from 'node:fs';
import path from 'node:path';

export function normalizeRel(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

export function joinRel(...parts) {
  return parts.map(normalizeRel).filter(Boolean).join('/');
}

export function ensureInside(root, target) {
  const rootFull = path.resolve(root);
  const targetFull = path.resolve(target);
  const rel = path.relative(rootFull, targetFull);
  if (rel && (rel.startsWith('..') || path.isAbsolute(rel))) {
    throw new Error(`Target path escapes project root: ${targetFull}`);
  }
  return targetFull;
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function walkFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const item of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, item.name);
    if (item.isDirectory()) out.push(...walkFiles(full));
    if (item.isFile()) out.push(full);
  }
  return out;
}

export function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

export function removeEmptyParents(start, stop) {
  let current = path.dirname(start);
  const stopFull = path.resolve(stop);
  while (current.startsWith(stopFull) && current !== stopFull) {
    try {
      fs.rmdirSync(current);
    } catch {
      break;
    }
    current = path.dirname(current);
  }
}
