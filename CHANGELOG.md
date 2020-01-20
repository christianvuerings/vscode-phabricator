# Change Log

All notable changes to the "vscode-phabricator" extension will be documented in this file.
Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- [internal] Add EditorConfig file
- [internal] Add CI tests

## [1.0.5] - 2020-01-18

- [feature] Add commands to set VS Code as the Aranist editor

## [1.0.4] - 2020-01-16

- [feature] Allow for autocompletion anywhere in the `arc diff` message

## [1.0.3] - 2020-01-16

- [bugfix] Show correct message when there are no accepted diffs

## [1.0.2] - 2020-01-15

- [bugfix] Fix .map of undefined error
- [docs] Add instructions on how to make vscode the default editor for arcanist.

## [1.0.1] - 2020-01-13

- [docs] Update installation docs
- [docs] Show GitHub CI workflow status for the master branch

## [1.0.0] - 2020-01-13

- [internal] Clean up parameter to `request` - use `fields` instead
- [internal] Detect and fix circular dependency
- [internal] Update badges to use shields.io
- [internal] Add GitHub Workflows: CI

## [0.0.17] - 2020-01-11

- [feature] Show accepted diffs with their build status
- [feature] Only show notifications for ready to land (passed) diffs
- [bugfix] Convert confusing gear icon to descriptive text
- [internal] Update README

## [0.0.16] - 2020-01-10

- [bugfix] Fix link text to vim-phabricator
- [feature] Add version number as a custom google analytics dimension

## [0.0.15] - 2020-01-09

- [feature] Disable accepte diff notifications by default - we also need to look at the build status, not just the diff status

## [0.0.14] - 2020-01-09

- [internal] Track errors
- [internal] Update Google Analytics id to ignore test events
- [internal] Fail silently when we can not update the phabricator cache

## [0.0.13] - 2020-01-08

- [feature] Show notifications when a new diff is ready to land
- [feature] Make whether to show diff notifications configurable
- [feature] Track usage with google analytics
- [feature] Make whether to track configurable
- [internal] Improve type information for `.arcrc` file
- [internal] Always fetch configuration instead of passing it through on activation
- [internal] Big refactor to make code more readable

## [0.0.12] - 2020-01-06

- [feature] Show number of ready to land diffs in the status bar
- [feature] Standard format for log messages
- [feature] Fetch ready to land diffs every 10 min
- [feature] Cache current user

## [0.0.11] - 2019-12-29

- [docs] Update publish documentation
- [feature] Add browse command
- [bugfix] Fix requests not going through on a slow connection

## [0.0.10] - 2019-12-28

- Better error handling: use dedicated output channel
- Extract "request"

## [0.0.9] - 2019-12-24

- Add screencast to `README.md`

## [0.0.8] - 2019-12-24

- Change timeout for status messages to 5 seconds

## [0.0.7] - 2019-12-24

- Add badges to `README.md`
- Add license information in `package.json`
- Update TypeScript to `3.7.4`
- Add command to update the phabricator cache
- Provide better error messages when the update fails

## [0.0.6] - 2019-12-24

- Convert tslint to eslint

## [0.0.5] - 2019-12-24

- Update VSCode marketplace theme

## [0.0.4] - 2019-12-24

- Add icon

## [0.0.3] - 2019-12-23

- Fix unnecessary `)` at the end of each project detail

## [0.0.2] - 2019-12-23

- Update readme

## [0.0.1] - 2019-12-23

- Initial release
