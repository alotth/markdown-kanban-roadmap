# AI Skill Draft - mapcs

This draft describes an AI workflow skill for using `mapcs` safely in dynamic sessions.

## Purpose

Enable an AI agent to run sync operations with low risk, low token usage, and clear user feedback.

## Trigger situations

- Session starts and project has `mapcs.config.json`
- User asks to update roadmap from GitHub
- User asks to publish local task changes
- User asks to diagnose divergence/conflicts

## Default policy

1. Run `mapcs status` first.
2. If remote differs, run `mapcs pull` before any push.
3. Use `--dry-run` before bootstrap or large updates.
4. Explain impact before write operations.

## Recommended AI command flow

### Session start

1. `mapcs status`
2. If remote changes exist: `mapcs pull`
3. Confirm local file updated, then continue planning/editing

### Before publishing

1. `mapcs status`
2. If stale relative to remote: `mapcs pull`
3. `mapcs push`
4. `mapcs status` to confirm convergence

### New project bootstrap (local-first)

1. `mapcs bootstrap --from local --dry-run`
2. Show summary (issues to create, statuses to map, links to write)
3. `mapcs bootstrap --from local`
4. `mapcs status`

### Existing GitHub project bootstrap (remote-first)

1. `mapcs bootstrap --from github --dry-run`
2. Show summary (tasks to create/update locally)
3. `mapcs bootstrap --from github`
4. `mapcs status`

## Guardrails

- Never run `push` before a successful `pull` in the active session.
- Never overwrite local-only fields from remote.
- Never delete tasks automatically unless user explicitly requests destructive sync mode.
- If matching is ambiguous, pause and request one explicit mapping decision.

## Minimal output format for AI responses

- Current sync state
- Commands executed
- Fields changed (high level)
- Any conflicts and resolution policy applied
- Recommended next action
