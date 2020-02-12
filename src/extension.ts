import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let openURLsDisposable = vscode.commands.registerCommand('extension.openURLs', () => {
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
		try {
			child_process.execSync("~/.bin/urls_open", { input: text });
		}
		catch (error) {
			// Ignored, there's an error if no URLs are found.
		}
	});
	context.subscriptions.push(openURLsDisposable);

	let openFileDisposable = vscode.commands.registerCommand('extension.openFile', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (!activeTextEditor) {
			return;
		}

		const detectFile = new RegExp("[(]([^)]+)[)]");
		const position = activeTextEditor.selection.active;
		let range = activeTextEditor.document.getWordRangeAtPosition(position, detectFile);
		if (typeof range === 'undefined') {
			return;
		}

		console.log("range = " + range);
		const text = activeTextEditor.document.getText(range);
		console.log(text);
	});

	context.subscriptions.push(openFileDisposable);
}

export function deactivate() { }
