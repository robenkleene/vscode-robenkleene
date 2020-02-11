#!/usr/bin/env bash

set -e

destination_path="$HOME/.vscode-oss/extensions/robenkleene"
extension_path="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
rsync -a --delete -v --dry-run --exclude=install.sh --exclude=.gitignore \
  --exclude=.git "$extension_path" "$destination_path"
