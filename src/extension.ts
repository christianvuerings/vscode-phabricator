import * as vscode from "vscode";
import cache from "./cache";
import completionProvider from "./completionProvider";
import configuration from "./configuration";
import log from "./log";
import readyToLandDiffs from "./readyToLandDiffs";
import statusBar from "./statusBar";
import store from "./store";

export async function activate(context: vscode.ExtensionContext) {
  log.append('Extension "vscode-phabricator" is active');

  const [apiToken, baseUrl] = await Promise.all([
    configuration.apiToken(),
    configuration.baseUrl()
  ]);

  if (!apiToken || !baseUrl) {
    const errorMessage =
      "`phabricator.baseUrl` and `phabricator.apiToken` are required settings for the Phabricator extension";
    console.error(errorMessage);
    log.append(errorMessage);
    return;
  }

  // Setup the status bar
  statusBar.activate();
  statusBar.text("");
  statusBar.get().command = "phabricator-vscode.listReadyToLandDiffs";

  // Update users / projects for autocompletion every 24 hours
  const { lastUpdated } = store.get({ context, id: baseUrl }) || {};
  const FULL_DAY = 24 * 60 * 60 * 1000;
  if (!lastUpdated || Date.now() - lastUpdated > FULL_DAY) {
    await cache.update({ context });
  }
  vscode.commands.registerCommand(
    "phabricator-vscode.updateCache",
    async () => {
      log.show();
      await cache.update({ context });
    }
  );

  // Update ready to land diffs every minute
  const MINUTES_1 = 1 * 60 * 1000;
  await readyToLandDiffs.update({ context, initialLoad: true });
  setInterval(async () => {
    await readyToLandDiffs.update({ context });
  }, MINUTES_1);
  vscode.commands.registerCommand(
    "phabricator-vscode.listReadyToLandDiffs",
    async () => {
      try {
        await readyToLandDiffs.update({ context });
      } catch (e) {}
      await readyToLandDiffs.list();
    }
  );

  // Browse the phabricator repository
  vscode.commands.registerCommand("phabricator-vscode.browseRepository", () => {
    vscode.env.openExternal(vscode.Uri.parse(baseUrl));
  });

  // Add the auto completion provider
  context.subscriptions.push(completionProvider({ baseUrl, context }));
}

export function deactivate() {}
