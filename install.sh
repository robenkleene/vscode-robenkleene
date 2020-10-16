#!/usr/bin/env bash

set -e

force=true
while getopts ":dh" option; do
  case "$option" in
    d)
      force=false
      ;;
    h)
      echo "Usage: ./install.sh [-hf]"
      exit 0
      ;;
    :)
      echo "Option -$OPTARG requires an argument" >&2
      exit 1
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done

dry_run=" --dry-run"
if [[ "$force" == "true" ]]; then
  dry_run=""
else
  echo "DRY RUN"
  echo
fi

extension_path="$(
  cd "$(dirname "$0")" >/dev/null 2>&1
  pwd -P
)"

install() {
  destination_path="$1"
  if [[ -d "$destination_path" ]]; then
    echo "Installing to $destination_path"
    rsync -a --delete${dry_run} --verbose --exclude=install.sh --exclude=.gitignore \
      --exclude=.git "$extension_path" "$destination_path"
  else
    echo "Skipping $destination_path"
  fi
}

install "$HOME/.vscode/extensions/"
install "$HOME/.vscode-insiders/extensions/"
install "$HOME/.vscode-server-insiders/extensions/"
