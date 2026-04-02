# Status and Sync Rules

Use this reference for transitions and external sync behavior.

## Status Lifecycle

Default lifecycle (used only when project does not define a custom workflow):

- `backlog -> ready-for-do`: clarified and ready to execute
- `ready-for-do -> doing`: start work
- `doing -> review`: request review
- `review -> done`: approved/completed
- `doing -> paused`: temporary stop
- `paused -> doing`: resume

Custom statuses are allowed when project workflow requires them (for example `design`).
Custom workflows may extend defaults or replace them entirely.
When custom statuses exist, keep transitions explicit and deterministic for that project.

## Low-Conflict Edit Rules

- Prefer updating only `status` and `updated` during transitions.
- Set `completed: YYYY-MM-DD` when status reaches the project completion state.
- Reset `completed: null` when moving out of the project completion state.
- Keep task position stable unless creating a new task.

## Source Strategy and Sync

- If source is existing GitHub Project, use project mapping as source of truth.
- If source is local-first, keep `externalId: null` until linked.
- Use provider-agnostic external mapping format: `<provider>:<entity>:<id>`.
- Recommended GitHub format: `github:issue:<number>`.
- Required hierarchy/task typing mapping:
   - `type` <-> issue label `type:<value>` (for example `type:epic`, `type:feature`).
   - `parent` <-> parent issue relationship for subtasks.
   - `subIssueProgress` is usually epic-only, remote-derived/read-mostly, and should not drive status transitions.
- Optional mapping:
   - `assignees` <-> issue assignees (prefer login names).
   - `iteration` <-> project iteration field when configured.
- Keep provider-specific payload out of `TASKS.md`.

## Validation Checklist

- No duplicate task IDs.
- `## Work Domains` is present and stable unless domain edits were explicitly requested.
- Every task appears once under `## Tasks`.
- Canonical field order is preserved.
- `domains` values map to declared `## Work Domains` keys (or are intentionally empty).
- `touch` may exist only in legacy tasks and should be migrated when edited.
- `updated` changed for every edited task.
- `completed` matches completion policy (completion state => date, other states => `null`).
