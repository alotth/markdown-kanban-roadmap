import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import test from 'node:test';
import { planCommand, validateCommand } from './board-tools';
import { SyncConfig } from './types';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mapcs-board-tools-'));
}

function writeConfig(tempDir: string, config: Partial<SyncConfig> = {}): string {
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

function writeTasks(tempDir: string, content: string): string {
  const tasksFilePath = path.resolve(tempDir, 'TASKS.md');
  fs.writeFileSync(tasksFilePath, content, 'utf8');
  return tasksFilePath;
}

test('validate command passes for canonical single-list board', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir);
  const detailDir = path.resolve(tempDir, 'tasks');
  fs.mkdirSync(detailDir, { recursive: true });
  fs.writeFileSync(path.resolve(detailDir, 'T-001.md'), '# T-001\n', 'utf8');

  writeTasks(tempDir, [
    '# Tasks - sample',
    '',
    '## Work Domains',
    '',
    '- SYNC: sync domain',
    '',
    '## Tasks',
    '',
    '### [T-001] Validate board',
    '',
    '  - id: T-001',
    '  - status: ready-for-do',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: medium',
    '  - workload: Normal',
    '  - tags: [validation]',
    '  - domains: [SYNC]',
    '  - dependsOn: []',
    '  - start: null',
    '  - due: null',
    '  - completed: null',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: ./tasks/T-001.md',
    '',
    '## Notes',
    ''
  ].join('\n'));

  const report = validateCommand({ configPath });
  assert.equal(report.errors, 0);
});

test('validate command fails when detail file does not exist', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir);

  writeTasks(tempDir, [
    '# Tasks - sample',
    '',
    '## Work Domains',
    '',
    '- DOCS: docs domain',
    '',
    '## Tasks',
    '',
    '### [T-001] Missing detail file',
    '',
    '  - id: T-001',
    '  - status: backlog',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: medium',
    '  - workload: Easy',
    '  - tags: []',
    '  - domains: [DOCS]',
    '  - dependsOn: []',
    '  - start: null',
    '  - due: null',
    '  - completed: null',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: ./tasks/T-001.md',
    '',
    '## Notes',
    ''
  ].join('\n'));

  assert.throws(() => validateCommand({ configPath }), /Validation failed/);
});

test('plan command returns dependency waves and recommendations', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir);

  writeTasks(tempDir, [
    '# Tasks - sample',
    '',
    '## Work Domains',
    '',
    '- SYNC: sync domain',
    '',
    '## Tasks',
    '',
    '### [T-001] Done prerequisite',
    '',
    '  - id: T-001',
    '  - status: done',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: medium',
    '  - workload: Easy',
    '  - tags: []',
    '  - domains: [SYNC]',
    '  - dependsOn: []',
    '  - start: null',
    '  - due: null',
    '  - completed: 2026-04-01',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: null',
    '',
    '### [T-002] First runnable',
    '',
    '  - id: T-002',
    '  - status: ready-for-do',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: high',
    '  - workload: Normal',
    '  - tags: []',
    '  - domains: [SYNC]',
    '  - dependsOn: [T-001]',
    '  - start: null',
    '  - due: null',
    '  - completed: null',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: null',
    '',
    '### [T-003] Depends on T-002',
    '',
    '  - id: T-003',
    '  - status: backlog',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: medium',
    '  - workload: Normal',
    '  - tags: []',
    '  - domains: [SYNC]',
    '  - dependsOn: [T-002]',
    '  - start: null',
    '  - due: null',
    '  - completed: null',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: null',
    '',
    '### [T-004] Parallel runnable',
    '',
    '  - id: T-004',
    '  - status: ready-for-do',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: medium',
    '  - workload: Easy',
    '  - tags: []',
    '  - domains: [SYNC]',
    '  - dependsOn: []',
    '  - start: null',
    '  - due: null',
    '  - completed: null',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: null',
    '',
    '## Notes',
    ''
  ].join('\n'));

  const report = planCommand({ configPath });
  assert.equal(report.waves.length, 2);
  assert.deepEqual(report.waves[0].tasks.map(task => task.id), ['T-002', 'T-004']);
  assert.deepEqual(report.waves[1].tasks.map(task => task.id), ['T-003']);
  assert.deepEqual(report.cycleTaskIds, []);
  assert.ok(report.recommendedNext.includes('T-002'));
});

test('plan command fails when validation reports dependency cycle', () => {
  const tempDir = makeTempDir();
  const configPath = writeConfig(tempDir);

  writeTasks(tempDir, [
    '# Tasks - sample',
    '',
    '## Work Domains',
    '',
    '- CORE: core domain',
    '',
    '## Tasks',
    '',
    '### [T-001] Cycle A',
    '',
    '  - id: T-001',
    '  - status: backlog',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: medium',
    '  - workload: Easy',
    '  - tags: []',
    '  - domains: [CORE]',
    '  - dependsOn: [T-002]',
    '  - start: null',
    '  - due: null',
    '  - completed: null',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: null',
    '',
    '### [T-002] Cycle B',
    '',
    '  - id: T-002',
    '  - status: backlog',
    '  - type: task',
    '  - parent: null',
    '  - subIssueProgress: null',
    '  - priority: medium',
    '  - workload: Easy',
    '  - tags: []',
    '  - domains: [CORE]',
    '  - dependsOn: [T-001]',
    '  - start: null',
    '  - due: null',
    '  - completed: null',
    '  - externalId: null',
    '  - updated: 2026-04-01',
    '  - detail: null',
    '',
    '## Notes',
    ''
  ].join('\n'));

  assert.throws(() => planCommand({ configPath }), /Cannot build execution plan while validation has errors/);
});
