import * as vscode from "vscode";

var escapeShell = function(cmd: string) {
  return '"' + cmd.replace(/(["\s'$`\\])/g, "\\$1") + '"';
};

var displayResult = function(result: any) {
  const message = result.stdout.toString();
  const error = result.stderr.toString();
  if (message.length) {
    vscode.window.showInformationMessage(message);
  }
  if (error.length) {
    vscode.window.showErrorMessage(error);
  }
};

var archiveFilePath = async function(filePath: string) {
  const fs = require("fs");
  if (!fs.existsSync(filePath)) {
    return;
  }
  const path = require("path");
  const filename = path.basename(filePath);
  const response = await vscode.window.showQuickPick(["no", "yes"], {
    placeHolder: `Backup ${filename}?`
  });

  if (response === "no") {
    return;
  }

  const child_process = require("child_process");
  try {
    const result = child_process.spawnSync(
      "~/.bin/backup_file",
      [`"${escapeShell(filePath)}"`],
      { shell: true }
    );
    displayResult(result);
  } catch (error) {}
};

export function activate(context: vscode.ExtensionContext) {
  let openURLsDisposable = vscode.commands.registerCommand(
    "extension.openURLs",
    () => {
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
      } catch (error) {
        // Ignored, there's an error if no URLs are found.
      }
    }
  );
  context.subscriptions.push(openURLsDisposable);

  let openFileDisposable = vscode.commands.registerCommand(
    "extension.openFile",
    () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }

      const delimiters = "()\\s\"'";
      const pathRegExpString =
        "[" + delimiters + "]([^" + delimiters + "]+)[" + delimiters + "]";
      const pathRegExp = new RegExp(pathRegExpString);
      const position = activeTextEditor.selection.active;
      let range = activeTextEditor.document.getWordRangeAtPosition(
        position,
        pathRegExp
      );
      if (typeof range === "undefined") {
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

      var path = require("path");
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
    }
  );
  context.subscriptions.push(openFileDisposable);

  let archiveDisposable = vscode.commands.registerCommand(
    "extension.archive",
    async (uri: vscode.Uri) => {
      var filePath;
      var text;
      if (uri) {
        filePath = uri.fsPath;
        archiveFilePath(filePath);
        return;
      }
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      const selection = activeTextEditor.selection;
      text = activeTextEditor.document.getText(selection);
      if (!text.length) {
        filePath = activeTextEditor.document.uri.fsPath;
        archiveFilePath(filePath);
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync("~/.bin/backup_text", ["-m"], {
          input: text,
          shell: true
        });
        displayResult(result);
        activeTextEditor.edit(editBuilder => {
          editBuilder.delete(selection);
        });
      } catch (error) {
        // Ignored, there's an error if no URLs are found.
      }
    }
  );
  context.subscriptions.push(archiveDisposable);

  let slugProjectDisposable = vscode.commands.registerCommand(
    "extension.slugProject",
    async (uri: vscode.Uri) => {
      const currentDirPath = uri.fsPath;
      const fs = require("fs");
      if (!fs.lstatSync(currentDirPath).isDirectory()) {
        return;
      }

      const input = await vscode.window.showInputBox();
      const title = input?.toString();
      if (title === undefined) {
        return;
      }
      if (!title.length) {
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/slug_project",
          [`"${escapeShell(title)}"`],
          { shell: true, cwd: currentDirPath }
        );
        displayResult(result);
        const relativePath = result.stdout.toString();
        var path = require("path");
        const destinationPath = path.resolve(currentDirPath, relativePath);
        if (fs.existsSync(destinationPath)) {
          const fileURL = vscode.Uri.file(destinationPath);
          vscode.workspace.openTextDocument(fileURL).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        }
      } catch (error) {}
    }
  );
  context.subscriptions.push(slugProjectDisposable);
}

export function deactivate() {}
