import fs from 'node:fs';

export function mergeHooksJson(existingPath, generatedHooks) {
  const current = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, 'utf8')) : {};
  const hooks = current.hooks && typeof current.hooks === 'object' ? current.hooks : {};
  const next = {};
  for (const [event, groups] of Object.entries(hooks)) {
    next[event] = groups
      .map((group) => ({
        ...group,
        hooks: (group.hooks || []).filter((hook) => !String(hook.command || hook.commandWindows || '').includes('.codex/hooks/vnpt-managed/'))
      }))
      .filter((group) => group.hooks.length);
  }
  for (const [event, groups] of Object.entries(generatedHooks)) {
    next[event] = [...(next[event] || []), ...groups];
  }
  return `${JSON.stringify({ ...current, hooks: next }, null, 2)}\n`;
}
