# Roben Kleene's Personal Visual Studio Code Extension

This is both a collection of my own VS Code customizations, and an example of how personal customizations can be managed.

While most programmable text editors have a built-in place to put personal customizations, such Vim's [`vimrc`](https://vim.fandom.com/wiki/Open_vimrc_file) and Emac's [`init.el`](https://www.gnu.org/software/emacs/manual/html_node/emacs/Init-File.html), Visual Studio Code does not have this functionality. In order to make your own customizations, you must build an extension. But an extension is not an ideal way to manage personal customizations, especially not if shared via the [Extension Marketplace](https://marketplace.visualstudio.com/VSCode).

## Foreword

The intention is not for you to install this extension yourself, but instead illustrate how a personal extension can be used to quickly add commands to VS Code, similar to how other programmable text editors can be customized. If you install this extension on your machine, *most of the commands will not work*, because most of the commands depend on [a number of other customizations](https://github.com/robenkleene/Dotfiles) already being in place.

To those ends, the best way to peruse what customizations can do, and how they are added, is to look at the commands defined in the [`package.json`](package.json) file, to see how they are configured as contextual menus, keyboard shortcuts, and command palette commands.

## Making Your Own Personal VS Code Extension

This process show how you can make your own personal extension to extend VS Code and test your changes. The process is generally the same as you'd use when developing a normal extension for the Visual Studio Code Extension Marketplace, up until the last step: installing the extension.

1. **Creating a Personal Extension:** Create an extension with per [the official documentation](https://code.visualstudio.com/api/get-started/your-first-extension).
2. **Editing Your Personal Extension:** Open your extension directory in Visual Studio Code, and hit `F5` (or select `Debug: Start Debugging` from the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)). This runs a separate instance of Visual Studio Code with your extension installed, so you can test your changes, to stop running the separate instance use `⇧F5` (or `Debug: Stop` from the Command Palette).
3. **Install Your Personal Extension:** To install your extension, run the [`install script`](install.sh). This script just copies the extension files into your `~/.vscode/extensions/`, i.e., it installs the extension while bypassing the Extension Marketplace altogether. You should copy this script to your extension directory and run it from the command-line in that directory with `./install.sh`.

The install script has only been tested on macOS.