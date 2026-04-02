# Validate Flow

Use this flow to check contract health before planning.

## Command Templates

Preferred (local binary):

```bash
mapcs validate --config <config-path> [--tasks-file <tasks-path>] [--json]
```

Fallback (npx):

```bash
npx --yes --package @mapctx/sync-engine mapcs validate --config <config-path> [--tasks-file <tasks-path>] [--json]
```

## Interpretation

- `PASS` with warnings: planning can proceed, but include warning summary.
- `FAIL`: stop planning and report top blocking errors.

## Typical Blocking Classes

- missing required keys or key order drift
- invalid statuses
- missing detail files
- invalid `domains` keys
- dependency cycles
