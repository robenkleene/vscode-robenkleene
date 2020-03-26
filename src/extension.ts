import * as vscode from "vscode";

import { pickFile } from "./quickOpen";

var escapeShell = function(cmd: string) {
  return '"' + cmd.replace(/(["\s'$`\\])/g, "\\$1") + '"';
};

var displayError = function(result: any) {
  if (result.stderr !== null) {
    const error = result.stderr.toString();
    if (error.length) {
      vscode.window.showErrorMessage(error);
    }
  }
};

var displayResult = function(result: any) {
  if (result.stdout !== null) {
    const message = result.stdout.toString();
    if (message.length) {
      vscode.window.showInformationMessage(message);
    }
  }
  if (result.stderr !== null) {
    const error = result.stderr.toString();
    if (error.length) {
      vscode.window.showErrorMessage(error);
    }
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

  if (response !== "yes") {
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
      var pathRegExp = new RegExp(pathRegExpString);
      const position = activeTextEditor.selection.active;
      let range = activeTextEditor.document.getWordRangeAtPosition(
        position,
        pathRegExp
      );
      if (typeof range === "undefined") {
        pathRegExp = new RegExp("\\b(.+)\\b");
        range = activeTextEditor.document.getWordRangeAtPosition(
          position,
          pathRegExp
        );
        if (typeof range === "undefined") {
          return;
        }
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

  let insertFilePathDisposable = vscode.commands.registerCommand(
    "extension.insertFilePath",
    async () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      const currentPath = activeTextEditor.document.uri.fsPath;
      var path = require("path");
      const fs = require("fs");
      if (!fs.existsSync(currentPath)) {
        return;
      }

      const uri = await pickFile(true);
      if (!uri) {
        return;
      }

      const destinationPath = uri.fsPath;
      if (!fs.existsSync(destinationPath)) {
        return;
      }

      const relativePath = path.relative(currentPath, destinationPath);
      const cleanRelativePath = relativePath.replace(/^\.\.\//, "");
      const selection = activeTextEditor.selection;
      activeTextEditor.edit(editBuilder => {
        editBuilder.insert(selection.active, cleanRelativePath);
      });
    }
  );
  context.subscriptions.push(insertFilePathDisposable);

  let makeWikiLinkDisposable = vscode.commands.registerCommand(
    "extension.makeWikiLink",
    async () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      const currentPath = activeTextEditor.document.uri.fsPath;
      var path = require("path");
      const fs = require("fs");
      const currentDirPath = path.dirname(currentPath);
      if (!fs.existsSync(currentDirPath)) {
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
      var match = /\r|\n/.exec(text);
      if (match) {
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/markdown_wiki_link -t ",
          [`"${escapeShell(text)}"`],
          { shell: true, cwd: currentDirPath }
        );
        displayError(result);
        const newText = result.stdout.toString();
        if (!newText.length) {
          return;
        }  
        activeTextEditor.edit(editBuilder => {
          editBuilder.replace(selection, newText);
        });  
      } catch (error) {}
    }
  );
  context.subscriptions.push(makeWikiLinkDisposable);

  let archiveDisposable = vscode.commands.registerCommand(
    "extension.archive",
    async (uri: vscode.Uri) => {
      var filePath;
      var text;
      if (uri) {
        filePath = uri.fsPath;
      }
      const activeTextEditor = vscode.window.activeTextEditor;
      if (activeTextEditor) {
        const selection = activeTextEditor.selection;
        text = activeTextEditor.document.getText(selection);
        if (!filePath) {
          filePath = activeTextEditor.document.uri.fsPath;
        }
      }

      if (filePath && (!text || !text.length)) {
        archiveFilePath(filePath);
        return;
      }

      if (!activeTextEditor) {
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync("~/.bin/backup_text", ["-m"], {
          input: text,
          shell: true
        });
        displayResult(result);
        const selection = activeTextEditor.selection;
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
        displayError(result);
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

  let openSourceControlSiteDisposable = vscode.commands.registerCommand(
    "extension.openSourceControlSite",
    async (uri: vscode.Uri) => {
      var filePath;
      if (uri) {
        filePath = uri.fsPath;
      } else {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) {
          return;
        }
        const folder = vscode.workspace.getWorkspaceFolder(
          activeTextEditor.document.uri
        );
        if (!folder) {
          return;
        }
        filePath = folder.uri.fsPath;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/source_control_open_site",
          null,
          {
            shell: true,
            cwd: filePath
          }
        );
        displayError(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(openSourceControlSiteDisposable);
}

export function deactivate() {}
