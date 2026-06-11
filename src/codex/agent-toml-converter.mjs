import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter, slugName } from './frontmatter.mjs';

function tomlString(value) {
  return `"""${String(value || '').replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}"""`;
}

export function convertAgentFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const { data, body } = parseFrontmatter(source);
  const name = slugName(data.name || path.basename(filePath, '.md'));
  const description = data.description || `${name} VNPT harness agent.`;
  const lines = [
    `name = "${name}"`,
    `description = ${tomlString(description)}`,
    'sandbox_mode = "workspace-write"',
    `developer_instructions = ${tomlString(body)}`
  ];
  return { name, content: `${lines.join('\n')}\n` };
}
