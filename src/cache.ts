import * as vscode from "vscode";
import configuration from "./configuration";
import log from "./log";
import store from "./store";

async function update() {
  const statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  log.append(`Cache: Fetch data`);
  const baseUrl = await configuration.baseUrl();
  try {
    await store.initialize();
  } catch (e) {
    console.error(e);
    const errorMessage = `[Phabricator] Could not update the cache. Ensure you can connect to ${baseUrl}`;
    vscode.window.showErrorMessage(errorMessage);
    log.append(errorMessage);
  }

  setTimeout(() => {
    statusBarItem.hide();
  }, 5000);
}

export default {
  update
};
