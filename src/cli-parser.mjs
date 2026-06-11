import { hasCommand } from './cli/command-registry.mjs';

const BOOLEAN_FLAGS = new Set([
  'check',
  'dryRun',
  'fresh',
  'force',
  'help',
  'installSkills',
  'noDocs',
  'noPlanTemplates',
  'overwrite',
  'yes'
]);

const SHORT_FLAGS = {
  d: 'directory',
  f: 'force',
  r: 'release',
  y: 'yes'
};

function toKey(flag) {
  return flag.replace(/^-+/, '').replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

function normalizeShortKey(token) {
  const raw = toKey(token).charAt(0).toLowerCase();
  return SHORT_FLAGS[raw] || raw;
}

export function parseCli(argv) {
  const args = { _: [] };
  const tokens = [...argv];
  if (tokens[0] === '--help' || tokens[0] === '-h') return { command: 'help', args };
  if (tokens[0] === '--version' || tokens[0] === '-v') return { command: 'version', args };
  let command = hasCommand(tokens[0]) ? tokens.shift() : 'init';
  if (command === 'help' || args.help) return { command: 'help', args };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '-f') {
      args.force = true;
    } else if (token.startsWith('--')) {
      const [rawKey, inlineValue] = token.split('=', 2);
      const key = toKey(rawKey);
      const next = tokens[i + 1];
      if (inlineValue !== undefined) {
        args[key] = inlineValue;
      } else if (next && !next.startsWith('-') && !BOOLEAN_FLAGS.has(key)) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else if (token.startsWith('-')) {
      const key = normalizeShortKey(token);
      const next = tokens[i + 1];
      if (next && !next.startsWith('-')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(token);
    }
  }
  if (args.dir && !args.directory) args.directory = args.dir;
  if (args.dryrun && !args.dryRun) args.dryRun = args.dryrun;
  if (args.kitpath && !args.kitPath) args.kitPath = args.kitpath;
  if (args.release && !args.version) args.version = args.release;
  if (args.ref && !args.version) args.version = args.ref;
  if (args.help) command = 'help';
  return { command, args };
}
