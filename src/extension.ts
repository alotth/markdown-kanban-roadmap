// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { KanbanWebviewPanel } from './kanbanWebviewPanel';
import { RoadmapWebviewPanel } from './roadmapWebviewPanel';
import { logger } from './logger';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let fileListenerEnabled = true;
	// Use the logger to output diagnostic information
	logger.info('Markdown Kanban extension is now active!', undefined, 'extension.ts:activate');

	// 注册webview panel序列化器（用于恢复面板状态）
	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer(KanbanWebviewPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				KanbanWebviewPanel.revive(webviewPanel, context.extensionUri, context);
			}
		});
		vscode.window.registerWebviewPanelSerializer(RoadmapWebviewPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				RoadmapWebviewPanel.revive(webviewPanel, context.extensionUri, context);
			}
		});
	}

	// 注册打开看板命令（在中间区域打开）
	const openKanbanCommand = vscode.commands.registerCommand('markdown-kanban.openKanban', async (uri?: vscode.Uri) => {
		let targetUri = uri;

		// 如果没有提供URI，尝试从当前活动编辑器获取
		if (!targetUri && vscode.window.activeTextEditor) {
			targetUri = vscode.window.activeTextEditor.document.uri;
		}

		// 如果还是没有URI，让用户选择文件
		if (!targetUri) {
			const fileUris = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				filters: {
					'Markdown files': ['md']
				}
			});

			if (fileUris && fileUris.length > 0) {
				targetUri = fileUris[0];
			} else {
				return;
			}
		}

		// 检查文件是否为markdown文件
		if (!targetUri.fsPath.endsWith('.md')) {
			vscode.window.showErrorMessage('请选择一个markdown文件。');
			return;
		}

		try {
			// 打开文档
			const document = await vscode.workspace.openTextDocument(targetUri);

			// 在中间区域创建或显示看板面板
			KanbanWebviewPanel.createOrShow(context.extensionUri, context, document);

			vscode.window.showInformationMessage(`load kanban from: ${document.fileName}`);
		} catch (error) {
			vscode.window.showErrorMessage(`failed open kanban: ${error}`);
		}
	});

	const openRoadmapCommand = vscode.commands.registerCommand('markdown-kanban.openRoadmap', async (uri?: vscode.Uri) => {
		let targetUri = uri;

		if (!targetUri && vscode.window.activeTextEditor) {
			targetUri = vscode.window.activeTextEditor.document.uri;
		}

		if (!targetUri) {
			const fileUris = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				filters: {
					'Markdown files': ['md']
				}
			});

			if (fileUris && fileUris.length > 0) {
				targetUri = fileUris[0];
			} else {
				return;
			}
		}

		if (!targetUri.fsPath.endsWith('.md')) {
			vscode.window.showErrorMessage('请选择一个markdown文件。');
			return;
		}

		try {
			const document = await vscode.workspace.openTextDocument(targetUri);
			RoadmapWebviewPanel.createOrShow(context.extensionUri, context, document);
			vscode.window.showInformationMessage(`load roadmap from: ${document.fileName}`);
		} catch (error) {
			vscode.window.showErrorMessage(`failed open roadmap: ${error}`);
		}
	});

	const disableFileListenerCommand = vscode.commands.registerCommand('markdown-kanban.disableFileListener', async () => {
		fileListenerEnabled = !fileListenerEnabled;
	});

	// 监听文档变化，自动更新看板（实时同步）
	const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId === 'markdown' && fileListenerEnabled) {
			// 延迟更新，避免频繁刷新
			setTimeout(() => {
				// 更新面板中的看板
				if (KanbanWebviewPanel.currentPanel) {
					KanbanWebviewPanel.currentPanel.handleDocumentChange(event.document);
				}
				if (RoadmapWebviewPanel.currentPanel) {
					RoadmapWebviewPanel.currentPanel.handleDocumentChange(event.document);
				}
			}, 500);
		}
	});

	// 监听活动编辑器变化
	const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.languageId === 'markdown' && fileListenerEnabled) {
			vscode.commands.executeCommand('setContext', 'markdownKanbanActive', true);
			// 如果有面板打开，自动加载当前文档
			if (KanbanWebviewPanel.currentPanel) {
				KanbanWebviewPanel.currentPanel.handleActiveEditorChange(editor.document);
			}
			if (RoadmapWebviewPanel.currentPanel) {
				RoadmapWebviewPanel.currentPanel.handleActiveEditorChange(editor.document);
			}
		} else {
			vscode.commands.executeCommand('setContext', 'markdownKanbanActive', false);
		}
	});

	// 添加到订阅列表
	context.subscriptions.push(
		openKanbanCommand,
		openRoadmapCommand,
		disableFileListenerCommand,
		documentChangeListener,
		activeEditorChangeListener,
	);

	// 如果当前有活动的markdown编辑器，自动激活看板
	if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === 'markdown') {
		vscode.commands.executeCommand('setContext', 'markdownKanbanActive', true);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	// 清理上下文
	vscode.commands.executeCommand('setContext', 'markdownKanbanActive', false);
}
