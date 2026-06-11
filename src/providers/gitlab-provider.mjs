import { cloneWithGit } from './git-provider.mjs';
import { commandExists, runCommand } from './process-runner.mjs';
import { SourceProviderError, PROVIDER_ERROR } from './provider-errors.mjs';

export function parseGitLabSource(value = '') {
  if (!value.startsWith('gitlab:')) return null;
  const spec = value.slice('gitlab:'.length).replace(/^\/+/, '');
  const parts = spec.split('/').filter(Boolean);
  if (parts.length < 3) {
    throw new SourceProviderError(PROVIDER_ERROR.UNSUPPORTED_SOURCE, 'GitLab source must be gitlab:<host>/<namespace>/<project>');
  }
  const [host, ...repoParts] = parts;
  const repoPath = repoParts.join('/').replace(/\.git$/i, '');
  return {
    host,
    repoPath,
    display: `gitlab:${host}/${repoPath}`,
    cloneUrl: `https://${host}/${repoPath}.git`
  };
}

function glabClone(gitlab, ref, tempRoot, env) {
  const args = [
    'repo',
    'clone',
    `${gitlab.host}/${gitlab.repoPath}`,
    tempRoot,
    '--',
    '--depth',
    '1',
    ...(ref && ref !== 'latest' ? ['--branch', ref] : [])
  ];
  return runCommand('glab', args, { env, encoding: 'utf8', stdio: 'pipe' });
}

export function gitlabProvider() {
  return {
    name: 'gitlab',
    canResolve(input) {
      return Boolean(parseGitLabSource(input.source || ''));
    },
    resolve(input) {
      const gitlab = parseGitLabSource(input.source);
      if (commandExists('glab', input.env)) {
        const tempRoot = input.makeTempRoot();
        const result = glabClone(gitlab, input.ref, tempRoot, input.env);
        if (result.status === 0) {
          return {
            root: tempRoot,
            provider: 'gitlab',
            source: input.source,
            displaySource: gitlab.display,
            version: input.ref,
            cleanup: () => input.removeTempRoot(tempRoot)
          };
        }
        input.removeTempRoot(tempRoot);
      }
      const resolved = cloneWithGit({
        source: gitlab.cloneUrl,
        ref: input.ref,
        env: input.env,
        displaySource: gitlab.display,
        provider: 'gitlab'
      });
      return { ...resolved, source: input.source };
    }
  };
}
