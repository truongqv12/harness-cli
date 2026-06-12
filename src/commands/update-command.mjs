import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { readPackageInfo } from '../core/package-info.mjs';

const DEFAULT_UPDATE_SOURCE = 'github:truongqv12/harness-cli';

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

function printDryRun(args) {
  console.log(`Dry run: npm ${args.join(' ')}`);
}

function updateSource(pkg, args) {
  return args.source || pkg.vnptHarness?.updateSource || DEFAULT_UPDATE_SOURCE;
}

function withGitRef(source, requested) {
  if (requested === 'latest' || source.includes('#') || /^https?:\/\/.*\.t(?:ar\.)?gz$/i.test(source)) return source;
  return `${source}#${requested}`;
}

function shouldUseInstallLinks(packageSpec) {
  return /^(github:|git\+|git:\/\/|https?:\/\/.*\.git(?:#|$))/i.test(packageSpec);
}

function updateInstallArgs(pkg, args, requested) {
  const packageSpec = args.registry
    ? requested === 'latest' ? pkg.name : `${pkg.name}@${requested}`
    : withGitRef(updateSource(pkg, args), requested);
  const installArgs = ['install', '-g', packageSpec];
  if (shouldUseInstallLinks(packageSpec)) installArgs.push('--install-links=true');
  if (args.registry) installArgs.push('--registry', args.registry);
  return installArgs;
}

export function runUpdate(args, context) {
  const pkg = readPackageInfo(context.packageRoot);

  if (args.kit || args.global) {
    console.log('vnpt-harness update only updates the CLI package.');
    console.log('To update project harness files, run: vnpt-harness init');
    return;
  }

  if (args.check) {
    if (!args.registry) {
      console.log(`Current ${pkg.name} version: ${pkg.version}`);
      console.log(`Update source: ${updateSource(pkg, args)}`);
      console.log('Run `vnpt-harness update --dry-run` to inspect the npm install command.');
      return;
    }
    const checkArgs = ['view', pkg.name, 'version', ...(args.registry ? ['--registry', args.registry] : [])];
    if (args.dryRun) {
      printDryRun(checkArgs);
      return;
    }
    runNpm(checkArgs);
    return;
  }

  const requested = args.release || args.version || 'latest';
  const installArgs = updateInstallArgs(pkg, args, requested);

  console.log(`Updating ${pkg.name} CLI package (${requested})...`);
  if (args.dryRun) {
    printDryRun(installArgs);
    return;
  }
  runNpm(installArgs);
}
