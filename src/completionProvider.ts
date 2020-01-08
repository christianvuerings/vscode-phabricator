import * as vscode from "vscode";
import { URL } from "url";
import Fuse from "fuse.js";
import store from "./store";
import track from "./track";

const triggerCharacters: string[] = ["@", "#"];
const completionProvider = ({ baseUrl }: { baseUrl: string }) =>
  vscode.languages.registerCompletionItemProvider(
    "plaintext",
    {
      async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        const storeInstance = store.get({ id: baseUrl });
        if (!storeInstance) {
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
        const fuse = new Fuse(
          isGroup ? storeInstance.projects : storeInstance.users,
          {
            keys: ["key", "value"],
            threshold: 0.2
          }
        );
        const results = fuse.search(search);

        if (!results) {
          return undefined;
        }

        track.event({
          category: "Event",
          action: "Count",
          label: "Autocompletion",
          value: String(results.length)
        });

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
