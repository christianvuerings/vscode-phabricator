import log from "./log";
import configuration from "./configuration";
import context from "./context";
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

const initialize = async () => {
  const baseUrl = await configuration.baseUrl();
  const [users, projects, currentUser] = await Promise.all([
    request.items({
      method: "user.search",
      fields: {
        "order[0]": "username"
      }
    }),
    request.items({
      method: "project.search",
      fields: {
        "order[0]": "name"
      }
    }),
    request.currentUser()
  ]);

  log.append("Cache: Updated");

  update({
    id: baseUrl,
    currentUser,
    users,
    projects
  });
};

const get = ({ id }: { id: string }) => {
  const store:
    | (Store & { lastUpdated: number })
    | undefined = context.get().globalState.get(id);
  return store;
};

const update = ({
  currentUser,
  id,
  projects,
  users
}: Store & {
  id: string;
}) => {
  context.get().globalState.update(id, {
    lastUpdated: Date.now(),
    currentUser,
    users,
    projects
  });
};

export default { get, initialize, update };
