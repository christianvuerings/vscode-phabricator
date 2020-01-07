import log from "./log";
import * as vscode from "vscode";
import configuration from "./configuration";
import request from "./request";

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

const initialize = async ({
  context
}: {
  context: vscode.ExtensionContext;
}) => {
  const baseUrl = await configuration.baseUrl();
  const [users, projects, currentUser] = await Promise.all([
    request.items({
      method: "user.search",
      order: "username"
    }),
    request.items({
      method: "project.search",
      order: "name"
    }),
    request.currentUser()
  ]);

  log.append("Cache: Updated");

  update({
    context,
    id: baseUrl,
    currentUser,
    users,
    projects
  });
};

const get = ({
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

const update = ({
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

export default { get, initialize, update };
