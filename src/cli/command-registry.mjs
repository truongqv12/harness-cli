export const COMMANDS = {
  init: {
    description: 'Install or update harness files in the current project'
  },
  install: {
    description: 'Compatibility alias for init',
    aliasFor: 'init'
  },
  update: {
    description: 'Update the vnpt-harness CLI package'
  },
  migrate: {
    description: 'Migrate installed harness assets for another agent'
  },
  doctor: {
    description: 'Check local CLI, provider, and project state health'
  },
  version: {
    description: 'Print CLI version'
  },
  config: {
    description: 'Read or write user/project CLI configuration'
  },
  help: {
    description: 'Show command help'
  }
};

export function hasCommand(name) {
  return Object.prototype.hasOwnProperty.call(COMMANDS, name);
}

export function formatHelp() {
  const lines = [
    'vnpt-harness',
    '',
    'Usage:',
    '  vnpt-harness init [--source <path|git-url|gitlab:host/group/project|gitlab:https://host/group/project>] [--archive <tar.gz>] [--release <ref>] [--dir <dir>] [--yes]',
    '  vnpt-harness install [options]       # compatibility alias for init',
    '  vnpt-harness update [--check|--dry-run|--release <ref>|--source <npm|git>]',
    '  vnpt-harness migrate --agent codex [options]',
    '',
    'Commands:'
  ];

  for (const [name, command] of Object.entries(COMMANDS)) {
    if (name === 'help') continue;
    lines.push(`  ${name.padEnd(8)} ${command.description}`);
  }

  return `${lines.join('\n')}\n`;
}
