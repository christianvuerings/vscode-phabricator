import * as vscode from "vscode";

let statusBarItem: vscode.StatusBarItem;

const activate = () => {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  statusBarItem.show();
};

const text = (input: string | number) => {
  const output = `${input ? ": " + input : input}`;
  statusBarItem.text = `Phabricator${output}`;
};

const get = () => {
  return statusBarItem;
};

export default { activate, get, text };
