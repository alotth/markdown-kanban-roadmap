import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import test from 'node:test';
import { loadConfig } from './config';
import { parseTasksFile, writeBoard } from './markdown';
import { bootstrapCommand, pullCommand, pushCommand, statusCommand } from './sync';
import { SyncConfig, TaskBoard } from './types';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mapcs-'));
}

function writeConfig(tempDir: string, config: Partial<SyncConfig>): string {
  const merged: SyncConfig = {
    owner: 'acme',
    repo: 'roadmap',
    tasksFile: './TASKS.md',
    statusMap: {
      backlog: 'Backlog',
      'ready-for-do': 'Ready for Do',
      doing: 'Doing',
      review: 'Review',
      done: 'Done',
      paused: 'Paused'
    },
    ...config
  };
  const configPath = path.resolve(tempDir, 'mapcs.config.json');
  fs.writeFileSync(configPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return configPath;
}

function writeTasks(tempDir: string, board: TaskBoard): string {
  const tasksFilePath = path.resolve(tempDir, 'TASKS.md');
  writeBoard(tasksFilePath, board);
  return tasksFilePath;
}

function stubGitHub(stubs: Record<string, any>): () => void {
  const github = require('./github') as Record<string, any>;
  const original: Record<string, any> = {};
  for (const [key, value] of Object.entries(stubs)) {
    original[key] = github[key];
    github[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(original)) {
      github[key] = value;
    }
  };
}

test('default config keeps legacy status behavior', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {});
  const { config } = loadConfig({ configPath });
  assert.deepEqual(config.allowedStatuses, ['backlog', 'ready-for-do', 'doing', 'review', 'done', 'paused']);
  assert.deepEqual(config.completionStatuses, ['done']);
});

test('custom partial workflow accepts extra status', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    allowedStatuses: ['backlog', 'doing', 'review', 'done', 'paused', 'design'],
    statusMap: {
      backlog: 'Backlog',
      doing: 'Doing',
      review: 'Review',
      done: 'Done',
      paused: 'Paused',
      design: 'Design'
    }
  });
  writeTasks(tempDir, {
    title: 'Tasks',
    workDomainsSection: [],
    notesSection: [],
    tasks: [{ id: 'T-001', title: 'UX pass', status: 'design', completed: null, externalId: null }]
  });

  const restore = stubGitHub({ getIssues: () => [] });
  try {
    const report = statusCommand({ configPath });
    assert.equal(report.localTasks, 1);
    assert.equal(report.linkedTasks, 0);
  } finally {
    restore();
  }
});

test('custom full replacement works without default statuses', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    allowedStatuses: ['inbox', 'design', 'build', 'qa', 'released'],
    completionStatuses: ['released'],
    statusMap: {
      inbox: 'Inbox',
      design: 'Design',
      build: 'Build',
      qa: 'QA',
      released: 'Released'
    }
  });
  writeTasks(tempDir, {
    title: 'Tasks',
    workDomainsSection: [],
    notesSection: [],
    tasks: [{ id: 'T-010', title: 'Ship v1', status: 'qa', completed: null, externalId: null }]
  });

  const restore = stubGitHub({ getIssues: () => [] });
  try {
    const report = statusCommand({ configPath });
    assert.equal(report.localTasks, 1);
  } finally {
    restore();
  }
});

test('custom completionStatuses drive completed semantics on pull', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    projectId: 'PVT_1',
    statusFieldId: 'FIELD_STATUS',
    completedDateFieldId: 'FIELD_COMPLETED',
    allowedStatuses: ['inbox', 'design', 'build', 'qa', 'released'],
    completionStatuses: ['released'],
    statusMap: {
      inbox: 'Inbox',
      design: 'Design',
      build: 'Build',
      qa: 'QA',
      released: 'Released'
    }
  });
  const tasksFilePath = writeTasks(tempDir, {
    title: 'Tasks',
    workDomainsSection: [],
    notesSection: [],
    tasks: [
      { id: 'T-001', title: 'Release train', status: 'released', completed: null, externalId: 'github:issue:1' },
      { id: 'T-002', title: 'Backend build', status: 'build', completed: '2026-01-01', externalId: 'github:issue:2' }
    ]
  });

  const restore = stubGitHub({
    getIssues: () => [
      {
        number: 1,
        node_id: 'I_1',
        title: 'Release train',
        body: '',
        state: 'closed',
        labels: [],
        milestone: null,
        html_url: 'https://example.test/1',
        closed_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z'
      },
      {
        number: 2,
        node_id: 'I_2',
        title: 'Backend build',
        body: '',
        state: 'open',
        labels: [],
        milestone: null,
        html_url: 'https://example.test/2',
        closed_at: null,
        updated_at: '2026-02-02T00:00:00Z'
      }
    ],
    getProjectStatuses: () => [
      { issueNumber: 1, itemId: 'PI_1', statusName: 'Released' },
      { issueNumber: 2, itemId: 'PI_2', statusName: 'Build' }
    ],
    getProjectDates: () => [
      { issueNumber: 1, itemId: 'PI_1' },
      { issueNumber: 2, itemId: 'PI_2' }
    ]
  });

  try {
    pullCommand({ configPath });
    const parsed = parseTasksFile(tasksFilePath);
    const released = parsed.tasks.find(task => task.id === 'T-001');
    const build = parsed.tasks.find(task => task.id === 'T-002');
    assert.equal(released?.completed, '2026-02-01');
    assert.equal(build?.completed, null);
  } finally {
    restore();
  }
});

test('fails when statusMap does not cover all allowedStatuses', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    allowedStatuses: ['backlog', 'doing', 'review', 'done', 'paused', 'design'],
    statusMap: {
      backlog: 'Backlog',
      doing: 'Doing',
      review: 'Review',
      done: 'Done',
      paused: 'Paused'
    }
  });

  assert.throws(() => loadConfig({ configPath }), /statusMap is missing allowed statuses: design/);
});

test('fails when completionStatuses has values outside allowedStatuses', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    allowedStatuses: ['inbox', 'design', 'build'],
    completionStatuses: ['released'],
    statusMap: {
      inbox: 'Inbox',
      design: 'Design',
      build: 'Build'
    }
  });

  assert.throws(() => loadConfig({ configPath }), /completionStatuses must be a subset/);
});

test('fails when idGeneration preferredPrefix is invalid', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    idGeneration: {
      preferredPrefix: 'T-'
    }
  });

  assert.throws(() => loadConfig({ configPath }), /idGeneration\.preferredPrefix/);
});

test('roundtrip pull/push/bootstrap preserves custom statuses', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    projectId: 'PVT_2',
    statusFieldId: 'FIELD_STATUS',
    allowedStatuses: ['inbox', 'design', 'build', 'qa', 'released'],
    completionStatuses: ['released'],
    statusMap: {
      inbox: 'Inbox',
      design: 'Design',
      build: 'Build',
      qa: 'QA',
      released: 'Released'
    },
    bootstrap: {
      defaultStatusForImportedIssues: 'inbox'
    }
  });
  const tasksFilePath = writeTasks(tempDir, {
    title: 'Tasks',
    workDomainsSection: [],
    notesSection: [],
    tasks: [
      { id: 'T-001', title: 'Design API', status: 'design', completed: null, externalId: 'github:issue:11' }
    ]
  });

  const issues = [
    {
      number: 11,
      node_id: 'I_11',
      title: 'Design API',
      body: 'body',
      state: 'open',
      labels: [],
      milestone: null,
      html_url: 'https://example.test/11',
      closed_at: null,
      updated_at: '2026-02-03T00:00:00Z'
    },
    {
      number: 12,
      node_id: 'I_12',
      title: 'QA pass',
      body: 'body',
      state: 'open',
      labels: [],
      milestone: null,
      html_url: 'https://example.test/12',
      closed_at: null,
      updated_at: '2026-02-03T00:00:00Z'
    }
  ];

  const restore = stubGitHub({
    getIssues: () => issues,
    getProjectStatuses: () => [
      { issueNumber: 11, itemId: 'PI_11', statusName: 'Design' },
      { issueNumber: 12, itemId: 'PI_12', statusName: 'QA' }
    ],
    getProjectDates: () => [],
    getStatusOptionIds: () => ({ Design: 'OPT_DESIGN', QA: 'OPT_QA' }),
    getProjectIssueItems: () => [
      { issueNumber: 11, itemId: 'PI_11' },
      { issueNumber: 12, itemId: 'PI_12' }
    ]
  });

  try {
    pullCommand({ configPath });
    pushCommand({ configPath, dryRun: true });
    bootstrapCommand('github', { configPath });

    const parsed = parseTasksFile(tasksFilePath);
    const byId = new Map(parsed.tasks.map(task => [task.id, task.status]));
    assert.equal(byId.get('T-001'), 'design');
    assert.ok(Array.from(byId.values()).includes('qa'));
  } finally {
    restore();
  }
});

test('parseTasksFile accepts metadata bullets with flexible indentation', () => {
  const tempDir = makeTempDir();
  const tasksFilePath = path.resolve(tempDir, 'TASKS.md');
  fs.writeFileSync(tasksFilePath, [
    '# Tasks',
    '',
    '## Tasks',
    '',
    '### [T-032] Bug: upload error',
    '',
    '- id: T-032',
    ' - status: backlog',
    '\t- completed: null',
    '  - externalId: github:issue:27',
    '    - updated: 2026-03-12',
    ' - detail: ./tasks/T-032.md',
    '',
    '## Notes',
    ''
  ].join('\n'), 'utf8');

  const parsed = parseTasksFile(tasksFilePath);
  assert.equal(parsed.tasks.length, 1);
  assert.equal(parsed.tasks[0].id, 'T-032');
  assert.equal(parsed.tasks[0].status, 'backlog');
  assert.equal(parsed.tasks[0].externalId, 'github:issue:27');
  assert.equal(parsed.tasks[0].updated, '2026-03-12');
  assert.equal(parsed.tasks[0].detail, './tasks/T-032.md');
});

test('parseTasksFile accepts deprecated touch and maps to domains', () => {
  const tempDir = makeTempDir();
  const tasksFilePath = path.resolve(tempDir, 'TASKS.md');
  fs.writeFileSync(tasksFilePath, [
    '# Tasks',
    '',
    '## Work Domains',
    '',
    '- SYNC: sync engine',
    '',
    '## Tasks',
    '',
    '### [T-001] Legacy touch key',
    '',
    '  - id: T-001',
    '  - status: backlog',
    '  - touch: [SYNC]',
    '  - completed: null',
    '  - externalId: null',
    '',
    '## Notes',
    ''
  ].join('\n'), 'utf8');

  const parsed = parseTasksFile(tasksFilePath);
  assert.deepEqual(parsed.tasks[0].domains, ['SYNC']);
});

test('writeBoard always serializes work domains and domains key', () => {
  const tempDir = makeTempDir();
  const tasksFilePath = path.resolve(tempDir, 'TASKS.md');
  writeBoard(tasksFilePath, {
    title: 'Tasks',
    workDomainsSection: ['- SYNC: sync engine'],
    notesSection: [],
    tasks: [{ id: 'T-001', title: 'Serialize domains', status: 'backlog', touch: ['SYNC'], completed: null, externalId: null }]
  });

  const content = fs.readFileSync(tasksFilePath, 'utf8');
  assert.match(content, /^## Work Domains$/m);
  assert.match(content, /^  - domains: \[SYNC\]$/m);
  assert.doesNotMatch(content, /^## Components$/m);
  assert.doesNotMatch(content, /^  - touch: /m);
});

test('bootstrap from github keeps existing id prefix for new tasks', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {});
  const tasksFilePath = writeTasks(tempDir, {
    title: 'Tasks',
    workDomainsSection: [],
    notesSection: [],
    tasks: [
      { id: 'E-009', title: 'Legacy epic', status: 'backlog', completed: null, externalId: 'github:issue:91' }
    ]
  });

  const restore = stubGitHub({
    getIssues: () => [
      {
        number: 91,
        node_id: 'I_91',
        title: 'Legacy epic',
        body: '',
        state: 'open',
        labels: [],
        milestone: null,
        html_url: 'https://example.test/91',
        closed_at: null,
        updated_at: '2026-03-10T00:00:00Z'
      },
      {
        number: 92,
        node_id: 'I_92',
        title: 'New imported issue',
        body: '',
        state: 'open',
        labels: [],
        milestone: null,
        html_url: 'https://example.test/92',
        closed_at: null,
        updated_at: '2026-03-10T00:00:00Z'
      }
    ]
  });

  try {
    bootstrapCommand('github', { configPath });
    const parsed = parseTasksFile(tasksFilePath);
    const imported = parsed.tasks.find(task => task.externalId === 'github:issue:92');
    assert.equal(imported?.id, 'E-010');
    assert.equal(imported?.detail, './tasks/E-010.md');
  } finally {
    restore();
  }
});

test('bootstrap from github honors configured idGeneration preferredPrefix', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    idGeneration: {
      preferredPrefix: 'E'
    }
  });
  const tasksFilePath = writeTasks(tempDir, {
    title: 'Tasks',
    workDomainsSection: [],
    notesSection: [],
    tasks: [
      { id: 'T-009', title: 'Legacy task', status: 'backlog', completed: null, externalId: 'github:issue:93' }
    ]
  });

  const restore = stubGitHub({
    getIssues: () => [
      {
        number: 93,
        node_id: 'I_93',
        title: 'Legacy task',
        body: '',
        state: 'open',
        labels: [],
        milestone: null,
        html_url: 'https://example.test/93',
        closed_at: null,
        updated_at: '2026-03-10T00:00:00Z'
      },
      {
        number: 94,
        node_id: 'I_94',
        title: 'New imported issue',
        body: '',
        state: 'open',
        labels: [],
        milestone: null,
        html_url: 'https://example.test/94',
        closed_at: null,
        updated_at: '2026-03-10T00:00:00Z'
      }
    ]
  });

  try {
    bootstrapCommand('github', { configPath });
    const parsed = parseTasksFile(tasksFilePath);
    const imported = parsed.tasks.find(task => task.externalId === 'github:issue:94');
    assert.equal(imported?.id, 'E-001');
    assert.equal(imported?.detail, './tasks/E-001.md');
  } finally {
    restore();
  }
});

test('fails when TASKS.md contains invalid status', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir, {
    allowedStatuses: ['backlog', 'doing', 'review', 'done', 'paused'],
    statusMap: {
      backlog: 'Backlog',
      doing: 'Doing',
      review: 'Review',
      done: 'Done',
      paused: 'Paused'
    }
  });
  writeTasks(tempDir, {
    title: 'Tasks',
    workDomainsSection: [],
    notesSection: [],
    tasks: [{ id: 'T-999', title: 'Unknown status', status: 'design', completed: null, externalId: null }]
  });

  const restore = stubGitHub({ getIssues: () => [] });
  try {
    assert.throws(() => statusCommand({ configPath }), /TASKS.md contains invalid statuses: design/);
  } finally {
    restore();
  }
});
