# Example Tasks - Markdown Kanban

This directory contains example tasks formatted in the Markdown Kanban standard to demonstrate the extension's features.

## 📋 TASKS.md File Structure

The `TASKS.md` file follows the Kanban format with the following sections:

- **Backlog**: Tasks that haven't been started yet
- **Doing**: Tasks in progress
- **Review**: Tasks awaiting review
- **Done**: Completed tasks
- **Paused**: Temporarily paused tasks
- **Notas**: General project notes

## 🏷️ Task Metadata

Each task can contain the following metadata:

### Basic Metadata

- **`id`**: Unique task identifier (e.g., `T-001`, `T-002`)
  - Format: `T-XXX` where XXX is a sequential number
  - Used to reference the task in other places

- **`tags`**: Tags for task categorization
  - Format: `[tag1, tag2, tag3]` (array of tags)
  - Example: `[backend, frontend, ui, components]`
  - Allows filtering tasks by category

- **`priority`**: Task priority level
  - Possible values: `high`, `medium`, `low`
  - Visually displayed in Kanban:
    - 🔴 High
    - 🟡 Medium
    - 🟢 Low

- **`workload`**: Estimated effort required
  - Possible values: `Easy`, `Medium`, `Hard`, `Extreme`
  - Visually displayed in Kanban:
    - 🟢 Easy
    - 🟡 Medium
    - 🔴 Hard
    - 🔴🔴 Extreme

### Date Metadata

- **`start`**: Task start date
  - Format: `YYYY-MM-DD`
  - Example: `2025-12-01`
  - Indicates when the task was started

- **`updated`**: Last update date
  - Format: `YYYY-MM-DD`
  - Example: `2025-12-19`
  - Updated whenever the task is modified

- **`completed`**: Task completion date
  - Format: `YYYY-MM-DD`
  - Example: `2025-12-23`
  - Filled when the task is moved to "Done"

- **`due`**: Due date (optional)
  - Format: `YYYY-MM-DD`
  - Example: `2024-01-15`
  - Indicates the deadline for completion

### Organization Metadata

- **`milestone`**: Milestone or marker the task belongs to
  - Format: Suggested format `sprint-year-month_number` (e.g., `sprint-26-1_1` for January 2026, sprint 1)
  - Can also use custom strings (e.g., `reconciliation-nn`, `timezone-utc`)
  - Used to group related tasks

- **`detail`**: Path to the task details file
  - Format: `./tasks/T-XXX.md`
  - Example: `./tasks/T-001.md`
  - Points to a markdown file with detailed description

- **`defaultExpanded`**: Defines if the task should be expanded by default
  - Values: `true` or `false`
  - When `true`, the task shows all details when loaded

### Steps (Sub-tasks)

Tasks can contain a list of steps (sub-tasks) in the details file:

```markdown
- steps:
    - [ ] Step 1 (not completed)
    - [x] Step 2 (completed)
    - [ ] Step 3 (not completed)
```

- Format: Markdown checkbox list
- `- [ ]` indicates uncompleted step
- `- [x]` indicates completed step
- Allows tracking progress within a task

## 📝 Task Format in TASKS.md

### Basic Example

```markdown
### Task Name

  - id: T-001
  - tags: [backend, frontend]
  - priority: high
  - workload: Hard
  - start: 2025-12-01
  - detail: ./tasks/T-001.md
```

### Example with Inline Description

```markdown
### Task Name

  - id: T-001
  - tags: [backend, frontend]
  - priority: high
    ```md
    Detailed task description here.
    Can contain multiple lines and markdown formatting.
    ```
```

### Complete Example

```markdown
### Implement n:n reconciliation between multiple sources

  - id: T-001
  - tags: [reconciliation, multiple-sources, n-to-n, backend, database]
  - priority: medium
  - milestone: reconciliation-nn
  - start: 2025-12-01
  - updated: 2025-12-19
  - workload: Hard
  - detail: ./tasks/T-001.md
```

## 📄 Detail Files (tasks/T-XXX.md)

Detail files contain the complete task description:

```markdown
# T-001

  - steps:
      - [ ] Step 1
      - [x] Step 2
    ```md
    Detailed task description.
    Can include context, requirements, examples, etc.
    ```
```

## 🚀 How to Test the Extension Locally

To test the Markdown Kanban extension with these examples:

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run in debug mode:**
   - Press `F5` or go to `Run > Start Debugging`
   - Or use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → "Debug: Start Debugging"

3. **Open the example-tasks folder:**
   - A new VS Code window will open
   - Navigate to the `example-tasks` folder and open it
   - Or select "Open Folder" and choose the `example-tasks` folder

4. **View the Kanban:**
   - Open the `TASKS.md` file
   - Right-click → "Kanban" or use the Command Palette → "Open Kanban Board"
   - Explore the features:
     - Drag & drop between columns
     - Tag filters
     - Sorting
     - Expand/collapse tasks
     - View priorities and workloads

## 📚 Additional Resources

- See the [main README](../README.md) for more information about the extension
- Check the example files in `tasks/` to see different task formats
- Explore the `TASKS.md` file to see examples of all supported metadata
