# Plan Flow

Use this flow to compute dependency waves after validation passes.

## Command Templates

Preferred (local binary):

```bash
mapcs plan --config <config-path> [--tasks-file <tasks-path>] [--json] [--mermaid]
```

Fallback (npx):

```bash
npx --yes --package @mapctx/sync-engine mapcs plan --config <config-path> [--tasks-file <tasks-path>] [--json] [--mermaid]
```

## Output to Capture

- total tasks
- active tasks
- wave count
- wave 1 task IDs
- cycle task IDs (if any)
- recommended next tasks

## Reporting Pattern

1. Confirm validation status from prior step.
2. Present waves compactly (first 2-3 waves inline).
3. Highlight blocked/cycle conditions.
4. End with one next operational action.
