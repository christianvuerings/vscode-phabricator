import * as vscode from "vscode";
import * as statusBar from "./statusBar";
import { getStore, updateStore } from "./store";
import { KeyValueItem } from "./store";
import completionProvider from "./completionProvider";
import configuration from "./configuration";
import request from "./request";

const output = vscode.window.createOutputChannel("Phabricator");
const appendToOutput = (text: string) => {
  const now = new Date();
  output.appendLine(
    `[${[now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(value => (value + "").padStart(2, "0"))
      .join(":")}] - ${text}`
  );
};
const diffToUrl: { [diffPHID: string]: string } = {};
let readyToLandDiffs: DiffItem[] = [];

class DiffItem implements vscode.QuickPickItem {
  label: string;
  uri: string;

  constructor({ label, uri }: { label: string; uri: string }) {
    this.label = label;
    this.uri = uri;
  }
}

const getItems = async ({
  fields,
  method,
  order
}: {
  fields?: {
    [key: string]: number | string;
  };
  method: "project.search" | "user.search";
  order?: string;
}): Promise<KeyValueItem> => {
  let after;
  const items: KeyValueItem = [];

  while (after !== null) {
    const response: {
      result?: {
        cursor?: {
          after?: string;
        };
        data?: {
          fields: {
            username: string;
            realName: string;
            slug: string;
            name: string;
            description: string;
          };
        }[];
      };
    } = await request({
      after,
      fields,
      method,
      order,
      setQueryKey: true
    });

    if (response.result && response.result.data) {
      after =
        response.result &&
        response.result.cursor &&
        response.result.cursor.after;

      appendToOutput(`Cache: ${method} - ${after}`);

      response.result.data.forEach(item => {
        items.push(
          item.fields.username
            ? {
                key: item.fields.username,
                value: item.fields.realName
              }
            : {
                key: item.fields.slug,
                value: item.fields.name,
                detail: item.fields.description || ""
              }
        );
      });
    }
  }

  return items;
};

const getCurrentUser = async (): Promise<{
  phid: string;
  realName: string;
  userName: string;
}> => {
  const { baseUrl } = await configuration();

  const response: {
    result?: {
      phid: string;
      realName: string;
      userName: string;
    };
  } = await request({
    method: "user.whoami",
    // [Pinterest specfic]: Pinterest requires the client and clientVersion to be set
    fields: baseUrl.includes("phabricator.pinadmin.com")
      ? {
          client: "arc",
          clientVersion: 1000
        }
      : {}
  });

  const { phid = "", realName = "", userName = "" } = response.result || {};
  return { phid, realName, userName };
};

const initializeStore = async ({
  context
}: {
  context: vscode.ExtensionContext;
}) => {
  const { baseUrl } = await configuration();
  const [users, projects, currentUser] = await Promise.all([
    getItems({
      method: "user.search",
      order: "username"
    }),
    getItems({
      method: "project.search",
      order: "name"
    }),
    getCurrentUser()
  ]);

  appendToOutput("Cache: Updated");

  updateStore({
    context,
    id: baseUrl,
    currentUser,
    users,
    projects
  });
};

async function updateReadyToLandDiffs({
  context
}: {
  context: vscode.ExtensionContext;
}) {
  try {
    const { baseUrl } = await configuration();
    const store = getStore({ context, id: baseUrl });

    if (!readyToLandDiffs.length) {
      statusBar.setText(`$(loading)`);
    }

    if (!store?.currentUser?.phid) {
      await initializeStore({ context });
    }

    const acceptedRevisionsResponse: {
      result?: {
        data?: {
          fields: {
            diffPHID: string;
            title: string;
          };
        }[];
      };
    } = await request({
      method: "differential.revision.search",
      fields: {
        "constraints[authorPHIDs][0]": store?.currentUser?.phid || "",
        "constraints[statuses][0]": "accepted"
      }
    });

    const acceptedRevisions = acceptedRevisionsResponse?.result?.data || [];
    if (!acceptedRevisions.length) {
      vscode.window.showInformationMessage(
        "[Phabricator] Did not find accepted revisions"
      );
      return;
    }

    const diffPHIDs = acceptedRevisions.map(el => el.fields.diffPHID);
    const diffPHIDsWithoutLinks = diffPHIDs.filter(phid => !diffToUrl[phid]);

    if (diffPHIDsWithoutLinks && diffPHIDsWithoutLinks.length) {
      const diffsInfoResponse: {
        result?: {
          [key: string]: {
            uri: string;
          };
        };
      } = await request({
        method: "phid.query",
        fields: diffPHIDsWithoutLinks.reduce(
          (accumulator, currentValue) => ({
            ...accumulator,
            [`phids[${Object.entries(accumulator).length}]`]: currentValue
          }),
          {}
        )
      });

      if (!diffsInfoResponse || !diffsInfoResponse.result) {
        const errorMessage = "[Phabricator] Could not fetch diff URIs";
        vscode.window.showErrorMessage(errorMessage);
        appendToOutput(errorMessage);
        return;
      }

      for (const [key, value] of Object.entries(diffsInfoResponse.result)) {
        diffToUrl[key] = value.uri;
      }
    }

    readyToLandDiffs = acceptedRevisions.map(
      el =>
        new DiffItem({
          label: el.fields.title,
          uri: diffToUrl[el.fields.diffPHID]
        })
    );

    statusBar.setText(readyToLandDiffs.length);
    statusBar.get().tooltip = `Phabricator: ${readyToLandDiffs.length} diffs ready to land`;
  } catch (e) {
    if (!readyToLandDiffs.length) {
      statusBar.setText(`$(error)`);
      statusBar.get().tooltip = `Phabricator: could not load accepted diffs`;
    }

    console.error(e);
    appendToOutput(e.message);
  }
}

async function listReadyToLandDiffs() {
  const selectedItem = await vscode.window.showQuickPick(readyToLandDiffs, {
    placeHolder: "Select Accepted Diff"
  });

  if (selectedItem && selectedItem.uri) {
    vscode.env.openExternal(vscode.Uri.parse(selectedItem.uri));
  }
}

async function updateCache({ context }: { context: vscode.ExtensionContext }) {
  const statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  appendToOutput(`Cache: Fetch data`);
  const { baseUrl } = await configuration();
  try {
    await initializeStore({ context });
  } catch (e) {
    console.error(e);
    const errorMessage = `[Phabricator] Could not update the cache. Ensure you can connect to ${baseUrl}`;
    vscode.window.showErrorMessage(errorMessage);
    appendToOutput(errorMessage);
  }

  setTimeout(() => {
    statusBarItem.hide();
  }, 5000);
}

export async function activate(context: vscode.ExtensionContext) {
  appendToOutput('Extension "vscode-phabricator" is active');

  const { apiToken, baseUrl } = await configuration();

  if (!apiToken || !baseUrl) {
    const errorMessage =
      "`phabricator.baseUrl` and `phabricator.apiToken` are required settings for the Phabricator extension";
    console.error(errorMessage);
    appendToOutput(errorMessage);
    return;
  }

  // Setup the status bar
  statusBar.activate();
  statusBar.setText("");
  statusBar.get().command = "phabricator-vscode.listReadyToLandDiffs";

  // Update users / projects for autocompletion every 24 hours
  const { lastUpdated } = getStore({ context, id: baseUrl }) || {};
  const FULL_DAY = 24 * 60 * 60 * 1000;
  if (!lastUpdated || Date.now() - lastUpdated > FULL_DAY) {
    await updateCache({ context });
  }
  vscode.commands.registerCommand(
    "phabricator-vscode.updateCache",
    async () => {
      output.show();
      await updateCache({ context });
    }
  );

  // Update ready to land diffs every 5 minutes
  const MINUTES_5 = 5 * 60 * 1000;
  await updateReadyToLandDiffs({ context });
  setInterval(async () => {
    await updateReadyToLandDiffs({ context });
  }, MINUTES_5);
  vscode.commands.registerCommand(
    "phabricator-vscode.listReadyToLandDiffs",
    async () => {
      try {
        await updateReadyToLandDiffs({ context });
      } catch (e) {}
      await listReadyToLandDiffs();
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
