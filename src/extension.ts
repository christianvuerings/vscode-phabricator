import * as vscode from "vscode";
import Fuse from "fuse.js";
import { URL } from "url";
import configuration from "./configuration";
import request from "./request";

const output = vscode.window.createOutputChannel("Phabricator");

type StoreItem = {
  detail?: string;
  key: string;
  value: string;
}[];

type Store =
  | {
      lastUpdate: number;
      users: StoreItem;
      projects: StoreItem;
    }
  | undefined;

class DiffItem implements vscode.QuickPickItem {
  description: string;
  label: string;
  uri: string;

  constructor({
    description,
    label,
    uri
  }: {
    description: string;
    label: string;
    uri: string;
  }) {
    this.description = description;
    this.label = label;
    this.uri = uri;
  }
}

const triggerCharacters: string[] = ["@", "#"];
const provider = ({
  baseUrl,
  context
}: {
  baseUrl: string;
  context: vscode.ExtensionContext;
}) =>
  vscode.languages.registerCompletionItemProvider(
    "plaintext",
    {
      async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        const store: Store = context.globalState.get(baseUrl);
        if (!store) {
          return undefined;
        }

        const linePrefix = document
          .lineAt(position)
          .text.substr(0, position.character);

        if (
          !linePrefix.startsWith("Reviewers:") &&
          !linePrefix.startsWith("Subscribers:")
        ) {
          return undefined;
        }

        const matched = linePrefix.match(/([#@][\w-_]+)$/);
        if (!matched) {
          return undefined;
        }

        const isGroup = matched[0].startsWith("#");
        const search = matched[0].replace(/[#@]/, "");
        const fuse = new Fuse(isGroup ? store.projects : store.users, {
          keys: ["key", "value"],
          threshold: 0.2
        });
        const results = fuse.search(search);

        if (!results) {
          return undefined;
        }

        return results.map(item => {
          const completionItem = new vscode.CompletionItem(
            item.key,
            vscode.CompletionItemKind.Text
          );

          const markdown = new vscode.MarkdownString(
            `**[${item.value}](${new URL(
              `/${isGroup ? "tag" : "p"}/${item.key}/`,
              baseUrl
            )})**`.concat(
              item.detail ? `\n\n${item.detail.replace(/\s\s#/g, " - ")}` : ""
            )
          );
          markdown.isTrusted = true;

          completionItem.documentation = markdown;
          completionItem.filterText = `${item.key} ${item.value}`;
          return completionItem;
        });
      }
    },
    ...triggerCharacters
  );

const getItems = async ({
  apiToken,
  baseUrl,
  fields,
  method,
  order
}: {
  apiToken: string;
  baseUrl: string;
  fields?: {
    [key: string]: number | string;
  };
  method: "differential.revision.search" | "project.search" | "user.search";
  order?: string;
}): Promise<StoreItem> => {
  let after;
  const items: StoreItem = [];

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
      apiToken,
      baseUrl,
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

      output.appendLine(`${method} - ${after}`);

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

const initializeStore = async ({
  apiToken,
  baseUrl,
  context
}: {
  apiToken: string;
  baseUrl: string;
  context: vscode.ExtensionContext;
}) => {
  const [users, projects] = await Promise.all([
    getItems({
      apiToken,
      baseUrl,
      method: "user.search",
      order: "username"
    }),
    getItems({
      apiToken,
      baseUrl,
      method: "project.search",
      order: "name"
    })
  ]);

  context.globalState.update(baseUrl, {
    lastUpdated: Date.now(),
    users,
    projects
  });
};

async function fetchReadyToLand({
  apiToken,
  baseUrl
}: {
  apiToken: string;
  baseUrl: string;
}) {
  try {
    const whoamiResponse: {
      result?: {
        phid: string;
      };
    } = await request({
      apiToken,
      baseUrl,
      method: "user.whoami",
      // [Pinterest specfic]: Pinterest requires the client and clientVersion to be set
      fields: baseUrl.includes("phabricator.pinadmin.com")
        ? {
            client: "arc",
            clientVersion: 1000
          }
        : {}
    });

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
      apiToken,
      baseUrl,
      method: "differential.revision.search",
      fields: {
        "constraints[authorPHIDs][0]": whoamiResponse.result?.phid || "",
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

    const diffsInfoResponse: {
      result?: {
        [key: string]: {
          uri: string;
        };
      };
    } = await request({
      apiToken,
      baseUrl,
      method: "phid.query",
      fields: acceptedRevisions.reduce(
        (accumulator, currentValue) => ({
          ...accumulator,
          [`phids[${Object.entries(accumulator).length}]`]: currentValue.fields
            .diffPHID
        }),
        {}
      )
    });

    const items: DiffItem[] = acceptedRevisions.map(
      el =>
        new DiffItem({
          // description: el.fields.summary,
          description: "",
          label: el.fields.title,
          uri: diffsInfoResponse.result
            ? diffsInfoResponse.result[el.fields.diffPHID].uri
            : ""
        })
    );

    const selectedItem = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a diff"
    });

    if (selectedItem && selectedItem.uri) {
      vscode.env.openExternal(vscode.Uri.parse(selectedItem.uri));
    }
  } catch (e) {
    console.error(e);
    // const errorMessage = `[Phabricator] Could not update the cache. Ensure you can connect to ${baseUrl}`;
    // vscode.window.showErrorMessage(errorMessage);
    // output.appendLine(errorMessage);
    // statusBarItem.text = "[Phabricator] Update failed";
  }

  // setTimeout(() => {
  //   statusBarItem.hide();
  // }, 5000);
}

async function updateCache({
  apiToken,
  baseUrl,
  context
}: {
  apiToken: string;
  baseUrl: string;
  context: vscode.ExtensionContext;
}) {
  const statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.show();
  statusBarItem.text = "[Phabricator] Fetching data...";
  try {
    await initializeStore({ apiToken, baseUrl, context });
    statusBarItem.text = "[Phabricator] Update succeeded";
  } catch (e) {
    console.error(e);
    const errorMessage = `[Phabricator] Could not update the cache. Ensure you can connect to ${baseUrl}`;
    vscode.window.showErrorMessage(errorMessage);
    output.appendLine(errorMessage);
    statusBarItem.text = "[Phabricator] Update failed";
  }

  setTimeout(() => {
    statusBarItem.hide();
  }, 5000);
}

export async function activate(context: vscode.ExtensionContext) {
  output.appendLine('Extension "vscode-phabricator" is active');

  const { apiToken, baseUrl } = await configuration();
  if (!apiToken || !baseUrl) {
    const errorMessage =
      "`phabricator.baseUrl` and `phabricator.apiToken` are required settings for the Phabricator extension";
    console.error(errorMessage);
    output.appendLine(errorMessage);
    return;
  }

  const { lastUpdated } = context.globalState.get(baseUrl) || {};
  const FULL_DAY = 24 * 60 * 60 * 1000;
  if (!lastUpdated || Date.now() - lastUpdated > FULL_DAY) {
    await updateCache({ apiToken, baseUrl, context });
  }

  vscode.commands.registerCommand(
    "phabricator-vscode.updateCache",
    async () => {
      await updateCache({ apiToken, baseUrl, context });
    }
  );
  vscode.commands.registerCommand("phabricator-vscode.browseRepository", () => {
    vscode.env.openExternal(vscode.Uri.parse(baseUrl));
  });
  vscode.commands.registerCommand(
    "phabricator-vscode.fetchReadyToLand",
    async () => {
      await fetchReadyToLand({ apiToken, baseUrl });
    }
  );

  context.subscriptions.push(provider({ baseUrl, context }));
}

export function deactivate() {}
