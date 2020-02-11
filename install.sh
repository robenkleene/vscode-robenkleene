#!/usr/bin/env bash

set -e

force=false
while getopts ":fh" option; do
  case "$option" in
    f)
      force=true
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
fi

destination_path="$HOME/.vscode-oss/extensions/"
extension_path="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
rsync -a --delete${dry_run} --verbose --exclude=install.sh --exclude=.gitignore \
  --exclude=.git "$extension_path" "$destination_path"
