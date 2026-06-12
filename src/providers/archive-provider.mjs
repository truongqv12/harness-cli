import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBundleRoot } from '../core/manifest.mjs';
import { runCommand } from './process-runner.mjs';
import { SourceProviderError, PROVIDER_ERROR } from './provider-errors.mjs';

function supportedArchive(filePath) {
  return /\.(zip|tar|tar\.gz|tgz)$/i.test(filePath);
}

function unsafeEntry(entry) {
  const normalized = entry.replace(/\\/g, '/');
  return path.isAbsolute(entry) || normalized.split('/').includes('..');
}

function tarCommand() {
  if (process.platform !== 'win32') return 'tar';
  const systemRoot = process.env.SystemRoot || process.env.WINDIR;
  if (!systemRoot) return 'tar';
  const candidate = path.join(systemRoot, 'System32', 'tar.exe');
  return fs.existsSync(candidate) ? candidate : 'tar';
}

function validateArchive(archive, env) {
  if (!supportedArchive(archive)) {
    throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_ARCHIVE, `Unsupported archive type: ${archive}`);
  }
  const list = runCommand(tarCommand(), ['-tf', archive], { env, encoding: 'utf8', stdio: 'pipe' });
  if (list.status !== 0) {
    throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_ARCHIVE, `Archive cannot be read: ${archive}`);
  }
  for (const entry of list.stdout.split(/\r?\n/).filter(Boolean)) {
    if (unsafeEntry(entry)) {
      throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_ARCHIVE, `Archive contains unsafe path: ${entry}`);
    }
  }
}

export function archiveProvider() {
  return {
    name: 'archive',
    canResolve(input) {
      return Boolean(input.archive);
    },
    resolve(input) {
      const archive = path.resolve(input.archive);
      if (!fs.existsSync(archive)) {
        throw new SourceProviderError(PROVIDER_ERROR.NOT_FOUND, `Archive not found: ${input.archive}`);
      }
      validateArchive(archive, input.env);
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-harness-archive-'));
      const extract = runCommand(tarCommand(), ['-xf', archive, '-C', tempRoot], { env: input.env });
      if (extract.status !== 0) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_ARCHIVE, `Archive extraction failed: ${input.archive}`);
      }
      const root = findBundleRoot(tempRoot);
      if (!root) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        throw new SourceProviderError(PROVIDER_ERROR.NOT_FOUND, 'Archive does not contain harness-manifest.json');
      }
      return {
        root,
        provider: 'archive',
        source: archive,
        displaySource: archive,
        version: input.ref,
        cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true })
      };
    }
  };
}
