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

destination_path="$HOME/.vscode/extensions/"
if [ ! -d "$destination_path" ]; then
  echo "$destination_path does not exist" >&2
  exit 1
fi
extension_path="$(
  cd "$(dirname "$0")" >/dev/null 2>&1
  pwd -P
)"
rsync -a --delete${dry_run} --verbose --exclude=install.sh --exclude=.gitignore \
  --exclude=.git "$extension_path" "$destination_path"
