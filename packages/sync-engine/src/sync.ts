import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import {
  addIssueToProject,
  clearProjectItemFieldValue,
  createIssue,
  getProjectDates,
  getProjectIssueItems,
  getIssues,
  getProjectStatuses,
  getStatusOptionIds,
  setProjectItemDate,
  setProjectItemStatus,
  updateIssue
} from './github';
import { ensureDetailFile, parseTasksFile, writeBoard } from './markdown';
import {
  GitHubIssue,
  StatusReport,
  SyncConfig,
  SyncState,
  SyncStateEntry,
  SyncOptions,
  Task
} from './types';
import {
  firstCompletionStatus,
  getAllowedStatuses,
  isCompletionStatus,
  normalizeStatus,
  normalizeTaskCompletion,
  validateTaskStatuses
} from './statuses';
import { ensureDir, parseExternalIssueNumber, sha256, todayISO, unique } from './utils';

function resolveTasksFile(configPath: string, config: SyncConfig, options: SyncOptions): string {
  const dir = path.dirname(configPath);
  const tasksFile = options.tasksFileOverride || config.tasksFile;
  return path.resolve(dir, tasksFile);
}

function resolveSyncStatePath(tasksFilePath: string): string {
  return path.resolve(path.dirname(tasksFilePath), '.mapcs', 'state.json');
}

function resolveConflictsDir(tasksFilePath: string): string {
  return path.resolve(path.dirname(tasksFilePath), '.mapcs', 'conflicts');
}

function readDetailContent(task: Task, tasksFilePath: string): string {
  if (!task.detail) return '';
  const detailPath = path.resolve(path.dirname(tasksFilePath), task.detail);
  if (!fs.existsSync(detailPath)) return '';
  return fs.readFileSync(detailPath, 'utf8');
}

function readSyncState(tasksFilePath: string): SyncState {
  const statePath = resolveSyncStatePath(tasksFilePath);
  if (!fs.existsSync(statePath)) {
    return { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  }
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw) as SyncState;
    if (!parsed.entries) {
      return { version: 1, generatedAt: new Date().toISOString(), entries: {} };
    }
    return parsed;
  } catch {
    return { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  }
}

function writeSyncState(tasksFilePath: string, state: SyncState): void {
  const statePath = resolveSyncStatePath(tasksFilePath);
  ensureDir(path.dirname(statePath));
  state.generatedAt = new Date().toISOString();
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function makeStateEntry(task: Task, issue: GitHubIssue, tasksFilePath: string): SyncStateEntry {
  const detail = readDetailContent(task, tasksFilePath);
  return {
    taskId: task.id,
    externalId: task.externalId || `github:issue:${issue.number}`,
    issueNumber: issue.number,
    remoteUpdatedAt: issue.updated_at,
    remoteBodyHash: sha256(issue.body || ''),
    remoteBodyAtPull: issue.body || '',
    localDetailHashAtPull: sha256(detail),
    localDetailAtPull: detail,
    pulledAt: new Date().toISOString()
  };
}

function writeConflictFile(args: {
  tasksFilePath: string;
  task: Task;
  issue: GitHubIssue;
  stateEntry: SyncStateEntry;
  localDetailNow: string;
}): string {
  const { tasksFilePath, task, issue, stateEntry, localDetailNow } = args;
  const conflictsDir = resolveConflictsDir(tasksFilePath);
  ensureDir(conflictsDir);
  const filePath = path.resolve(conflictsDir, `${task.id}.reconcile.md`);
  const content = [
    `# Reconcile ${task.id}`,
    '',
    `- task: ${task.title}`,
    `- issue: #${issue.number}`,
    `- issueUrl: ${issue.html_url}`,
    `- generatedAt: ${new Date().toISOString()}`,
    '',
    '## BASE (at last pull)',
    '',
    '```md',
    stateEntry.localDetailAtPull || '(empty)',
    '```',
    '',
    '## LOCAL (current detail file)',
    '',
    '```md',
    localDetailNow || '(empty)',
    '```',
    '',
    '## REMOTE (current issue body)',
    '',
    '```md',
    issue.body || '(empty)',
    '```',
    '',
    '## Resolution',
    '',
    '- Keep local version: mapcs reconcile <task-id> --accept local',
    '- Keep remote version: mapcs reconcile <task-id> --accept remote',
    '- Then run: mapcs push',
    ''
  ].join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function extractRemoteDetailFromIssueBody(body: string | null): string {
  if (!body) return '';
  const marker = '\n## Detail\n';
  const idx = body.indexOf(marker);
  if (idx === -1) return body;
  const detail = body.slice(idx + marker.length).trim();
  return detail;
}

function buildIssueBody(task: Task, tasksFilePath: string): string {
  const lines: string[] = [];
  lines.push(`Synced from TASKS.md on ${todayISO()}.`);
  lines.push('');
  lines.push('## Task Metadata');
  lines.push(`- id: ${task.id}`);
  lines.push(`- status: ${task.status}`);
  if (task.type) lines.push(`- type: ${task.type}`);
  if (task.parent) lines.push(`- parent: ${task.parent}`);
  if (task.subIssueProgress) lines.push(`- subIssueProgress: ${task.subIssueProgress}`);
  if (task.priority) lines.push(`- priority: ${task.priority}`);
  if (task.workload) lines.push(`- workload: ${task.workload}`);
  if (task.dependsOn) lines.push(`- dependsOn: [${task.dependsOn.join(', ')}]`);
  if (task.start) lines.push(`- start: ${task.start}`);
  if (task.due) lines.push(`- due: ${task.due}`);
  lines.push(`- completed: ${task.completed ?? 'null'}`);
  if (task.detail) lines.push(`- detail: ${task.detail}`);

  if (!task.detail) {
    return `${lines.join('\n')}\n`;
  }

  const detailPath = path.resolve(path.dirname(tasksFilePath), task.detail);
  if (!fs.existsSync(detailPath)) {
    lines.push('');
    lines.push('## Detail');
    lines.push(`Detail file not found at: ${task.detail}`);
    return `${lines.join('\n')}\n`;
  }

  const detailContent = fs.readFileSync(detailPath, 'utf8').trim();
  lines.push('');
  lines.push('## Detail');
  lines.push('');
  lines.push(detailContent || '(empty detail file)');
  return `${lines.join('\n')}\n`;
}

function parseIssueMetadata(body: string | null): Record<string, string> {
  if (!body) return {};
  const marker = '## Task Metadata';
  const start = body.indexOf(marker);
  if (start === -1) return {};

  const lines = body.slice(start + marker.length).split(/\r?\n/);
  const out: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('## ')) break;
    const m = trimmed.match(/^-\s*([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim();
  }
  return out;
}

function labelSetFromTask(task: Task): string[] {
  const labels: string[] = [];
  if (task.type) labels.push(`type:${task.type}`);
  if (task.priority) labels.push(`priority:${task.priority}`);
  if (task.workload) labels.push(`workload:${task.workload.toLowerCase()}`);
  for (const tag of task.tags || []) labels.push(`tag:${tag}`);
  return unique(labels);
}

function applyLabelsToTask(task: Task, labels: string[]): void {
  const tags: string[] = [];
  for (const label of labels) {
    if (label.startsWith('type:')) {
      const t = label.slice('type:'.length);
      if (t === 'epic' || t === 'feature' || t === 'task' || t === 'bug' || t === 'chore') {
        task.type = t;
      }
      continue;
    }
    if (label.startsWith('priority:')) {
      const p = label.slice('priority:'.length);
      if (p === 'high' || p === 'medium' || p === 'low') task.priority = p;
      continue;
    }
    if (label.startsWith('workload:')) {
      const wRaw = label.slice('workload:'.length);
      const normalized = wRaw.toLowerCase();
      if (normalized === 'easy') task.workload = 'Easy';
      if (normalized === 'normal') task.workload = 'Normal';
      if (normalized === 'hard') task.workload = 'Hard';
      if (normalized === 'extreme') task.workload = 'Extreme';
      continue;
    }
    if (label.startsWith('tag:')) tags.push(label.slice('tag:'.length));
  }
  task.tags = unique(tags);
}

function parseIssueNumber(task: Task): number | null {
  return parseExternalIssueNumber(task.externalId);
}

function invertStatusMap(map: SyncConfig['statusMap']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [local, remote] of Object.entries(map)) {
    out[remote] = local;
  }
  return out;
}

function closedIssueFallbackStatus(config: SyncConfig, fallback: string): string {
  return firstCompletionStatus(config) || fallback;
}

function maybePrintJson(value: unknown, json?: boolean): boolean {
  if (!json) return false;
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  return true;
}

function requireGhProject(config: SyncConfig): boolean {
  return Boolean(config.projectId && config.statusFieldId);
}

function requireGhProjectItems(config: SyncConfig): boolean {
  return Boolean(config.projectId);
}

type SequenceStyle = {
  prefix: string;
  max: number;
  padWidth: number;
  count: number;
  firstSeenAt: number;
};

function parseSequencedTaskId(id: string): { prefix: string; number: number; padWidth: number } | null {
  const m = id.match(/^([A-Za-z][A-Za-z0-9]*)-(\d+)$/);
  if (!m) return null;
  return {
    prefix: m[1],
    number: Number(m[2]),
    padWidth: m[2].length
  };
}

function nextTaskId(existingIds: string[], preferredPrefix?: string): string {
  const stylesByPrefix = new Map<string, SequenceStyle>();

  for (let i = 0; i < existingIds.length; i++) {
    const parsed = parseSequencedTaskId(existingIds[i]);
    if (!parsed) continue;

    const existing = stylesByPrefix.get(parsed.prefix);
    if (!existing) {
      stylesByPrefix.set(parsed.prefix, {
        prefix: parsed.prefix,
        max: parsed.number,
        padWidth: parsed.padWidth,
        count: 1,
        firstSeenAt: i
      });
      continue;
    }

    existing.max = Math.max(existing.max, parsed.number);
    existing.padWidth = Math.max(existing.padWidth, parsed.padWidth);
    existing.count += 1;
  }

  const styles = Array.from(stylesByPrefix.values());
  if (preferredPrefix) {
    const preferredStyle = stylesByPrefix.get(preferredPrefix);
    if (!preferredStyle) {
      return `${preferredPrefix}-001`;
    }
    const next = String(preferredStyle.max + 1).padStart(Math.max(preferredStyle.padWidth, 3), '0');
    return `${preferredStyle.prefix}-${next}`;
  }

  if (styles.length === 0) {
    return 'T-001';
  }

  styles.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.firstSeenAt - b.firstSeenAt;
  });

  const style = styles[0];
  const next = String(style.max + 1).padStart(Math.max(style.padWidth, 3), '0');
  return `${style.prefix}-${next}`;
}

function buildStatusByIssue(config: SyncConfig): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of getProjectStatuses(config)) {
    map.set(row.issueNumber, row.statusName);
  }
  return map;
}

function buildDatesByIssue(config: SyncConfig): Map<number, { start?: string; due?: string; completed?: string }> {
  const map = new Map<number, { start?: string; due?: string; completed?: string }>();
  for (const row of getProjectDates(config)) {
    map.set(row.issueNumber, { start: row.start, due: row.due, completed: row.completed });
  }
  return map;
}

export function statusCommand(options: SyncOptions = {}): StatusReport {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);
  const board = parseTasksFile(tasksFilePath);
  validateTaskStatuses(board.tasks, config);
  const issues = getIssues(config);
  const issuesByNumber = new Map<number, GitHubIssue>(issues.map(i => [i.number, i]));

  const statusByIssue = requireGhProject(config) ? buildStatusByIssue(config) : new Map<number, string>();
  const remoteToLocal = invertStatusMap(config.statusMap);

  const linked = board.tasks.filter(t => parseIssueNumber(t) !== null);
  const missingRemoteForLinked: string[] = [];
  const divergedStatuses: Array<{ id: string; local: string; remote: string }> = [];

  for (const task of linked) {
    const issueNumber = parseIssueNumber(task);
    if (!issueNumber) continue;
    const issue = issuesByNumber.get(issueNumber);
    if (!issue) {
      missingRemoteForLinked.push(task.id);
      continue;
    }
    const remoteProjectStatus = statusByIssue.get(issueNumber);
    const remoteLocalStatus = remoteProjectStatus
      ? (remoteToLocal[remoteProjectStatus] || task.status)
      : (issue.state === 'closed' ? closedIssueFallbackStatus(config, task.status) : task.status);
    if (remoteLocalStatus !== task.status) {
      divergedStatuses.push({ id: task.id, local: task.status, remote: remoteLocalStatus });
    }
  }

  const linkedIssueNumbers = new Set(linked.map(t => parseIssueNumber(t)).filter(Boolean) as number[]);
  const remoteOnlyIssues = issues
    .filter(i => !linkedIssueNumbers.has(i.number))
    .map(i => i.number)
    .slice(0, 50);

  const report: StatusReport = {
    localTasks: board.tasks.length,
    linkedTasks: linked.length,
    unlinkedTasks: board.tasks.length - linked.length,
    remoteIssues: issues.length,
    missingRemoteForLinked,
    remoteOnlyIssues,
    divergedStatuses
  };

  if (!maybePrintJson(report, options.json)) {
    console.log(`Tasks file: ${tasksFilePath}`);
    console.log(`Local tasks: ${report.localTasks}`);
    console.log(`Linked tasks: ${report.linkedTasks}`);
    console.log(`Unlinked tasks: ${report.unlinkedTasks}`);
    console.log(`Remote issues: ${report.remoteIssues}`);
    console.log(`Missing remote for linked: ${report.missingRemoteForLinked.length}`);
    console.log(`Remote-only issues: ${report.remoteOnlyIssues.length}`);
    console.log(`Diverged statuses: ${report.divergedStatuses.length}`);
  }

  return report;
}

export function pullCommand(options: SyncOptions = {}): void {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);
  const board = parseTasksFile(tasksFilePath);
  validateTaskStatuses(board.tasks, config);
  const issues = getIssues(config);
  const issuesByNumber = new Map<number, GitHubIssue>(issues.map(i => [i.number, i]));

  const remoteToLocal = invertStatusMap(config.statusMap);
  const statusByIssue = requireGhProject(config) ? buildStatusByIssue(config) : new Map<number, string>();
  const datesByIssue = requireGhProjectItems(config) ? buildDatesByIssue(config) : new Map<number, { start?: string; due?: string; completed?: string }>();
  const state = readSyncState(tasksFilePath);

  let changed = 0;
  for (const task of board.tasks) {
    const issueNumber = parseIssueNumber(task);
    if (!issueNumber) continue;
    const issue = issuesByNumber.get(issueNumber);
    if (!issue) continue;

    const remoteStatusName = statusByIssue.get(issueNumber);
    const newStatus = remoteStatusName
      ? (remoteToLocal[remoteStatusName] || task.status)
      : (issue.state === 'closed' ? closedIssueFallbackStatus(config, task.status) : task.status);
    if (newStatus !== task.status) {
      task.status = newStatus;
      changed++;
    }

    applyLabelsToTask(task, issue.labels.map(l => l.name));
    const metadata = parseIssueMetadata(issue.body);
    if (metadata.type && (metadata.type === 'epic' || metadata.type === 'feature' || metadata.type === 'task' || metadata.type === 'bug' || metadata.type === 'chore')) {
      task.type = metadata.type;
    }
    task.parent = metadata.parent && metadata.parent !== 'null' ? metadata.parent : undefined;
    task.subIssueProgress = metadata.subIssueProgress && metadata.subIssueProgress !== 'null' ? metadata.subIssueProgress : undefined;

    const remoteDates = datesByIssue.get(issueNumber);
    if (remoteDates) {
      if (config.startDateFieldId) task.start = remoteDates.start;
      if (config.dueDateFieldId) task.due = remoteDates.due;
    }

    if (issue.milestone?.title) task.milestone = issue.milestone.title;
    if (isCompletionStatus(task.status, config)) {
      if (config.completedDateFieldId && remoteDates?.completed) {
        task.completed = remoteDates.completed;
      } else if (!task.completed && issue.closed_at) {
        task.completed = issue.closed_at.slice(0, 10);
      } else {
        normalizeTaskCompletion(task, config, todayISO());
      }
    } else {
      task.completed = null;
    }
    task.updated = todayISO();

    if (task.externalId) {
      state.entries[task.externalId] = makeStateEntry(task, issue, tasksFilePath);
    }
  }

  if (options.dryRun) {
    console.log(`[dry-run] pull would update ${changed} task status values.`);
    return;
  }

  writeBoard(tasksFilePath, board);
  writeSyncState(tasksFilePath, state);
  console.log(`pull completed. Updated tasks file: ${tasksFilePath}`);
}

export function pushCommand(options: SyncOptions = {}): void {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);
  const board = parseTasksFile(tasksFilePath);
  validateTaskStatuses(board.tasks, config);
  const issues = getIssues(config);
  const issuesByNumber = new Map<number, GitHubIssue>(issues.map(i => [i.number, i]));
  const state = readSyncState(tasksFilePath);

  const projectItemsEnabled = requireGhProjectItems(config);
  const projectStatusEnabled = requireGhProject(config);
  const statusOptionIds = projectStatusEnabled ? getStatusOptionIds(config) : {};
  const projectItems = projectItemsEnabled ? getProjectIssueItems(config) : [];
  const projectItemIdByIssue = new Map<number, string>(projectItems.map(i => [i.issueNumber, i.itemId]));

  let created = 0;
  let updated = 0;
  const conflicts: string[] = [];

  for (const task of board.tasks) {
    let issueNumber = parseIssueNumber(task);
    const labels = labelSetFromTask(task);
    const localDetailNow = readDetailContent(task, tasksFilePath);

    if (!issueNumber) {
      if (options.dryRun) {
        console.log(`[dry-run] create issue for ${task.id} (${task.title})`);
        created++;
      } else {
        const createdIssue = createIssue(config, {
          title: task.title,
          body: buildIssueBody(task, tasksFilePath),
          labels
        });
        issueNumber = createdIssue.number;
        task.externalId = `github:issue:${createdIssue.number}`;
        issuesByNumber.set(createdIssue.number, createdIssue);
        state.entries[task.externalId] = makeStateEntry(task, createdIssue, tasksFilePath);
        created++;
      }
    }

    if (!issueNumber) continue;

    const remoteIssue = issuesByNumber.get(issueNumber);
    let localDetailChangedFromBase = true;
    if (remoteIssue && task.externalId && !options.force) {
      const stateEntry = state.entries[task.externalId];
      if (!stateEntry) {
        conflicts.push(`Task ${task.id} has no local sync base. Run pull before push.`);
        continue;
      }
      const remoteBodyHashNow = sha256(remoteIssue.body || '');
      const remoteChanged = stateEntry.remoteUpdatedAt !== remoteIssue.updated_at || stateEntry.remoteBodyHash !== remoteBodyHashNow;
      const localChanged = stateEntry.localDetailHashAtPull !== sha256(localDetailNow);
      localDetailChangedFromBase = localChanged;

      if (remoteChanged && localChanged) {
        const conflictFile = writeConflictFile({
          tasksFilePath,
          task,
          issue: remoteIssue,
          stateEntry,
          localDetailNow
        });
        conflicts.push(`Task ${task.id} has concurrent detail edits. Reconcile: ${conflictFile}`);
        continue;
      }

      if (remoteChanged && !localChanged) {
        conflicts.push(`Task ${task.id} is outdated remotely. Run pull before push.`);
        continue;
      }
    }

    const issueState: 'open' | 'closed' = isCompletionStatus(task.status, config) ? 'closed' : 'open';
    if (options.dryRun) {
      console.log(`[dry-run] update issue #${issueNumber} from task ${task.id}`);
      if (!localDetailChangedFromBase) {
        console.log(`[dry-run] skip body update for ${task.id} (detail unchanged since last pull)`);
      }
      updated++;
    } else {
      const updatedIssue = updateIssue(config, issueNumber, {
        title: task.title,
        body: localDetailChangedFromBase ? buildIssueBody(task, tasksFilePath) : undefined,
        state: issueState,
        labels
      });
      issuesByNumber.set(issueNumber, updatedIssue);
      if (task.externalId) {
        state.entries[task.externalId] = makeStateEntry(task, updatedIssue, tasksFilePath);
      }
      updated++;
    }

    if (projectItemsEnabled) {
      const remoteStatusName = config.statusMap[task.status];
      const optionId = statusOptionIds[remoteStatusName];
      if (options.dryRun) {
        console.log(`[dry-run] ensure issue #${issueNumber} is in project`);
        if (projectStatusEnabled && optionId) {
          console.log(`[dry-run] set project status for issue #${issueNumber} -> ${remoteStatusName}`);
        } else if (projectStatusEnabled) {
          console.log(`[dry-run] no matching project status option for '${remoteStatusName}'`);
        }
        if (config.startDateFieldId) {
          console.log(task.start
            ? `[dry-run] set project start date for issue #${issueNumber} -> ${task.start}`
            : `[dry-run] clear project start date for issue #${issueNumber}`);
        }
        if (config.dueDateFieldId) {
          console.log(task.due
            ? `[dry-run] set project due date for issue #${issueNumber} -> ${task.due}`
            : `[dry-run] clear project due date for issue #${issueNumber}`);
        }
        if (config.completedDateFieldId) {
          const completedDate = isCompletionStatus(task.status, config) ? (task.completed || todayISO()) : null;
          console.log(completedDate
            ? `[dry-run] set project completed date for issue #${issueNumber} -> ${completedDate}`
            : `[dry-run] clear project completed date for issue #${issueNumber}`);
        }
      } else {
        let itemId = projectItemIdByIssue.get(issueNumber);
        if (!itemId) {
          const issueNodeId = issuesByNumber.get(issueNumber)?.node_id;
          if (issueNodeId) {
            itemId = addIssueToProject(config, issueNodeId);
            projectItemIdByIssue.set(issueNumber, itemId);
          }
        }
        if (itemId && projectStatusEnabled && optionId) {
          setProjectItemStatus(config, itemId, optionId);
        }
        if (itemId && config.startDateFieldId) {
          if (task.start) {
            setProjectItemDate(config, itemId, config.startDateFieldId, task.start);
          } else {
            clearProjectItemFieldValue(config, itemId, config.startDateFieldId);
          }
        }
        if (itemId && config.dueDateFieldId) {
          if (task.due) {
            setProjectItemDate(config, itemId, config.dueDateFieldId, task.due);
          } else {
            clearProjectItemFieldValue(config, itemId, config.dueDateFieldId);
          }
        }
        if (itemId && config.completedDateFieldId) {
          const completedDate = isCompletionStatus(task.status, config) ? (task.completed || todayISO()) : null;
          if (completedDate) {
            setProjectItemDate(config, itemId, config.completedDateFieldId, completedDate);
          } else {
            clearProjectItemFieldValue(config, itemId, config.completedDateFieldId);
          }
        }
      }
    }

    task.updated = todayISO();
    normalizeTaskCompletion(task, config, todayISO());
  }

  if (conflicts.length > 0) {
    const hint = options.force
      ? 'Conflicts detected even with force flow. Resolve local reconciliation files first.'
      : 'Push blocked to avoid data loss. Run pull or reconcile conflict files, then push again. Use --force to override.';
    throw new Error(`${conflicts.join('\n')}\n${hint}`);
  }

  if (options.dryRun) {
    console.log(`[dry-run] push summary: create=${created}, update=${updated}`);
    return;
  }

  writeBoard(tasksFilePath, board);
  writeSyncState(tasksFilePath, state);
  console.log(`push completed. Created ${created}, updated ${updated}.`);
}

export function bootstrapCommand(from: 'local' | 'github', options: SyncOptions = {}): void {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);
  const requireConfirm = Boolean(config.bootstrap?.requireConfirmFlag);
  if (!options.dryRun && requireConfirm && !options.confirm) {
    throw new Error('Bootstrap requires --confirm by config policy.');
  }

  if (from === 'local') {
    pushCommand(options);
    if (!options.dryRun) {
      const board = parseTasksFile(tasksFilePath);
      if (config.bootstrap?.createMissingDetailFiles) {
        for (const task of board.tasks) ensureDetailFile(tasksFilePath, task);
      }
      writeBoard(tasksFilePath, board);
    }
    return;
  }

  const issues = getIssues(config);
  const board = parseTasksFile(tasksFilePath);
  validateTaskStatuses(board.tasks, config);
  const byExternal = new Map(board.tasks.map(t => [t.externalId, t]));
  const existingIds = board.tasks.map(t => t.id);
  const statusByIssue = requireGhProject(config) ? buildStatusByIssue(config) : new Map<number, string>();
  const remoteToLocal = invertStatusMap(config.statusMap);
  const defaultStatus = normalizeStatus(config.bootstrap?.defaultStatusForImportedIssues) || getAllowedStatuses(config)[0];

  let createdLocal = 0;
  let updatedLocal = 0;

  for (const issue of issues) {
    const externalId = `github:issue:${issue.number}`;
    let task = byExternal.get(externalId);
    const remoteStatusName = statusByIssue.get(issue.number);
    const localStatus = remoteStatusName
      ? (remoteToLocal[remoteStatusName] || defaultStatus)
      : (issue.state === 'closed' ? closedIssueFallbackStatus(config, defaultStatus) : defaultStatus);

      if (!task) {
      const newId = nextTaskId(existingIds, config.idGeneration?.preferredPrefix);
      existingIds.push(newId);
        task = {
          id: newId,
          title: `[${newId}] ${issue.title}`,
          status: localStatus,
          type: undefined,
          parent: undefined,
          subIssueProgress: undefined,
          completed: null,
          externalId,
          updated: todayISO(),
          detail: `./tasks/${newId}.md`
        };
        applyLabelsToTask(task, issue.labels.map(l => l.name));
        const metadata = parseIssueMetadata(issue.body);
        if (metadata.type && (metadata.type === 'epic' || metadata.type === 'feature' || metadata.type === 'task' || metadata.type === 'bug' || metadata.type === 'chore')) {
          task.type = metadata.type;
        }
        task.parent = metadata.parent && metadata.parent !== 'null' ? metadata.parent : undefined;
        task.subIssueProgress = metadata.subIssueProgress && metadata.subIssueProgress !== 'null' ? metadata.subIssueProgress : undefined;
        normalizeTaskCompletion(task, config, issue.closed_at ? issue.closed_at.slice(0, 10) : todayISO());
      board.tasks.push(task);
      byExternal.set(externalId, task);
      createdLocal++;
      } else {
        task.title = task.title || issue.title;
        task.status = localStatus;
        applyLabelsToTask(task, issue.labels.map(l => l.name));
        const metadata = parseIssueMetadata(issue.body);
        if (metadata.type && (metadata.type === 'epic' || metadata.type === 'feature' || metadata.type === 'task' || metadata.type === 'bug' || metadata.type === 'chore')) {
          task.type = metadata.type;
        }
        task.parent = metadata.parent && metadata.parent !== 'null' ? metadata.parent : undefined;
        task.subIssueProgress = metadata.subIssueProgress && metadata.subIssueProgress !== 'null' ? metadata.subIssueProgress : undefined;
        normalizeTaskCompletion(task, config, issue.closed_at ? issue.closed_at.slice(0, 10) : todayISO());
      task.updated = todayISO();
      updatedLocal++;
    }
  }

  if (options.dryRun) {
    console.log(`[dry-run] bootstrap --from github would create ${createdLocal} and update ${updatedLocal} local tasks.`);
    return;
  }

  if (config.bootstrap?.createMissingDetailFiles) {
    for (const task of board.tasks) ensureDetailFile(tasksFilePath, task);
  }
  writeBoard(tasksFilePath, board);
  console.log(`bootstrap --from github completed. Created ${createdLocal}, updated ${updatedLocal}.`);
}

export function reconcileCommand(taskId: string, options: SyncOptions = {}): void {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);
  const board = parseTasksFile(tasksFilePath);
  validateTaskStatuses(board.tasks, config);
  const state = readSyncState(tasksFilePath);
  const issues = getIssues(config);
  const issuesByNumber = new Map<number, GitHubIssue>(issues.map(i => [i.number, i]));

  const task = board.tasks.find(t => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  if (!task.externalId) {
    throw new Error(`Task ${taskId} is not linked (externalId is null).`);
  }

  const issueNumber = parseIssueNumber(task);
  if (!issueNumber) {
    throw new Error(`Task ${taskId} externalId is not a GitHub issue id.`);
  }
  const issue = issuesByNumber.get(issueNumber);
  if (!issue) {
    throw new Error(`Remote issue not found for ${taskId} (#${issueNumber}).`);
  }

  const entry = state.entries[task.externalId];
  if (!entry) {
    throw new Error(`No sync baseline found for ${taskId}. Run pull first.`);
  }

  const localDetailNow = readDetailContent(task, tasksFilePath);
  const conflictPath = writeConflictFile({
    tasksFilePath,
    task,
    issue,
    stateEntry: entry,
    localDetailNow
  });

  if (!options.accept) {
    console.log(`reconcile file generated: ${conflictPath}`);
    return;
  }

  const remoteDetail = extractRemoteDetailFromIssueBody(issue.body);
  const detailPath = task.detail
    ? path.resolve(path.dirname(tasksFilePath), task.detail)
    : null;

  if (options.accept === 'remote') {
    if (detailPath) {
      ensureDir(path.dirname(detailPath));
      fs.writeFileSync(detailPath, remoteDetail, 'utf8');
    }
    entry.localDetailAtPull = remoteDetail;
    entry.localDetailHashAtPull = sha256(remoteDetail);
  } else {
    entry.localDetailAtPull = remoteDetail;
    entry.localDetailHashAtPull = sha256(remoteDetail);
  }

  entry.remoteUpdatedAt = issue.updated_at;
  entry.remoteBodyAtPull = issue.body || '';
  entry.remoteBodyHash = sha256(issue.body || '');
  entry.pulledAt = new Date().toISOString();

  writeSyncState(tasksFilePath, state);

  if (fs.existsSync(conflictPath)) {
    fs.unlinkSync(conflictPath);
  }

  console.log(`reconcile resolved for ${taskId} using '${options.accept}'.`);
  console.log('Run mapcs push to apply final state.');
}

export function listConflictsCommand(options: SyncOptions = {}): void {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);
  const conflictsDir = resolveConflictsDir(tasksFilePath);

  if (!fs.existsSync(conflictsDir)) {
    if (options.json) {
      process.stdout.write('[]\n');
    } else {
      console.log('No pending reconcile conflicts.');
    }
    return;
  }

  const files = fs
    .readdirSync(conflictsDir)
    .filter(name => name.endsWith('.reconcile.md'))
    .sort();

  if (options.json) {
    process.stdout.write(`${JSON.stringify(files, null, 2)}\n`);
    return;
  }

  if (files.length === 0) {
    console.log('No pending reconcile conflicts.');
    return;
  }

  console.log('Pending reconcile conflicts:');
  for (const file of files) {
    console.log(`- ${path.resolve(conflictsDir, file)}`);
  }
}
