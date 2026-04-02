export type LocalStatus = string;

export type TaskType = 'epic' | 'feature' | 'task' | 'bug' | 'chore';

export type SpecMode = 'lite' | 'standard' | 'strict';

export type Task = {
  title: string;
  id: string;
  status: LocalStatus;
  type?: TaskType;
  parent?: string;
  subIssueProgress?: string;
  priority?: 'high' | 'medium' | 'low';
  workload?: 'Easy' | 'Normal' | 'Hard' | 'Extreme';
  tags?: string[];
  domains?: string[];
  touch?: string[];
  dependsOn?: string[];
  iteration?: string;
  assignees?: string[];
  milestone?: string;
  specMode?: SpecMode;
  start?: string;
  due?: string;
  completed: string | null;
  externalId: string | null;
  externalLinks?: string[];
  updated?: string;
  detail?: string;
  defaultExpanded?: boolean;
};

export type TaskBoard = {
  title: string;
  workDomainsSection: string[];
  componentsSection?: string[];
  tasks: Task[];
  notesSection: string[];
};

export type SyncConfig = {
  owner: string;
  repo: string;
  projectId?: string;
  statusFieldId?: string;
  startDateFieldId?: string;
  dueDateFieldId?: string;
  completedDateFieldId?: string;
  statusMap: Record<string, string>;
  allowedStatuses?: string[];
  completionStatuses?: string[];
  tasksFile: string;
  bootstrap?: {
    createMissingDetailFiles?: boolean;
    defaultStatusForImportedIssues?: string;
    requireConfirmFlag?: boolean;
  };
  idGeneration?: {
    preferredPrefix?: string;
  };
  remoteWinsFields?: string[];
  localWinsFields?: string[];
};

export type SyncOptions = {
  dryRun?: boolean;
  tasksFileOverride?: string;
  configPath?: string;
  confirm?: boolean;
  json?: boolean;
  force?: boolean;
  accept?: 'local' | 'remote';
  list?: boolean;
  mermaid?: boolean;
};

export type SyncStateEntry = {
  taskId: string;
  externalId: string;
  issueNumber: number;
  remoteUpdatedAt: string;
  remoteBodyHash: string;
  remoteBodyAtPull: string;
  localDetailHashAtPull: string;
  localDetailAtPull: string;
  pulledAt: string;
};

export type SyncState = {
  version: 1;
  generatedAt: string;
  entries: Record<string, SyncStateEntry>;
};

export type GitHubIssue = {
  number: number;
  node_id: string;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  milestone: null | { title: string };
  html_url: string;
  closed_at: string | null;
  updated_at: string;
};

export type ProjectItemStatus = {
  issueNumber: number;
  itemId: string;
  statusName: string;
};

export type ProjectIssueItem = {
  issueNumber: number;
  itemId: string;
};

export type ProjectItemDates = {
  issueNumber: number;
  itemId: string;
  start?: string;
  due?: string;
  completed?: string;
};

export type StatusReport = {
  localTasks: number;
  linkedTasks: number;
  unlinkedTasks: number;
  remoteIssues: number;
  missingRemoteForLinked: string[];
  remoteOnlyIssues: number[];
  divergedStatuses: Array<{ id: string; local: string; remote: string }>;
};
