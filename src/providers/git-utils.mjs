export function cloneSource(value = '') {
  const normalized = String(value).replace(/^git\+/, '');
  try {
    const url = new URL(normalized);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return normalized;
  }
}

export function isGitSource(value = '') {
  return /^[^:]+@[^:]+:.+/.test(value) || /^git\+?[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

export function gitCloneArgs(source, ref, env = process.env) {
  const args = [];
  if (env.CI_JOB_TOKEN) args.push('-c', `http.extraHeader=JOB-TOKEN: ${env.CI_JOB_TOKEN}`);
  if (env.VNPT_HARNESS_TOKEN) args.push('-c', `http.extraHeader=PRIVATE-TOKEN: ${env.VNPT_HARNESS_TOKEN}`);
  args.push('clone', '--depth', '1');
  if (ref && ref !== 'latest') args.push('--branch', ref);
  args.push(cloneSource(source));
  return args;
}
