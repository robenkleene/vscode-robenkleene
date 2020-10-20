.PHONY: update build install

update:
	build install

build:
	vsce package

install:
	latest_version=$$(ls robenkleene-*.vsix | grep -o -E '[0-9]+.[0-9]+.[0-9]+' | tr '.' ' ' | sort -nr -k 1 -k 2 -k 3 | tr ' ' '.' | head -1); \
	code-insiders --install-extension robenkleene-$${latest_version}
