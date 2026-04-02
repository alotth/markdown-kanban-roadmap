---
name: mapctx-tasks
description: Create and maintain status-based single-list TASKS.md files with deterministic low-conflict edits; trigger when requests mention `status:` updates, `## Tasks` model, sync metadata (`externalId`), epic/subtask hierarchy, and planning workflows.
---

# Kanban Tasks (Single-List)

Use this skill for boards where tasks live under one `## Tasks` section and workflow state is in `status:`.

Keep this file focused on decisions and workflow. Load detailed templates and field specs from references:

- `./references/bootstrap-and-templates.md`
- `./references/field-types-and-contract.md`
- `./references/status-and-sync.md`
- `./references/custom-statuses.md`

For operational GitHub sync commands (`status`, `pull`, `push`, `bootstrap`, `reconcile`), use skill `mapctx-sync-engine`.

## Workflow

1. Detect format before editing.
   - Confirm tasks are in one `## Tasks` list.
   - Confirm `## Work Domains` exists and stays in `TASKS.md` (do not remove it during normalization).
   - Confirm each task has `status:`.
   - Confirm each task has `domains:` and values align with domain keys from `## Work Domains` when that section is defined.
   - Accept legacy `touch:` when present, but treat it as deprecated alias for `domains`.
   - If section headers (`## Backlog`, `## Doing`, ...) are primary, normalize to single-list format before making changes.

2. Confirm source strategy (required decision gate).
   - Present source options and ask the user to choose one:
     1) Import tasks from an existing GitHub Project.
     2) Create local `TASKS.md` first (with optional future export to GitHub Project).
   - Do not proceed until one option is explicitly selected.

3. Read current board state.
   - If `TASKS.md` exists, scan all IDs to compute next `T-XXX` and `E-XXX` while keeping task order stable.
   - ID policy:
     - Use `E-XXX` when `type: epic`.
     - Use `T-XXX` for all other executable work (`feature`, `task`, `bug`, `chore`, or `null` when unresolved).
   - If `TASKS.md` does not exist, run bootstrap from `./references/bootstrap-and-templates.md` and start at `T-001` and `E-001`.

4. Apply operation with minimal diff.
   - Move status by editing only `status:` when possible.
   - Add new tasks at end of `## Tasks`.
   - Keep required canonical task fields present; if unknown, use `null`.
   - Preserve `## Work Domains` as project-level registry for valid `domains` values.
   - When creating/updating tasks, keep `domains` explicit (`[]` when unknown) and prefer existing domain keys.
   - For legacy tasks using `touch`, migrate to `domains` on write.
   - For optional fields, add only when needed by project workflow or sync setup.
   - Treat statuses as project-defined workflow states. If none are specified, use default `backlog|ready-for-do|doing|review|done|paused`.
   - Allow full rename/replacement of defaults when user defines a custom status model.

5. Enforce contract.
   - Keep exact field order and types from `./references/field-types-and-contract.md`.
   - Keep hierarchy semantics deterministic:
     - `type` is required in every task.
     - `parent` is populated for subtasks (otherwise `null`).
     - `subIssueProgress` is populated for epics when known (otherwise `null`).
   - Keep dates as `YYYY-MM-DD`.
   - Keep `externalId` provider-agnostic (`<provider>:<entity>:<id>`), or `null`.

6. Keep metadata consistent.
   - Update `updated` on every task edit.
   - Use the project completion state policy from `./references/custom-statuses.md`.
   - By default, completion state is `done`; if project defines another completion state, follow it.

7. Maintain detail files when relevant.
   - Store short objective in `summary` and full Markdown context in `description: |` in `./tasks/<ID>.md`.
   - Keep planning product-first in detail files: clarify user context and desired outcome before technical implementation notes.
   - Keep `TASKS.md` compact and deterministic.

8. Validate before returning.
   - No duplicate IDs.
   - `## Work Domains` exists and remains unchanged unless user explicitly requested domain edits.
   - Required fields present in canonical order.
   - Optional fields, when present, follow extension order.
   - `domains` values use domain keys declared in `## Work Domains` (or are `[]`/`null` if domain model is intentionally not defined).
   - Every task appears once in the single list.

## Source Strategy Gate (Required)

Before creating a new `TASKS.md` or syncing tasks, present these options and ask for one explicit choice:

1. Import tasks from an existing GitHub Project.
2. Create local `TASKS.md` first (and export to GitHub Project later, or not).

Decision rules:

- If option 1 is selected, use the existing GitHub Project as source of truth for linkage and mapping.
- If option 2 is selected, initialize local files first and keep `externalId: null` until linked.
- If option 2 is selected and user later wants sync, create/sync GitHub Project from local `TASKS.md`.
- Do not assume project creation or linkage without explicit user confirmation.
