import fs from 'node:fs';
import path from 'node:path';
import { hideCredentials } from './source-resolver.mjs';
import { ensureInside, normalizeRel, readJson, writeJson } from './path-utils.mjs';

export function readManagedState(projectRoot, stateRel) {
  const statePath = ensureInside(projectRoot, path.join(projectRoot, normalizeRel(stateRel)));
  if (!fs.existsSync(statePath)) return { path: statePath, exists: false, managed: {} };
  const state = readJson(statePath);
  return { path: statePath, exists: true, managed: state.managedFiles || {}, state };
}

export function writeState({ projectRoot, stateRel, manifest, managed, source, version, ops, sourceInfo, cliVersion }) {
  const statePath = ensureInside(projectRoot, path.join(projectRoot, normalizeRel(stateRel)));
  const conflicts = ops
    .filter((op) => ['skip-conflict', 'preserve-user', 'skip-modified-stale', 'conflict'].includes(op.action))
    .map((op) => ({ path: op.file.targetRel, action: op.action, reason: op.reason }));
  const now = new Date().toISOString();
  const stateSource = sourceInfo?.source || source;
  const stateRef = sourceInfo?.version || version;
  writeJson(statePath, {
    schemaVersion: 1,
    cliVersion,
    kitId: manifest.kitId || manifest.name,
    bundleVersion: manifest.version,
    sourceProvider: sourceInfo?.provider || 'unknown',
    sourceUrl: hideCredentials(stateSource),
    sourceRef: stateRef,
    lastInitAt: now,
    name: manifest.name,
    version: manifest.version,
    installedAt: now,
    checksumAlgorithm: 'sha256',
    managedFiles: Object.fromEntries(Object.keys(managed).sort().map((key) => [key, managed[key]])),
    skippedConflicts: conflicts
  });
  return statePath;
}
