import path from 'node:path';
import { normalizeRel } from './path-utils.mjs';

function globToRegex(glob) {
  let regex = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    const next = glob[i + 1];
    if (ch === '*' && next === '*') {
      regex += '.*';
      i += 1;
    } else if (ch === '*') {
      regex += '[^/]*';
    } else if (ch === '?') {
      regex += '[^/]';
    } else {
      regex += ch.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
    }
  }
  return new RegExp(`${regex}$`, 'i');
}

export function isProtected(relPath, patterns = []) {
  const rel = normalizeRel(relPath);
  const base = path.posix.basename(rel);
  return patterns.some((raw) => {
    const pattern = normalizeRel(raw).replace(/\/\*\*$/, '/**');
    const matcher = globToRegex(pattern);
    if (matcher.test(rel)) return true;
    return !pattern.includes('/') && matcher.test(base);
  });
}
