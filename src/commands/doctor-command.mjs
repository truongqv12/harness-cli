import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadManifest } from '../core/manifest.mjs';
import { resolveTarget } from '../core/target-resolver.mjs';

function available(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0;
}

export function runDoctor(args, context) {
  const manifest = loadManifest(context.bundleRoot);
  const installedRoot = resolveTarget('doctor', args, manifest);
  const claudeState = path.join(installedRoot, manifest.stateFile);
  const codexState = path.join(installedRoot, '.codex', 'vnpt-harness-state.json');
  const legacyEngine = path.join(installedRoot, '.vnpt-harness', 'cli', 'src', 'main.mjs');

  console.log('VNPT Harness doctor');
  console.log(`cwd: ${process.cwd()}`);
  console.log(`target: ${installedRoot}`);
  console.log(`node: ${process.version}`);
  console.log(`git: ${available('git') ? 'available' : 'missing'}`);
  console.log(`glab: ${available('glab') ? 'available' : 'missing'} (optional; HTTPS GitLab uses git)`);
  console.log(`gh: ${available('gh') ? 'available' : 'missing (optional)'}`);
  console.log(`claude state: ${fs.existsSync(claudeState) ? claudeState : 'missing'}`);
  console.log(`codex state: ${fs.existsSync(codexState) ? codexState : 'missing'}`);
  console.log(`legacy vendored CLI: ${fs.existsSync(legacyEngine) ? legacyEngine : 'not found'}`);
}
