# MapCtx Skills

This directory contains reusable skill packs for AI-assisted workflows.

## Available Skills

- `mapctx-tasks`: maintain single-list `TASKS.md` (V2 status model)
- `mapctx-sync-engine`: run safe TASKS <-> GitHub sync operations
- `mapctx-plan-engine`: run `mapcs validate/plan` for contract and wave planning
- `mapctx-ralph-tasks`: run Ralph task-loop workflow from `/mapctx-ralph-tasks`

## Intended Use

- OpenCode users
- Claude-compatible agent workflows
- Cursor users with custom agent/task instructions

## Notes

- Skills are versioned with the monorepo.
- When task format contracts change, update both skill docs and package docs in the same PR.
- Task ID convention is prefix-based: use `E-XXX` for `type: epic` and `T-XXX` for all other task types.
- Detail files should follow `./tasks/<ID>.md` (for example `./tasks/E-001.md`, `./tasks/T-014.md`).
