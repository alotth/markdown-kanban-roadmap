#!/usr/bin/env node
import { bootstrapCommand, listConflictsCommand, pullCommand, pushCommand, reconcileCommand, statusCommand } from './sync';
import { planCommand, validateCommand } from './board-tools';
import { SyncOptions } from './types';

function parseArgs(argv: string[]): { command: string; options: SyncOptions; from?: 'local' | 'github'; taskId?: string } {
  const args = [...argv];
  const command = args.shift() || 'help';
  const options: SyncOptions = {};
  let from: 'local' | 'github' | undefined;
  let taskId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') options.dryRun = true;
    else if (a === '--force') options.force = true;
    else if (a === '--list') options.list = true;
    else if (a === '--json') options.json = true;
    else if (a === '--confirm') options.confirm = true;
    else if (a === '--mermaid') options.mermaid = true;
    else if (a === '--accept') {
      const value = args[++i];
      if (value === 'local' || value === 'remote') options.accept = value;
      else throw new Error(`Invalid --accept value: ${value}`);
    }
    else if (a === '--config') options.configPath = args[++i];
    else if (a === '--tasks-file') options.tasksFileOverride = args[++i];
    else if (a === '--from') {
      const value = args[++i];
      if (value === 'local' || value === 'github') from = value;
      else throw new Error(`Invalid --from value: ${value}`);
    } else if (!a.startsWith('-') && !taskId) {
      taskId = a;
    }
  }

  return { command, options, from, taskId };
}

function printHelp(): void {
  console.log('mapcs CLI');
  console.log('');
  console.log('Commands:');
  console.log('  mapcs status [--json] [--config path] [--tasks-file path]');
  console.log('  mapcs validate [--json] [--config path] [--tasks-file path]');
  console.log('  mapcs plan [--json] [--mermaid] [--config path] [--tasks-file path]');
  console.log('  mapcs pull [--dry-run] [--config path] [--tasks-file path]');
  console.log('  mapcs push [--dry-run] [--force] [--config path] [--tasks-file path]');
  console.log('  mapcs bootstrap --from <local|github> [--dry-run] [--confirm] [--config path] [--tasks-file path]');
  console.log('  mapcs reconcile <task-id> [--accept <local|remote>] [--config path] [--tasks-file path]');
  console.log('  mapcs reconcile --list [--json] [--config path] [--tasks-file path]');
}

function main(): void {
  try {
    const { command, options, from, taskId } = parseArgs(process.argv.slice(2));

    if (command === 'status') {
      statusCommand(options);
      return;
    }
    if (command === 'pull') {
      pullCommand(options);
      return;
    }
    if (command === 'validate') {
      validateCommand(options);
      return;
    }
    if (command === 'plan') {
      planCommand(options);
      return;
    }
    if (command === 'push') {
      pushCommand(options);
      return;
    }
    if (command === 'bootstrap') {
      if (!from) throw new Error('bootstrap requires --from <local|github>');
      bootstrapCommand(from, options);
      return;
    }
    if (command === 'reconcile') {
      if (options.list) {
        listConflictsCommand(options);
        return;
      }
      if (!taskId) throw new Error('reconcile requires <task-id>');
      reconcileCommand(taskId, options);
      return;
    }

    printHelp();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
