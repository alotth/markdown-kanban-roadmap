# MapCtx Tasks Rules for Claude

Use this file when Claude edits `TASKS.md` and `tasks/<ID>.md`.

## Board model

- Use one single list under `## Tasks`.
- Do not use `## Backlog`, `## Doing`, `## Review`, `## Done`, `## Paused` sections.
- Workflow state is always the `status` field inside each task block.

## Required task format (`TASKS.md`)

Use this exact key order in every task:

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

- `type` is required: `epic|feature|task|bug|chore`.
- `parent` is required as a key; use parent task ID for subtasks, else `null`.
- `subIssueProgress` is required as a key; use for epics when known (example `3/8`), else `null`.
- `domains` is the canonical field for parallelization/conflict scope.
- `touch` is deprecated and accepted only for backward compatibility.
- Use `YYYY-MM-DD` for dates.
- Use `null` for unknown scalar values and `[]` for empty lists.

## Optional extension keys

Add only when needed, after `detail`:

- `iteration`
- `assignees`
- `externalLinks`
- `milestone`
- `specMode` (`lite|standard|strict|null`)

Do not use `defaultExpanded`.

## Detail file format (`tasks/<ID>.md`)

Use metadata-first format:

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
```

Rules:

- Heading must match task ID (`# <ID>`).
- Keep `description` as last key.
- Keep planning product-first: capture user context and expected outcome before technical notes.
- Keep acceptance/steps/notes inside `description: |`.
- Do not use fenced ```md blocks for task description.

## Status transitions

Default lifecycle:

- `backlog -> ready-for-do`
- `ready-for-do -> doing`
- `doing -> review`
- `review -> done`
- `doing -> paused`
- `paused -> doing`

On every status change:

- update `updated`
- set `completed` when entering completion state (`done` by default)
- reset `completed: null` when leaving completion state

## Planning behavior for Claude

1. Plan from outcome to execution.
   - Use epics for major outcomes.
   - Use tasks/bugs/chore/features for delivery units.
   - Use subtasks only when decomposition improves execution clarity.

2. Keep work-in-progress low.
   - Avoid opening many `doing` tasks at once.

3. Keep tasks small and testable.
   - Prefer tasks that can finish in a few days.
   - Keep acceptance and `testsRequired` realistic.

4. Keep dependencies explicit and minimal.
   - Use `dependsOn` only for real blockers.

5. Keep edits low-conflict.
   - Keep task order stable.
   - Append new tasks at end of `## Tasks`.
   - During transitions, prefer editing only `status`, `updated`, and `completed`.
