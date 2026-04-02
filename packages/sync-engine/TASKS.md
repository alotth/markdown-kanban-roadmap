# Kanban Sync Engine Execution

## Work Domains

- SYNC: synchronization engine and orchestration logic
- GITHUB: GitHub API and project integration behavior
- PROJECT: GitHub Projects field/status mapping
- DOCS: documentation and guidance updates
- CONFIG: configuration and setup workflow
- CLI: command-line behavior and UX
- PARSER: TASKS markdown parsing and serialization
- TEST: automated coverage and regression validation

## Tasks

### [T-001] Sync Project date fields from TASKS.md on push

  - id: T-001
  - status: done
  - priority: high
  - workload: Hard
  - tags: []
  - domains: [SYNC, GITHUB, PROJECT]
  - dependsOn: []
  - start: 2026-02-24
  - due: 2026-02-24
  - completed: 2026-02-24
  - externalId: github:issue:1
  - updated: 2026-02-25
  - detail: ./tasks/T-001.md

### [T-002] Document Roadmap date-field requirements in config guides

  - id: T-002
  - status: done
  - priority: medium
  - workload: Normal
  - tags: []
  - domains: [DOCS, CONFIG]
  - dependsOn: [T-001]
  - start: 2026-02-24
  - due: 2026-02-24
  - completed: 2026-02-24
  - externalId: github:issue:2
  - updated: 2026-02-25
  - detail: ./tasks/T-002.md

### [T-003] Configure real Project date field IDs and run first sync validation

  - id: T-003
  - status: review
  - priority: high
  - workload: Normal
  - tags: []
  - domains: [CONFIG, PROJECT, CLI]
  - dependsOn: [T-001, T-002]
  - start: 2026-02-24
  - due: 2026-02-25
  - completed: null
  - externalId: github:issue:3
  - updated: 2026-02-25
  - detail: ./tasks/T-003.md

### [T-004] Pull Project date fields back into local task model

  - id: T-004
  - status: done
  - priority: high
  - workload: Hard
  - tags: []
  - domains: [SYNC, GITHUB, PARSER]
  - dependsOn: [T-003]
  - start: 2026-02-25
  - due: 2026-02-27
  - completed: 2026-02-24
  - externalId: github:issue:4
  - updated: 2026-02-25
  - detail: ./tasks/T-004.md

### [T-005] Add optional Project field sync for priority and workload

  - id: T-005
  - status: backlog
  - priority: medium
  - workload: Hard
  - tags: []
  - domains: [SYNC, GITHUB, PROJECT]
  - dependsOn: [T-004]
  - start: 2026-02-26
  - due: 2026-03-01
  - completed: null
  - externalId: github:issue:5
  - updated: 2026-02-25
  - detail: ./tasks/T-005.md

### [T-006] Add automated tests for Project field date operations

  - id: T-006
  - status: backlog
  - priority: medium
  - workload: Normal
  - tags: []
  - domains: [TEST, SYNC]
  - dependsOn: [T-004]
  - start: 2026-02-27
  - due: 2026-03-02
  - completed: null
  - externalId: github:issue:6
  - updated: 2026-02-25
  - detail: ./tasks/T-006.md

### [T-007] Add full support for custom status workflows and configurable completion states

  - id: T-007
  - status: done
  - priority: high
  - workload: Hard
  - tags: []
  - domains: [SYNC, CONFIG, TEST, DOCS]
  - dependsOn: [T-004]
  - start: 2026-02-24
  - due: 2026-02-24
  - completed: 2026-02-24
  - externalId: github:issue:7
  - updated: 2026-02-25
  - detail: ./tasks/T-007.md

## Notes







- Source strategy: local-first.
- Keep `externalId: null` until first link to GitHub issues/projects.
