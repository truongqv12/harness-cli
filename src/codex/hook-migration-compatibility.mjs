import path from 'node:path';
import { normalizeRel } from '../core/path-utils.mjs';

const GENERATED_CONTEXT_HOOK_BASENAMES = new Set([
  'cook-after-plan-reminder.cjs',
  'dev-rules-reminder.cjs',
  'plan-format-kanban.cjs',
  'session-init.cjs',
  'session-state.cjs',
  'subagent-init.cjs',
  'team-context-inject.cjs',
  'teammate-idle-handler.cjs',
  'usage-context-awareness.cjs'
]);

const CODEX_EXCLUDED_HOOK_BASENAMES = new Set([
  'team-context-inject.cjs',
  'teammate-idle-handler.cjs',
  'usage-context-awareness.cjs',
  'usage-quota-cache-refresh.cjs'
]);

export function extractClaudeHookScriptRel(command) {
  const text = String(command || '');
  const match = text.match(/\.claude[\\/]hooks[\\/]+([^"'\s`;&|)]+)/i);
  if (!match) return null;
  return normalizeRel(match[1]).replace(/[),;]+$/g, '');
}

export function isSafeHookRel(scriptRel) {
  const parts = normalizeRel(scriptRel).split('/');
  return Boolean(scriptRel) && !parts.includes('..') && !path.isAbsolute(scriptRel);
}

export function isCodexExcludedHook(scriptRel) {
  const basename = path.basename(normalizeRel(scriptRel));
  return GENERATED_CONTEXT_HOOK_BASENAMES.has(basename) || CODEX_EXCLUDED_HOOK_BASENAMES.has(basename);
}

export function hookCommandValues(hook) {
  return [hook?.command, hook?.commandWindows].filter((value) => typeof value === 'string');
}

export function referencesManagedHook(value) {
  const normalized = String(value || '').replace(/\\/g, '/');
  return normalized.includes('.codex/hooks/vnpt-managed/');
}

export function referencesExcludedHook(value) {
  const normalized = String(value || '').replace(/\\/g, '/');
  for (const name of [...GENERATED_CONTEXT_HOOK_BASENAMES, ...CODEX_EXCLUDED_HOOK_BASENAMES]) {
    if (normalized.includes(name)) return true;
  }
  return false;
}
