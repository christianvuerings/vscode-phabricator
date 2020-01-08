import * as vscode from "vscode";

let contextInstance: vscode.ExtensionContext;

const get = () => {
  return contextInstance;
};

const set = (input: vscode.ExtensionContext) => {
  contextInstance = input;
};

export default { get, set };
