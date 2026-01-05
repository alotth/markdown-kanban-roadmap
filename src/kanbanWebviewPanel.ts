import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { MarkdownKanbanParser, KanbanBoard, KanbanTask, KanbanColumn } from './markdownParser';

// UI debug notifications are noisy; keep them off by default.
// Enable only when needed:
//   MARKDOWN_KANBAN_UI_DEBUG=true
const UI_DEBUG = process.env.MARKDOWN_KANBAN_UI_DEBUG === 'true';

export class KanbanWebviewPanel {
    public static currentPanel: KanbanWebviewPanel | undefined;
    public static readonly viewType = 'markdownKanbanPanel';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    private _board?: KanbanBoard;
    private _document?: vscode.TextDocument;
    private _detailFilePaths: Set<string> = new Set();
    private _detailWatchers: vscode.FileSystemWatcher[] = [];
    private _boardWatcher?: vscode.FileSystemWatcher;

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext, document?: vscode.TextDocument) {
        const column = vscode.window.activeTextEditor?.viewColumn;

        if (KanbanWebviewPanel.currentPanel) {
            KanbanWebviewPanel.currentPanel._panel.reveal(column);
            if (document) {
                KanbanWebviewPanel.currentPanel.loadMarkdownFile(document);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            KanbanWebviewPanel.viewType,
            'Markdown Kanban',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        KanbanWebviewPanel.currentPanel = new KanbanWebviewPanel(panel, extensionUri, context);

        if (document) {
            KanbanWebviewPanel.currentPanel.loadMarkdownFile(document);
        }
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [extensionUri],
        };
        KanbanWebviewPanel.currentPanel = new KanbanWebviewPanel(panel, extensionUri, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        this._update();
        this._setupEventListeners();
        
        if (this._document) {
            this.loadMarkdownFile(this._document);
        }
    }

    private _setupEventListeners() {
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            e => {
                if (e.webviewPanel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );
    }

    private _handleMessage(message: any) {
        // #region agent log
        console.error('=== _handleMessage CALLED ===', message.type);
        if (message.type === 'editTask') {
            console.error('EDIT TASK MESSAGE:', {
                taskId: message.taskId,
                columnId: message.columnId,
                startDate: message.taskData?.startDate,
                dueDate: message.taskData?.dueDate,
                taskDataKeys: Object.keys(message.taskData || {})
            });
            if (UI_DEBUG) {
                vscode.window.showErrorMessage(
                    `DEBUG: editTask message - startDate="${message.taskData?.startDate}", dueDate="${message.taskData?.dueDate}"`,
                    { modal: false }
                );
            }
        }
        try { 
            const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
            const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logData = JSON.stringify({location:'kanbanWebviewPanel.ts:91',message:'_handleMessage called',data:{messageType:message.type, taskId:message.taskId, hasTaskData:!!message.taskData, startDate:message.taskData?.startDate, dueDate:message.taskData?.dueDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
            fs.appendFileSync(logPath, logData);
            console.error('Backend log written:', message.type);
        } catch(e) {
            console.error('Log error:', e, e instanceof Error ? e.stack : '');
        }
        // #endregion
        switch (message.type) {
            case 'moveTask':
                this.moveTask(message.taskId, message.fromColumnId, message.toColumnId, message.newIndex);
                break;
            case 'addTask':
                this.addTask(message.columnId, message.taskData);
                break;
            case 'deleteTask':
                this.deleteTask(message.taskId, message.columnId);
                break;
            case 'editTask':
                // #region agent log
                console.error('=== CASE editTask ===');
                console.error('About to call editTask with:', {
                    taskId: message.taskId,
                    columnId: message.columnId,
                    startDate: message.taskData?.startDate,
                    dueDate: message.taskData?.dueDate
                });
                try { 
                    const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
                    const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
                    if (!fs.existsSync(logDir)) {
                        fs.mkdirSync(logDir, { recursive: true });
                    }
                    const logData = JSON.stringify({location:'kanbanWebviewPanel.ts:111',message:'editTask message received',data:{taskId:message.taskId, columnId:message.columnId, startDate:message.taskData?.startDate, dueDate:message.taskData?.dueDate, hasTaskData:!!message.taskData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
                    fs.appendFileSync(logPath, logData);
                    console.error('editTask log written to file');
                } catch(e) {
                    console.error('Log error:', e, e instanceof Error ? e.stack : '');
                }
                // #endregion
                this.editTask(message.taskId, message.columnId, message.taskData);
                break;
            case 'addColumn':
                this.addColumn(message.title);
                break;
            case 'moveColumn':
                this.moveColumn(message.fromIndex, message.toIndex);
                break;
            case 'toggleTask':
                this.toggleTaskExpansion(message.taskId);
                break;
            case 'updateTaskStep':
                this.updateTaskStep(message.taskId, message.columnId, message.stepIndex, message.completed);
                break;
            case 'reorderTaskSteps':
                this.reorderTaskSteps(message.taskId, message.columnId, message.newOrder);
                break;
            case 'toggleColumnArchive':
                this.toggleColumnArchive(message.columnId, message.archived);
                break;
        }
    }

    public loadMarkdownFile(document: vscode.TextDocument) {
        // #region agent log
        console.error('=== loadMarkdownFile CALLED ===');
        const stackTrace = new Error().stack;
        console.error('Stack trace:', stackTrace);
        // #endregion
        this._document = document;
        try {
            this._board = MarkdownKanbanParser.parseMarkdownWithDetails(document.getText(), document.uri.fsPath);
            // #region agent log
            const taskAfterLoad = this._board.columns.flatMap(c => c.tasks).find(t => t.id === 'T-001');
            if (taskAfterLoad) {
                console.error('Task T-001 AFTER loadMarkdownFile:', {startDate: taskAfterLoad.startDate, dueDate: taskAfterLoad.dueDate});
            }
            // #endregion
        } catch (error) {
            console.error('Error parsing Markdown:', error);
            vscode.window.showErrorMessage(`Kanban parsing error: ${error instanceof Error ? error.message : String(error)}`);
            this._board = { title: 'Error Loading Board', columns: [] };
        }
        this._syncWatchers();
        this._update();
    }

    private _update() {
        if (!this._panel.webview) return;

        this._panel.webview.html = this._getHtmlForWebview();
        
        const board = this._board || { title: 'Please open a Markdown Kanban file', columns: [] };
        this._panel.webview.postMessage({
            type: 'updateBoard',
            board: board
        });
    }

    private async saveToMarkdown() {
        if (!this._document || !this._board) return;

        // 获取配置设置
        const config = vscode.workspace.getConfiguration('markdown-kanban');
        const taskHeaderFormat = config.get<'title' | 'list'>('taskHeader', 'title');

        // #region agent log
        console.error('=== saveToMarkdown START ===');
        const sampleTask = this._board.columns.flatMap(c => c.tasks).find(t => t.id === 'T-001');
        if (sampleTask) {
            console.error('Task T-001 in _board BEFORE generateMarkdown:', {startDate: sampleTask.startDate, dueDate: sampleTask.dueDate, hasStartDate: 'startDate' in sampleTask, hasDueDate: 'dueDate' in sampleTask});
        }
        // #endregion

        const markdown = MarkdownKanbanParser.generateMarkdown(this._board, taskHeaderFormat);
        
        // #region agent log
        console.error('=== saveToMarkdown AFTER generateMarkdown ===');
        if (sampleTask) {
            console.error('Task T-001 in _board AFTER generateMarkdown:', {startDate: sampleTask.startDate, dueDate: sampleTask.dueDate});
        }
        // Check if markdown contains the start date
        const startDateInMarkdown = markdown.includes('start: 2026-01-05');
        const startDateOldInMarkdown = markdown.includes('start: 2026-01-01');
        console.error('Markdown contains start: 2026-01-05?', startDateInMarkdown);
        console.error('Markdown contains start: 2026-01-01?', startDateOldInMarkdown);
        const startDateLine = markdown.split('\n').find(line => line.includes('start:') && line.includes('T-001'));
        console.error('Start date line in markdown:', startDateLine);
        // #endregion
        
        // #region agent log
        if (sampleTask) {
            console.error('Before saving markdown - task.startDate:', sampleTask.startDate, 'task.dueDate:', sampleTask.dueDate);
            console.error('hasStartDate:', 'startDate' in sampleTask, 'hasDueDate:', 'dueDate' in sampleTask);
            if (UI_DEBUG) {
                vscode.window.showInformationMessage(
                    `DEBUG: Before saving markdown - task.startDate="${sampleTask.startDate}", task.dueDate="${sampleTask.dueDate}", hasStartDate=${'startDate' in sampleTask}, hasDueDate=${'dueDate' in sampleTask}`,
                    { modal: false }
                );
            }
            try {
                const logData = JSON.stringify({location:'kanbanWebviewPanel.ts:189',message:'Before saving markdown',data:{markdownLength:markdown.length, taskId:sampleTask.id, taskStartDate:sampleTask.startDate, taskDueDate:sampleTask.dueDate, hasStartDate:'startDate' in sampleTask, hasDueDate:'dueDate' in sampleTask, markdownPreview:markdown.substring(0,1000), startDateInMarkdown, startDateOldInMarkdown, startDateLine},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + '\n';
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
        
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            this._document.uri,
            new vscode.Range(0, 0, this._document.lineCount, 0),
            markdown
        );
        await vscode.workspace.applyEdit(edit);
        await this._document.save();
        
        // #region agent log
        console.error('=== saveToMarkdown AFTER save ===');
        // Read the file back to verify what was saved
        const savedContent = fs.readFileSync(this._document.uri.fsPath, 'utf8');
        const savedStartDateLine = savedContent.split('\n').find(line => line.includes('start:') && line.includes('T-001'));
        console.error('Start date line in SAVED file:', savedStartDateLine);
        try { fs.appendFileSync('/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log', JSON.stringify({location:'kanbanWebviewPanel.ts:172',message:'After saving markdown',data:{documentUri:this._document.uri.toString(), savedStartDateLine},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + '\n'); } catch(e) {}
        // #endregion
    }

    private async saveTaskDetail(task: KanbanTask) {
        if (!this._document || !task.detailPath) return;

        const detailFilePath = MarkdownKanbanParser.resolveDetailFilePath(task.detailPath, this._document.uri.fsPath);
        const detailUri = vscode.Uri.file(detailFilePath);
        const detailDir = vscode.Uri.file(path.dirname(detailFilePath));
        const detailContent = MarkdownKanbanParser.generateTaskDetailMarkdown(task);

        try {
            await vscode.workspace.fs.createDirectory(detailDir);
            await vscode.workspace.fs.writeFile(detailUri, Buffer.from(detailContent, 'utf8'));
        } catch (error) {
            vscode.window.showErrorMessage(`failed save detail: ${error}`);
        }
    }

    private findColumn(columnId: string): KanbanColumn | undefined {
        return this._board?.columns.find(col => col.id === columnId);
    }

    private findTask(columnId: string, taskId: string): { column: KanbanColumn; task: KanbanTask; index: number } | undefined {
        const column = this.findColumn(columnId);
        if (!column) return undefined;

        const taskIndex = column.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return undefined;

        return {
            column,
            task: column.tasks[taskIndex],
            index: taskIndex
        };
    }

    private async performAction(action: () => void | Promise<void>) {
        if (!this._board) return;
        
        // #region agent log
        console.error('=== performAction START ===');
        const taskBefore = this._board.columns.flatMap(c => c.tasks).find(t => t.id === 'T-001');
        if (taskBefore) {
            console.error('Task T-001 BEFORE action:', {startDate: taskBefore.startDate, dueDate: taskBefore.dueDate});
        }
        // #endregion
        
        await action();
        
        // #region agent log
        console.error('=== performAction AFTER action, BEFORE saveToMarkdown ===');
        const taskAfter = this._board.columns.flatMap(c => c.tasks).find(t => t.id === 'T-001');
        if (taskAfter) {
            console.error('Task T-001 AFTER action:', {startDate: taskAfter.startDate, dueDate: taskAfter.dueDate});
        }
        // #endregion
        
        await this.saveToMarkdown();
        
        // #region agent log
        console.error('=== performAction AFTER saveToMarkdown, BEFORE _update ===');
        const taskAfterSave = this._board.columns.flatMap(c => c.tasks).find(t => t.id === 'T-001');
        if (taskAfterSave) {
            console.error('Task T-001 AFTER saveToMarkdown:', {startDate: taskAfterSave.startDate, dueDate: taskAfterSave.dueDate});
        }
        // #endregion
        
        this._update();
        
        // #region agent log
        console.error('=== performAction AFTER _update ===');
        const taskAfterUpdate = this._board.columns.flatMap(c => c.tasks).find(t => t.id === 'T-001');
        if (taskAfterUpdate) {
            console.error('Task T-001 AFTER _update:', {startDate: taskAfterUpdate.startDate, dueDate: taskAfterUpdate.dueDate});
        }
        // #endregion
    }

    private moveTask(taskId: string, fromColumnId: string, toColumnId: string, newIndex: number) {
        this.performAction(() => {
            const fromColumn = this.findColumn(fromColumnId);
            const toColumn = this.findColumn(toColumnId);

            if (!fromColumn || !toColumn) return;

            const taskIndex = fromColumn.tasks.findIndex(task => task.id === taskId);
            if (taskIndex === -1) return;

            const task = fromColumn.tasks.splice(taskIndex, 1)[0];
            toColumn.tasks.splice(newIndex, 0, task);
        });
    }

    private addTask(columnId: string, taskData: any) {
        this.performAction(() => {
            const column = this.findColumn(columnId);
            if (!column) return;

            const newTask: KanbanTask = {
                id: Math.random().toString(36).substr(2, 9),
                title: taskData.title,
                description: taskData.description,
                tags: taskData.tags || [],
                priority: taskData.priority,
                workload: taskData.workload,
                startDate: taskData.startDate || undefined,
                dueDate: taskData.dueDate || undefined,
                defaultExpanded: taskData.defaultExpanded,
                steps: taskData.steps || []
            };

            column.tasks.push(newTask);
        });
    }

    private deleteTask(taskId: string, columnId: string) {
        this.performAction(() => {
            const column = this.findColumn(columnId);
            if (!column) return;

            const taskIndex = column.tasks.findIndex(task => task.id === taskId);
            if (taskIndex === -1) return;

            column.tasks.splice(taskIndex, 1);
        });
    }

    private editTask(taskId: string, columnId: string, taskData: any) {
        // #region agent log
        try {
            const logData = JSON.stringify({location:'kanbanWebviewPanel.ts:300',message:'editTask called',data:{taskId, columnId, startDate:taskData.startDate, dueDate:taskData.dueDate, startDateType:typeof taskData.startDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n';
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
        // #endregion
        this.performAction(async () => {
            const result = this.findTask(columnId, taskId);
            if (!result) return;

            // Normalize empty strings to undefined
            // #region agent log
            console.error('=== DEBUG editTask ===');
            console.error('taskData.startDate:', taskData.startDate, 'type:', typeof taskData.startDate);
            console.error('taskData.dueDate:', taskData.dueDate, 'type:', typeof taskData.dueDate);
            if (UI_DEBUG) {
                vscode.window.showInformationMessage(
                    `DEBUG: taskData.startDate="${taskData.startDate}", taskData.dueDate="${taskData.dueDate}"`,
                    { modal: false }
                );
            }
            // #endregion
            const startDate = taskData.startDate && typeof taskData.startDate === 'string' && taskData.startDate.trim() 
                ? taskData.startDate.trim() 
                : undefined;
            const dueDate = taskData.dueDate && typeof taskData.dueDate === 'string' && taskData.dueDate.trim() 
                ? taskData.dueDate.trim() 
                : undefined;
            // #region agent log
            console.error('After normalization - startDate:', startDate, 'dueDate:', dueDate);
            if (UI_DEBUG) {
                vscode.window.showInformationMessage(
                    `DEBUG: After normalization - startDate="${startDate}", dueDate="${dueDate}"`,
                    { modal: false }
                );
            }
            // #endregion
            
            // #region agent log
            try {
                const logData = JSON.stringify({location:'kanbanWebviewPanel.ts:327',message:'After normalization',data:{startDate, dueDate, originalStartDate:taskData.startDate, originalDueDate:taskData.dueDate, taskId:result.task.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
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
            // #endregion
            
            // Update task properties
            result.task.title = taskData.title;
            result.task.description = taskData.description;
            result.task.tags = taskData.tags || [];
            result.task.priority = taskData.priority;
            result.task.workload = taskData.workload;
            result.task.defaultExpanded = taskData.defaultExpanded;
            result.task.steps = taskData.steps || [];
            
            // Handle startDate and dueDate explicitly - always update these properties
            // #region agent log
            try {
                const logData1 = JSON.stringify({location:'kanbanWebviewPanel.ts:351',message:'Before assignment',data:{startDate, dueDate, taskStartDate:result.task.startDate, taskDueDate:result.task.dueDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
                const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
                const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                fs.appendFileSync(logPath, logData1);
                if (typeof fetch !== 'undefined') {
                    fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData1.trim()}).catch(()=>{});
                }
            } catch(e) {}
            // #endregion
            
            result.task.startDate = startDate;
            result.task.dueDate = dueDate;
            // #region agent log
            console.error('After assignment - task.startDate:', result.task.startDate, 'task.dueDate:', result.task.dueDate);
            console.error('hasStartDate:', 'startDate' in result.task, 'hasDueDate:', 'dueDate' in result.task);
            if (UI_DEBUG) {
                vscode.window.showInformationMessage(
                    `DEBUG: After assignment - task.startDate="${result.task.startDate}", task.dueDate="${result.task.dueDate}"`,
                    { modal: false }
                );
            }
            // #endregion
            
            // #region agent log
            try {
                const logData2 = JSON.stringify({location:'kanbanWebviewPanel.ts:360',message:'After assignment',data:{startDate, dueDate, taskStartDate:result.task.startDate, taskDueDate:result.task.dueDate, hasStartDate:'startDate' in result.task, hasDueDate:'dueDate' in result.task},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
                const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
                const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                fs.appendFileSync(logPath, logData2);
                if (typeof fetch !== 'undefined') {
                    fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData2.trim()}).catch(()=>{});
                }
            } catch(e) {}
            // #endregion
            
            // Remove properties if they are undefined
            // #region agent log
            try {
                const logData3 = JSON.stringify({location:'kanbanWebviewPanel.ts:374',message:'Before delete check',data:{taskStartDate:result.task.startDate, taskDueDate:result.task.dueDate, startDateFalsy:!result.task.startDate, dueDateFalsy:!result.task.dueDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
                const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
                const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                fs.appendFileSync(logPath, logData3);
                if (typeof fetch !== 'undefined') {
                    fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData3.trim()}).catch(()=>{});
                }
            } catch(e) {}
            // #endregion
            if (!result.task.startDate) {
                // #region agent log
                console.error('DELETING startDate because it is falsy:', result.task.startDate);
                if (UI_DEBUG) {
                    vscode.window.showInformationMessage(
                        `DEBUG: DELETING startDate because it is falsy: "${result.task.startDate}"`,
                        { modal: false }
                    );
                }
                // #endregion
                try {
                    const logData4 = JSON.stringify({location:'kanbanWebviewPanel.ts:377',message:'DELETING startDate',data:{taskStartDate:result.task.startDate, taskId:result.task.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
                    const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
                    const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
                    if (!fs.existsSync(logDir)) {
                        fs.mkdirSync(logDir, { recursive: true });
                    }
                    fs.appendFileSync(logPath, logData4);
                    if (typeof fetch !== 'undefined') {
                        fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData4.trim()}).catch(()=>{});
                    }
                } catch(e) {}
                delete result.task.startDate;
            }
            if (!result.task.dueDate) {
                try {
                    const logData5 = JSON.stringify({location:'kanbanWebviewPanel.ts:380',message:'DELETING dueDate',data:{taskDueDate:result.task.dueDate, taskId:result.task.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
                    const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
                    const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
                    if (!fs.existsSync(logDir)) {
                        fs.mkdirSync(logDir, { recursive: true });
                    }
                    fs.appendFileSync(logPath, logData5);
                    if (typeof fetch !== 'undefined') {
                        fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData5.trim()}).catch(()=>{});
                    }
                } catch(e) {}
                delete result.task.dueDate;
            }
            
            // #region agent log
            console.error('After delete check - task.startDate:', result.task.startDate, 'task.dueDate:', result.task.dueDate);
            console.error('hasStartDate:', 'startDate' in result.task, 'hasDueDate:', 'dueDate' in result.task);
            if (UI_DEBUG) {
                vscode.window.showInformationMessage(
                    `DEBUG: After delete check - task.startDate="${result.task.startDate}", task.dueDate="${result.task.dueDate}", hasStartDate=${'startDate' in result.task}, hasDueDate=${'dueDate' in result.task}`,
                    { modal: false }
                );
            }
            try {
                const logData6 = JSON.stringify({location:'kanbanWebviewPanel.ts:385',message:'After delete check',data:{taskStartDate:result.task.startDate, taskDueDate:result.task.dueDate, hasStartDate:'startDate' in result.task, hasDueDate:'dueDate' in result.task, taskId:result.task.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n';
                const logPath = '/Users/alt/repos/markdown-kanban-roadmap/.cursor/debug.log';
                const logDir = '/Users/alt/repos/markdown-kanban-roadmap/.cursor';
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                fs.appendFileSync(logPath, logData6);
                if (typeof fetch !== 'undefined') {
                    fetch('http://127.0.0.1:7244/ingest/aba74913-58f8-46f6-a42e-073f503b4cf6',{method:'POST',headers:{'Content-Type':'application/json'},body:logData6.trim()}).catch(()=>{});
                }
            } catch(e) {}
            // #endregion
            
            // Save detail file if it exists
            if (result.task.detailPath) {
                await this.saveTaskDetail(result.task);
            }
        });
    }

    private updateTaskStep(taskId: string, columnId: string, stepIndex: number, completed: boolean) {
        this.performAction(() => {
            const result = this.findTask(columnId, taskId);
            if (!result?.task.steps || stepIndex < 0 || stepIndex >= result.task.steps.length) {
                return;
            }

            result.task.steps[stepIndex].completed = completed;
            return this.saveTaskDetail(result.task);
        });
    }

    private reorderTaskSteps(taskId: string, columnId: string, newOrder: number[]) {
        this.performAction(() => {
            const result = this.findTask(columnId, taskId);
            if (!result?.task.steps) return;

            const originalSteps = [...result.task.steps];
            const reorderedSteps = newOrder
                .filter(index => index >= 0 && index < originalSteps.length)
                .map(index => originalSteps[index]);

            result.task.steps = reorderedSteps;
            return this.saveTaskDetail(result.task);
        });
    }

    private addColumn(title: string) {
        this.performAction(() => {
            if (!this._board) return;

            const newColumn: KanbanColumn = {
                id: Math.random().toString(36).substr(2, 9),
                title: title,
                tasks: []
            };

            this._board.columns.push(newColumn);
        });
    }

    private moveColumn(fromIndex: number, toIndex: number) {
        this.performAction(() => {
            if (!this._board || fromIndex === toIndex) return;

            const columns = this._board.columns;
            const column = columns.splice(fromIndex, 1)[0];
            columns.splice(toIndex, 0, column);
        });
    }

    private toggleTaskExpansion(taskId: string) {
        this._panel.webview.postMessage({
            type: 'toggleTaskExpansion',
            taskId: taskId
        });
    }

    private toggleColumnArchive(columnId: string, archived: boolean) {
        this.performAction(() => {
            const column = this.findColumn(columnId);
            if (!column) return;

            column.archived = archived;
        });
    }

    private _getHtmlForWebview() {
        const filePath = vscode.Uri.file(path.join(this._context.extensionPath, 'src', 'html', 'webview.html'));
        let html = fs.readFileSync(filePath.fsPath, 'utf8');

        const baseWebviewUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._context.extensionPath, 'src', 'html'))
        );

        html = html.replace(/<head>/, `<head><base href="${baseWebviewUri.toString()}/">`);

        return html;
    }

    public handleDocumentChange(document: vscode.TextDocument) {
        if (!this._document) return;
        const documentPath = document.uri.fsPath;

        if (documentPath === this._document.uri.fsPath) {
            this.loadMarkdownFile(document);
            return;
        }

        if (this._detailFilePaths.has(documentPath)) {
            this.loadMarkdownFile(this._document);
        }
    }

    public handleActiveEditorChange(document: vscode.TextDocument) {
        if (this._detailFilePaths.has(document.uri.fsPath)) {
            return;
        }
        this.loadMarkdownFile(document);
    }

    public dispose() {
        KanbanWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposeWatchers();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            disposable?.dispose();
        }
    }

    private _syncWatchers() {
        this._disposeWatchers();

        this._detailFilePaths.clear();
        if (!this._document || !this._board) return;

        for (const column of this._board.columns) {
            for (const task of column.tasks) {
                if (!task.detailPath) continue;
                const detailFilePath = MarkdownKanbanParser.resolveDetailFilePath(task.detailPath, this._document.uri.fsPath);
                this._detailFilePaths.add(detailFilePath);
            }
        }

        this._boardWatcher = this._createFileWatcher(this._document.uri);

        for (const detailPath of this._detailFilePaths) {
            this._detailWatchers.push(this._createFileWatcher(vscode.Uri.file(detailPath)));
        }
    }

    private _disposeWatchers() {
        this._boardWatcher?.dispose();
        this._boardWatcher = undefined;

        this._detailWatchers.forEach(watcher => watcher.dispose());
        this._detailWatchers = [];
    }

    private _createFileWatcher(uri: vscode.Uri): vscode.FileSystemWatcher {
        const pattern = new vscode.RelativePattern(path.dirname(uri.fsPath), path.basename(uri.fsPath));
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        const refresh = async () => {
            if (!this._document) return;
            if (uri.fsPath === this._document.uri.fsPath) {
                const document = await vscode.workspace.openTextDocument(this._document.uri);
                this.loadMarkdownFile(document);
                return;
            }
            this.loadMarkdownFile(this._document);
        };

        watcher.onDidChange(() => { void refresh(); });
        watcher.onDidCreate(() => { void refresh(); });
        watcher.onDidDelete(() => { void refresh(); });

        return watcher;
    }
}
