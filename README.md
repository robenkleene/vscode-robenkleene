# Roben Kleene's Personal Visual Studio Code Extension

The idea of a personal extension is make a place for personal customizations to Visual Studio Code. Most programmable text editors have a built-in place to put customizations, like Vim's [`vimrc`](https://vim.fandom.com/wiki/Open_vimrc_file) and Emac's [`init.el`](https://www.gnu.org/software/emacs/manual/html_node/emacs/Init-File.html), but Visual Studio Code does not have this functionality; in order to make customizations, you must build an extension. But an extension is not an ideal way to manage personal customizations, especially not if shared via [Visual Studio Code's Extension Marketplace](https://marketplace.visualstudio.com/VSCode).

## Foreword

This is my personal extension, if you install this extension on your machine, very few of the commands will work, this is because these commands depend on your machine already having [a number of other customizations in place](https://github.com/robenkleene/Dotfiles). The intention of sharing this extension is not for you to install it yourself, but to illustrate how a personal extension can be used to quickly add commands to Visual Studio Code, similar to how other programmable text editors can be customized.

To those ends, the best way to peruse what customizations can do, and how they are added, is to look at the commands in the [`package.json`](package.json) file, and review how they are configured as contextual menus, keyboard shortcuts, and command palette commands.

## Using a Personal Visual Studio Code Extension

This process illustrates how personal extension can be used to extend VSCode and test those expansions. The process is generally the same as you'd use when developing a normal extension for the Visual Studio Code Extension Marketplace, until you get to the step about installing the extension.

1. **Creating a Personal Extension:** Create an extension with per [the official documentation](https://code.visualstudio.com/api/get-started/your-first-extension).
2. **Editing Your Personal Extension:** Open your extension directory in Visual Studio Code, and hit `F5` (or select `Debug: Start Debugging` from the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)). This runs a separate instance of Visual Studio Code with your extension installed, so you can test your changes, to stop running the separate instance use `⇧F5` (or `Debug: Stop` from the Command Palette).
3. **Install Your Personal Extension:** To install your extension, run the [`install script`](install.sh). You should copy this script to your extension directory and run it from the command-line in that directory with `./install.sh`. Just running `./install.sh` will perform an `rsync` with the `--dry-run` flag enabled, so you can review what the script will do, assuming that output looks good, to actually install the extension use `./install.sh`