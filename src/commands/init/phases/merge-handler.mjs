import { confirm as clackConfirm, isCancel } from '@clack/prompts';
import { applyReconcilePlan } from '../../../core/apply-plan.mjs';
import { createBackup } from '../../../core/backup-store.mjs';
import { existingManagedRoots, managedTargets, sourceFiles } from '../../../core/inventory.mjs';
import { printSummary } from '../../../core/output.mjs';
import { buildReconcilePlan, STATE_ACTIONS, WRITE_ACTIONS } from '../../../core/reconcile.mjs';
import { readManagedState, writeState } from '../../../core/state-store.mjs';

async function confirm(message) {
  const answer = await clackConfirm({ message, initialValue: false });
  return !isCancel(answer) && answer;
}

export function planInitMerge(ctx) {
  const targets = managedTargets(ctx.manifest, ctx.args);
  const files = sourceFiles(ctx.sourceInfo.root, ctx.projectRoot, targets, ctx.manifest.protectedPatterns);
  const state = readManagedState(ctx.projectRoot, ctx.manifest.stateFile);
  const roots = state.exists ? [] : existingManagedRoots(ctx.projectRoot, targets);
  const ops = buildReconcilePlan({
    files,
    managed: state.managed,
    patterns: ctx.manifest.protectedPatterns,
    metadata: ctx.metadata,
    projectRoot: ctx.projectRoot,
    fresh: ctx.args.fresh,
    overwrite: ctx.args.overwrite
  });

  return { ...ctx, targets, files, state, existingRoots: roots, ops };
}

export async function applyInitMerge(ctx) {
  printSummary({
    command: ctx.invokedAs,
    projectRoot: ctx.projectRoot,
    statePath: ctx.state.path,
    sourceInfo: ctx.sourceInfo,
    dryRun: ctx.args.dryRun,
    overwrite: ctx.args.overwrite,
    ops: ctx.ops
  });

  const stateOps = ctx.ops.filter((op) => STATE_ACTIONS.has(op.action));
  const writeOps = ctx.ops.filter((op) => WRITE_ACTIONS.has(op.action));

  if (ctx.args.fresh && !ctx.args.yes && !ctx.args.dryRun && !(await confirm('Fresh reinstall can remove clean VNPT-managed files after backup. Continue?'))) {
    throw new Error('Fresh reinstall cancelled');
  }

  if (!ctx.state.exists && ctx.existingRoots.length && stateOps.length && !ctx.args.yes && !ctx.args.dryRun) {
    console.log(`Existing managed target roots without VNPT state: ${ctx.existingRoots.join(', ')}`);
    if (!(await confirm('Adopt/copy VNPT-managed files and write new state?'))) {
      throw new Error('Install/adoption cancelled');
    }
  }

  let backupDir = null;
  if (stateOps.length && !ctx.args.dryRun) {
    if (writeOps.length) backupDir = createBackup(ctx.projectRoot, ctx.targets, ctx.manifest);
    const nextManaged = applyReconcilePlan(ctx.ops, ctx.state.managed, ctx.projectRoot);
    writeState({
      projectRoot: ctx.projectRoot,
      stateRel: ctx.manifest.stateFile,
      manifest: ctx.manifest,
      managed: nextManaged,
      source: ctx.sourceInfo.source,
      version: ctx.sourceInfo.version,
      sourceInfo: ctx.sourceInfo,
      cliVersion: ctx.packageInfo.version,
      ops: ctx.ops
    });
  }

  return { ...ctx, backupDir, stateOps };
}
