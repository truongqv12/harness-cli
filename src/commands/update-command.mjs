import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { readPackageInfo } from '../core/package-info.mjs';

function npmInvocation(args) {
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (fs.existsSync(npmCli)) return { command: process.execPath, args: [npmCli, ...args] };
  return { command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args };
}

function runNpm(args) {
  const invocation = npmInvocation(args);
  const result = spawnSync(invocation.command, invocation.args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(' ')} failed`);
  }
}

export function runUpdate(args, context) {
  const pkg = readPackageInfo(context.packageRoot);

  if (args.kit || args.global) {
    console.log('vnpt-harness update only updates the CLI package.');
    console.log('To update project harness files, run: vnpt-harness init');
    return;
  }

  if (args.check) {
    runNpm(['view', pkg.name, 'version', ...(args.registry ? ['--registry', args.registry] : [])]);
    return;
  }

  const requested = args.release || args.version || 'latest';
  const packageSpec = requested === 'latest' ? pkg.name : `${pkg.name}@${requested}`;
  const installArgs = ['install', '-g', packageSpec];
  if (args.registry) installArgs.push('--registry', args.registry);

  console.log(`Updating ${pkg.name} CLI package (${requested})...`);
  runNpm(installArgs);
}
