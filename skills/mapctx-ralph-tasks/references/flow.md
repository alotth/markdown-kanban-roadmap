# Flow

Use this sequence for `/mapctx-ralph-tasks`.

## 1) Parse and Normalize

- Parse input as `[/mapctx-ralph-tasks] [dry-run?] do [task-id] [--max-iterations N?]`.
- Normalize task ID:
- `t-1` => `T-001`
- `t-23` => `T-023`
- `T-003` => `T-003`
- `e-1` => `E-001`
- `e-9` => `E-009`
- `E-012` => `E-012`
- Fail fast if ID cannot be normalized.

## 2) Validate Board State

- Read `TASKS.md` and locate exact task block by `id`.
- Ensure the ID is unique in the file.
- Read `detail` field and verify referenced file exists.
- If detail file missing, fail fast with path and expected location.

## 3) Transition to Doing

- Apply low-conflict edit in target block:
  - `status: doing`
  - `updated: YYYY-MM-DD`
  - `completed: null` (if not already null)
- Do not reorder tasks.
- Do not modify unrelated blocks.

## 4) Decide Iterations

- If user provided `--max-iterations`, use it.
- Otherwise map from `workload`:
  - `Easy` => `4`
  - `Normal` => `8`
  - `Hard` => `14`
  - `Extreme` => `20`
  - `null` or unknown => `8`

## 5) Build Ralph Prompt

- Include both files as explicit context:
- `@TASKS.md`
  - `@tasks/<ID>.md`
- Include component-scoping instruction from board metadata:
  - respect `## Work Domains` definitions
  - prioritize implementation on domain keys listed in task `domains`
  - accept `touch` only as deprecated legacy alias
- Include acceptance intent from detail `description` Markdown when present.
- Force deterministic completion markers:
  - `<promise>COMPLETE_TESTED</promise>` when implementation and tests pass.
  - `<promise>COMPLETE_REVIEW</promise>` when implementation is done but needs review or tests were not validated.

## 6) Execute Ralph

- Use command template from `prompt-contract.md`.
- Always include `--agent codex --model gpt-5-codex`.
- Execute with retry policy from `retry-policy.md`.
- In `dry-run`, do not execute; return fully rendered command and planned transitions.

## 7) Finalize Status

- Parse Ralph output marker in priority order:
  1. `COMPLETE_TESTED`
  2. `COMPLETE_REVIEW`
- Transition task:
  - `COMPLETE_TESTED` => `status: done`, `completed: YYYY-MM-DD`
  - `COMPLETE_REVIEW` => `status: review`, `completed: null`
- Always set `updated: YYYY-MM-DD`.

## 8) Validate and Report

- Validate target task block still has canonical fields.
- Validate status is part of workflow (`backlog|ready-for-do|doing|review|done|paused` unless project defines custom model).
- Return concise report:
  - ID and title
  - command executed
  - max iterations used and source
  - retries performed
  - final marker and status transition
