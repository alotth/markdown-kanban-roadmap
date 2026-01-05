# Markdown Kanban & Roadmap - Rules for AI Agents

> **Note for AI Assistants**: These rules are suggested guidelines for AI assistants to understand how to properly create and manage tasks in the Markdown Kanban format. When working with `TASKS.md` files, follow these rules to ensure compatibility with the VS Code Markdown Kanban extension.

This document provides comprehensive rules for AI agents to create and manage tasks in the Markdown Kanban format that works with the VS Code Markdown Kanban extension.

## 📋 TASKS.md File Structure

The `TASKS.md` file must follow the Kanban format with these required sections:

- **Backlog**: Tasks that haven't been started yet
- **Doing**: Tasks currently in progress
- **Review**: Tasks awaiting review
- **Done**: Completed tasks
- **Paused**: Temporarily paused tasks
- **Notas**: General project notes (optional)

## 🏷️ Task Format

### Basic Structure

Each task must follow this format:

```markdown
### Task Name

  - id: T-001
  - tags: [tag1, tag2, tag3]
  - priority: high|medium|low
  - workload: Easy|Normal|Hard|Extreme
  - milestone: sprint-26-1_1
  - start: YYYY-MM-DD
  - due: YYYY-MM-DD
  - updated: YYYY-MM-DD
  - completed: YYYY-MM-DD
  - detail: ./tasks/T-001.md
  - defaultExpanded: true|false
```

### Task Properties

#### Required
- **`id`**: Unique task identifier (format: `T-XXX` where XXX is a sequential number)
  - Example: `T-001`, `T-002`, `T-010`

#### Optional
- **`tags`**: Array of tags for categorization
  - Format: `[tag1, tag2, tag3]`
  - Example: `[backend, frontend, ui, components]`
  - Use descriptive and consistent tags

- **`priority`**: Priority level
  - Values: `high`, `medium`, `low`
  - Kanban display: 🔴 High, 🟡 Medium, 🟢 Low

- **`workload`**: Estimated effort
  - Values: `Easy`, `Normal`, `Hard`, `Extreme`
  - Kanban display: 🟢 Easy, 🟡 Normal, 🔴 Hard, 🔴🔴 Extreme

- **`milestone`**: Milestone or marker the task belongs to
  - Suggested format: `sprint-year-month_number` (e.g., `sprint-26-1_1` for January 2026, sprint 1)
  - Can use custom strings (e.g., `reconciliation-nn`, `timezone-utc`)

- **`start`**: Start date
  - Format: `YYYY-MM-DD`
  - Example: `2025-12-01`

- **`due`**: Due date
  - Format: `YYYY-MM-DD`
  - Example: `2026-01-15`

- **`updated`**: Last update date
  - Format: `YYYY-MM-DD`
  - Update whenever the task is modified

- **`completed`**: Completion date
  - Format: `YYYY-MM-DD`
  - Filled when task is moved to "Done"

- **`detail`**: Path to detail file
  - Format: `./tasks/T-XXX.md`
  - Example: `./tasks/T-001.md`
  - Points to a markdown file with detailed description

- **`defaultExpanded`**: Whether task should be expanded by default
  - Values: `true` or `false`
  - When `true`, task shows all details when loaded

### Inline Description

If not using a detail file (`detail`), you can include inline description:

```markdown
### Task Name

  - id: T-001
  - tags: [backend]
  - priority: high
    ```md
    Detailed task description here.
    Can contain multiple lines and markdown formatting.
    ```
```

## 📄 Detail Files (tasks/T-XXX.md)

When using `detail: ./tasks/T-XXX.md`, the file must follow this format:

```markdown
# T-001

  - steps:
      - [ ] Step 1 (not completed)
      - [x] Step 2 (completed)
      - [ ] Step 3 (not completed)
    ```md
    Detailed task description.
    Can include context, requirements, examples, etc.
    ```
```

### Steps Format

- Use `- [ ]` for uncompleted steps
- Use `- [x]` for completed steps
- Indentation: minimum 6 spaces before `-`
- Example:
  ```markdown
  - steps:
      - [ ] Research existing patterns
      - [x] Create schema design
      - [ ] Implement endpoints
  ```

## ✅ Critical Rules

1. **Indentation**: All task properties must have 2 spaces indentation
2. **Date Format**: Always use `YYYY-MM-DD` for all dates
3. **Unique IDs**: Each task must have a unique ID in format `T-XXX`
4. **Tags**: Use arrays in format `[tag1, tag2]` with commas and spaces
5. **Descriptions**: Use markdown code blocks with ` ```md ` for descriptions
6. **Steps**: Only in detail files, not in main TASKS.md
7. **Sections**: Maintain Kanban sections (Backlog, Doing, Review, Done, Paused)

## 🔄 Status Flow

- **Backlog** → **Doing**: When work starts
- **Doing** → **Review**: When awaiting review
- **Review** → **Done**: When approved/completed
- **Doing** → **Paused**: When temporarily paused
- **Paused** → **Doing**: When resumed

## 📝 Complete Examples

### Simple Task (no detail file)

```markdown
### Implement user authentication

  - id: T-010
  - tags: [authentication, security, backend, frontend]
  - priority: high
  - workload: Hard
  - milestone: sprint-26-1_2
  - start: 2026-01-15
  - due: 2026-02-15
```

### Task with Inline Description

```markdown
### Create analytics dashboard

  - id: T-011
  - tags: [frontend, dashboard, analytics, visualization]
  - priority: medium
  - milestone: sprint-26-1_2
  - start: 2026-01-15
  - due: 2026-02-10
    ```md
    Create an analytics visualization with charts and metrics.
    Include filters by date and category.
    ```
```

### Task with Detail File

```markdown
### Implement n:n reconciliation between multiple sources

  - id: T-001
  - tags: [reconciliation, multiple-sources, n-to-n, backend, database]
  - priority: high
  - workload: Hard
  - milestone: sprint-26-1_1
  - start: 2026-01-01
  - due: 2026-01-26
  - detail: ./tasks/T-001.md
  - defaultExpanded: false
```

## ⚠️ Common Mistakes to Avoid

1. ❌ Don't use incorrect indentation (must be 2 spaces for properties)
2. ❌ Don't mix date formats (always `YYYY-MM-DD`)
3. ❌ Don't forget to update `updated` when modifying tasks
4. ❌ Don't put steps directly in TASKS.md (only in detail files)
5. ❌ Don't use duplicate IDs
6. ❌ Don't forget to move tasks between sections when status changes

## 🎯 Best Practices

1. ✅ Use sequential IDs (`T-001`, `T-002`, etc.)
2. ✅ Keep tags consistent and descriptive
3. ✅ Update `updated` whenever you modify a task
4. ✅ Use `detail` for complex tasks with many steps
5. ✅ Set `defaultExpanded: true` for important tasks
6. ✅ Use milestones to group related tasks
7. ✅ Keep Kanban sections organized

## 🤖 AI Agent Guidelines

When creating or modifying tasks as an AI agent:

1. **Always check existing tasks** before creating new ones to avoid duplicates
2. **Use appropriate IDs** - find the highest existing ID and increment
3. **Update `updated` field** whenever you modify a task
4. **Move tasks between sections** when their status changes
5. **Create detail files** for complex tasks that need step tracking
6. **Maintain consistent tag naming** - check existing tags first
7. **Set realistic dates** - use `start` and `due` appropriately
8. **Use milestones** to group related work

## 📚 References

- See `example-tasks/TASKS.md` for complete examples
- See `example-tasks/tasks/` for detail file examples
- See `example-tasks/README.md` for detailed documentation

