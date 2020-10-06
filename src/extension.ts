import * as vscode from "vscode";

import { pickFile } from "./quickOpen";

var escapeShell = function (cmd: string) {
  return '"' + cmd.replace(/(["\s'$`\\])/g, "\\$1") + '"';
};

var displayError = function (result: any) {
  if (result.stderr !== null) {
    const error = result.stderr.toString();
    if (error.length) {
      vscode.window.showErrorMessage(error);
    }
  } else if (result.error) {
    vscode.window.showErrorMessage(result.error.message);
  }
};

var blogFromFile = function (filePath: string, link: Boolean = false) {
  const child_process = require("child_process");
  var args = ["-f", `"${escapeShell(filePath)}"`];
  if (link) {
    args.unshift("-l");
  }

  try {
    const result = child_process.spawnSync("~/.bin/jekyll_new_draft", args, {
      shell: true,
    });
    displayError(result);
    const newFilePath = result.stdout.toString();
    const fs = require("fs");
    if (fs.existsSync(newFilePath)) {
      const fileURL = vscode.Uri.file(newFilePath);
      vscode.workspace.openTextDocument(fileURL).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    }
  } catch (error) {}
};

var displayResult = function (result: any) {
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

var archiveFilePath = async function (filePath: string) {
  const fs = require("fs");
  if (!fs.existsSync(filePath)) {
    return;
  }
  const path = require("path");
  const filename = path.basename(filePath);

  // if (fs.lstatSync(filePath).isDirectory()) {
  // }
  const response = await vscode.window.showQuickPick(["no", "yes"], {
    placeHolder: `Backup ${filename}?`,
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
    displayError(result);
  } catch (error) {}
};

var todoCheck = function (
  flag: string,
  useBreak: Boolean = true,
  range?: vscode.Range
) {
  const activeTextEditor = vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return;
  }
  const selection = activeTextEditor.selection;
  if (!range) {
    if (!selection || selection.isEmpty) {
      var firstLine = activeTextEditor.document.lineAt(0);
      var lastLine = activeTextEditor.document.lineAt(
        activeTextEditor.document.lineCount - 1
      );
      range = new vscode.Range(firstLine.range.start, lastLine.range.end);
    } else {
      range = selection;
    }
  }
  const text = activeTextEditor.document.getText(range);

  if (!(text && text.length)) {
    return;
  }

  const child_process = require("child_process");
  try {
    const args = useBreak ? [flag, "-b"] : [flag];
    const result = child_process.spawnSync("~/.bin/markdown_check", args, {
      shell: true,
      input: text,
    });
    displayError(result);
    const newText = result.stdout.toString();
    if (!newText.length) {
      return;
    }
    if (text?.length) {
      if (!range) {
        return;
      }
      const aRange = range;
      activeTextEditor.edit((editBuilder) => {
        editBuilder.replace(aRange, newText);
      });
    }
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
        const result = child_process.spawnSync("~/.bin/urls_open", null, {
          shell: true,
          input: text,
        });
        displayError(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(openURLsDisposable);

  // This doesn't work yet, IINA can't open URLs from the command line
  let openURLsInIINADisposable = vscode.commands.registerCommand(
    "extension.openURLsInIINA",
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
        const result = child_process.spawnSync("~/.bin/urls_open_iina", null, {
          shell: true,
          input: text,
        });
        displayError(result);
      } catch (error) {}
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

      // First test between delimiters
      const delimiters = "()\"'";
      const pathRegExpString =
        "[" + delimiters + "]([^" + delimiters + "]+)[" + delimiters + "]";
      var pathRegExp = new RegExp(pathRegExpString);
      var index = 1;
      const position = activeTextEditor.selection.active;
      let range = activeTextEditor.document.getWordRangeAtPosition(
        position,
        pathRegExp
      );
      if (typeof range === "undefined") {
        // Otherwise test for word boundaries
        // `\b` is a word boundary
        // pathRegExp = new RegExp("\\b(.+)\\b");
        // This seems to work better than the above:
        pathRegExp = new RegExp("\\S+");
        index = 0;
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
      if (match.length <= index) {
        return;
      }
      const relativePath = match[index];
      const currentPath = activeTextEditor.document.uri.fsPath;

      var path = require("path");
      const currentDirPath = path.dirname(currentPath);
      const destinationPath = path.resolve(currentDirPath, relativePath);
      const fs = require("fs");
      if (!fs.existsSync(destinationPath)) {
        return;
      }

      const fileURL = vscode.Uri.file(destinationPath);
      vscode.workspace.openTextDocument(fileURL).then((doc) => {
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

      var rootDirs;
      if (!vscode.workspace.workspaceFolders) {
        rootDirs = [path.dirname(currentPath)];
      }
      const uri = await pickFile(true, rootDirs);
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
      activeTextEditor.edit((editBuilder) => {
        editBuilder.replace(selection, cleanRelativePath);
      });
    }
  );
  context.subscriptions.push(insertFilePathDisposable);

  let convertToSlugDisposable = vscode.commands.registerCommand(
    "extension.convertToSlug",
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
        const result = child_process.spawnSync("~/.bin/slug", null, {
          shell: true,
          input: text,
        });
        displayError(result);
        if (result.status !== 0) {
          return;
        }
        const newText = result.stdout.toString();
        if (!newText.length) {
          return;
        }
        const selection = activeTextEditor.selection;
        activeTextEditor.edit((editBuilder) => {
          editBuilder.replace(selection, newText);
        });
      } catch (error) {}
    }
  );
  context.subscriptions.push(convertToSlugDisposable);

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
          "~/.bin/markdown_wiki_link",
          null,
          { shell: true, cwd: currentDirPath, input: text }
        );
        displayError(result);
        const newText = result.stdout.toString();
        if (!newText.length) {
          return;
        }
        activeTextEditor.edit((editBuilder) => {
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
          if (
            activeTextEditor.document.languageId.localeCompare(
              "Markdown",
              undefined,
              { sensitivity: "base" }
            )
          ) {
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
      if (!text?.length) {
        return;
      }

      const os = require("os");
      const path = require("path");
      const defaultUri = vscode.Uri.file(
        path.resolve(os.homedir(), "Documents/Text/Notes/Inbox")
      );
      var destinationUri = await vscode.window.showSaveDialog({
        defaultUri: defaultUri,
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

      // Clear the document so we can save without prompting
      var firstLine = activeTextEditor.document.lineAt(0);
      var lastLine = activeTextEditor.document.lineAt(
        activeTextEditor.document.lineCount - 1
      );
      var textRange = new vscode.Range(
        firstLine.range.start,
        lastLine.range.end
      );
      activeTextEditor.edit((editBuilder) => {
        editBuilder.delete(textRange);
      });
      vscode.commands.executeCommand("workbench.action.closeActiveEditor");
      vscode.workspace.openTextDocument(destinationUri).then((doc) => {
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
      var text = null;
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

      if (filePath && !text?.length) {
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
          shell: true,
        });
        displayError(result);
        const selection = activeTextEditor.selection;
        activeTextEditor.edit((editBuilder) => {
          editBuilder.delete(selection);
        });
      } catch (error) {
        // Ignored, there's an error if no URLs are found.
      }
    }
  );
  context.subscriptions.push(archiveDisposable);

  let openScratchDisposable = vscode.commands.registerCommand(
    "extension.openScratch",
    async () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      const filePath = activeTextEditor?.document.uri.path;
      var path = require("path");
      const extension = path.extname(filePath);
      const languageId = activeTextEditor?.document.languageId;
      var text = null;
      if (activeTextEditor) {
        const selection = activeTextEditor.selection;
        text = activeTextEditor.document.getText(selection);
      } else {
        return;
      }

      if (!extension || !languageId) {
        return;
      }

      const child_process = require("child_process");
      const args = ["-f", languageId, "-e", extension];
      try {
        const result = child_process.spawnSync("~/.bin/scratch", args, {
          input: text,
          shell: true,
        });
        displayError(result);
        const newFilePath = result.stdout.toString();
        const fs = require("fs");
        if (fs.existsSync(newFilePath)) {
          const fileURL = vscode.Uri.file(newFilePath);
          vscode.workspace.openTextDocument(fileURL).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        }
      } catch (error) {}
    }
  );
  context.subscriptions.push(openScratchDisposable);

  let slugProjectDisposable = vscode.commands.registerCommand(
    "extension.slugProject",
    async (uri: vscode.Uri) => {
      const fs = require("fs");
      var currentDirPath;
      const activeTextEditor = vscode.window.activeTextEditor;
      var title = null;
      var directory;
      var selection: vscode.Selection;

      if (uri && fs.lstatSync(uri.fsPath).isDirectory()) {
        currentDirPath = uri.fsPath;
      } else if (activeTextEditor) {
        const currentPath = activeTextEditor.document.uri.fsPath;
        var path = require("path");
        currentDirPath = path.dirname(currentPath);
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

      if (!title?.length) {
        return;
      }

      var args = null;
      if (directory) {
        args = ["-l", "-d", `"${escapeShell(directory)}"`];
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync("~/.bin/slug_project", args, {
          shell: true,
          cwd: currentDirPath,
          input: title,
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
            activeTextEditor.edit((editBuilder) => {
              editBuilder.replace(selection, newText);
            });
          }
        } else {
          const relativePath = result.stdout.toString();
          const path = require("path");
          const destinationPath = path.resolve(currentDirPath, relativePath);
          if (fs.existsSync(destinationPath)) {
            const fileURL = vscode.Uri.file(destinationPath);
            vscode.workspace.openTextDocument(fileURL).then((doc) => {
              vscode.window.showTextDocument(doc);
            });
          }
        }
      } catch (error) {}
    }
  );
  context.subscriptions.push(slugProjectDisposable);

  let slugProjectArchiveDisposable = vscode.commands.registerCommand(
    "extension.slugProjectArchive",
    async (uri: vscode.Uri) => {
      const fs = require("fs");
      var currentDirPath;
      const activeTextEditor = vscode.window.activeTextEditor;
      if (uri && fs.lstatSync(uri.fsPath).isDirectory()) {
        currentDirPath = uri.fsPath;
      } else if (activeTextEditor) {
        const currentPath = activeTextEditor.document.uri.fsPath;
        var path = require("path");
        var dirPath = path.dirname(currentPath);
        if (fs.lstatSync(dirPath).isDirectory()) {
          currentDirPath = dirPath;
        }
      }

      if (!currentDirPath) {
        return;
      }

      const args = [`"${escapeShell(currentDirPath)}"`];
      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/slug_project_archive",
          args,
          {
            shell: true,
          }
        );
        displayError(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(slugProjectArchiveDisposable);

  let slugProjectArchiveReadmeDisposable = vscode.commands.registerCommand(
    "extension.slugProjectArchiveReadme",
    async (uri: vscode.Uri) => {
      var filePath;
      const path = require("path");
      if (uri) {
        filePath = uri.fsPath;
      } else {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
          const fileUri = activeTextEditor.document.uri;
          const documentFilePath = activeTextEditor.document.uri.fsPath;
          filePath = path.dirname(documentFilePath);
        } else {
          filePath = vscode.workspace.rootPath;
        }
      }

      if (!filePath) {
        return;
      }

      var readmePath = path.join(filePath, "archive/README.md");
      const fs = require("fs");
      if (fs.existsSync(readmePath)) {
        const fileURL = vscode.Uri.file(readmePath);
        vscode.workspace.openTextDocument(fileURL).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      } else {
        // Try lowercase
        readmePath = path.join(filePath, "archive/readme.md");
        if (!fs.existsSync(readmePath)) {
          return;
        }
        const fileURL = vscode.Uri.file(readmePath);
        vscode.workspace.openTextDocument(fileURL).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
    }
  );
  context.subscriptions.push(slugProjectArchiveReadmeDisposable);

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
            cwd: filePath,
          }
        );
        displayError(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(openSourceControlSiteDisposable);

  let openInReplaDisposable = vscode.commands.registerCommand(
    "extension.openInRepla",
    async (uri: vscode.Uri) => {
      var filePath;
      if (uri) {
        filePath = uri.fsPath;
      }

      if (!filePath) {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
          filePath = activeTextEditor.document.uri.fsPath;
        }
      }
      if (!filePath) {
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "/usr/local/bin/repla",
          [`"${escapeShell(filePath)}"`],
          { shell: true }
        );
        displayResult(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(openInReplaDisposable);

  let makeTitleCaseDisposable = vscode.commands.registerCommand(
    "extension.makeTitleCase",
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
        const result = child_process.spawnSync("~/.bin/title_case", null, {
          shell: true,
          input: text,
        });
        displayError(result);
        const newText = result.stdout.toString();
        if (!newText.length) {
          return;
        }
        activeTextEditor.edit((editBuilder) => {
          editBuilder.replace(selection, newText);
        });
      } catch (error) {}
    }
  );
  context.subscriptions.push(makeTitleCaseDisposable);

  let openReadmeDisposable = vscode.commands.registerCommand(
    "extension.openReadme",
    async (uri: vscode.Uri) => {
      var filePath;
      if (uri) {
        filePath = uri.fsPath;
      } else {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor) {
          const folder = vscode.workspace.getWorkspaceFolder(
            activeTextEditor.document.uri
          );
          if (!folder) {
            return;
          }
          filePath = folder.uri.fsPath;
        } else {
          filePath = vscode.workspace.rootPath;
        }
      }

      if (!filePath) {
        return;
      }

      const path = require("path");
      var readmePath = path.join(filePath, "README.md");
      const fs = require("fs");
      if (fs.existsSync(readmePath)) {
        const fileURL = vscode.Uri.file(readmePath);
        vscode.workspace.openTextDocument(fileURL).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      } else {
        // Try lowercase
        readmePath = path.join(filePath, "readme.md");
        if (!fs.existsSync(readmePath)) {
          return;
        }
        const fileURL = vscode.Uri.file(readmePath);
        vscode.workspace.openTextDocument(fileURL).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
    }
  );
  context.subscriptions.push(openReadmeDisposable);

  let quickOpenDocumentationDisposable = vscode.commands.registerCommand(
    "extension.quickOpenDocumentation",
    async () => {
      const path = require("path");
      const os = require("os");
      let dirPath = path.resolve(os.homedir(), "Documentation");

      const uri = await pickFile(true, [dirPath]);
      if (!uri) {
        return;
      }

      const destinationPath = uri.fsPath;
      const fs = require("fs");
      if (!fs.existsSync(destinationPath)) {
        return;
      }
      let destUri = vscode.Uri.file(destinationPath);
      if (fs.lstatSync(destinationPath).isDirectory()) {
        const success = await vscode.commands.executeCommand(
          "vscode.openFolder",
          destUri
        );
      } else {
        vscode.workspace.openTextDocument(destUri).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
    }
  );
  context.subscriptions.push(quickOpenDocumentationDisposable);

  let quickOpenZDisposable = vscode.commands.registerCommand(
    "extension.quickOpenZ",
    async () => {
      const path = require("path");
      const os = require("os");

      // Passing in `[""]` as `cwd` makes `pickFile` operate with absolute
      // paths. E.g., if we pass in `undefined` instead, the absolute path with
      // be concatenated onto the relative path.
      const uri = await pickFile(true, [""], "/usr/local/bin/fasd -Rdl");
      if (!uri) {
        return;
      }

      const destinationPath = uri.fsPath;
      const fs = require("fs");
      if (
        fs.existsSync(destinationPath) &&
        fs.lstatSync(destinationPath).isDirectory()
      ) {
        let destUri = vscode.Uri.file(destinationPath);
        const success = await vscode.commands.executeCommand(
          "vscode.openFolder",
          destUri
        );
      }
    }
  );
  context.subscriptions.push(quickOpenZDisposable);

  let quickOpenTextDisposable = vscode.commands.registerCommand(
    "extension.quickOpenText",
    async () => {
      const path = require("path");
      const os = require("os");
      let dirPath = path.resolve(os.homedir(), "Text");

      const uri = await pickFile(true, [dirPath]);
      if (!uri) {
        return;
      }

      const destinationPath = uri.fsPath;
      const fs = require("fs");
      if (!fs.existsSync(destinationPath)) {
        return;
      }
      let destUri = vscode.Uri.file(destinationPath);
      if (fs.lstatSync(destinationPath).isDirectory()) {
        const success = await vscode.commands.executeCommand(
          "vscode.openFolder",
          destUri
        );
      } else {
        vscode.workspace.openTextDocument(destUri).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
    }
  );
  context.subscriptions.push(quickOpenTextDisposable);

  let quickOpenAllDisposable = vscode.commands.registerCommand(
    "extension.quickOpenAll",
    async () => {
      const path = require("path");
      const os = require("os");
      let textDirPath = path.resolve(os.homedir(), "Text");
      let documentationDirPath = path.resolve(os.homedir(), "Documentation");
      let notesDirPath = path.resolve(os.homedir(), "Documents/Text/Notes");

      const uri = await pickFile(
        true,
        [textDirPath, documentationDirPath, notesDirPath],
        undefined,
        "--type d"
      );
      if (!uri) {
        return;
      }

      const destinationPath = uri.fsPath;
      const fs = require("fs");
      if (!fs.existsSync(destinationPath)) {
        return;
      }
      let destUri = vscode.Uri.file(destinationPath);
      if (fs.lstatSync(destinationPath).isDirectory()) {
        const success = await vscode.commands.executeCommand(
          "vscode.openFolder",
          destUri
        );
      } else {
        vscode.workspace.openTextDocument(destUri).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
    }
  );
  context.subscriptions.push(quickOpenAllDisposable);

  let quickOpenAllFilesDisposable = vscode.commands.registerCommand(
    "extension.quickOpenAllFiles",
    async () => {
      const path = require("path");
      const os = require("os");
      let textDirPath = path.resolve(os.homedir(), "Text");
      let documentationDirPath = path.resolve(os.homedir(), "Documentation");
      let notesDirPath = path.resolve(os.homedir(), "Documents/Text/Notes");

      const uri = await pickFile(
        true,
        [textDirPath, documentationDirPath, notesDirPath],
        undefined,
        "--type f"
      );
      if (!uri) {
        return;
      }

      const destinationPath = uri.fsPath;
      const fs = require("fs");
      if (!fs.existsSync(destinationPath)) {
        return;
      }
      let destUri = vscode.Uri.file(destinationPath);
      if (fs.lstatSync(destinationPath).isDirectory()) {
        const success = await vscode.commands.executeCommand(
          "vscode.openFolder",
          destUri
        );
      } else {
        vscode.workspace.openTextDocument(destUri).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
    }
  );
  context.subscriptions.push(quickOpenAllFilesDisposable);

  let insertTitleDisposable = vscode.commands.registerCommand(
    "extension.insertTitle",
    () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      const selection = activeTextEditor.selection;

      const currentPath = activeTextEditor.document.uri.fsPath;
      var path = require("path");
      const fs = require("fs");
      if (!fs.existsSync(currentPath)) {
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/markdown_title",
          [`"${escapeShell(currentPath)}"`],
          {
            shell: true,
          }
        );
        displayError(result);

        if (result.status !== 0) {
          return;
        }
        const newText = result.stdout.toString();
        if (!newText.length) {
          return;
        }
        if (activeTextEditor) {
          activeTextEditor
            .edit((editBuilder) => {
              editBuilder.replace(selection, newText);
            })
            .then((success) => {
              var position = activeTextEditor.selection.end;
              activeTextEditor.selection = new vscode.Selection(
                position,
                position
              );
            });
        }
      } catch (error) {}
    }
  );
  context.subscriptions.push(insertTitleDisposable);

  let todoCheckDisposable = vscode.commands.registerCommand(
    "extension.todoCheck",
    () => {
      todoCheck("-c");
    }
  );
  context.subscriptions.push(todoCheckDisposable);

  let todoUncheckDisposable = vscode.commands.registerCommand(
    "extension.todoUncheck",
    () => {
      todoCheck("-u");
    }
  );
  context.subscriptions.push(todoUncheckDisposable);

  let todoToggleDisposable = vscode.commands.registerCommand(
    "extension.todoToggle",
    () => {
      todoCheck("-i");
    }
  );
  context.subscriptions.push(todoToggleDisposable);

  let todoToggleLocalDisposable = vscode.commands.registerCommand(
    "extension.todoToggleLocal",
    () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      var range: vscode.Range = activeTextEditor.selection;
      var useBreak = true;
      if (!range || range.isEmpty) {
        const line = activeTextEditor.document.lineAt(
          activeTextEditor.selection.active.line
        );
        range = line.range;
        useBreak = false;
      }
      todoCheck("-i", useBreak, range);
    }
  );
  context.subscriptions.push(todoToggleLocalDisposable);

  let copyMarkdownSourceControlLinkDisposable = vscode.commands.registerCommand(
    "extension.copyMarkdownSourceControlLink",
    async () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      const filePath = activeTextEditor.document.uri.fsPath;

      const line = activeTextEditor.selection.start.line + 1;
      var options: { [k: string]: any } = { shell: true };

      const selection = activeTextEditor.selection;
      if (!selection) {
        return;
      }
      const text = activeTextEditor.document.getText(selection);
      if (text.length) {
        options["input"] = text;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/link_source_control_markdown",
          ["--line-number", line, `"${escapeShell(filePath)}"`],
          options
        );

        if (result.stdout !== null) {
          const quote = result.stdout.toString();
          if (quote.length) {
            await vscode.env.clipboard.writeText(quote);
          }
        }
        displayError(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(copyMarkdownSourceControlLinkDisposable);

  let copyMarkdownSourceControlQuoteDisposable = vscode.commands.registerCommand(
    "extension.copyMarkdownSourceControlQuote",
    async () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      const filePath = activeTextEditor.document.uri.fsPath;

      const line = activeTextEditor.selection.start.line + 1;
      var options: { [k: string]: any } = { shell: true };

      const selection = activeTextEditor.selection;
      if (!selection) {
        return;
      }
      const text = activeTextEditor.document.getText(selection);
      if (text.length) {
        options["input"] = text;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/link_source_control_markdown",
          ["--quote", "--line-number", line, `"${escapeShell(filePath)}"`],
          options
        );

        if (result.stdout !== null) {
          const quote = result.stdout.toString();
          if (quote.length) {
            await vscode.env.clipboard.writeText(quote);
          }
        }
        displayError(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(copyMarkdownSourceControlQuoteDisposable);

  let openSourceControlLinkDisposable = vscode.commands.registerCommand(
    "extension.openSourceControlLink",
    () => {
      const activeTextEditor = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }
      const filePath = activeTextEditor.document.uri.fsPath;

      const line = activeTextEditor.selection.start.line + 1;
      var options: { [k: string]: any } = { shell: true };

      const selection = activeTextEditor.selection;
      if (!selection) {
        return;
      }
      const text = activeTextEditor.document.getText(selection);
      if (text.length) {
        options["input"] = text;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/link_source_control_open",
          ["--line-number", line, `"${escapeShell(filePath)}"`],
          options
        );
        displayError(result);
      } catch (error) {}
    }
  );
  context.subscriptions.push(openSourceControlLinkDisposable);

  let openFolderForFileDisposable = vscode.commands.registerCommand(
    "extension.openDirectory",
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
      // This doesn't seem to work, I think because `openFolder` triggers some
      // kind of refresh and no additional commands can be executed after it.
      // if (fileUri && fs.existsSync(fileUri.fsPath)) {
      //   vscode.workspace.openTextDocument(fileUri).then((doc) => {
      //     vscode.window.showTextDocument(doc, { preview: false });
      //   });
      // }
    }
  );
  context.subscriptions.push(openFolderForFileDisposable);

  let closeOtherEditorsDisposable = vscode.commands.registerCommand(
    "extension.closeOtherEditors",
    async (uri: vscode.Uri) => {
      var fileUri;
      const fs = require("fs");
      if (uri && !fs.lstatSync(uri.fsPath).isDirectory()) {
        // Use the selected directory in the file explorer
        fileUri = uri;
      } else {
        // Or if a valid directory wasn't passed in, use the directory of the current file
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) {
          return;
        }
        let filePath = activeTextEditor.document.uri.fsPath;
        fileUri = vscode.Uri.file(filePath);
      }

      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      vscode.workspace.openTextDocument(fileUri).then((doc) => {
        vscode.window.showTextDocument(doc, { preview: false });
      });
    }
  );
  context.subscriptions.push(closeOtherEditorsDisposable);

  let openDocumentationDisposable = vscode.commands.registerCommand(
    "extension.openDocumentation",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "Documentation");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openDocumentationDisposable);

  let openTweetsDisposable = vscode.commands.registerCommand(
    "extension.openTweets",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "/Documents/Text/Social/Tweets/");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openTweetsDisposable);

  let openEmailDisposable = vscode.commands.registerCommand(
    "extension.openEmail",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "/Documents/Text/Social/Email/");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openEmailDisposable);

  let openSocialDisposable = vscode.commands.registerCommand(
    "extension.openSocial",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "/Documents/Text/Social/");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openEmailDisposable);

  let newEmailDisposable = vscode.commands.registerCommand(
    "extension.newEmail",
    async () => {
      const title = await vscode.window.showInputBox({
        placeHolder: "Name",
      });

      if (!title?.length) {
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/email_new",
          [`"${escapeShell(title)}"`],
          {
            shell: true,
          }
        );
        displayError(result);
        const newFilePath = result.stdout.toString();
        const fs = require("fs");
        if (fs.existsSync(newFilePath)) {
          const fileURL = vscode.Uri.file(newFilePath);
          vscode.workspace.openTextDocument(fileURL).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        }
      } catch (error) {}
    }
  );
  context.subscriptions.push(newEmailDisposable);

  let openDevelopmentScratchDisposable = vscode.commands.registerCommand(
    "extension.openDevelopmentScratch",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "Developer/Scratch");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openDevelopmentScratchDisposable);

  let openBlogDisposable = vscode.commands.registerCommand(
    "extension.openBlog",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(
        homedir,
        "Developer/Projects/Web/robenkleene.github.io"
      );

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openBlogDisposable);

  let openWikiDisposable = vscode.commands.registerCommand(
    "extension.openWiki",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "Text/wiki");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openWikiDisposable);

  let openPersonalWikiDisposable = vscode.commands.registerCommand(
    "extension.openPersonalWiki",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "Text/personal-wiki");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openPersonalWikiDisposable);

  let newInboxDocumentDisposable = vscode.commands.registerCommand(
    "extension.newInboxDocument",
    async () => {
      const title = await vscode.window.showInputBox({
        placeHolder: "Title",
      });

      if (!title?.length) {
        return;
      }

      const child_process = require("child_process");
      try {
        const result = child_process.spawnSync(
          "~/.bin/inbox_new",
          [`"${escapeShell(title)}"`],
          {
            shell: true,
          }
        );
        displayError(result);
        const newFilePath = result.stdout.toString();
        const fs = require("fs");
        if (fs.existsSync(newFilePath)) {
          const fileURL = vscode.Uri.file(newFilePath);
          vscode.workspace.openTextDocument(fileURL).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        }
      } catch (error) {}
    }
  );
  context.subscriptions.push(newInboxDocumentDisposable);

  let openJournalEntryDisposable = vscode.commands.registerCommand(
    "extension.openJournalEntry",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "Text/journal");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openJournalEntryDisposable);

  let openProjectsDisposable = vscode.commands.registerCommand(
    "extension.openProjects",
    async () => {
      const homedir = require("os").homedir();
      const path = require("path");
      const dirPath = path.join(homedir, "Text/Projects");

      const fs = require("fs");
      if (!fs.lstatSync(dirPath).isDirectory()) {
        return;
      }
      let dirUri = vscode.Uri.file(dirPath);
      const success = await vscode.commands.executeCommand(
        "vscode.openFolder",
        dirUri
      );
    }
  );
  context.subscriptions.push(openProjectsDisposable);
}

export function deactivate() {}
