import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson } from './path-utils.mjs';

export function userConfigPath(env = process.env) {
  return env.VNPT_HARNESS_CONFIG || path.join(os.homedir(), '.vnpt-harness', 'config.json');
}

export function projectConfigPath(projectRoot = process.cwd()) {
  return path.join(projectRoot, '.vnpt-harness', 'config.json');
}

export function readConfigFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return readJson(filePath);
}

export function writeConfigFile(filePath, config) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`);
}

export function loadConfig(projectRoot = process.cwd(), env = process.env) {
  return {
    ...readConfigFile(userConfigPath(env)),
    ...readConfigFile(projectConfigPath(projectRoot))
  };
}
