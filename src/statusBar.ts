import * as vscode from "vscode";

let statusBarItem: vscode.StatusBarItem;

const activate = () => {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  statusBarItem.show();
};

const setText = (text: string | number) => {
  const output = `${text ? " " + text : text}`;
  statusBarItem.text = `$(gear)${output}`;
};

const get = () => {
  return statusBarItem;
};

export { activate, get, setText };
