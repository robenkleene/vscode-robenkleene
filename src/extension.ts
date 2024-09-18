import * as vscode from 'vscode';
import * as os from 'os';

export function activate(context: vscode.ExtensionContext) {
	let zDisposable = vscode.commands.registerCommand('robenkleene.z', async () => {
		const input = await vscode.window.showInputBox({
			placeHolder: "Z",
		});
		if (!input?.length) {
			return;
		}

		let result: string = "";
		if (input) {
			const { execSync } = require('child_process');
			try {
				const output = execSync(`zoxide query ${input} | tr -d '\n'`);
				result = output.toString();
			} catch (error) {
				const err = error as Error;
				vscode.window.showErrorMessage(`Error: ${err.message}`);
				return;
			}
		}

		if (!result?.length) {
			return;
		}
		const fs = require("fs");
		if (
			fs.existsSync(result) &&
			fs.lstatSync(result).isDirectory()
		) {
			let destUri = vscode.Uri.file(result);
			const success = await vscode.commands.executeCommand(
				"vscode.openFolder",
				destUri
			);
		}
	});
	context.subscriptions.push(zDisposable);

	let openFolderForFileDisposable = vscode.commands.registerCommand(
		"robenkleene.openDirectory",
		async (uri: vscode.Uri) => {
			var dirUri;
			var fileUri;
			const fs = require("fs");
			var path = require("path");
			if (uri) {
				if (fs.lstatSync(uri.fsPath).isDirectory()) {
					// Use the selected directory in the file explorer
					dirUri = uri;
				} else {
					fileUri = uri;
					const dirPath = path.dirname(fileUri.fsPath);
					dirUri = vscode.Uri.file(dirPath);
				}
			} else {
				// Or if a valid directory wasn't passed in, use the directory of the current file
				const activeTextEditor = vscode.window.activeTextEditor;
				if (!activeTextEditor) {
					return;
				}
				fileUri = activeTextEditor.document.uri;
				let filePath = activeTextEditor.document.uri.fsPath;
				const dirPath = path.dirname(filePath);
				if (!fs.lstatSync(dirPath).isDirectory()) {
					return;
				}
				dirUri = vscode.Uri.file(dirPath);
			}

			if (!fs.existsSync(dirUri.fsPath)) {
				return;
			}
			await vscode.commands.executeCommand("vscode.openFolder", dirUri);
		}
	);
	context.subscriptions.push(openFolderForFileDisposable);

	let disposable = vscode.commands.registerCommand('robenkleene.copyGrep', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const document = editor.document;
		const selection = editor.selection;
		const line = selection.active.line + 1;
		const column = selection.active.character + 1;
		let filePath = document.uri.fsPath;
		const homeDir = os.homedir();
		if (filePath.startsWith(homeDir)) {
		  filePath = `~${filePath.substring(homeDir.length)}`;
		}  
		const location = `${filePath}:${line}:${column}`;

		let result = location;
		if (selection) {
			const text = editor.document.getText(selection);
			if (text.length) {
				result += `:\n${text}`;
			}
		}

		vscode.env.clipboard.writeText(result).then(() => {
		  vscode.window.showInformationMessage(`${result}`);
		});
	});
	context.subscriptions.push(disposable);

}

// This method is called when your extension is deactivated
export function deactivate() { }
