import { projectConfigPath, readConfigFile, userConfigPath, writeConfigFile } from '../core/config-store.mjs';

function scopePath(args) {
  return args.project ? projectConfigPath(process.cwd()) : userConfigPath();
}

export function runConfig(args) {
  const [action = 'path', key, value] = args._;
  const filePath = scopePath(args);
  const config = readConfigFile(filePath);

  if (action === 'path') {
    console.log(filePath);
    return;
  }

  if (action === 'list') {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (action === 'get') {
    if (!key) throw new Error('config get requires a key');
    if (config[key] !== undefined) console.log(config[key]);
    return;
  }

  if (action === 'set') {
    if (!key || value === undefined) throw new Error('config set requires a key and value');
    config[key] = value;
    writeConfigFile(filePath, config);
    console.log(`Set ${key} in ${filePath}`);
    return;
  }

  if (action === 'unset') {
    if (!key) throw new Error('config unset requires a key');
    delete config[key];
    writeConfigFile(filePath, config);
    console.log(`Unset ${key} in ${filePath}`);
    return;
  }

  throw new Error(`Unknown config action: ${action}`);
}
