# MapCtx - Multi-Agent Project Context

A multi-agent project context workspace for Markdown tasks, roadmap visualization, and sync workflows.

MapCtx is an AI-first workspace for planning and execution with:

- local task boards in `TASKS.md`
- detailed task docs in `tasks/T-XXX.md`
- Kanban/Roadmap UI (VS Code + OpenCode plugin)
- bidirectional sync with GitHub Issues + GitHub Projects v2 (via `@mapctx/sync-engine`)

**Install extension:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=alotth.mapctx)

## What is in this monorepo

- `packages/vscode-extension/`: VS Code/Cursor extension (`mapctx`)
- `packages/opencode-plugin/`: OpenCode UI plugin assets + installer flow
- `packages/sync-engine/`: `@mapctx/sync-engine` CLI/library for sync
- `packages/core/`: shared parser/model helpers
- `skills/`: reusable AI skills for OpenCode/Claude/Cursor
- `rules/`: agent rules (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`)

Contributor guide: `CONTRIBUTING.md`

## Core capabilities

- Local-first task management in Markdown with deterministic structure
- Task hierarchy support (`type`, `parent`, `subIssueProgress`)
- External detail files for large task descriptions and checklists
- Kanban + roadmap visualization in VS Code
- OpenCode plugin tab for kanban/roadmap workflows
- Sync operations for Issues + Projects v2:
  - `status`, `pull`, `push`, `bootstrap`, `reconcile`
  - dry-run and conflict-oriented workflows

For sync operational details, see `packages/sync-engine/README.md` and `packages/sync-engine/DOCUMENTATION.md`.

## Quick start

### 1) Install dependencies

```bash
npm ci
```

### 2) Build key packages

```bash
npm run compile
npm run build:sync-engine
npm run build:opencode-plugin
```

### 3) Run tests

```bash
npm test
npm run test:sync-engine
```

## Use the VS Code extension

You can use MapCtx from the Marketplace build or run it locally.

Local dev flow:

1. Run `npm run compile`
2. Press `F5` in VS Code (Extension Development Host)
3. Open a folder with a `TASKS.md`
4. Use command palette action to open the Kanban board

Package local VSIX:

```bash
cd packages/vscode-extension
npx @vscode/vsce package --out ../../mapctx-local.vsix
```

## Use sync engine (`@mapctx/sync-engine`)

Run with `npx` (no global install required):

```bash
npx --yes --package @mapctx/sync-engine mapcs status
```

Typical safe flow:

```bash
mapcs pull
mapcs status
mapcs push
```

Safety rule: run `pull` before `push` in the same session.

Main files:

- `mapcs.config.json`
- `.mapcs/state.json`
- `.mapcs/conflicts/<task-id>.reconcile.md`

### GitHub auth scopes

To sync Issues + Projects v2, token scopes must include:

- `repo`
- `read:project`
- `project`

Refresh example:

```bash
gh auth refresh -h github.com -s repo,read:project,project
gh auth status
```

## AI skills and rules

Available skills are documented in `skills/README.md`:

- `mapctx-tasks`: maintain V2 single-list `TASKS.md`
- `mapctx-sync-engine`: safe sync operations and conflict handling
- `mapctx-plan-engine`: validate task contract and compute wave plans
- `mapctx-ralph-tasks`: execute Ralph task loops via slash trigger

Rule packs for AI assistants:

- `rules/AGENTS.md`
- `rules/CLAUDE.md`
- `rules/.cursorrules`

## OpenCode plugin

Build + install from repo root:

```bash
npm run build:opencode-plugin
npm run install:opencode-plugin
```

Installed location:

- `~/.config/opencode/plugins/kanban-roadmap/`
- `~/.config/opencode/plugins/kanban-roadmap.js`

More details: `packages/opencode-plugin/README.md`

## Release tags

Monorepo releases are split by tag prefix:

- `ext-vX.Y.Z` -> VS Code extension
- `sync-vX.Y.Z` -> `@mapctx/sync-engine`
- `plugin-vX.Y.Z` -> OpenCode plugin

Runbooks:

- `docs/releases/tag-strategy.md`
- `docs/releases/extension.md`
- `docs/releases/engine.md`
- `docs/releases/opencode-plugin.md`

## Documentation map

- Main contributor docs: `CONTRIBUTING.md`
- Sync engine guide: `packages/sync-engine/DOCUMENTATION.md`
- Sync quick commands: `packages/sync-engine/CHEATSHEET.md`
- Skills overview: `skills/README.md`
- Static docs site source: `docs/`
