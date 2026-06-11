import { cloneWithGit } from './git-provider.mjs';
import { commandExists, runCommand } from './process-runner.mjs';
import { SourceProviderError, PROVIDER_ERROR } from './provider-errors.mjs';

export function parseGitHubSource(value = '') {
  if (!value.startsWith('github:')) return null;
  const repo = value.slice('github:'.length).replace(/^\/+/, '').replace(/\.git$/i, '');
  if (!/^[^/]+\/[^/]+$/.test(repo)) {
    throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_SOURCE, 'GitHub source must be github:<owner>/<repo>');
  }
  return {
    repo,
    display: `github:${repo}`,
    cloneUrl: `https://github.com/${repo}.git`
  };
}

function ghClone(github, ref, tempRoot, env) {
  const args = ['repo', 'clone', github.repo, tempRoot, '--', '--depth', '1'];
  if (ref && ref !== 'latest') args.push('--branch', ref);
  return runCommand('gh', args, { env, encoding: 'utf8', stdio: 'pipe' });
}

export function githubProvider() {
  return {
    name: 'github',
    canResolve(input) {
      return Boolean(parseGitHubSource(input.source || ''));
    },
    resolve(input) {
      const github = parseGitHubSource(input.source);
      if (commandExists('gh', input.env)) {
        const tempRoot = input.makeTempRoot();
        const result = ghClone(github, input.ref, tempRoot, input.env);
        if (result.status === 0) {
          return {
            root: tempRoot,
            provider: 'github',
            source: input.source,
            displaySource: github.display,
            version: input.ref,
            cleanup: () => input.removeTempRoot(tempRoot)
          };
        }
        input.removeTempRoot(tempRoot);
      }
      const resolved = cloneWithGit({
        source: github.cloneUrl,
        ref: input.ref,
        env: input.env,
        displaySource: github.display,
        provider: 'github'
      });
      return { ...resolved, source: input.source };
    }
  };
}
