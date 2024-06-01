import * as vscode from 'vscode';

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
			const { exec } = require('child_process');
			exec(`zoxide query ${input}`, (error: { message: any; }, stdout: string, stderr: any) => {
				if (error) {
					vscode.window.showErrorMessage(`Error: ${error.message}`);
					return;
				}
				if (stderr) {
					vscode.window.showErrorMessage(`Error: ${stderr}`);
					return;
				}
				result = stdout;
			});
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
}

// This method is called when your extension is deactivated
export function deactivate() { }
