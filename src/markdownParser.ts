import * as fs from 'fs';
import * as path from 'path';
const DEBUG_LOG_PATH = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  workload?: 'Easy' | 'Normal' | 'Hard' | 'Extreme';
  dueDate?: string;
  startDate?: string;
  updated?: string;
  completed?: string;
  milestone?: string;
  detailPath?: string;
  defaultExpanded?: boolean;
  steps?: Array<{ text: string; completed: boolean }>;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
  archived?: boolean;
}

export interface KanbanBoard {
  title: string;
  columns: KanbanColumn[];
}

export class MarkdownKanbanParser {
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  static parseMarkdown(content: string): KanbanBoard {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const board: KanbanBoard = {
      title: '',
      columns: []
    };

    let currentColumn: KanbanColumn | null = null;
    let currentTask: KanbanTask | null = null;
    let inTaskProperties = false;
    let inTaskDescription = false;
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 检查代码块标记
      if (trimmedLine.startsWith('```')) {
        if (inTaskDescription) {
          if (trimmedLine === '```md' || trimmedLine === '```') {
            inCodeBlock = !inCodeBlock;
            continue;
          }
        }
      }

      // 如果在代码块内部，处理为描述内容
      if (inCodeBlock && inTaskDescription && currentTask) {
        if (trimmedLine === '```') {
          inCodeBlock = false;
          inTaskDescription = false;
          continue;
        } else {
          const cleanLine = line.replace(/^\s{4,}/, '');
          currentTask.description = currentTask.description 
            ? currentTask.description + '\n' + cleanLine
            : cleanLine;
        }
        continue;
      }

      // 解析看板标题
      if (!inCodeBlock && trimmedLine.startsWith('# ') && !board.title) {
        board.title = trimmedLine.substring(2).trim();
        this.finalizeCurrentTask(currentTask, currentColumn);
        currentTask = null;
        inTaskProperties = false;
        inTaskDescription = false;
        continue;
      }

      // 解析列标题
      if (!inCodeBlock && trimmedLine.startsWith('## ')) {
        this.finalizeCurrentTask(currentTask, currentColumn);
        currentTask = null;
        if (currentColumn) {
          board.columns.push(currentColumn);
        }
        
        let columnTitle = trimmedLine.substring(3).trim();
        let isArchived = false;
        
        // 检查是否包含 [Archived] 标记
        if (columnTitle.endsWith('[Archived]')) {
          isArchived = true;
          columnTitle = columnTitle.replace(/\s*\[Archived\]$/, '').trim();
        }
        
        currentColumn = {
          id: this.generateId(),
          title: columnTitle,
          tasks: [],
          archived: isArchived
        };
        inTaskProperties = false;
        inTaskDescription = false;
        continue;
      }

      // 解析任务标题
      if (!inCodeBlock && this.isTaskTitle(line, trimmedLine)) {
        this.finalizeCurrentTask(currentTask, currentColumn);

        if (currentColumn) {
          let taskTitle = '';
          
          if (trimmedLine.startsWith('### ')) {
            taskTitle = trimmedLine.substring(4).trim();
          } else {
            taskTitle = trimmedLine.substring(2).trim();
            // 移除复选框标记
            if (taskTitle.startsWith('[ ] ') || taskTitle.startsWith('[x] ')) {
              taskTitle = taskTitle.substring(4).trim();
            }
          }

          currentTask = {
            id: this.generateId(),
            title: taskTitle,
            description: ''
          };
          inTaskProperties = true;
          inTaskDescription = false;
        }
        continue;
      }

      // 解析任务属性
      if (!inCodeBlock && currentTask && inTaskProperties) {
        if (this.parseTaskProperty(line, currentTask)) {
          continue;
        }
        
        // 解析 steps 中的具体步骤项
        if (this.parseTaskStep(line, currentTask)) {
          continue;
        }
        
        // 检查是否开始描述部分
        if (line.match(/^\s+```md/)) {
          inTaskProperties = false;
          inTaskDescription = true;
          inCodeBlock = true;
          continue;
        }
      }

      // 处理空行
      if (trimmedLine === '') {
        continue;
      }

      // 结束当前任务
      if (!inCodeBlock && currentTask && (inTaskProperties || inTaskDescription)) {
        this.finalizeCurrentTask(currentTask, currentColumn);
        currentTask = null;
        inTaskProperties = false;
        inTaskDescription = false;
        i--;
      }
    }

    // 添加最后的任务和列
    this.finalizeCurrentTask(currentTask, currentColumn);
    if (currentColumn) {
      board.columns.push(currentColumn);
    }

    return board;
  }

  static parseMarkdownWithDetails(content: string, boardFilePath: string): KanbanBoard {
    const board = this.parseMarkdown(content);
    this.applyDetailsToBoard(board, boardFilePath);
    return board;
  }

  private static isTaskTitle(line: string, trimmedLine: string): boolean {
    // 排除属性行和步骤项
    if (line.startsWith('- ') && 
        (trimmedLine.match(/^\s*- (id|due|tags|priority|workload|steps|defaultExpanded|start|milestone|detail|updated|completed):/) ||
         line.match(/^\s{6,}- \[([ x])\]/))) {
      return false;
    }
    
    return (line.startsWith('- ') && !line.startsWith('  ')) || 
           trimmedLine.startsWith('### ');
  }

  private static parseTaskProperty(line: string, task: KanbanTask): boolean {
    const propertyMatch = line.match(/^\s+- (id|due|tags|priority|workload|steps|defaultExpanded|start|milestone|detail|updated|completed):\s*(.*)$/);
    if (!propertyMatch) return false;

    const [, propertyName, propertyValue] = propertyMatch;
    const value = propertyValue.trim();

    switch (propertyName) {
      case 'id':
        if (value) {
          task.id = value;
        }
        break;
      case 'due':
        task.dueDate = value;
        break;
      case 'start':
        task.startDate = value;
        break;
      case 'tags':
        const tagsMatch = value.match(/\[(.*)\]/);
        if (tagsMatch) {
          task.tags = tagsMatch[1].split(',').map(tag => tag.trim());
        }
        break;
      case 'priority':
        if (['low', 'medium', 'high'].includes(value)) {
          task.priority = value as 'low' | 'medium' | 'high';
        }
        break;
      case 'workload':
        if (['Easy', 'Normal', 'Hard', 'Extreme'].includes(value)) {
          task.workload = value as 'Easy' | 'Normal' | 'Hard' | 'Extreme';
        }
        break;
      case 'updated':
        task.updated = value;
        break;
      case 'completed':
        task.completed = value;
        break;
      case 'milestone':
        task.milestone = value;
        break;
      case 'detail':
        if (value) {
          task.detailPath = value;
        }
        break;
      case 'defaultExpanded':
        task.defaultExpanded = value.toLowerCase() === 'true';
        break;
      case 'steps':
        task.steps = [];
        break;
    }
    return true;
  }

  private static parseTaskStep(line: string, task: KanbanTask): boolean {
    if (!task.steps) return false;
    
    const stepMatch = line.match(/^\s{6,}- \[([ x])\]\s*(.*)$/);
    if (!stepMatch) return false;

    const [, checkmark, text] = stepMatch;
    task.steps.push({ 
      text: text.trim(), 
      completed: checkmark === 'x' 
    });
    return true;
  }

  private static finalizeCurrentTask(task: KanbanTask | null, column: KanbanColumn | null): void {
    if (!task || !column) return;

    if (task.description) {
      task.description = task.description.trim();
      if (task.description === '') {
        delete task.description;
      }
    }
    column.tasks.push(task);
  }

  static generateMarkdown(board: KanbanBoard, taskHeaderFormat: 'title' | 'list' = 'title'): string {
    let markdown = '';

    if (board.title) {
      markdown += `# ${board.title}\n\n`;
    }

    for (const column of board.columns) {
      const columnTitle = column.archived ? `${column.title} [Archived]` : column.title;
      markdown += `## ${columnTitle}\n\n`;

      for (const task of column.tasks) {
        if (taskHeaderFormat === 'title') {
          markdown += `### ${task.title}\n\n`;
        } else {
          markdown += `- ${task.title}\n`;
        }

        // 添加任务属性
        markdown += this.generateTaskProperties(task);

        // 添加描述
        if (!task.detailPath && task.description && task.description.trim() !== '') {
          markdown += `    \`\`\`md\n`;
          const descriptionLines = task.description.trim().split('\n');
          for (const descLine of descriptionLines) {
            markdown += `    ${descLine}\n`;
          }
          markdown += `    \`\`\`\n`;
        }

        markdown += '\n';
      }
    }
    return markdown;
  }

  private static generateTaskProperties(task: KanbanTask): string {
    let properties = '';

    if (task.id) {
      properties += `  - id: ${task.id}\n`;
    }
    if (task.tags && task.tags.length > 0) {
      properties += `  - tags: [${task.tags.join(', ')}]\n`;
    }
    if (task.priority) {
      properties += `  - priority: ${task.priority}\n`;
    }
    if (task.workload) {
      properties += `  - workload: ${task.workload}\n`;
    }
    if (task.updated) {
      properties += `  - updated: ${task.updated}\n`;
    }
    if (task.completed) {
      properties += `  - completed: ${task.completed}\n`;
    }
    if (task.milestone) {
      properties += `  - milestone: ${task.milestone}\n`;
    }
    // #region agent log
    if (task.id === 'T-001') {
      try {
        const logData = JSON.stringify({location:'markdownParser.ts:356',message:'generateTaskProperties - checking dates',data:{taskId:task.id, hasStartDate:'startDate' in task, startDate:task.startDate, hasDueDate:'dueDate' in task, dueDate:task.dueDate, startDateType:typeof task.startDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}) + '\n';
        const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
        const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(logPath, logData);
        if (typeof fetch !== 'undefined') {
          fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData.trim()}).catch(()=>{});
        }
      } catch(e) {}
    }
    // #endregion
    if (task.startDate) {
      properties += `  - start: ${task.startDate}\n`;
      // #region agent log
      console.error('=== Added start date to properties ===', {
        taskId: task.id,
        startDate: task.startDate,
        propertiesLength: properties.length
      });
      if (task.id === 'T-001') {
        try {
          const logData = JSON.stringify({location:'markdownParser.ts:365',message:'Added start date to properties',data:{taskId:task.id, startDate:task.startDate, propertiesLength:properties.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}) + '\n';
          const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
          const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          fs.appendFileSync(logPath, logData);
          if (typeof fetch !== 'undefined') {
            fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData.trim()}).catch(()=>{});
          }
        } catch(e) {}
      }
      // #endregion
    } else {
      // #region agent log
      console.error('=== startDate is FALSY, NOT adding to properties ===', {
        taskId: task.id,
        startDate: task.startDate,
        startDateType: typeof task.startDate,
        hasStartDate: 'startDate' in task
      });
      if (task.id === 'T-001') {
        try {
          const logData = JSON.stringify({location:'markdownParser.ts:374',message:'startDate is FALSY, NOT adding',data:{taskId:task.id, startDate:task.startDate, startDateType:typeof task.startDate, hasStartDate:'startDate' in task},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}) + '\n';
          const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
          const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          fs.appendFileSync(logPath, logData);
          if (typeof fetch !== 'undefined') {
            fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData.trim()}).catch(()=>{});
          }
        } catch(e) {}
      }
      // #endregion
    }
    if (task.dueDate) {
      properties += `  - due: ${task.dueDate}\n`;
      // #region agent log
      console.log('=== Added due date to properties ===', {
          taskId: task.id,
          dueDate: task.dueDate
      });
      // #endregion
    } else {
      // #region agent log
      console.log('=== dueDate is FALSY, NOT adding to properties ===', {
          taskId: task.id,
          dueDate: task.dueDate
      });
      // #endregion
    }
    if (task.detailPath) {
      properties += `  - detail: ${task.detailPath}\n`;
    }
    if (task.defaultExpanded !== undefined) {
      properties += `  - defaultExpanded: ${task.defaultExpanded}\n`;
    }
    if (!task.detailPath && task.steps && task.steps.length > 0) {
      properties += `  - steps:\n`;
      for (const step of task.steps) {
        const checkbox = step.completed ? '[x]' : '[ ]';
        properties += `      - ${checkbox} ${step.text}\n`;
      }
    }

    return properties;
  }

  static resolveDetailFilePath(detailPath: string, boardFilePath: string): string {
    if (path.isAbsolute(detailPath)) {
      return detailPath;
    }
    return path.resolve(path.dirname(boardFilePath), detailPath);
  }

  static parseTaskDetailMarkdown(content: string): Pick<KanbanTask, 'steps' | 'description'> {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const steps: Array<{ text: string; completed: boolean }> = [];
    const descriptionLines: string[] = [];
    let inSteps = false;
    let inDescription = false;
    let inCodeBlock = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (inCodeBlock && inDescription) {
        if (trimmedLine === '```') {
          inCodeBlock = false;
          inDescription = false;
          continue;
        }
        descriptionLines.push(line.replace(/^\s{4,}/, ''));
        continue;
      }

      if (line.match(/^\s+- steps:\s*$/)) {
        inSteps = true;
        continue;
      }

      if (inSteps) {
        const stepMatch = line.match(/^\s{6,}- \[([ x])\]\s*(.*)$/);
        if (stepMatch) {
          const [, checkmark, text] = stepMatch;
          steps.push({
            text: text.trim(),
            completed: checkmark === 'x'
          });
          continue;
        }
        if (trimmedLine === '') {
          continue;
        }
        inSteps = false;
      }

      if (line.match(/^\s+```md/) || line.match(/^\s+```/)) {
        inDescription = true;
        inCodeBlock = true;
        continue;
      }
    }

    const detail: Pick<KanbanTask, 'steps' | 'description'> = {};
    if (steps.length > 0) {
      detail.steps = steps;
    }
    if (descriptionLines.length > 0) {
      detail.description = descriptionLines.join('\n').trim();
    }
    return detail;
  }

  static generateTaskDetailMarkdown(task: KanbanTask): string {
    const headerId = task.id ? task.id : 'Task';
    let markdown = `# ${headerId}\n\n`;

    if (task.steps && task.steps.length > 0) {
      markdown += `  - steps:\n`;
      for (const step of task.steps) {
        const checkbox = step.completed ? '[x]' : '[ ]';
        markdown += `      - ${checkbox} ${step.text}\n`;
      }
    }

    if (task.description && task.description.trim() !== '') {
      markdown += `    \`\`\`md\n`;
      const descriptionLines = task.description.trim().split('\n');
      for (const descLine of descriptionLines) {
        markdown += `    ${descLine}\n`;
      }
      markdown += `    \`\`\`\n`;
    }

    return markdown.trimEnd() + '\n';
  }

  private static applyDetailsToBoard(board: KanbanBoard, boardFilePath: string): void {
    for (const column of board.columns) {
      for (const task of column.tasks) {
        if (!task.detailPath) {
          continue;
        }
        const detailFilePath = this.resolveDetailFilePath(task.detailPath, boardFilePath);
        const detailContent = this.readDetailFile(detailFilePath);
        if (!detailContent) {
          delete task.steps;
          delete task.description;
          continue;
        }
        const detail = this.parseTaskDetailMarkdown(detailContent);
        if (detail.steps) {
          task.steps = detail.steps;
        } else {
          delete task.steps;
        }
        if (detail.description) {
          task.description = detail.description;
        } else {
          delete task.description;
        }
      }
    }
  }

  private static readDetailFile(detailFilePath: string): string | null {
    try {
      return fs.readFileSync(detailFilePath, 'utf8');
    } catch (error) {
      console.warn(`Failed to read detail file: ${detailFilePath}`, error);
      return null;
    }
  }
}
