import { CONFLICT_ACTIONS } from './reconcile.mjs';

export function printSummary({ command, projectRoot, statePath, sourceInfo, dryRun, overwrite, force, ops }) {
  console.log('\n== Source ==');
  console.log(`Source: ${sourceInfo.displaySource}`);
  console.log(`Resolved: ${sourceInfo.root}`);
  console.log(`Version: ${sourceInfo.version}`);
  console.log('\n== Target ==');
  console.log(`Project: ${projectRoot}`);
  console.log(`State: ${statePath}`);
  console.log('\n== Mode ==');
  console.log(`Command: ${command}`);
  console.log(`Dry run: ${Boolean(dryRun)}`);
  console.log(`Overwrite conflicts: ${Boolean(overwrite)}`);
  if (force !== undefined) console.log(`Force: ${Boolean(force)}`);
  console.log('\n== Planned changes ==');
  const counts = new Map();
  for (const op of ops) counts.set(op.action, (counts.get(op.action) || 0) + 1);
  for (const [name, count] of [...counts].sort()) console.log(`${name}: ${count}`);
  const conflicts = ops.filter((op) => CONFLICT_ACTIONS.has(op.action));
  if (conflicts.length) {
    console.log('\n== Conflicts ==');
    for (const op of conflicts.slice(0, 20)) {
      console.log(`${op.action}: ${op.file.targetRel} - ${op.reason}`);
    }
    if (conflicts.length > 20) console.log(`... and ${conflicts.length - 20} more`);
  }
}
