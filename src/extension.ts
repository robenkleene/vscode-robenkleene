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
			child_process.execFileSync("~/.bin/urls_open", null, { input: text });
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

		const delimiters = '()\\s"\'';
		const pathRegExpString = "[" + delimiters + "]([^" + delimiters + "]+)[" + delimiters + "]";
		const pathRegExp = new RegExp(pathRegExpString);
		const position = activeTextEditor.selection.active;
		let range = activeTextEditor.document.getWordRangeAtPosition(position, pathRegExp);
		if (typeof range === 'undefined') {
			return;
		}
		const text = activeTextEditor.document.getText(range);
		const match = pathRegExp.exec(text);
		if (match === null) {
			return;
		}
		if (match.length < 2) {
			return;
		}
		const relativePath = match[1];
		const currentPath = activeTextEditor.document.uri.fsPath;

		var path = require('path');
		const currentDirPath = path.dirname(currentPath);
		const destinationPath = path.resolve(currentDirPath, relativePath);
		const fs = require("fs");
		if (!fs.existsSync(destinationPath)) {
			return;
		}

		const fileURL = vscode.Uri.file(destinationPath);
		vscode.workspace.openTextDocument(fileURL).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	});

	context.subscriptions.push(openFileDisposable);

	let backupDisposable = vscode.commands.registerCommand('extension.backupFile', (uri: vscode.Uri) => {
		const path = uri.fsPath;
		const fs = require("fs");
		if (!fs.existsSync(path)) {
			return;
		}
		const child_process = require("child_process");
		try {
			// This doesn't return for some reason
			// const result = child_process.execFileSync('~/.bin/backup_file', [path]);
			// const message = result.toString();
			const result = child_process.spawnSync('~/.bin/backup_file', [path], { shell: true });
			const message = result.stdout.toString();
			const error = result.stderr.toString();
			if (message.length) {
				vscode.window.showInformationMessage(message);
			}
			if (error.length) {
				vscode.window.showInformationMessage(message);
			}
		}
		catch (error) { }
	});
	context.subscriptions.push(backupDisposable);
}

export function deactivate() { }