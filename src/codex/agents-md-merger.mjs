import fs from 'node:fs';
import path from 'node:path';

const START = '<!-- VNPT_HARNESS_AGENTS_START -->';
const END = '<!-- VNPT_HARNESS_AGENTS_END -->';

function rulesBlock(sourceRoot) {
  const rulesDir = path.join(sourceRoot, 'claude', 'rules');
  const files = fs.existsSync(rulesDir)
    ? fs.readdirSync(rulesDir).filter((name) => name.endsWith('.md')).sort()
    : [];
  const parts = files.map((name) => {
    const title = name.replace(/\.md$/, '');
    return `## Rule: ${title}\n\n${fs.readFileSync(path.join(rulesDir, name), 'utf8').trim()}`;
  });
  return `${START}\n# VNPT IT Harness Instructions\n\n${parts.join('\n\n---\n\n')}\n${END}`;
}

export function mergeAgentsMd(sourceRoot, targetPath) {
  const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8').trimEnd() : '';
  const block = rulesBlock(sourceRoot);
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`, 'm');
  if (pattern.test(current)) return `${current.replace(pattern, block)}\n`;
  return `${current ? `${current}\n\n` : ''}${block}\n`;
}
