import * as vscode from "vscode";

export type KeyValueItem = {
  detail?: string;
  key: string;
  value: string;
}[];

type Store =
  | {
      lastUpdated: number;
      currentUser?: {
        phid: string;
        realName: string;
        userName: string;
      };
      users: KeyValueItem;
      projects: KeyValueItem;
    }
  | undefined;

export const getStore = ({
  context,
  id
}: {
  context: vscode.ExtensionContext;
  id: string;
}) => {
  const store: Store = context.globalState.get(id);
  return store;
};
