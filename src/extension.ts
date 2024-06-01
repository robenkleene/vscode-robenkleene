import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let zDisposable = vscode.commands.registerCommand('robenkleene.z', async () => {
		const result = await vscode.window.showInputBox({
			placeHolder: "Z",
		  });
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
export function deactivate() {}
