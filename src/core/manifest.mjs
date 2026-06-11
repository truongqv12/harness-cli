import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './path-utils.mjs';

export const DEFAULT_MANIFEST = {
  schemaVersion: 1,
  kitId: 'vnpt-it-harness',
  kitName: 'VNPT IT Harness',
  name: 'vnpt-it-harness',
  version: '0.0.0',
  requiresCli: '>=0.4.0 <1.0.0',
  checksumAlgorithm: 'sha256',
  stateFile: '.claude/vnpt-harness-state.json',
  backupRoot: '.vnpt-harness-backups',
  defaultDocsTarget: 'docs/vnpt-harness',
  defaultPlansTarget: 'plans/templates',
  managedTargets: [],
  protectedPatterns: [],
  postInstall: {}
};

export function findBundleRoot(start) {
  let current = path.resolve(start);
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }
  while (true) {
    if (fs.existsSync(path.join(current, 'harness-manifest.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function loadManifest(bundleRoot, { required = false } = {}) {
  const manifestPath = bundleRoot ? path.join(bundleRoot, 'harness-manifest.json') : '';
  if (manifestPath && fs.existsSync(manifestPath)) {
    return { ...DEFAULT_MANIFEST, ...readJson(manifestPath) };
  }
  if (required) throw new Error('Source bundle missing harness-manifest.json');
  return DEFAULT_MANIFEST;
}
