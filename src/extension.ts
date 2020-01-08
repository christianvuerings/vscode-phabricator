import * as vscode from "vscode";
import cache from "./cache";
import completionProvider from "./completionProvider";
import configuration from "./configuration";
import extensionContext from "./context";
import log from "./log";
import readyToLandDiffs from "./readyToLandDiffs";
import statusBar from "./statusBar";
import store from "./store";
import track from "./track";

export async function activate(context: vscode.ExtensionContext) {
  log.append('Extension "vscode-phabricator" is active');
  extensionContext.set(context);

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

  // Setup status bar
  statusBar.activate();
  statusBar.text("");
  statusBar.get().command = "phabricator-vscode.listReadyToLandDiffs";

  // Update users / projects for autocompletion every 24 hours
  const { lastUpdated } = store.get({ id: baseUrl }) || {};
  const FULL_DAY = 24 * 60 * 60 * 1000;
  if (!lastUpdated || Date.now() - lastUpdated > FULL_DAY) {
    await cache.update();
  }
  vscode.commands.registerCommand(
    "phabricator-vscode.updateCache",
    async () => {
      log.show();
      await cache.update();
    }
  );

  // Update ready to land diffs every minute
  const MINUTES_1 = 1 * 60 * 1000;
  await readyToLandDiffs.update(true);
  setInterval(async () => {
    await readyToLandDiffs.update();
  }, MINUTES_1);
  vscode.commands.registerCommand(
    "phabricator-vscode.listReadyToLandDiffs",
    async () => {
      try {
        await readyToLandDiffs.update();
      } catch (e) {}
      await readyToLandDiffs.list();
    }
  );

  // Browse phabricator repository
  vscode.commands.registerCommand("phabricator-vscode.browseRepository", () => {
    vscode.env.openExternal(vscode.Uri.parse(baseUrl));
  });

  // Add auto completion provider
  context.subscriptions.push(completionProvider({ baseUrl }));

  track.event({
    category: "Event",
    action: "Activate",
    label: "Extension"
  });
}

export function deactivate() {}
