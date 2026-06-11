import { DEFAULT_MANIFEST } from './manifest.mjs';
import { hideCredentials, parseGitLabSource, resolveWithProviders } from '../providers/index.mjs';

export { hideCredentials, parseGitLabSource };

export function resolveSource(options) {
  return resolveWithProviders({
    ...options,
    localManifest: options.localManifest || DEFAULT_MANIFEST
  });
}
