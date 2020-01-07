import * as vscode from "vscode";

export type KeyValueItem = {
  detail?: string;
  key: string;
  value: string;
}[];

type Store = {
  currentUser?: {
    phid: string;
    realName: string;
    userName: string;
  };
  users: KeyValueItem;
  projects: KeyValueItem;
};

export const getStore = ({
  context,
  id
}: {
  context: vscode.ExtensionContext;
  id: string;
}) => {
  const store:
    | (Store & { lastUpdated: number })
    | undefined = context.globalState.get(id);
  return store;
};

export const updateStore = ({
  currentUser,
  id,
  projects,
  users,
  context
}: Store & {
  context: vscode.ExtensionContext;
  id: string;
}) => {
  context.globalState.update(id, {
    lastUpdated: Date.now(),
    currentUser,
    users,
    projects
  });
};
