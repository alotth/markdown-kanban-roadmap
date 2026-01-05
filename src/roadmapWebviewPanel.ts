import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { MarkdownKanbanParser, KanbanBoard, KanbanTask } from './markdownParser';

type RoadmapTask = {
    id: string;
    title: string;
    status: string;
    milestone?: string;
    startDate?: string;
    dueDate?: string;
    completedDate?: string;
    updatedDate?: string;
    progress: number;
    detailPath?: string;
};

export class RoadmapWebviewPanel {
    public static currentPanel: RoadmapWebviewPanel | undefined;
    public static readonly viewType = 'markdownKanbanRoadmapPanel';

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

        if (RoadmapWebviewPanel.currentPanel) {
            RoadmapWebviewPanel.currentPanel._panel.reveal(column);
            if (document) {
                RoadmapWebviewPanel.currentPanel.loadMarkdownFile(document);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            RoadmapWebviewPanel.viewType,
            'Markdown Roadmap',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        RoadmapWebviewPanel.currentPanel = new RoadmapWebviewPanel(panel, extensionUri, context);

        if (document) {
            RoadmapWebviewPanel.currentPanel.loadMarkdownFile(document);
        }
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [extensionUri],
        };
        RoadmapWebviewPanel.currentPanel = new RoadmapWebviewPanel(panel, extensionUri, context);
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
        switch (message.type) {
            case 'openTask':
                if (message.taskId) {
                    void this.openTask(message.taskId);
                }
                break;
        }
    }

    public loadMarkdownFile(document: vscode.TextDocument) {
        this._document = document;
        try {
            this._board = MarkdownKanbanParser.parseMarkdownWithDetails(document.getText(), document.uri.fsPath);
        } catch (error) {
            console.error('Error parsing Markdown:', error);
            vscode.window.showErrorMessage(`Roadmap parsing error: ${error instanceof Error ? error.message : String(error)}`);
            this._board = { title: 'Error Loading Board', columns: [] };
        }
        this._syncWatchers();
        this._update();
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

    private _update() {
        if (!this._panel.webview) return;

        this._panel.webview.html = this._getHtmlForWebview();

        const board = this._board || { title: 'Please open a Markdown Roadmap file', columns: [] };
        this._panel.webview.postMessage({
            type: 'updateRoadmap',
            title: board.title,
            tasks: this._buildRoadmapTasks(board)
        });
    }

    private _buildRoadmapTasks(board: KanbanBoard): RoadmapTask[] {
        const tasks: RoadmapTask[] = [];

        for (const column of board.columns) {
            for (const task of column.tasks) {
                tasks.push({
                    id: task.id,
                    title: task.title,
                    status: column.title,
                    milestone: task.milestone,
                    startDate: task.startDate,
                    dueDate: task.dueDate,
                    completedDate: task.completed,
                    updatedDate: task.updated,
                    progress: this._calculateProgress(task, column.title),
                    detailPath: task.detailPath
                });
            }
        }

        return tasks;
    }

    private _calculateProgress(task: KanbanTask, status: string): number {
        if (status.trim().toLowerCase() === 'done') {
            return 1;
        }
        if (task.steps && task.steps.length > 0) {
            const completed = task.steps.filter(step => step.completed).length;
            return completed / task.steps.length;
        }
        return 0;
    }

    private async openTask(taskId: string) {
        if (!this._board || !this._document) return;

        let foundTask: KanbanTask | undefined;
        for (const column of this._board.columns) {
            const task = column.tasks.find(item => item.id === taskId);
            if (task) {
                foundTask = task;
                break;
            }
        }

        if (!foundTask) return;

        if (!foundTask.detailPath) {
            vscode.window.showWarningMessage('Task detail path not found. Add a "detail:" entry to open the task detail file.');
            return;
        }

        const detailFilePath = MarkdownKanbanParser.resolveDetailFilePath(foundTask.detailPath, this._document.uri.fsPath);
        const targetUri = vscode.Uri.file(detailFilePath);

        try {
            const document = await vscode.workspace.openTextDocument(targetUri);
            await vscode.window.showTextDocument(document, { preview: false });
        } catch (error) {
            vscode.window.showErrorMessage(`failed open file: ${error}`);
        }
    }

    private _getHtmlForWebview() {
        const filePath = vscode.Uri.file(path.join(this._context.extensionPath, 'src', 'html', 'roadmap.html'));
        let html = fs.readFileSync(filePath.fsPath, 'utf8');

        const baseWebviewUri = this._panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this._context.extensionPath, 'src', 'html'))
        );

        html = html.replace(/<head>/, `<head><base href="${baseWebviewUri.toString()}/">`);

        return html;
    }

    public dispose() {
        RoadmapWebviewPanel.currentPanel = undefined;
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
