# Custom Statuses Policy

Default statuses are (only when project does not define custom statuses):

- `backlog`
- `ready-for-do`
- `doing`
- `review`
- `done`
- `paused`

Recommended default transition path:

- `backlog -> ready-for-do`
- `ready-for-do -> doing`
- `doing -> review`
- `review -> done`
- `doing -> paused`
- `paused -> doing`

Projects may add extra statuses (for example `design`) or fully replace default statuses.

## Rules

1. Ask for the project status model when status names/order matter.
2. If user requests custom statuses, treat that list as canonical for the project.
3. Custom model may extend defaults or replace defaults entirely.
4. Define completion state explicitly when model is custom.
5. Keep `completed` behavior tied to completion state:
   - completion state -> set `completed: YYYY-MM-DD`
   - non-completion state -> set `completed: null`

## Completion State Policy

- Default completion state: `done`.
- For custom workflows, support custom completion state names (for example `shipped`, `released`, `completed`).
- Keep one primary completion state unless user explicitly requires multiple completion states.

## Sync Alignment

When GitHub sync is enabled:

1. Ensure Project Pipeline options include all local statuses.
2. Ensure `statusMap` covers every local status.
3. Ensure completion-state mapping is explicit if completion status is not `done`.
4. Do not drop unknown statuses during pull/push/bootstrap.

For operational sync steps, use skill `mapctx-sync-engine`.
