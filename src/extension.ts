import * as vscode from "vscode";
import fetch from "node-fetch";
import Fuse from "fuse.js";
import { URL } from "url";
import configuration from "./configuration";

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

type Response = {
  result?: {
    cursor: {
      after: string;
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
};

const request = async ({
  after,
  apiToken,
  baseUrl,
  method,
  order
}: {
  after?: string | null;
  apiToken: string;
  baseUrl: string;
  method: string;
  order: string;
}): Promise<Response> => {
  const url = new URL(`/api/${method}`, baseUrl);
  url.searchParams.set("api.token", apiToken);
  url.searchParams.set("queryKey", "active");
  url.searchParams.set("order[0]", order);
  if (after) {
    url.searchParams.set("after", after);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "vscode-phabricator"
    },
    timeout: 2000
  });
  return await response.json();
};

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

const initializeStore = async ({
  apiToken,
  baseUrl,
  context
}: {
  apiToken: string;
  baseUrl: string;
  context: vscode.ExtensionContext;
}) => {
  const getItems = async ({
    method,
    order
  }: {
    method: "user.search" | "project.search";
    order: string;
  }): Promise<StoreItem> => {
    let after;
    const items: StoreItem = [];

    while (after !== null) {
      const response: Response = await request({
        after,
        apiToken,
        baseUrl,
        method,
        order
      });

      if (response.result && response.result.data) {
        after = response.result.cursor.after;

        console.log("phabricator", method, after);

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

  const [users, projects] = await Promise.all([
    getItems({
      method: "user.search",
      order: "username"
    }),
    getItems({
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
    vscode.window.showErrorMessage(
      "[Phabricator] Could not update the cache. Ensure you can connect to your phabricator instance."
    );
    statusBarItem.text = "[Phabricator] Update failed";
  }

  setTimeout(() => {
    statusBarItem.hide();
  }, 5000);
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "vscode-phabricator" is active');

  const { apiToken, baseUrl } = await configuration();
  if (!apiToken || !baseUrl) {
    console.error(
      "`phabricator.baseUrl` and `phabricator.apiToken` are required settings for the Phabricator extension"
    );
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

  context.subscriptions.push(provider({ baseUrl, context }));
}

export function deactivate() {}
