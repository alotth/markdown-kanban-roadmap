# Markdown Kanban & Roadmap - Rules for Claude

> **Note for AI Assistants**: These rules are suggested guidelines for AI assistants to understand how to properly create and manage tasks in the Markdown Kanban format. When working with `TASKS.md` files, follow these rules to ensure compatibility with the VS Code Markdown Kanban extension.

This document provides specific rules for Claude AI to create and manage tasks in the Markdown Kanban format that works with the VS Code Markdown Kanban extension.

## 🎯 Quick Reference

When working with Markdown Kanban files, follow these rules:

### Task Creation Checklist
- [ ] Use format `### Task Name` for task title
- [ ] Include `id: T-XXX` (find next available ID)
- [ ] Add appropriate `tags: [tag1, tag2]`
- [ ] Set `priority: high|medium|low`
- [ ] Set `workload: Easy|Normal|Hard|Extreme` if applicable
- [ ] Use `start: YYYY-MM-DD` and `due: YYYY-MM-DD` for dates
- [ ] Use 2 spaces indentation for all properties
- [ ] Place task in correct section (Backlog, Doing, Review, Done, Paused)

### Task Modification Checklist
- [ ] Update `updated: YYYY-MM-DD` when modifying
- [ ] Move task to appropriate section if status changed
- [ ] Maintain proper indentation (2 spaces)
- [ ] Keep date format as `YYYY-MM-DD`

## 📋 File Structure

The `TASKS.md` file has these sections in order:

```markdown
# Tasks - project-name

## Backlog
## Doing
## Review
## Done
## Paused
## Notas
```

## 🏷️ Task Format Specification

### Minimal Task

```markdown
### Task Name

  - id: T-001
```

### Complete Task

```markdown
### Task Name

  - id: T-001
  - tags: [backend, frontend]
  - priority: high
  - workload: Hard
  - milestone: sprint-26-1_1
  - start: 2026-01-01
  - due: 2026-01-26
  - updated: 2026-01-15
  - completed: 2026-01-26
  - detail: ./tasks/T-001.md
  - defaultExpanded: false
```

### Task with Inline Description

```markdown
### Task Name

  - id: T-001
  - tags: [backend]
  - priority: high
    ```md
    Detailed description here.
    Supports markdown formatting.
    ```
```

## 📄 Detail File Format

When `detail: ./tasks/T-XXX.md` is specified, create the file:

```markdown
# T-001

  - steps:
      - [ ] Step 1 description
      - [x] Step 2 description
      - [ ] Step 3 description
    ```md
    Full task description with context, requirements, and examples.
    ```
```

**Important**: Steps are ONLY in detail files, never in TASKS.md directly.

## ✅ Property Reference

| Property | Required | Format | Example |
|----------|----------|--------|---------|
| `id` | ✅ Yes | `T-XXX` | `T-001` |
| `tags` | ❌ No | `[tag1, tag2]` | `[backend, frontend]` |
| `priority` | ❌ No | `high\|medium\|low` | `high` |
| `workload` | ❌ No | `Easy\|Normal\|Hard\|Extreme` | `Hard` |
| `milestone` | ❌ No | string | `sprint-26-1_1` |
| `start` | ❌ No | `YYYY-MM-DD` | `2026-01-01` |
| `due` | ❌ No | `YYYY-MM-DD` | `2026-01-26` |
| `updated` | ❌ No | `YYYY-MM-DD` | `2026-01-15` |
| `completed` | ❌ No | `YYYY-MM-DD` | `2026-01-26` |
| `detail` | ❌ No | `./tasks/T-XXX.md` | `./tasks/T-001.md` |
| `defaultExpanded` | ❌ No | `true\|false` | `false` |

## 🔍 Finding Next Task ID

When creating a new task, find the highest existing ID:

1. Search for all `id: T-` patterns in TASKS.md
2. Extract the numbers (e.g., `T-001` → `1`, `T-010` → `10`)
3. Find the maximum number
4. Increment by 1
5. Format as `T-XXX` with leading zeros (e.g., max is `T-010` → next is `T-011`)

## 🔄 Status Transitions

When updating task status, move between sections:

- **Starting work**: Move from `Backlog` to `Doing`, set `start: YYYY-MM-DD`
- **Completing work**: Move from `Doing` to `Done`, set `completed: YYYY-MM-DD`
- **Pausing work**: Move from `Doing` to `Paused`
- **Resuming work**: Move from `Paused` to `Doing`
- **Requesting review**: Move from `Doing` to `Review`
- **Approving**: Move from `Review` to `Done`

Always update `updated: YYYY-MM-DD` when moving tasks.

## ⚠️ Critical Formatting Rules

1. **Indentation**: Exactly 2 spaces for task properties
   ```markdown
   ### Task
   
     - id: T-001    ← 2 spaces before `-`
   ```

2. **Date Format**: Always `YYYY-MM-DD`
   - ✅ Correct: `2026-01-15`
   - ❌ Wrong: `2026/01/15`, `15-01-2026`, `Jan 15, 2026`

3. **Tags Format**: Array with brackets and commas
   - ✅ Correct: `[backend, frontend, ui]`
   - ❌ Wrong: `backend, frontend`, `#backend #frontend`

4. **Description Blocks**: Use ` ```md ` (with 4 spaces indentation)
   ```markdown
       ```md
       Description here
       ```
   ```

5. **Steps**: Only in detail files, with 6+ spaces indentation
   ```markdown
     - steps:
         - [ ] Step 1    ← 6 spaces before `-`
   ```

## 🎯 Claude-Specific Guidelines

### When User Asks to Create a Task

1. Check if similar task exists (search by title/keywords)
2. Find next available ID
3. Determine appropriate section (usually `Backlog`)
4. Create task with all relevant properties
5. If complex, create detail file with steps

### When User Asks to Update a Task

1. Find task by ID or title
2. Update relevant properties
3. Update `updated: YYYY-MM-DD` field
4. Move to appropriate section if status changed
5. If detail file exists, update it too

### When User Asks to Complete a Task

1. Find task by ID or title
2. Set `completed: YYYY-MM-DD` (today's date)
3. Update `updated: YYYY-MM-DD`
4. Move task to `Done` section
5. Mark all steps as completed in detail file if exists

### When Creating Detail Files

1. Create directory `tasks/` if it doesn't exist
2. Create file `tasks/T-XXX.md` where XXX matches task ID
3. Include task ID as header: `# T-001`
4. Add steps if applicable
5. Add description in ` ```md ` block

## 📝 Example Workflows

### Creating a New Task

```markdown
## Backlog

### Implement user authentication system

  - id: T-010
  - tags: [authentication, security, backend, frontend]
  - priority: high
  - workload: Hard
  - milestone: sprint-26-1_2
  - start: 2026-01-15
  - due: 2026-02-15
  - detail: ./tasks/T-010.md
```

Then create `tasks/T-010.md`:

```markdown
# T-010

  - steps:
      - [ ] Design authentication flow
      - [ ] Implement JWT tokens
      - [ ] Create login endpoint
      - [ ] Create registration endpoint
      - [ ] Add password reset
      - [ ] Write tests
    ```md
    Implement complete user authentication system with JWT tokens.
    Include login, registration, and password reset functionality.
    ```
```

### Moving Task to Done

Find task in `Doing` section:
```markdown
## Doing

### Fix bug in login

  - id: T-005
  - tags: [bugfix, frontend]
  - priority: high
  - updated: 2026-01-14
```

Move to `Done` and update:
```markdown
## Done

### Fix bug in login

  - id: T-005
  - tags: [bugfix, frontend]
  - priority: high
  - updated: 2026-01-15
  - completed: 2026-01-15
```

## 🚨 Common Errors to Avoid

1. ❌ **Wrong indentation**: Using 4 spaces instead of 2
2. ❌ **Missing ID**: Forgetting to add `id: T-XXX`
3. ❌ **Duplicate IDs**: Not checking existing IDs before creating
4. ❌ **Wrong date format**: Using any format other than `YYYY-MM-DD`
5. ❌ **Steps in TASKS.md**: Steps should only be in detail files
6. ❌ **Forgetting updated**: Not updating `updated` when modifying
7. ❌ **Wrong section**: Not moving task when status changes

## 📚 Quick Examples Reference

See `example-tasks/` directory for:
- `TASKS.md` - Complete example file
- `tasks/T-001.md` - Example detail file with steps
- `README.md` - Detailed documentation

## 💡 Pro Tips

1. **Use detail files** for tasks with multiple steps or complex requirements
2. **Keep tags consistent** - check existing tags before creating new ones
3. **Set realistic dates** - use `start` and `due` to track timeline
4. **Use milestones** to group related tasks for sprints or features
5. **Update `updated`** every time you touch a task - it helps track activity
6. **Set `defaultExpanded: true`** for critical tasks that need immediate attention

