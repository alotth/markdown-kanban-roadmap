import * as fs from 'fs';
import * as path from 'path';
import { SyncConfig, SyncOptions } from './types';
import {
  getAllowedStatuses,
  getCompletionStatuses,
  normalizeStatus,
  normalizeStatusMap,
  validateStatusConfig
} from './statuses';

export function loadConfig(options: SyncOptions = {}): { config: SyncConfig; configPath: string } {
  const cwd = process.cwd();
  const configPath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : path.resolve(cwd, 'mapcs.config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}. Create mapcs.config.json from mapcs.config.example.json.`);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as SyncConfig;

  if (!parsed.owner || !parsed.repo) {
    throw new Error('Config must include owner and repo.');
  }
  if (!parsed.tasksFile) {
    parsed.tasksFile = './TASKS.md';
  }
  if (!parsed.statusMap) {
    throw new Error('Config must include statusMap.');
  }

  parsed.statusMap = normalizeStatusMap(parsed.statusMap);
  parsed.allowedStatuses = getAllowedStatuses(parsed);
  parsed.completionStatuses = getCompletionStatuses(parsed);

  if (parsed.bootstrap?.defaultStatusForImportedIssues) {
    parsed.bootstrap.defaultStatusForImportedIssues = normalizeStatus(parsed.bootstrap.defaultStatusForImportedIssues);
  }

  if (parsed.idGeneration?.preferredPrefix !== undefined) {
    parsed.idGeneration.preferredPrefix = String(parsed.idGeneration.preferredPrefix).trim();
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(parsed.idGeneration.preferredPrefix)) {
      throw new Error('idGeneration.preferredPrefix must match /^[A-Za-z][A-Za-z0-9]*$/.');
    }
  }

  validateStatusConfig(parsed);

  return { config: parsed, configPath };
}
