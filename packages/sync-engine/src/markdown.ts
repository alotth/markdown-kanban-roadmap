import * as fs from 'fs';
import * as path from 'path';
import { LocalStatus, Task, TaskBoard, TaskType } from './types';
import { normalizeStatus } from './statuses';
import { parseArray, readUtf8, toArrayString, writeUtf8 } from './utils';

const LEGACY_SECTIONS: Record<string, LocalStatus> = {
  backlog: 'backlog',
  doing: 'doing',
  review: 'review',
  done: 'done',
  paused: 'paused'
};

function parseStatus(value: string | undefined, fallback: LocalStatus = 'backlog'): LocalStatus {
  const normalized = normalizeStatus(value);
  return normalized || fallback;
}

function taskFromTitle(title: string, statusFallback: LocalStatus): Task {
  return {
    title,
    id: '',
    status: statusFallback,
    completed: null,
    externalId: null
  };
}

function parseTaskType(value: string): TaskType | undefined {
  if (value === 'epic' || value === 'feature' || value === 'task' || value === 'bug' || value === 'chore') {
    return value;
  }
  return undefined;
}

function parseSpecMode(value: string): Task['specMode'] {
  if (value === 'lite' || value === 'standard' || value === 'strict') {
    return value;
  }
  return undefined;
}

export function parseTasksFile(tasksFilePath: string): TaskBoard {
  const content = readUtf8(tasksFilePath);
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let title = 'Tasks';
  let inWorkDomains = false;
  let inNotes = false;
  let inTasks = false;
  let currentLegacyStatus: LocalStatus = 'backlog';
  let currentTask: Task | null = null;

  const workDomainsSection: string[] = [];
  const notesSection: string[] = [];
  const tasks: Task[] = [];

  const flushTask = () => {
    if (!currentTask) return;
    if (!currentTask.id) {
      currentTask.id = `tmp-${Math.random().toString(36).slice(2, 8)}`;
    }
    tasks.push(currentTask);
    currentTask = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      title = trimmed.slice(2).trim();
      continue;
    }

    if (trimmed === '## Work Domains' || trimmed === '## Components') {
      flushTask();
      inWorkDomains = true;
      inTasks = false;
      inNotes = false;
      continue;
    }
    if (trimmed === '## Tasks') {
      flushTask();
      inWorkDomains = false;
      inTasks = true;
      inNotes = false;
      continue;
    }
    if (trimmed === '## Notes' || trimmed === '## Notas') {
      flushTask();
      inWorkDomains = false;
      inTasks = false;
      inNotes = true;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const legacySection = trimmed.slice(3).trim().toLowerCase();
      if (legacySection in LEGACY_SECTIONS) {
        flushTask();
        inWorkDomains = false;
        inTasks = true;
        inNotes = false;
        currentLegacyStatus = LEGACY_SECTIONS[legacySection];
        continue;
      }
    }

    if (inWorkDomains) {
      workDomainsSection.push(line);
      continue;
    }
    if (inNotes) {
      notesSection.push(line);
      continue;
    }

    if (inTasks && trimmed.startsWith('### ')) {
      flushTask();
      currentTask = taskFromTitle(trimmed.slice(4).trim(), currentLegacyStatus);
      continue;
    }

    if (inTasks && currentTask) {
      const m = line.match(/^\s*-\s*([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      const value = m[2].trim();

      switch (key) {
        case 'id':
          currentTask.id = value;
          break;
        case 'status':
          currentTask.status = parseStatus(value, currentTask.status);
          break;
        case 'type':
          currentTask.type = parseTaskType(value);
          break;
        case 'parent':
          currentTask.parent = value === 'null' || value === '' ? undefined : value;
          break;
        case 'subIssueProgress':
          currentTask.subIssueProgress = value === 'null' || value === '' ? undefined : value;
          break;
        case 'priority':
          if (value === 'high' || value === 'medium' || value === 'low') currentTask.priority = value;
          break;
        case 'workload':
          if (value === 'Easy' || value === 'Normal' || value === 'Hard' || value === 'Extreme') currentTask.workload = value;
          break;
        case 'tags':
          currentTask.tags = parseArray(value);
          break;
        case 'domains':
          currentTask.domains = parseArray(value);
          break;
        case 'touch':
          if (!currentTask.domains) currentTask.domains = parseArray(value);
          currentTask.touch = parseArray(value);
          break;
        case 'dependsOn':
          currentTask.dependsOn = parseArray(value);
          break;
        case 'iteration':
          currentTask.iteration = value === 'null' || value === '' ? undefined : value;
          break;
        case 'assignees':
          currentTask.assignees = parseArray(value);
          break;
        case 'milestone':
          currentTask.milestone = value === 'null' || value === '' ? undefined : value;
          break;
        case 'specMode':
          currentTask.specMode = parseSpecMode(value);
          break;
        case 'start':
          currentTask.start = value === 'null' || value === '' ? undefined : value;
          break;
        case 'due':
          currentTask.due = value === 'null' || value === '' ? undefined : value;
          break;
        case 'completed':
          currentTask.completed = value === 'null' || value === '' ? null : value;
          break;
        case 'externalId':
          currentTask.externalId = value === 'null' || value === '' ? null : value;
          break;
        case 'externalLinks':
          currentTask.externalLinks = parseArray(value);
          break;
        case 'updated':
          currentTask.updated = value === 'null' || value === '' ? undefined : value;
          break;
        case 'detail':
          currentTask.detail = value || undefined;
          break;
        case 'defaultExpanded':
          currentTask.defaultExpanded = value.toLowerCase() === 'true';
          break;
        default:
          break;
      }
    }
  }

  flushTask();

  return {
    title,
    workDomainsSection,
    componentsSection: workDomainsSection,
    tasks,
    notesSection
  };
}

export function serializeTasksFile(board: TaskBoard): string {
  const out: string[] = [];
  out.push(`# ${board.title}`);
  out.push('');

  const workDomains = board.workDomainsSection ?? board.componentsSection ?? [];
  if (workDomains.length > 0) {
    out.push('## Work Domains');
    out.push('');
    for (const line of workDomains) out.push(line);
    out.push('');
  }

  out.push('## Tasks');
  out.push('');

  for (const task of board.tasks) {
    out.push(`### ${task.title}`);
    out.push('');
    out.push(`  - id: ${task.id}`);
    out.push(`  - status: ${task.status}`);
    if (task.type) out.push(`  - type: ${task.type}`);
    if (task.parent) out.push(`  - parent: ${task.parent}`);
    if (task.subIssueProgress) out.push(`  - subIssueProgress: ${task.subIssueProgress}`);
    if (task.priority) out.push(`  - priority: ${task.priority}`);
    if (task.workload) out.push(`  - workload: ${task.workload}`);
    if (task.tags) out.push(`  - tags: ${toArrayString(task.tags)}`);
    if (task.domains ?? task.touch) out.push(`  - domains: ${toArrayString(task.domains ?? task.touch ?? [])}`);
    if (task.dependsOn) out.push(`  - dependsOn: ${toArrayString(task.dependsOn)}`);
    if (task.start) out.push(`  - start: ${task.start}`);
    if (task.due) out.push(`  - due: ${task.due}`);
    out.push(`  - completed: ${task.completed ?? 'null'}`);
    out.push(`  - externalId: ${task.externalId ?? 'null'}`);
    if (task.updated) out.push(`  - updated: ${task.updated}`);
    if (task.detail) out.push(`  - detail: ${task.detail}`);
    if (task.iteration) out.push(`  - iteration: ${task.iteration}`);
    if (task.assignees) out.push(`  - assignees: ${toArrayString(task.assignees)}`);
    if (task.externalLinks) out.push(`  - externalLinks: ${toArrayString(task.externalLinks)}`);
    if (task.milestone) out.push(`  - milestone: ${task.milestone}`);
    if (task.specMode) out.push(`  - specMode: ${task.specMode}`);
    if (task.defaultExpanded !== undefined) out.push(`  - defaultExpanded: ${task.defaultExpanded}`);
    out.push('');
  }

  out.push('## Notes');
  out.push('');
  if (board.notesSection.length > 0) {
    for (const line of board.notesSection) out.push(line);
  }

  return out.join('\n').replace(/\n+$/, '\n');
}

export function writeBoard(tasksFilePath: string, board: TaskBoard): void {
  writeUtf8(tasksFilePath, serializeTasksFile(board));
}

export function ensureDetailFile(tasksFilePath: string, task: Task): void {
  if (!task.detail) return;
  const full = path.resolve(path.dirname(tasksFilePath), task.detail);
  if (fs.existsSync(full)) return;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `# ${task.id}\n\n  - summary: Define scope\n  - description: |\n      ## Steps\n\n      - [ ] Define scope\n`, 'utf8');
}
