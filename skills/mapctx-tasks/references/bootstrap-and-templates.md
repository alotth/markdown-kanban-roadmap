# Bootstrap and Templates

Use this reference when `TASKS.md` does not exist, or when creating new baseline files.

## Bootstrap (When `TASKS.md` Does Not Exist)

Initialize exactly this layout at repository root:

```text
./TASKS.md
./tasks/
```

Rules:

1. Create `./TASKS.md`.
2. Create `./tasks/`.
3. Start IDs at `T-001` and `E-001`.
4. ID policy:
   - Use `E-XXX` when `type: epic`.
   - Use `T-XXX` for all other task types.
5. When a task has `detail`, create `./tasks/<ID>.md`.
6. Keep and maintain `## Work Domains`; task `domains` must use these domain keys.

## `TASKS.md` Baseline Template

Values below are examples. Replace with real project values.

```markdown
# Tasks - <project-name>

## Work Domains

- PARSER: example component for parser and serialization
- WEBVIEW: example component for kanban rendering and interaction
- ROADMAP: example component for roadmap timeline and progress
- CI: example component for validation and automation
- DOCS: example component for rules and docs

## Tasks

### [E-001] Epic title

  - id: E-001
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: 0/2
  - priority: null
  - workload: null
  - tags: []
  - domains: []
  - dependsOn: []
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/E-001.md

### [T-001] Task title

  - id: T-001
  - status: backlog
  - type: task
  - parent: null
  - subIssueProgress: null
  - priority: null
  - workload: null
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

- Keep updates in `TASKS.md` small and deterministic.
- Add optional extension keys (`iteration`, `assignees`, `externalLinks`, `milestone`, `specMode`) only when needed.
- Keep `domains` values aligned with keys declared in `## Work Domains`.
- Treat `touch` as deprecated legacy alias.
```

## Detail File Template (`./tasks/<ID>.md`)

Values below are examples. Replace with real task context.

```markdown
# <ID>

  - role: null
  - impact: null
  - estimatedEffort: null
  - prerequisites: []
  - blocking: []
  - filesAffected: []
  - testsRequired: []
  - summary: null
  - description: |
      ## Product Context
      Explain the user or business context this task addresses.

      ## User Story
      As a <persona>, I want <capability>, so that <outcome>.

      ## Expected Outcome
      Describe what should be true when this task is complete.

      ## Acceptance
      - [ ] Define behavior-focused acceptance criteria.

      ## Non-Goals
      - [ ] Capture out-of-scope items for this task.

      ## Constraints
      List non-negotiable boundaries and dependencies.

      ## Technical Notes
      Optional implementation hints after product intent is clear.

      ## Steps
      - [ ] Define implementation steps.
```
