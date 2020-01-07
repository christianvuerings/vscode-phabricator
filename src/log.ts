import * as vscode from "vscode";

const output = vscode.window.createOutputChannel("Phabricator");
const append = (text: string) => {
  const now = new Date();
  output.appendLine(
    `[${[now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(value => (value + "").padStart(2, "0"))
      .join(":")}] - ${text}`
  );
};

const show = () => {
  output.show;
};

export default {
  append,
  show
};
