# mapcs Cheat Sheet

## Auth

```bash
gh auth status
gh auth refresh -h github.com -s repo,read:project,project
```

## Daily flow

```bash
mapcs pull
mapcs status
mapcs push
```

## Safe preview

```bash
mapcs pull --dry-run
mapcs push --dry-run
```

## Reconciliation

```bash
mapcs reconcile --list
mapcs reconcile T-002
mapcs reconcile T-002 --accept local
mapcs reconcile T-002 --accept remote
mapcs push
```

## Bootstrap

```bash
mapcs bootstrap --from local --dry-run --confirm
mapcs bootstrap --from local --confirm

mapcs bootstrap --from github --dry-run
mapcs bootstrap --from github
```

## Project setup (GitHub)

```bash
gh project create --owner alotth --title "Markdown Kanban Roadmap V2 Execution"
gh project field-create <project-number> --owner alotth --name Pipeline --data-type SINGLE_SELECT --single-select-options "Backlog,Doing,Review,Done,Paused"
gh project link <project-number> --owner alotth --repo markdown-kanban-roadmap
```

## Status workflow config snippets

Default-compatible:

```json
{
  "allowedStatuses": ["backlog", "doing", "review", "done", "paused"],
  "completionStatuses": ["done"]
}
```

Fully custom:

```json
{
  "allowedStatuses": ["inbox", "design", "build", "qa", "released"],
  "completionStatuses": ["released"],
  "statusMap": {
    "inbox": "Inbox",
    "design": "Design",
    "build": "Build",
    "qa": "QA",
    "released": "Released"
  }
}
```

Rules:

- `statusMap` must cover all `allowedStatuses`
- `completionStatuses` must be subset of `allowedStatuses`
- GitHub Pipeline options must match `statusMap` values

## Common flags

- `--config <path>`
- `--tasks-file <path>`
- `--dry-run`
- `--force`
- `--json`
