import * as vscode from "vscode";
import execa from "execa";
import log from "./log";
import track from "./track";

const set = async () => {
  // Ensure VS Code is set on the command path
  vscode.commands.executeCommand("workbench.action.installCommandLine");

  // Set VS Code as the default arcanist editor
  try {
    const result = await execa("arc", ["set-config", "editor", "code --wait"]);
    if (result?.stdout) {
      track.event({
        category: "Event",
        action: "Count",
        label: "SetDefaultEditor",
        value: String(1),
      });
      log.append(`setArcanistEditorToVscode: ${result.stdout}`);
      vscode.window.showInformationMessage(
        "[Phabricator] Arcanist default editor set to VS Code."
      );
    }
  } catch (e) {
    console.error(e);
    log.append(`setArcanistEditorToVscode Error: ${e.message}`);
    log.show();
  }
};

const unset = async () => {
  try {
    const result = await execa("arc", ["set-config", "editor", ""]);
    if (result?.stdout) {
      track.event({
        category: "Event",
        action: "Count",
        label: "UnSetDefaultEditor",
        value: String(1),
      });
      log.append(`unsetArcanistEditorToVscode: ${result.stdout}`);
      vscode.window.showInformationMessage(
        "[Phabricator] Arcanist default editor removed."
      );
    }
  } catch (e) {
    console.error(e);
    log.append(`unsetArcanistEditorToVscode Error: ${e.message}`);
    log.show();
  }
};

export default {
  set,
  unset,
};
