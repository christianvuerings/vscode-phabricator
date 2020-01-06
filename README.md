# Phabribator Extension for VSCode

[![Version](https://vsmarketplacebadge.apphb.com/version/christianvuerings.vscode-phabricator.svg)](https://marketplace.visualstudio.com/items?itemName=christianvuerings.vscode-phabricator) [![Installs](https://vsmarketplacebadge.apphb.com/installs-short/christianvuerings.vscode-phabricator.svg)](https://marketplace.visualstudio.com/items?itemName=christianvuerings.vscode-phabricator)

## Features

- **Autocompletion support**: autocomplete users and projects.

  ![Username & project autocompletion in VSCode](images/vscode-phabricator-screencast.gif)

- **Ready to land diffs**: keep track of diffs that are ready to land.

## Installation

- Search for "Phabricator" in the VS Code extensions panel or [download on the marketplace](https://marketplace.visualstudio.com/items?itemName=christianvuerings.vscode-phabricator).

## Configuration

**Note**: By default the extension uses `~/.arcrc` to read in the settings. Only override them when the extension doesn't work:

- `phabricator.apiToken`: Generate your phabricator API token: https://phabricator.example.com/settings/user/USERNAME/page/apitokens/
- `phabricator.baseUrl`: Base URL for the phabricator repo: https://phabricator.example.com/

## Publish

Publish a new version:

1. Update `CHANGELOG.md` and add a new version
2. Publish with `vsce`

```
npm i -g vsce
vsce publish patch
```

## Acknowledgements

- Heavily inspired by [@jparise](https://github.com/jparise)'s [vscode-vim](https://github.com/jparise/vim-phabricator) plugin.
