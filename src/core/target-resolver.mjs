import fs from 'node:fs';
import path from 'node:path';

const CODEX_STATE = '.codex/vnpt-harness-state.json';

export function findInstalledRoot(start, manifest) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, manifest.stateFile))) return current;
    if (fs.existsSync(path.join(current, CODEX_STATE))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function resolveTarget(command, args, manifest, env = process.env) {
  const explicit = args.directory || args.project || env.VNPT_HARNESS_TARGET_DIR;
  if (explicit) return path.resolve(explicit);
  if (command === 'init' || command === 'install') {
    return findInstalledRoot(process.cwd(), manifest) || path.resolve(process.cwd());
  }
  return findInstalledRoot(process.cwd(), manifest) || path.resolve(process.cwd());
}

export { CODEX_STATE };
