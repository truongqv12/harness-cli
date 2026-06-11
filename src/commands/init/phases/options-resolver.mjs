import fs from 'node:fs';
import { loadConfig } from '../../../core/config-store.mjs';
import { loadManifest } from '../../../core/manifest.mjs';
import { readPackageInfo } from '../../../core/package-info.mjs';
import { resolveTarget } from '../../../core/target-resolver.mjs';

export function resolveInitOptions(ctx) {
  const localManifest = loadManifest(ctx.cli.bundleRoot);
  const projectRoot = resolveTarget('init', ctx.args, localManifest);
  fs.mkdirSync(projectRoot, { recursive: true });

  return {
    ...ctx,
    localManifest,
    packageInfo: readPackageInfo(ctx.cli.packageRoot),
    projectRoot,
    config: loadConfig(projectRoot)
  };
}
