import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { confirm as clackConfirm, isCancel } from '@clack/prompts';

async function confirm(message) {
  const answer = await clackConfirm({ message, initialValue: false });
  return !isCancel(answer) && answer;
}

function scriptCommand(scriptPath) {
  if (scriptPath.endsWith('.ps1')) {
    return ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]];
  }
  return ['bash', [scriptPath]];
}

async function maybeRunSkillsInstall(ctx) {
  const relScript = ctx.manifest.postInstall?.skillsInstallScript;
  if (!relScript) return;

  const scriptPath = path.join(ctx.projectRoot, relScript);
  if (!fs.existsSync(scriptPath)) {
    console.log(`Optional skills installer not found: ${relScript}`);
    return;
  }

  console.log('\n== Optional dependencies ==');
  console.log(`Skills installer: ${scriptPath}`);
  console.log('Dependency scripts are not executed by default.');

  const shouldRun = ctx.args.installSkills
    ? Boolean(ctx.args.yes) || (await confirm('Execute the skills dependency installer now?'))
    : false;

  if (!shouldRun) {
    const [command, commandArgs] = scriptCommand(scriptPath);
    console.log(`Manual command: ${[command, ...commandArgs].join(' ')}`);
    return;
  }

  const [command, commandArgs] = scriptCommand(scriptPath);
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', cwd: path.dirname(scriptPath) });
  if (result.status !== 0) {
    throw new Error(`Skills dependency installer failed: ${scriptPath}`);
  }
}

export async function handlePostInstall(ctx) {
  console.log('\n== Backup ==');
  if (ctx.args.dryRun) {
    console.log('No backup created in dry-run mode.');
  } else if (ctx.backupDir) {
    console.log(`Backup saved to: ${ctx.backupDir}`);
  } else if (ctx.stateOps.length) {
    console.log('No target content writes needed; state file updated.');
  } else {
    console.log('No writes needed; no backup created.');
  }

  await maybeRunSkillsInstall(ctx);

  console.log('\n== Next steps ==');
  console.log('Run Claude from the target project and smoke: /ck:scout, /ck:plan, /ck:test, /ck:code-review --pending');
  console.log('Rerun `vnpt-harness init` to update project harness files.');
}
