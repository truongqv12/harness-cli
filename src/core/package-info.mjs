import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './path-utils.mjs';

export function findPackageRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function readPackageInfo(packageRoot) {
  if (!packageRoot) return { name: 'vnpt-harness-cli', version: '0.0.0' };
  return readJson(path.join(packageRoot, 'package.json'));
}
