# @mapctx/sync-engine (alpha)

Standalone npm package + CLI to sync local `TASKS.md` with GitHub Issues and GitHub Projects (v2).

Status: alpha. APIs, config keys, and sync behavior may change before `1.0.0`.

Detailed operational guide: `DOCUMENTATION.md`.

## Install

```bash
npm install @mapctx/sync-engine
```

Run with npx:

```bash
npx --yes --package @mapctx/sync-engine mapcs status
```

Release/maintainer process: see `MAINTAINERS.md`.

## Use as library

```ts
import { planCommand, pullCommand, pushCommand, statusCommand, validateCommand } from '@mapctx/sync-engine';

statusCommand({ configPath: 'mapcs.dev.json' });
validateCommand({ configPath: 'mapcs.dev.json' });
planCommand({ configPath: 'mapcs.dev.json' });
```

## CLI commands

- `mapcs status`
- `mapcs validate`
- `mapcs plan`
- `mapcs pull`
- `mapcs push`
- `mapcs bootstrap --from <local|github>`
- `mapcs reconcile <task-id>`
- `mapcs reconcile --list`

Common flags:

- `--dry-run`
- `--force`
- `--json`
- `--mermaid` (for `mapcs plan`)
- `--accept <local|remote>`
- `--config <path>`
- `--tasks-file <path>`

## Important files

- Main config: `mapcs.config.json`
- Config template: `mapcs.config.example.json`
- Local sync state: `.mapcs/state.json`
- Conflict artifacts: `.mapcs/conflicts/<task-id>.reconcile.md`

## ID generation

When importing remote issues (`bootstrap --from github`), new local IDs can follow a preferred prefix:

```json
{
  "idGeneration": {
    "preferredPrefix": "E"
  }
}
```

If omitted, the engine infers the dominant existing prefix (e.g. `T`, `E`, `EPIC`) and continues that sequence.

## Daily flow

```bash
mapcs pull
mapcs status
mapcs push
```

Safety rule: always run `pull` before `push` in the same session.

## Bootstrap

Local-first (`TASKS.md` -> GitHub):

```bash
mapcs bootstrap --from local --dry-run --confirm
mapcs bootstrap --from local --confirm
```

Remote-first (GitHub -> `TASKS.md`):

```bash
mapcs bootstrap --from github --dry-run
mapcs bootstrap --from github
```

## Reconciliation

```bash
mapcs reconcile --list
mapcs reconcile T-002
mapcs reconcile T-002 --accept local
mapcs reconcile T-002 --accept remote
mapcs push
```

## GitHub auth scopes

To sync Issues and Projects v2, your `gh` token needs:

- `repo`
- `read:project`
- `project`

Refresh scopes:

```bash
gh auth refresh -h github.com -s repo,read:project,project
gh auth status
```

## Dev quickstart

From `packages/sync-engine/`:

```bash
npm install
npm run build
node dist/cli.js status --config mapcs.dev.json
node dist/cli.js pull --dry-run --config mapcs.dev.json
node dist/cli.js push --dry-run --config mapcs.dev.json
```
