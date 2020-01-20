import * as vscode from "vscode";

const outputChannel = vscode.window.createOutputChannel("Phabricator");
const append = (text: string) => {
  const now = new Date();
  const output = `[${[now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(value => (value + "").padStart(2, "0"))
    .join(":")}] - ${text}`;
  outputChannel.appendLine(output);
  return output;
};

const show = () => {
  outputChannel.show();
};

export default {
  append,
  show
};
