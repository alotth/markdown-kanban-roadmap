import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { parseTasksFile } from './markdown';
import { getCompletionStatuses, normalizeStatus } from './statuses';
import { SyncConfig, SyncOptions, Task } from './types';

const REQUIRED_KEYS = [
  'id',
  'status',
  'type',
  'parent',
  'subIssueProgress',
  'priority',
  'workload',
  'tags',
  'domains',
  'dependsOn',
  'start',
  'due',
  'completed',
  'externalId',
  'updated',
  'detail'
] as const;

const OPTIONAL_KEYS = ['iteration', 'assignees', 'externalLinks', 'milestone', 'specMode'] as const;

const REQUIRED_KEY_SET = new Set<string>(REQUIRED_KEYS);
const OPTIONAL_KEY_SET = new Set<string>(OPTIONAL_KEYS);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Severity = 'error' | 'warning';

type Issue = {
  severity: Severity;
  code: string;
  message: string;
  taskId?: string;
  line?: number;
};

type TaskBlock = {
  heading: string;
  headingLine: number;
  keys: string[];
  keyLineByName: Record<string, number>;
  id?: string;
};

export type ValidateReport = {
  tasksFilePath: string;
  totalTasks: number;
  errors: number;
  warnings: number;
  issues: Issue[];
};

type PlanTask = {
  id: string;
  title: string;
  status: string;
  dependsOn: string[];
};

export type PlanWave = {
  wave: number;
  tasks: PlanTask[];
};

export type PlanReport = {
  tasksFilePath: string;
  totalTasks: number;
  activeTasks: number;
  completionStatuses: string[];
  waves: PlanWave[];
  cycleTaskIds: string[];
  recommendedNext: string[];
  mermaid: string;
};

function resolveTasksFile(configPath: string, config: SyncConfig, options: SyncOptions): string {
  const dir = path.dirname(configPath);
  const tasksFile = options.tasksFileOverride || config.tasksFile;
  return path.resolve(dir, tasksFile);
}

function parseTaskBlocks(content: string): TaskBlock[] {
  const blocks: TaskBlock[] = [];
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let inTasks = false;
  let current: TaskBlock | null = null;

  const flush = () => {
    if (!current) return;
    blocks.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '## Tasks') {
      flush();
      inTasks = true;
      continue;
    }

    if (inTasks && trimmed.startsWith('## ') && trimmed !== '## Tasks') {
      flush();
      break;
    }

    if (!inTasks) continue;

    if (trimmed.startsWith('### ')) {
      flush();
      current = {
        heading: trimmed.slice(4).trim(),
        headingLine: i + 1,
        keys: [],
        keyLineByName: {}
      };
      continue;
    }

    if (!current) continue;
    const m = line.match(/^\s*-\s*([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim();
    current.keys.push(key);
    if (!(key in current.keyLineByName)) {
      current.keyLineByName[key] = i + 1;
    }
    if (key === 'id' && !current.id) {
      current.id = value;
    }
  }

  flush();
  return blocks;
}

function parseDomainKeys(lines: string[]): Set<string> {
  const out = new Set<string>();
  for (const line of lines) {
    const m = line.trim().match(/^-\s*([A-Za-z0-9_-]+)\s*:/);
    if (!m) continue;
    out.add(m[1]);
  }
  return out;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function firstOccurrenceOrder(keys: string[], allowed: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (!allowed.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function createIssueSink() {
  const issues: Issue[] = [];
  const add = (issue: Issue) => {
    issues.push(issue);
  };
  return { issues, add };
}

function validateDate(value: string | undefined | null): boolean {
  if (value === undefined || value === null || value === '') return true;
  return DATE_RE.test(value);
}

function validateSpecMode(value: Task['specMode'] | undefined): boolean {
  return value === undefined || value === 'lite' || value === 'standard' || value === 'strict';
}

function validateBoardInternal(tasksFilePath: string, config: SyncConfig): ValidateReport {
  const content = fs.readFileSync(tasksFilePath, 'utf8');
  const board = parseTasksFile(tasksFilePath);
  const blocks = parseTaskBlocks(content);
  const allowedStatuses = new Set((config.allowedStatuses || []).map(normalizeStatus));
  const completionStatuses = new Set(getCompletionStatuses(config).map(normalizeStatus));

  const { issues, add } = createIssueSink();

  const hasTasksHeading = /^## Tasks$/m.test(content);
  const hasWorkDomainsHeading = /^## Work Domains$/m.test(content) || /^## Components$/m.test(content);
  if (!hasTasksHeading) {
    add({ severity: 'error', code: 'missing-tasks-section', message: 'Missing `## Tasks` section.' });
  }
  if (!hasWorkDomainsHeading) {
    add({ severity: 'error', code: 'missing-work-domains', message: 'Missing `## Work Domains` section.' });
  }

  const domainKeys = parseDomainKeys(board.workDomainsSection || []);
  if (domainKeys.size === 0) {
    add({ severity: 'warning', code: 'empty-work-domains', message: 'No domain keys found under `## Work Domains`.' });
  }

  const ids = board.tasks.map(task => task.id);
  const idCount = new Map<string, number>();
  for (const id of ids) {
    idCount.set(id, (idCount.get(id) || 0) + 1);
  }
  for (const [id, count] of idCount.entries()) {
    if (count > 1) {
      add({ severity: 'error', code: 'duplicate-id', message: `Duplicate task id: ${id}`, taskId: id });
    }
  }

  for (const block of blocks) {
    const taskId = block.id;
    if (!taskId) {
      add({ severity: 'error', code: 'missing-id-key', message: 'Task block is missing `id` key.', line: block.headingLine });
      continue;
    }

    const keyCounts = new Map<string, number>();
    for (const key of block.keys) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }

    for (const req of REQUIRED_KEYS) {
      const count = keyCounts.get(req) || 0;
      if (count === 0) {
        add({ severity: 'error', code: 'missing-required-key', message: `Missing required key \`${req}\` in task block.`, taskId, line: block.headingLine });
      }
      if (count > 1) {
        add({ severity: 'error', code: 'duplicate-required-key', message: `Key \`${req}\` appears more than once.`, taskId, line: block.keyLineByName[req] });
      }
    }

    const requiredOrder = firstOccurrenceOrder(block.keys, REQUIRED_KEY_SET);
    if (requiredOrder.length === REQUIRED_KEYS.length && !arraysEqual(requiredOrder, [...REQUIRED_KEYS])) {
      add({ severity: 'error', code: 'required-order', message: 'Required keys are out of canonical order.', taskId, line: block.headingLine });
    }

    const optionalOrder = firstOccurrenceOrder(block.keys, OPTIONAL_KEY_SET);
    const expectedOptionalOrder = OPTIONAL_KEYS.filter(key => optionalOrder.includes(key));
    if (!arraysEqual(optionalOrder, expectedOptionalOrder)) {
      add({ severity: 'error', code: 'optional-order', message: 'Optional keys are out of canonical extension order.', taskId, line: block.headingLine });
    }

    const known = new Set<string>([...REQUIRED_KEYS, ...OPTIONAL_KEYS, 'touch', 'defaultExpanded']);
    for (const key of block.keys) {
      if (!known.has(key)) {
        add({ severity: 'warning', code: 'unknown-key', message: `Unknown key \`${key}\` in task block.`, taskId, line: block.keyLineByName[key] });
      }
      if (key === 'touch') {
        add({ severity: 'warning', code: 'deprecated-touch', message: '`touch` is deprecated; use `domains`.', taskId, line: block.keyLineByName[key] });
      }
      if (key === 'defaultExpanded') {
        add({ severity: 'error', code: 'forbidden-defaultExpanded', message: '`defaultExpanded` is not allowed in task blocks.', taskId, line: block.keyLineByName[key] });
      }
    }

    const headingId = block.heading.match(/^\[([A-Za-z][A-Za-z0-9]*-\d+)\]/)?.[1];
    if (headingId && headingId !== taskId) {
      add({ severity: 'error', code: 'heading-id-mismatch', message: `Heading ID (${headingId}) does not match task id (${taskId}).`, taskId, line: block.headingLine });
    }
  }

  const idSet = new Set(ids);
  for (const task of board.tasks) {
    const taskId = task.id;
    const status = normalizeStatus(task.status);
    if (!allowedStatuses.has(status)) {
      add({ severity: 'error', code: 'invalid-status', message: `Invalid status \`${task.status}\`.`, taskId });
    }

    if (task.type === 'epic' && !task.id.startsWith('E-')) {
      add({ severity: 'warning', code: 'epic-prefix', message: 'Epic tasks should use `E-XXX` IDs.', taskId });
    }
    if (task.type && task.type !== 'epic' && task.id.startsWith('E-')) {
      add({ severity: 'warning', code: 'non-epic-prefix', message: 'Non-epic tasks should use `T-XXX` IDs.', taskId });
    }

    if (task.parent && !idSet.has(task.parent)) {
      add({ severity: 'error', code: 'invalid-parent', message: `Parent task not found: ${task.parent}`, taskId });
    }

    for (const dep of task.dependsOn || []) {
      if (!idSet.has(dep)) {
        add({ severity: 'error', code: 'missing-dependency', message: `Dependency task not found: ${dep}`, taskId });
      }
      if (dep === task.id) {
        add({ severity: 'error', code: 'self-dependency', message: 'Task cannot depend on itself.', taskId });
      }
    }

    const domains = task.domains || task.touch || [];
    if (domains.length > 0 && domainKeys.size === 0) {
      add({ severity: 'error', code: 'domains-without-work-domains', message: 'Task has domains but no declared `## Work Domains` keys.', taskId });
    }
    for (const domain of domains) {
      if (domainKeys.size > 0 && !domainKeys.has(domain)) {
        add({ severity: 'error', code: 'invalid-domain', message: `Unknown domain key: ${domain}`, taskId });
      }
    }

    if (!validateDate(task.start)) {
      add({ severity: 'error', code: 'invalid-start-date', message: '`start` must use YYYY-MM-DD or null.', taskId });
    }
    if (!validateDate(task.due)) {
      add({ severity: 'error', code: 'invalid-due-date', message: '`due` must use YYYY-MM-DD or null.', taskId });
    }
    if (!validateDate(task.completed)) {
      add({ severity: 'error', code: 'invalid-completed-date', message: '`completed` must use YYYY-MM-DD or null.', taskId });
    }
    if (!validateDate(task.updated)) {
      add({ severity: 'error', code: 'invalid-updated-date', message: '`updated` must use YYYY-MM-DD.', taskId });
    }

    if (!validateSpecMode(task.specMode)) {
      add({ severity: 'error', code: 'invalid-specmode', message: '`specMode` must be `lite`, `standard`, `strict`, or null.', taskId });
    }

    if (task.externalId && !/^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:.+$/.test(task.externalId)) {
      add({ severity: 'warning', code: 'external-id-format', message: '`externalId` should match `<provider>:<entity>:<id>`.', taskId });
    }

    if (task.detail && task.detail !== 'null') {
      const detailPath = path.resolve(path.dirname(tasksFilePath), task.detail);
      if (!fs.existsSync(detailPath)) {
        add({ severity: 'error', code: 'missing-detail-file', message: `Detail file not found: ${task.detail}`, taskId });
      }
    }

    const normalizedStatus = normalizeStatus(task.status);
    const completed = task.completed;
    if (completionStatuses.has(normalizedStatus) && !completed) {
      add({ severity: 'warning', code: 'completion-date-missing', message: 'Task is in completion state but `completed` is null.', taskId });
    }
    if (!completionStatuses.has(normalizedStatus) && completed) {
      add({ severity: 'warning', code: 'completion-date-unexpected', message: 'Task is not in completion state but `completed` is set.', taskId });
    }
  }

  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const id of ids) {
    indegree.set(id, 0);
    adjacency.set(id, []);
  }
  for (const task of board.tasks) {
    for (const dep of task.dependsOn || []) {
      if (!idSet.has(dep) || dep === task.id) continue;
      indegree.set(task.id, (indegree.get(task.id) || 0) + 1);
      adjacency.get(dep)?.push(task.id);
    }
  }
  const queue = ids.filter(id => (indegree.get(id) || 0) === 0);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift() as string;
    visited += 1;
    for (const next of adjacency.get(id) || []) {
      const after = (indegree.get(next) || 0) - 1;
      indegree.set(next, after);
      if (after === 0) queue.push(next);
    }
  }
  if (visited !== ids.length) {
    const cycleIds = ids.filter(id => (indegree.get(id) || 0) > 0);
    add({ severity: 'error', code: 'dependency-cycle', message: `Dependency cycle detected: ${cycleIds.join(', ')}` });
  }

  const errors = issues.filter(issue => issue.severity === 'error').length;
  const warnings = issues.filter(issue => issue.severity === 'warning').length;
  return {
    tasksFilePath,
    totalTasks: board.tasks.length,
    errors,
    warnings,
    issues
  };
}

function printValidationReport(report: ValidateReport, json?: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  console.log(`Tasks file: ${report.tasksFilePath}`);
  console.log(`Validation: ${report.errors === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`Tasks: ${report.totalTasks}`);
  console.log(`Errors: ${report.errors}`);
  console.log(`Warnings: ${report.warnings}`);
  if (report.issues.length === 0) return;

  const preview = report.issues.slice(0, 25);
  for (const issue of preview) {
    const ref = issue.taskId ? ` ${issue.taskId}` : '';
    const line = issue.line ? ` (line ${issue.line})` : '';
    console.log(`- [${issue.severity}] ${issue.code}${ref}${line}: ${issue.message}`);
  }
  if (report.issues.length > preview.length) {
    console.log(`- ... ${report.issues.length - preview.length} more issues`);
  }
}

function sanitizeMermaidNodeId(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `n_${cleaned}`;
}

function escapeMermaidLabel(label: string): string {
  return label.replace(/"/g, '\\"');
}

function buildMermaid(boardTasks: Task[]): string {
  const out: string[] = ['graph TD'];
  for (const task of boardTasks) {
    const nodeId = sanitizeMermaidNodeId(task.id);
    const label = escapeMermaidLabel(`${task.id} ${normalizeStatus(task.status)}`);
    out.push(`  ${nodeId}["${label}"]`);
  }
  for (const task of boardTasks) {
    for (const dep of task.dependsOn || []) {
      out.push(`  ${sanitizeMermaidNodeId(dep)} --> ${sanitizeMermaidNodeId(task.id)}`);
    }
  }
  return out.join('\n');
}

function printPlanReport(report: PlanReport, options: SyncOptions): void {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  console.log(`Tasks file: ${report.tasksFilePath}`);
  console.log(`Total tasks: ${report.totalTasks}`);
  console.log(`Active tasks: ${report.activeTasks}`);
  console.log(`Waves: ${report.waves.length}`);

  for (const wave of report.waves) {
    const ids = wave.tasks.map(task => task.id).join(', ');
    console.log(`Wave ${wave.wave}: ${ids || '(empty)'}`);
  }

  if (report.cycleTaskIds.length > 0) {
    console.log(`Cycle detected: ${report.cycleTaskIds.join(', ')}`);
  }
  if (report.recommendedNext.length > 0) {
    console.log(`Recommended next: ${report.recommendedNext.join(', ')}`);
  }
  if (options.mermaid) {
    console.log('');
    console.log(report.mermaid);
  }
}

export function validateCommand(options: SyncOptions = {}): ValidateReport {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);
  const report = validateBoardInternal(tasksFilePath, config);
  printValidationReport(report, options.json);
  if (report.errors > 0) {
    throw new Error(`Validation failed with ${report.errors} error(s).`);
  }
  return report;
}

export function planCommand(options: SyncOptions = {}): PlanReport {
  const { config, configPath } = loadConfig(options);
  const tasksFilePath = resolveTasksFile(configPath, config, options);

  const validation = validateBoardInternal(tasksFilePath, config);
  if (validation.errors > 0) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ error: 'validation-failed', report: validation }, null, 2)}\n`);
    } else {
      printValidationReport(validation, false);
    }
    throw new Error('Cannot build execution plan while validation has errors.');
  }

  const board = parseTasksFile(tasksFilePath);
  const byId = new Map(board.tasks.map(task => [task.id, task]));
  const completionStatuses = new Set(getCompletionStatuses(config).map(normalizeStatus));

  const active = board.tasks.filter(task => !completionStatuses.has(normalizeStatus(task.status)));
  const activeIdSet = new Set(active.map(task => task.id));

  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const task of active) {
    indegree.set(task.id, 0);
    adjacency.set(task.id, []);
  }

  for (const task of active) {
    for (const dep of task.dependsOn || []) {
      if (!activeIdSet.has(dep)) continue;
      indegree.set(task.id, (indegree.get(task.id) || 0) + 1);
      adjacency.get(dep)?.push(task.id);
    }
  }

  const waves: string[][] = [];
  const ready = active
    .map(task => task.id)
    .filter(id => (indegree.get(id) || 0) === 0)
    .sort();
  const processed = new Set<string>();

  while (ready.length > 0) {
    const wave = [...ready].sort();
    waves.push(wave);
    ready.length = 0;

    for (const id of wave) {
      processed.add(id);
      for (const next of adjacency.get(id) || []) {
        const after = (indegree.get(next) || 0) - 1;
        indegree.set(next, after);
      }
    }

    for (const task of active) {
      if (processed.has(task.id)) continue;
      if ((indegree.get(task.id) || 0) === 0) ready.push(task.id);
    }
  }

  const cycleTaskIds = active
    .map(task => task.id)
    .filter(id => !processed.has(id))
    .sort();

  const statusRank: Record<string, number> = {
    'ready-for-do': 0,
    backlog: 1,
    paused: 2,
    doing: 3,
    review: 4
  };
  const firstWaveTasks = (waves[0] || [])
    .map(id => byId.get(id))
    .filter((task): task is Task => Boolean(task));
  const recommendedNext = firstWaveTasks
    .sort((a, b) => {
      const rankA = statusRank[normalizeStatus(a.status)] ?? 99;
      const rankB = statusRank[normalizeStatus(b.status)] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.id.localeCompare(b.id);
    })
    .map(task => task.id)
    .slice(0, 8);

  const detailedWaves: PlanWave[] = waves.map((ids, index) => ({
    wave: index + 1,
    tasks: ids
      .map(id => byId.get(id))
      .filter((task): task is Task => Boolean(task))
      .map(task => ({
        id: task.id,
        title: task.title,
        status: normalizeStatus(task.status),
        dependsOn: [...(task.dependsOn || [])]
      }))
  }));

  const report: PlanReport = {
    tasksFilePath,
    totalTasks: board.tasks.length,
    activeTasks: active.length,
    completionStatuses: Array.from(completionStatuses.values()),
    waves: detailedWaves,
    cycleTaskIds,
    recommendedNext,
    mermaid: buildMermaid(board.tasks)
  };

  printPlanReport(report, options);
  return report;
}
