import { resolveInitOptions } from './phases/options-resolver.mjs';
import { resolveInitSource } from './phases/source-handler.mjs';
import { applyInitMerge, planInitMerge } from './phases/merge-handler.mjs';
import { handlePostInstall } from './phases/post-install-handler.mjs';

export async function runInit(args, cli, invokedAs = 'init') {
  let ctx = { args, cli, invokedAs };
  try {
    ctx = resolveInitOptions(ctx);
    ctx = resolveInitSource(ctx);
    ctx = planInitMerge(ctx);
    ctx = await applyInitMerge(ctx);
    await handlePostInstall(ctx);
  } finally {
    ctx.sourceInfo?.cleanup?.();
  }
}
