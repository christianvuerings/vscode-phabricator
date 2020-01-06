import * as vscode from "vscode";
import Fuse from "fuse.js";
import { URL } from "url";
import { getStore } from "./store";

const triggerCharacters: string[] = ["@", "#"];
const completionProvider = ({
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
        const store = getStore({ id: baseUrl, context });
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

export default completionProvider;
