import fs from 'node:fs';
import path from 'node:path';
import { loadManifest } from '../../../core/manifest.mjs';
import { readJson } from '../../../core/path-utils.mjs';
import { resolveSource } from '../../../core/source-resolver.mjs';

export function resolveInitSource(ctx) {
  const sourceInfo = resolveSource({
    source: ctx.args.source,
    kitPath: ctx.args.kitPath,
    archive: ctx.args.archive,
    version: ctx.args.version,
    release: ctx.args.release,
    ref: ctx.args.ref,
    localManifest: ctx.localManifest,
    config: ctx.config
  });
  const manifest = loadManifest(sourceInfo.root, { required: true });
  const metadataPath = path.join(sourceInfo.root, 'claude', 'metadata.json');

  return {
    ...ctx,
    sourceInfo,
    manifest,
    metadata: fs.existsSync(metadataPath) ? readJson(metadataPath) : null
  };
}
