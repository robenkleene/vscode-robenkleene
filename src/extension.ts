import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.openURLs', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (!activeTextEditor) {
			return;
		}
		const selection = activeTextEditor.selection;
		if (!selection) {
			return;
		}
		const text = activeTextEditor.document.getText(selection);
		if (!text.length) {
			return;
		}

		const child_process = require("child_process");
		child_process.execSync("~/.bin/urls_open", { input: text });
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
