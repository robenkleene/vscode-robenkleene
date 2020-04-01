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

var blogFromFile = function(filePath: string, link: Boolean = false) {
  const child_process = require("child_process");
  var args = ["-f", `"${escapeShell(filePath)}"`];
  if (link) {
    args.unshift("-l");
  }

  try {
    const result = child_process.spawnSync("~/.bin/jekyll_new_draft", args, {
      shell: true
    });
    displayError(result);
    const newFilePath = result.stdout.toString();
    const fs = require("fs");
    if (fs.existsSync(newFilePath)) {
      const fileURL = vscode.Uri.file(newFilePath);
      vscode.workspace.openTextDocument(fileURL).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }
  } catch (error) {}
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

  let blogPostDisposable = vscode.commands.registerCommand(
    "extension.blogPostFromFile",
    async (uri: vscode.Uri) => {
      var filePath;
      if (uri) {
        filePath = uri.fsPath;
      }

      if (!filePath) {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
          if (activeTextEditor.document.languageId !== "Markdown") {
            return;
          }
          filePath = activeTextEditor.document.uri.fsPath;
        }
      }

      if (!filePath) {
        return;
      }

      blogFromFile(filePath);
    }
  );
  context.subscriptions.push(blogPostDisposable);

  let blogLinkDisposable = vscode.commands.registerCommand(
    "extension.blogLinkFromFile",
    async (uri: vscode.Uri) => {
      var filePath;
      if (uri) {
        filePath = uri.fsPath;
      }

      if (!filePath) {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
          if (activeTextEditor.document.languageId !== "markdown") {
            return;
          }
          filePath = activeTextEditor.document.uri.fsPath;
        }
      }

      if (!filePath) {
        return;
      }

      blogFromFile(filePath, true);
    }
  );
  context.subscriptions.push(blogLinkDisposable);

  let saveAsInboxDisposable = vscode.commands.registerCommand(
    "extension.saveAsInbox",
    async () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }

      const text = activeTextEditor.document.getText();
      if (!text || !text.length) {
        return;
      }

      const os = require("os");
      const path = require("path");
      const defaultUri = vscode.Uri.file(
        path.resolve(os.homedir(), "Documents/Text/Inbox")
      );
      var destinationUri = await vscode.window.showSaveDialog({
        defaultUri: defaultUri
      });
      if (!destinationUri) {
        return;
      }

      const fs = require("fs");
      var destinationPath = destinationUri?.fsPath;
      if (!destinationPath) {
        return;
      }
      if (path.extname(destinationPath) !== ".md") {
        destinationPath = destinationPath + ".md";
        destinationUri = vscode.Uri.file(destinationPath);
      }
      fs.writeFileSync(destinationPath, text);
      if (!fs.existsSync(destinationPath)) {
        return;
      }

      vscode.commands.executeCommand("workbench.action.closeActiveEditor");
      vscode.workspace.openTextDocument(destinationUri).then(doc => {
        vscode.window.showTextDocument(doc, { preview: false });
      });
      // Close original without saving
    }
  );
  context.subscriptions.push(saveAsInboxDisposable);

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
      const fs = require("fs");
      var currentDirPath;
      const activeTextEditor = vscode.window.activeTextEditor;
      var title;
      var directory;
      var selection: vscode.Selection;

      if (uri && fs.lstatSync(uri.fsPath).isDirectory()) {
        currentDirPath = uri.fsPath;
      } else if (activeTextEditor) {
        const folder = vscode.workspace.getWorkspaceFolder(
          activeTextEditor.document.uri
        );
        if (folder) {
          currentDirPath = folder.uri.fsPath;
          selection = activeTextEditor.selection;
          if (selection) {
            const text = activeTextEditor.document.getText(selection);
            if (text.length) {
              var match = /\r|\n/.exec(text);
              if (!match) {
                title = text;
                directory = "projects";
              }
            }
          }
        }
      } else {
        return;
      }

      if (!fs.lstatSync(currentDirPath).isDirectory()) {
        return;
      }

      if (!title) {
        const input = await vscode.window.showInputBox();
        const title = input?.toString();
        if (title === undefined) {
          return;
        }
      }

      if (!title || !title.length) {
        return;
      }

      var args = ["-t", `"${escapeShell(title)}"`];
      if (directory) {
        args = args.concat(["-l", "-d", `"${escapeShell(directory)}"`]);
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync("~/.bin/slug_project", args, {
          shell: true,
          cwd: currentDirPath
        });
        displayError(result);

        if (result.status !== 0) {
          return;
        }
        if (directory) {
          const newText = result.stdout.toString();
          if (!newText.length) {
            return;
          }
          if (activeTextEditor) {
            activeTextEditor.edit(editBuilder => {
              editBuilder.replace(selection, newText);
            });
          }
        } else {
          const relativePath = result.stdout.toString();
          const path = require("path");
          const destinationPath = path.resolve(currentDirPath, relativePath);
          if (fs.existsSync(destinationPath)) {
            const fileURL = vscode.Uri.file(destinationPath);
            vscode.workspace.openTextDocument(fileURL).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          }
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
