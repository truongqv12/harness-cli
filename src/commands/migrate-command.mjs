import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyReconcilePlan } from '../core/apply-plan.mjs';
import { createBackup } from '../core/backup-store.mjs';
import { loadManifest } from '../core/manifest.mjs';
import { printSummary } from '../core/output.mjs';
import { readPackageInfo } from '../core/package-info.mjs';
import { buildReconcilePlan, STATE_ACTIONS, WRITE_ACTIONS } from '../core/reconcile.mjs';
import { resolveSource } from '../core/source-resolver.mjs';
import { CODEX_STATE, resolveTarget } from '../core/target-resolver.mjs';
import { readManagedState, writeState } from '../core/state-store.mjs';
import { buildCodexInventory } from '../codex/codex-inventory.mjs';
import { buildCopilotInventory } from '../copilot/copilot-inventory.mjs';

export async function runMigrate(args, context) {
  const agent = args.agent || 'codex';
  if (!['codex', 'copilot'].includes(agent)) throw new Error('Only migrate --agent codex or --agent copilot is supported');
  const localManifest = loadManifest(context.bundleRoot);
  const packageInfo = readPackageInfo(context.packageRoot);
  const projectRoot = resolveTarget('migrate', args, localManifest);
  const sourceInfo = resolveSource({ source: args.source, version: args.version, localManifest });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `vnpt-${agent}-migrate-`));
  try {
    const manifest = loadManifest(sourceInfo.root, { required: true });
    const stateRel = agent === 'codex' ? CODEX_STATE : '.github/vnpt-harness-state.json';
    const state = readManagedState(projectRoot, stateRel);
    const inventory = agent === 'codex'
      ? buildCodexInventory({ sourceRoot: sourceInfo.root, tempRoot, projectRoot })
      : buildCopilotInventory({ sourceRoot: sourceInfo.root, tempRoot, projectRoot });
    const { files, generatedHooks = {} } = inventory;
    const ops = buildReconcilePlan({
      files,
      managed: state.managed,
      patterns: manifest.protectedPatterns,
      projectRoot,
      force: args.force,
      forceNarrow: true,
      pruneMissingManaged: true
    });
    printSummary({ command: `migrate ${agent}`, projectRoot, statePath: state.path, sourceInfo, dryRun: args.dryRun, force: args.force, ops });
    const stateOps = ops.filter((op) => STATE_ACTIONS.has(op.action));
    const writeOps = ops.filter((op) => WRITE_ACTIONS.has(op.action));
    let backupDir = null;
    if (stateOps.length && !args.dryRun) {
      const backupTargets = agent === 'codex'
        ? [{ target: '.codex' }, { target: '.agents' }, { target: 'AGENTS.md' }]
        : [{ target: '.github' }];
      if (writeOps.length) backupDir = createBackup(projectRoot, backupTargets, manifest);
      const nextManaged = applyReconcilePlan(ops, state.managed, projectRoot);
      writeState({
        projectRoot,
        stateRel,
        manifest,
        managed: nextManaged,
        source: sourceInfo.source,
        version: sourceInfo.version,
        sourceInfo,
        cliVersion: packageInfo.version,
        ops
      });
    }
    if (agent === 'codex') {
      console.log('\n== Codex hooks ==');
      console.log(`Generated hook event groups: ${Object.values(generatedHooks).reduce((sum, groups) => sum + groups.length, 0)}`);
      console.log('Review project hooks in Codex with /hooks before relying on them.');
    } else {
      console.log('\n== Copilot ==');
      console.log('Generated GitHub Copilot instructions under .github/.');
    }
    console.log('\n== Backup ==');
    console.log(args.dryRun ? 'No backup created in dry-run mode.' : backupDir ? `Backup saved to: ${backupDir}` : 'No target content writes needed; state file updated.');
  } finally {
    sourceInfo.cleanup();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
