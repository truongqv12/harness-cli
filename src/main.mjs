#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseCli } from './cli-parser.mjs';
import { formatHelp } from './cli/command-registry.mjs';
import { findBundleRoot } from './core/manifest.mjs';
import { findPackageRoot } from './core/package-info.mjs';
import { runInit } from './commands/init/init-command.mjs';
import { runDoctor } from './commands/doctor-command.mjs';
import { runVersion } from './commands/version-command.mjs';
import { runMigrate } from './commands/migrate-command.mjs';
import { runUpdate } from './commands/update-command.mjs';
import { runConfig } from './commands/config-command.mjs';

async function main() {
  const entry = fileURLToPath(import.meta.url);
  const packageRoot = findPackageRoot(path.dirname(entry));
  const bundleRoot = findBundleRoot(path.dirname(entry));
  const { command, args } = parseCli(process.argv.slice(2));
  const context = { bundleRoot, packageRoot };
  if (command === 'help') {
    process.stdout.write(formatHelp());
  } else if (command === 'init') {
    await runInit(args, context, 'init');
  } else if (command === 'install') {
    console.warn('`vnpt-harness install` is a compatibility alias. Use `vnpt-harness init` for project installs and updates.');
    await runInit(args, context, 'install');
  } else if (command === 'update') {
    runUpdate(args, context);
  } else if (command === 'migrate') {
    await runMigrate(args, context);
  } else if (command === 'doctor') {
    runDoctor(args, context);
  } else if (command === 'version') {
    runVersion(args, context);
  } else if (command === 'config') {
    runConfig(args, context);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(`vnpt-harness: ${error.message}`);
  process.exit(1);
});
