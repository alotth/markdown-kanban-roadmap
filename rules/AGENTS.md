# MapCtx Tasks Rules for AI Agents

These rules define how agents should create and maintain `TASKS.md` and `tasks/<ID>.md` files in this repository.

## TASKS.md structure

Use one single list model:

```markdown
# Tasks - <project-name>

## Work Domains

- COMPONENT: short scope description

## Tasks

### [T-001] Task title

  - id: T-001
  - status: backlog
  - type: task
  - parent: null
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: []
  - domains: []
  - dependsOn: []
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-001.md

## Notes

- Optional project notes
```

Do not use section-based columns like `## Backlog`, `## Doing`, `## Review`, `## Done`, `## Paused`.
Status is always represented by `status:` in each task.

## Required task fields

Every task in `## Tasks` must include these keys in this exact order:

1. `id`
2. `status`
3. `type`
4. `parent`
5. `subIssueProgress`
6. `priority`
7. `workload`
8. `tags`
9. `domains`
10. `dependsOn`
11. `start`
12. `due`
13. `completed`
14. `externalId`
15. `updated`
16. `detail`

Rules:

- `type` is required and should be one of `epic|feature|task|bug|chore`.
- `parent` is required as a key. Use parent task ID for subtasks, otherwise `null`.
- `subIssueProgress` is required as a key. Use for epics when known (for example `3/8`), otherwise `null`.
- `domains` is the canonical field for parallelization/conflict scope.
- `touch` is deprecated and accepted only for backward compatibility.
- Dates must use `YYYY-MM-DD`.
- Unknown scalar values use `null`.
- Empty list values should use `[]`.

## Optional extension fields

Add only when needed by project workflow or sync setup. If used, append after `detail`:

- `iteration`: cycle/sprint identifier
- `assignees`: list of assignee handles (for GitHub, prefer login names)
- `externalLinks`: multi-provider external references
- `milestone`: optional release marker
- `specMode`: optional depth mode (`lite|standard|strict|null`)

Do not use `defaultExpanded`.

## Status flow

Default status lifecycle:

- `backlog -> ready-for-do`
- `ready-for-do -> doing`
- `doing -> review`
- `review -> done`
- `doing -> paused`
- `paused -> doing`

Custom statuses are allowed when explicitly defined by the project.

When status changes:

- Always update `updated`.
- Set `completed` when entering completion state (`done` by default).
- Reset `completed: null` when moving out of completion state.

## Detail file format (`tasks/<ID>.md`)

Use this metadata-first format:

```markdown
# T-001

  - role: feature
  - impact: high
  - estimatedEffort: 2d
  - prerequisites: []
  - blocking: []
  - filesAffected: []
  - testsRequired: []
  - summary: One-line objective.
  - description: |
      ## Acceptance
      - [ ] Define acceptance criteria.

      ## Steps
      - [ ] Define implementation steps.

      ## Notes
      Additional context and constraints.
```

Rules:

- File heading must match task ID (`# <ID>`).
- Keep `description` as the last metadata key.
- Keep planning product-first: describe user context and expected outcome before technical notes.
- Put acceptance/steps/notes inside `description: |`.
- Do not use fenced ```md blocks for task description format.

## Project management patterns for agents

Use these planning rules by default:

1. Start with outcomes, then execution.
   - Create epics for major outcomes.
   - Create feature/task/bug/chore items for execution.
   - Add subtasks only when decomposition improves delivery clarity.

2. Keep task size delivery-friendly.
   - Prefer tasks that can be completed in a few days.
   - Split oversized tasks before moving them to `doing`.

3. Keep WIP low.
   - Avoid many concurrent `doing` tasks.
   - Finish in-progress work before opening new streams.

4. Make dependencies explicit and minimal.
   - Use `dependsOn` only for real blocking relationships.
   - Avoid dependency chains that are longer than needed.

5. Keep definitions of done testable.
   - Use clear acceptance checklists in detail files.
   - Keep `testsRequired` current with real validation commands.

6. Preserve low-conflict edits.
   - Prefer editing only the target task block.
   - During status transitions, prefer changing `status`, `updated`, and `completed` only.

## Agent execution checklist

When creating or editing tasks:

1. Scan existing IDs and use the next sequential `T-XXX`.
2. Keep required field order exact.
3. Keep task ordering stable; append new tasks at end of `## Tasks`.
4. Update `updated` for every touched task.
5. Validate no duplicate IDs.
6. Ensure every referenced `detail` file exists (or set `detail: null`).
