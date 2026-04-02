# Tasks - mapctx-monorepo

## Work Domains

- SYNC: sync engine reliability and conflict handling
- WEBVIEW: OpenCode task UX and task detail flows
- EXTENSION: VS Code integration touchpoints
- DOCS: guides, migration notes, runbooks
- SKILLS: local skills and references for task and sync workflows
- HOOKS: session-start automation for OpenCode and other clients

## Tasks

### [T-001] Harden session-start sync hooks and OpenCode plugin integration

  - id: T-001
  - status: doing
  - type: feature
  - parent: null
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [hooks, automation, plugin]
  - domains: [SYNC, HOOKS, WEBVIEW, DOCS]
  - dependsOn: []
  - start: 2026-03-06
  - due: 2026-03-10
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-001.md

### [T-002] Add task log timeline sync using GitHub issue comments

  - id: T-002
  - status: backlog
  - type: feature
  - parent: null
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [sync-reliability, github]
  - domains: [SYNC, DOCS]
  - dependsOn: [T-001]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-002.md

### [T-003] Add iteration and assignees with backward compatibility

  - id: T-003
  - status: backlog
  - type: feature
  - parent: null
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [github-projects, phase-2]
  - domains: [SYNC, WEBVIEW, EXTENSION, DOCS, SKILLS]
  - dependsOn: [T-001]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-003.md

### [T-004] Map sub-issue progress from GitHub Projects GraphQL

  - id: T-004
  - status: backlog
  - type: feature
  - parent: null
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [github-projects, graphql]
  - domains: [SYNC, DOCS]
  - dependsOn: [T-003]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-004.md

### [T-005] Add migration docs and regression coverage for new fields

  - id: T-005
  - status: backlog
  - type: chore
  - parent: null
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [migration, compatibility]
  - domains: [SYNC, DOCS, SKILLS]
  - dependsOn: [T-003, T-004]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-005.md

### [T-006] Epic: Obsidian vault sync (future)

  - id: T-006
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [obsidian, epic]
  - domains: [SYNC, DOCS]
  - dependsOn: []
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-006.md

### [T-007] Epic: Clean and organize new repository

  - id: T-007
  - status: doing
  - type: epic
  - parent: null
  - subIssueProgress: 0/4
  - priority: high
  - workload: Normal
  - tags: [repo-hygiene, documentation, epic]
  - domains: [DOCS, SKILLS]
  - dependsOn: []
  - start: 2026-03-06
  - due: 2026-03-12
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-007.md
  - iteration: 2026-W10

### [T-008] Align skills and task references to new contract

  - id: T-008
  - status: review
  - type: task
  - parent: T-007
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [skills, contract]
  - domains: [SKILLS, DOCS]
  - dependsOn: []
  - start: 2026-03-06
  - due: 2026-03-07
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-008.md

### [T-009] Remove legacy task-model artifacts and outdated guidance

  - id: T-009
  - status: review
  - type: chore
  - parent: T-007
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [cleanup, skills]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-008]
  - start: 2026-03-06
  - due: 2026-03-08
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-009.md

### [T-010] Rewrite `rules/CLAUDE.md` to single-list contract

  - id: T-010
  - status: review
  - type: task
  - parent: T-008
  - subIssueProgress: null
  - priority: high
  - workload: Easy
  - tags: [rules, claude]
  - domains: [DOCS, SKILLS]
  - dependsOn: []
  - start: 2026-03-06
  - due: 2026-03-06
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-010.md

### [T-011] Rewrite `rules/.cursorrules` to single-list contract

  - id: T-011
  - status: review
  - type: task
  - parent: T-008
  - subIssueProgress: null
  - priority: high
  - workload: Easy
  - tags: [rules, cursor]
  - domains: [DOCS, SKILLS]
  - dependsOn: []
  - start: 2026-03-06
  - due: 2026-03-06
  - completed: null
  - externalId: null
  - updated: 2026-03-06
  - detail: ./tasks/T-011.md

### [E-001] Spec-Driven v3 contract and status model foundation

  - id: E-001
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: 4/6
  - priority: high
  - workload: Hard
  - tags: [sdd, contract, status-model]
  - domains: [SKILLS, DOCS, SYNC]
  - dependsOn: []
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/E-001.md

### [T-012] Approve naming and lifecycle defaults (`specMode`, `ready-for-do`)

  - id: T-012
  - status: review
  - type: task
  - parent: E-001
  - subIssueProgress: null
  - priority: high
  - workload: Easy
  - tags: [decision, naming, workflow]
  - domains: [SKILLS, DOCS]
  - dependsOn: []
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-012.md

### [T-013] Extend canonical task contract with `specMode`

  - id: T-013
  - status: review
  - type: feature
  - parent: E-001
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [contract, task-model, specmode]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-012]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-013.md

### [T-014] Update default status policy to include `ready-for-do`

  - id: T-014
  - status: review
  - type: feature
  - parent: E-001
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [status, workflow, ready-for-do]
  - domains: [SKILLS, DOCS, SYNC]
  - dependsOn: [T-012]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-014.md

### [T-015] Align agent rule packs with Spec-Driven v3 policy

  - id: T-015
  - status: review
  - type: task
  - parent: E-001
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [rules, agents, governance]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-012]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-015.md

### [T-016] Publish migration guide for status and naming changes

  - id: T-016
  - status: backlog
  - type: chore
  - parent: E-001
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [migration, docs, rollout]
  - domains: [DOCS, SKILLS]
  - dependsOn: [T-013, T-014, T-015]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-016.md

### [T-017] Define epic-ID migration policy (`T-xxx` -> `E-xxx`)

  - id: T-017
  - status: backlog
  - type: task
  - parent: E-001
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [ids, epic, compatibility]
  - domains: [SYNC, DOCS, SKILLS]
  - dependsOn: [T-013]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-017.md

### [E-002] Product-first task specification templates

  - id: E-002
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: 3/4
  - priority: high
  - workload: Hard
  - tags: [product, user-story, planning]
  - domains: [SKILLS, DOCS]
  - dependsOn: [E-001]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/E-002.md

### [T-018] Define product-first detail template for `tasks/T-XXX.md`

  - id: T-018
  - status: review
  - type: feature
  - parent: E-002
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [template, user-story, task-detail]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-013]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-018.md

### [T-019] Add risk-based auto-classification rules for `specMode`

  - id: T-019
  - status: review
  - type: feature
  - parent: E-002
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [specmode, scoring, policy]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-013]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-019.md

### [T-020] Update `mapctx-tasks` guidance for product-first planning

  - id: T-020
  - status: review
  - type: task
  - parent: E-002
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [skill, planning, product-first]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-018, T-019]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-020.md

### [T-021] Add product-oriented example detail files and runbook

  - id: T-021
  - status: backlog
  - type: chore
  - parent: E-002
  - subIssueProgress: null
  - priority: medium
  - workload: Easy
  - tags: [examples, docs, onboarding]
  - domains: [DOCS, SKILLS]
  - dependsOn: [T-018]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-021.md

### [E-003] Isolated generator/evaluator execution model

  - id: E-003
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: 0/5
  - priority: high
  - workload: Hard
  - tags: [evaluation, quality-gate, subagents]
  - domains: [SKILLS, SYNC]
  - dependsOn: [E-001, E-002]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/E-003.md

### [T-022] Define evaluator handoff contract and evidence bundle

  - id: T-022
  - status: backlog
  - type: task
  - parent: E-003
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [handoff, evaluator, contract]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-019]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-022.md

### [T-023] Implement isolated evaluator flow in task execution skill

  - id: T-023
  - status: backlog
  - type: feature
  - parent: E-003
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [subagent, evaluator, execution]
  - domains: [SKILLS, SYNC]
  - dependsOn: [T-022]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-023.md

### [T-024] Add optional parallel evaluator mode with `auto` fallback

  - id: T-024
  - status: backlog
  - type: feature
  - parent: E-003
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [parallel, capability-detect, evaluator]
  - domains: [SKILLS, SYNC]
  - dependsOn: [T-023]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-024.md

### [T-025] Standardize evaluation verdict model and status transitions

  - id: T-025
  - status: backlog
  - type: task
  - parent: E-003
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [verdict, transitions, quality]
  - domains: [SKILLS, DOCS]
  - dependsOn: [T-023]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-025.md

### [T-026] Add regression coverage for isolated evaluation behavior

  - id: T-026
  - status: backlog
  - type: task
  - parent: E-003
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [tests, evaluator, regression]
  - domains: [SYNC, SKILLS]
  - dependsOn: [T-023, T-024, T-025]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-026.md

### [E-004] Validation and execution-order tooling

  - id: E-004
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: 4/5
  - priority: high
  - workload: Hard
  - tags: [tooling, validator, planning]
  - domains: [SYNC, EXTENSION, WEBVIEW, DOCS]
  - dependsOn: [E-001]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/E-004.md

### [T-027] Implement `mapctx validate` command MVP

  - id: T-027
  - status: review
  - type: feature
  - parent: E-004
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [cli, validation, contract]
  - domains: [SYNC, DOCS]
  - dependsOn: [T-013, T-014]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-027.md

### [T-028] Add full contract checks to validator

  - id: T-028
  - status: review
  - type: task
  - parent: E-004
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [schema, ids, dependencies]
  - domains: [SYNC, DOCS]
  - dependsOn: [T-027]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-028.md

### [T-029] Implement `mapctx plan` DAG and wave planner

  - id: T-029
  - status: review
  - type: feature
  - parent: E-004
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [dag, waves, execution-order]
  - domains: [SYNC, WEBVIEW, EXTENSION]
  - dependsOn: [T-027]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-029.md

### [T-030] Add Mermaid and CLI outputs for execution tree

  - id: T-030
  - status: review
  - type: task
  - parent: E-004
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [mermaid, visualization, docs]
  - domains: [WEBVIEW, DOCS, EXTENSION]
  - dependsOn: [T-029]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-030.md

### [T-031] Integrate validation and planning checks in CI

  - id: T-031
  - status: backlog
  - type: chore
  - parent: E-004
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [ci, quality-gates, automation]
  - domains: [SYNC, DOCS]
  - dependsOn: [T-028, T-030]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-031.md

### [E-005] Methodology documentation (SDD + BMAD + GSD)

  - id: E-005
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: 0/4
  - priority: high
  - workload: Normal
  - tags: [documentation, methodology, onboarding]
  - domains: [DOCS, SKILLS]
  - dependsOn: [E-001]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/E-005.md

### [T-032] Create `docs/methodology.md` with SDD/BMAD/GSD strategy

  - id: T-032
  - status: backlog
  - type: task
  - parent: E-005
  - subIssueProgress: null
  - priority: high
  - workload: Normal
  - tags: [docs, methodology, strategy]
  - domains: [DOCS, SKILLS]
  - dependsOn: [T-012]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-032.md

### [T-033] Align root docs (`README`, `skills`, `contributing`) with methodology

  - id: T-033
  - status: backlog
  - type: chore
  - parent: E-005
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [readme, onboarding, docs]
  - domains: [DOCS, SKILLS]
  - dependsOn: [T-032]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-033.md

### [T-034] Migrate docs site to single-list model and new status terms

  - id: T-034
  - status: backlog
  - type: task
  - parent: E-005
  - subIssueProgress: null
  - priority: high
  - workload: Hard
  - tags: [docs-site, migration, consistency]
  - domains: [DOCS, WEBVIEW]
  - dependsOn: [T-032, T-033]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-034.md

### [T-035] Document adopted vs rejected ideas (including implicit naming)

  - id: T-035
  - status: backlog
  - type: task
  - parent: E-005
  - subIssueProgress: null
  - priority: medium
  - workload: Easy
  - tags: [adr, scope, conventions]
  - domains: [DOCS, SKILLS]
  - dependsOn: [T-032]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-035.md

### [E-006] Workflow layer inspired by GSD/BMAD

  - id: E-006
  - status: backlog
  - type: epic
  - parent: null
  - subIssueProgress: 0/5
  - priority: medium
  - workload: Hard
  - tags: [workflow, gsd, bmad]
  - domains: [SKILLS, SYNC, WEBVIEW]
  - dependsOn: [E-001, E-002, E-003, E-004]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/E-006.md

### [T-036] Create `mapctx-enrich-task` skill for context enrichment

  - id: T-036
  - status: backlog
  - type: feature
  - parent: E-006
  - subIssueProgress: null
  - priority: medium
  - workload: Hard
  - tags: [skill, enrichment, planning]
  - domains: [SKILLS, DOCS, SYNC]
  - dependsOn: [T-020]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-036.md

### [T-037] Create `mapctx-sprint-status` workflow and recommendations

  - id: T-037
  - status: backlog
  - type: feature
  - parent: E-006
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [status, dashboard, recommendations]
  - domains: [SKILLS, WEBVIEW, DOCS]
  - dependsOn: [T-029]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-037.md

### [T-038] Implement `mapctx-next` next-best-action flow

  - id: T-038
  - status: backlog
  - type: feature
  - parent: E-006
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [next, orchestration, workflow]
  - domains: [SKILLS, SYNC, WEBVIEW]
  - dependsOn: [T-023, T-037]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-038.md

### [T-039] Implement `mapctx-correct-course` workflow

  - id: T-039
  - status: backlog
  - type: feature
  - parent: E-006
  - subIssueProgress: null
  - priority: medium
  - workload: Normal
  - tags: [scope-change, correction, governance]
  - domains: [SKILLS, DOCS, SYNC]
  - dependsOn: [T-020, T-023]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-039.md

### [T-040] Add wave-based task execution support to operational loop

  - id: T-040
  - status: backlog
  - type: feature
  - parent: E-006
  - subIssueProgress: null
  - priority: medium
  - workload: Hard
  - tags: [waves, execution, dependency-order]
  - domains: [SYNC, SKILLS, WEBVIEW]
  - dependsOn: [T-023, T-029]
  - start: null
  - due: null
  - completed: null
  - externalId: null
  - updated: 2026-04-01
  - detail: ./tasks/T-040.md

## Notes

- Scope is focused on monorepo priorities: reliability, task UX, GitHub Projects, docs, and hooks/plugins.
- Legacy and fork-era tasks were intentionally removed.
