import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from '../core/hash.mjs';
import { ensureInside } from '../core/path-utils.mjs';

const START = '<!-- VNPT-HARNESS:START -->';
const END = '<!-- VNPT-HARNESS:END -->';

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function managedBlock() {
  return [
    START,
    'Use VNPT IT Harness rules when working in this repository.',
    '',
    '- Follow YAGNI, KISS, and DRY.',
    '- Prefer current repository patterns over new abstractions.',
    '- Do not commit secrets, tokens, private URLs, or local machine paths.',
    '- Keep implementation, tests, docs, and rollout notes aligned.',
    '- For harness updates, prefer `vnpt-harness init`; `install` is compatibility only.',
    END
  ].join('\n');
}

function mergeManagedBlock(existing) {
  const block = managedBlock();
  if (!existing.trim()) return `${block}\n`;
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  if (start >= 0 && end > start) {
    return `${existing.slice(0, start).trimEnd()}\n\n${block}\n${existing.slice(end + END.length).trimStart()}`;
  }
  return `${existing.trimEnd()}\n\n${block}\n`;
}

function writeTemp(files, tempRoot, targetRel, content, merge = false) {
  const sourcePath = path.join(tempRoot, targetRel);
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, content, 'utf8');
  files.push({ sourcePath, targetRel, sourceHash: sha256File(sourcePath), merge });
}

export function buildCopilotInventory({ tempRoot, projectRoot }) {
  const files = [];
  const instructionsPath = path.join(projectRoot, '.github', 'copilot-instructions.md');
  writeTemp(files, tempRoot, '.github/copilot-instructions.md', mergeManagedBlock(readIfExists(instructionsPath)), true);
  writeTemp(
    files,
    tempRoot,
    '.github/instructions/vnpt-harness.instructions.md',
    ['---', 'applyTo: "**"', '---', '', managedBlock(), ''].join('\n')
  );
  return {
    files: files.map((file) => ({ ...file, targetPath: ensureInside(projectRoot, path.join(projectRoot, file.targetRel)) }))
  };
}
