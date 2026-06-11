import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gitCloneArgs, isGitSource } from './git-utils.mjs';
import { runCommand } from './process-runner.mjs';
import { SourceProviderError, PROVIDER_ERROR } from './provider-errors.mjs';
import { hideCredentials } from './redaction.mjs';

function classifyGitFailure(output = '') {
  if (/Authentication failed|authorization failed|could not read Username|Permission denied/i.test(output)) return PROVIDER_ERROR.AUTH;
  if (/Remote branch .* not found|pathspec .* did not match|not a valid object name/i.test(output)) return PROVIDER_ERROR.INVALID_REF;
  if (/repository .* not found|not found/i.test(output)) return PROVIDER_ERROR.NOT_FOUND;
  return PROVIDER_ERROR.UNSUPPORTED_SOURCE;
}

export function cloneWithGit({ source, ref, env, displaySource = hideCredentials(source), provider = 'git' }) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpt-harness-'));
  const result = runCommand('git', [...gitCloneArgs(source, ref, env), tempRoot], { env, encoding: 'utf8', stdio: 'pipe' });
  if (result.status !== 0) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    throw new SourceProviderError(classifyGitFailure(output), `git clone failed for ${displaySource}`);
  }
  return {
    root: tempRoot,
    provider,
    source,
    displaySource,
    version: ref,
    cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true })
  };
}

export function gitProvider() {
  return {
    name: 'git',
    canResolve(input) {
      return Boolean(input.source && isGitSource(input.source));
    },
    resolve(input) {
      return cloneWithGit({ source: input.source, ref: input.ref, env: input.env });
    }
  };
}
