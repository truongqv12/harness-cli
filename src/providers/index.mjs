import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { archiveProvider } from './archive-provider.mjs';
import { gitProvider } from './git-provider.mjs';
import { githubProvider } from './github-provider.mjs';
import { gitlabProvider, parseGitLabSource } from './gitlab-provider.mjs';
import { localProvider } from './local-provider.mjs';
import { SourceProviderError, PROVIDER_ERROR } from './provider-errors.mjs';
import { hideCredentials } from './redaction.mjs';

export { hideCredentials, parseGitLabSource };

function providers() {
  return [localProvider(), archiveProvider(), gitlabProvider(), githubProvider(), gitProvider()];
}

function resolveRef(input) {
  return input.ref || input.release || input.version || input.env.VNPT_HARNESS_VERSION || input.config.version || input.manifest.defaultVersion || 'main';
}

export function resolveWithProviders(options) {
  const env = options.env || process.env;
  const manifest = options.localManifest || {};
  const input = {
    ...options,
    env,
    manifest,
    ref: resolveRef({ ...options, env, manifest, config: options.config || {} }),
    makeTempRoot: () => fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-harness-')),
    removeTempRoot: (target) => fs.rmSync(target, { recursive: true, force: true })
  };
  input.source = input.kitPath || input.source || env.VNPT_HARNESS_SOURCE || input.config?.source || manifest.defaultSource;

  for (const provider of providers()) {
    if (provider.canResolve(input)) return provider.resolve(input);
  }

  if (!input.source && !input.archive) {
    throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_SOURCE, 'Source is required');
  }
  throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_SOURCE, `Unsupported source: ${hideCredentials(input.source || input.archive)}`);
}
