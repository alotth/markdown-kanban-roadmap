import { SyncConfig, Task } from './types';

export const DEFAULT_ALLOWED_STATUSES = ['backlog', 'ready-for-do', 'doing', 'review', 'done', 'paused'];
export const DEFAULT_COMPLETION_STATUSES = ['done'];

export function normalizeStatus(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeStatusList(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeStatus(value);
    if (!normalized || out.includes(normalized)) continue;
    out.push(normalized);
  }
  return out;
}

export function getAllowedStatuses(config: SyncConfig): string[] {
  if (!config.allowedStatuses) return [...DEFAULT_ALLOWED_STATUSES];
  return normalizeStatusList(config.allowedStatuses);
}

export function getCompletionStatuses(config: SyncConfig): string[] {
  if (!config.completionStatuses) return [...DEFAULT_COMPLETION_STATUSES];
  return normalizeStatusList(config.completionStatuses);
}

export function firstCompletionStatus(config: SyncConfig): string | null {
  const completion = getCompletionStatuses(config);
  return completion.length > 0 ? completion[0] : null;
}

export function isCompletionStatus(status: string, config: SyncConfig): boolean {
  const completion = new Set(getCompletionStatuses(config));
  return completion.has(normalizeStatus(status));
}

export function normalizeStatusMap(statusMap: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [localStatus, remoteStatus] of Object.entries(statusMap)) {
    const key = normalizeStatus(localStatus);
    if (!key) continue;
    normalized[key] = remoteStatus;
  }
  return normalized;
}

export function validateStatusConfig(config: SyncConfig): void {
  const allowedStatuses = getAllowedStatuses(config);
  const completionStatuses = getCompletionStatuses(config);
  const allowedSet = new Set(allowedStatuses);

  const errors: string[] = [];
  if (allowedStatuses.length === 0) {
    errors.push('allowedStatuses must include at least one status.');
  }

  const missingInStatusMap = allowedStatuses.filter(status => !Object.prototype.hasOwnProperty.call(config.statusMap, status));
  if (missingInStatusMap.length > 0) {
    errors.push(`statusMap is missing allowed statuses: ${missingInStatusMap.join(', ')}`);
  }

  const invalidCompletionStatuses = completionStatuses.filter(status => !allowedSet.has(status));
  if (invalidCompletionStatuses.length > 0) {
    errors.push(`completionStatuses must be a subset of allowedStatuses. Invalid values: ${invalidCompletionStatuses.join(', ')}`);
  }

  const bootstrapDefaultStatus = normalizeStatus(config.bootstrap?.defaultStatusForImportedIssues);
  if (bootstrapDefaultStatus && !allowedSet.has(bootstrapDefaultStatus)) {
    errors.push(`bootstrap.defaultStatusForImportedIssues is not in allowedStatuses: ${bootstrapDefaultStatus}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid status configuration:\n- ${errors.join('\n- ')}`);
  }
}

export function validateTaskStatuses(tasks: Task[], config: SyncConfig): void {
  const allowedSet = new Set(getAllowedStatuses(config));
  const invalidStatuses = tasks
    .map(task => normalizeStatus(task.status))
    .filter(status => !allowedSet.has(status));

  if (invalidStatuses.length > 0) {
    const uniqueInvalid = Array.from(new Set(invalidStatuses));
    throw new Error(`TASKS.md contains invalid statuses: ${uniqueInvalid.join(', ')}. allowedStatuses: ${Array.from(allowedSet).join(', ')}`);
  }
}

export function normalizeTaskCompletion(task: Task, config: SyncConfig, fallbackDate: string): void {
  if (isCompletionStatus(task.status, config)) {
    task.completed = task.completed || fallbackDate;
    return;
  }
  task.completed = null;
}
