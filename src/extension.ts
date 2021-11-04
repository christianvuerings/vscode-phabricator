import * as vscode from "vscode";
import cache from "./cache";
import completionProvider from "./completionProvider";
import configuration from "./configuration";
import diffusion from "./diffusion";
import arcanistEditorToVscode from "./arcanistEditorToVscode";
import extensionContext from "./context";
import log from "./log";
import readyToLandDiffs from "./readyToLandDiffs";
import statusBar from "./statusBar";
import store from "./store";
import track from "./track";
import runShellCommand from "./runShellCommand";

export async function activate(context: vscode.ExtensionContext) {
  log.append('Extension "vscode-phabricator" is active');
  extensionContext.set(context);

  vscode.workspace.onDidOpenTextDocument(async (document) => {
    const tmpDir = (await runShellCommand("echo $TMPDIR")) ?? "/tmp";
    const { fileName } = document;

    // Set text document language to 'plaintext' if it is a temporary arcanist file
    if (
      fileName.startsWith(tmpDir) &&
      (fileName.endsWith("/new-commit") ||
        fileName.endsWith("/differential-edit-revision-info"))
    ) {
      vscode.languages.setTextDocumentLanguage(document, "plaintext");
    }
  });

  const [apiToken, baseUrl] = await Promise.all([
    configuration.apiToken(),
    configuration.baseUrl(),
  ]);

  if (!apiToken || !baseUrl) {
    const errorMessage =
      "`phabricator.baseUrl` and `phabricator.apiToken` are required settings for the Phabricator extension";
    console.error(errorMessage);
    log.append(errorMessage);
    track.event({
      category: "Error",
      action: "Error",
      label: errorMessage,
    });
    return;
  }

  const repositoryCallsign = await configuration.repositoryCallsign();
  vscode.commands.executeCommand(
    "setContext",
    "inArcanistProject",
    Boolean(repositoryCallsign)
  );

  // Contribute Explorer menu
  vscode.commands.registerCommand(
    "phabricator-vscode.openDiffusionLink",
    diffusion.openLink
  );
  vscode.commands.registerCommand(
    "phabricator-vscode.copyDiffusionUrl",
    diffusion.copyUrl
  );

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

  (async () => {
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
  })();

  // Browse phabricator repository
  vscode.commands.registerCommand("phabricator-vscode.browseRepository", () => {
    vscode.env.openExternal(vscode.Uri.parse(baseUrl));
  });

  // Make VS Code the default editor
  vscode.commands.registerCommand(
    "phabricator-vscode.setArcanistEditorToVscode",
    arcanistEditorToVscode.set
  );
  vscode.commands.registerCommand(
    "phabricator-vscode.unsetArcanistEditorToVscode",
    arcanistEditorToVscode.unset
  );

  // Add auto completion provider
  context.subscriptions.push(completionProvider({ baseUrl }));

  track.event({
    category: "Event",
    action: "Activate",
    label: "Extension",
  });
}

export function deactivate() {}
