import fs from 'node:fs';
import path from 'node:path';
import { SourceProviderError, PROVIDER_ERROR } from './provider-errors.mjs';

export function localProvider() {
  return {
    name: 'local',
    canResolve(input) {
      return Boolean(input.kitPath || (input.source && fs.existsSync(path.resolve(input.source))));
    },
    resolve(input) {
      const requested = input.kitPath || input.source;
      const root = path.resolve(requested);
      if (!fs.existsSync(path.join(root, 'harness-manifest.json'))) {
        throw new SourceProviderError(PROVIDER_ERROR.NOT_FOUND, `Local source missing harness-manifest.json: ${requested}`);
      }
      return {
        root,
        provider: 'local',
        source: requested,
        displaySource: requested,
        version: input.ref,
        cleanup: () => {}
      };
    }
  };
}
