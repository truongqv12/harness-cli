import fs from 'node:fs';
import path from 'node:path';
import { convertAgentFile } from './agent-toml-converter.mjs';
import { mergeAgentsMd } from './agents-md-merger.mjs';
import { SUPPORTED_CODEX_HOOK_EVENTS } from './hook-capabilities.mjs';
import { extractClaudeHookScriptRel, isCodexExcludedHook, isSafeHookRel } from './hook-migration-compatibility.mjs';
import { wrapperName, wrapperSource } from './hook-wrapper-generator.mjs';
import { mergeHooksJson } from './hooks-json-merger.mjs';
import { sha256File } from '../core/hash.mjs';
import { copyFile, ensureInside, joinRel, normalizeRel, walkFiles } from '../core/path-utils.mjs';

const HOOK_COMPANION_SKIP_DIRS = new Set(['__tests__', 'tests', '.logs', 'docs']);
const HOOK_COMPANION_DOTFILES = new Set(['.ckignore']);

function pushTemp(files, tempRoot, targetRel, content, merge = false) {
  const sourcePath = path.join(tempRoot, targetRel);
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, content, 'utf8');
  files.push({ sourcePath, targetRel, sourceHash: sha256File(sourcePath), merge });
}

function pushCopiedFile(files, tempRoot, sourcePath, targetRel) {
  const tempPath = path.join(tempRoot, targetRel);
  copyFile(sourcePath, tempPath);
  files.push({ sourcePath: tempPath, targetRel, sourceHash: sha256File(tempPath) });
}

function copyTree(files, sourceDir, tempRoot, targetBase) {
  if (!fs.existsSync(sourceDir)) return;
  for (const sourcePath of walkFiles(sourceDir)) {
    const rel = normalizeRel(path.relative(sourceDir, sourcePath));
    pushCopiedFile(files, tempRoot, sourcePath, joinRel(targetBase, rel));
  }
}

function copyHookFile(files, sourceHooksDir, tempRoot, scriptRel, copied) {
  if (copied.has(scriptRel)) return true;
  const sourcePath = path.join(sourceHooksDir, scriptRel);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return false;
  pushCopiedFile(files, tempRoot, sourcePath, joinRel('.codex/hooks/claude', scriptRel));
  copied.add(scriptRel);
  return true;
}

function copyHookCompanions(files, sourceRoot, tempRoot) {
  const claudeRoot = path.join(sourceRoot, 'claude');
  const sourceHooksDir = path.join(claudeRoot, 'hooks');
  if (!fs.existsSync(sourceHooksDir)) return;
  for (const item of fs.readdirSync(sourceHooksDir, { withFileTypes: true })) {
    if (!item.isDirectory() || item.name.startsWith('.') || HOOK_COMPANION_SKIP_DIRS.has(item.name)) continue;
    copyTree(files, path.join(sourceHooksDir, item.name), tempRoot, joinRel('.codex/hooks/claude', item.name));
  }
  for (const dotfile of HOOK_COMPANION_DOTFILES) {
    const sourcePath = path.join(claudeRoot, dotfile);
    if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile()) {
      pushCopiedFile(files, tempRoot, sourcePath, joinRel('.codex', dotfile));
    }
  }
}

function buildHooks(files, sourceRoot, tempRoot, projectRoot) {
  const settingsPath = path.join(sourceRoot, 'claude', 'settings.json');
  const sourceHooksDir = path.join(sourceRoot, 'claude', 'hooks');
  if (!fs.existsSync(settingsPath)) return [];
  const generated = {};
  const copiedHooks = new Set();
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  for (const [event, groups] of Object.entries(settings.hooks || {})) {
    if (!SUPPORTED_CODEX_HOOK_EVENTS.has(event)) continue;
    const eventGroups = [];
    (Array.isArray(groups) ? groups : []).forEach((group, groupIndex) => {
      const handlers = [];
      (group.hooks || []).forEach((hook, hookIndex) => {
        if (hook.type !== 'command') return;
        const scriptRel = extractClaudeHookScriptRel(hook.command);
        if (!scriptRel || !isSafeHookRel(scriptRel) || isCodexExcludedHook(scriptRel)) return;
        if (!copyHookFile(files, sourceHooksDir, tempRoot, scriptRel, copiedHooks)) return;
        const name = wrapperName(event, groupIndex, hookIndex, scriptRel);
        pushTemp(files, tempRoot, `.codex/hooks/vnpt-managed/${name}`, wrapperSource({ event, scriptRel }));
        handlers.push({
          type: 'command',
          command: `root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; node "$root/.codex/hooks/vnpt-managed/${name}"`,
          commandWindows: `powershell -NoProfile -ExecutionPolicy Bypass -Command "$r=(git rev-parse --show-toplevel 2>$null); if (-not $r) { $r=(Get-Location).Path }; node (Join-Path $r '.codex/hooks/vnpt-managed/${name}')"`,
          statusMessage: hook.statusMessage || `VNPT ${event} hook`
        });
      });
      if (handlers.length) eventGroups.push({ ...(group.matcher ? { matcher: group.matcher } : {}), hooks: handlers });
    });
    if (eventGroups.length) generated[event] = eventGroups;
  }
  if (copiedHooks.size) copyHookCompanions(files, sourceRoot, tempRoot);
  const hooksPath = path.join(projectRoot, '.codex', 'hooks.json');
  pushTemp(files, tempRoot, '.codex/hooks.json', mergeHooksJson(hooksPath, generated), true);
  return generated;
}

export function buildCodexInventory({ sourceRoot, tempRoot, projectRoot }) {
  const files = [];
  const agentsDir = path.join(sourceRoot, 'claude', 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const file of fs.readdirSync(agentsDir).filter((name) => name.endsWith('.md')).sort()) {
      const converted = convertAgentFile(path.join(agentsDir, file));
      pushTemp(files, tempRoot, `.codex/agents/${converted.name}.toml`, converted.content);
    }
  }
  copyTree(files, path.join(sourceRoot, 'claude', 'skills'), tempRoot, '.agents/skills');
  pushTemp(files, tempRoot, 'AGENTS.md', mergeAgentsMd(sourceRoot, path.join(projectRoot, 'AGENTS.md')), true);
  const generatedHooks = buildHooks(files, sourceRoot, tempRoot, projectRoot);
  return {
    files: files.map((file) => ({ ...file, targetPath: ensureInside(projectRoot, path.join(projectRoot, file.targetRel)) })),
    generatedHooks
  };
}
