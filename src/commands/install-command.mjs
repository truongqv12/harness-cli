import { runInit } from './init/init-command.mjs';

export async function runInstallLike(command, args, context) {
  if (command === 'install') {
    console.warn('`vnpt-harness install` is a compatibility alias. Use `vnpt-harness init` for project installs and updates.');
  }
  await runInit(args, context, command === 'update' ? 'init' : command);
}
