import { spawnSync } from 'node:child_process';

export function commandExists(command, env = process.env) {
  return spawnSync(command, ['--version'], { env, stdio: 'ignore', shell: false }).status === 0;
}

export function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    env: options.env || process.env,
    cwd: options.cwd,
    encoding: options.encoding,
    stdio: options.stdio || 'inherit',
    shell: false
  });
}
