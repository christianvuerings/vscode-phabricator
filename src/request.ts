import log from "./log";
import configuration from "./configuration";
import fetch from "node-fetch";
import { URL } from "url";
import { KeyValueItem } from "./store";

async function get<T>({
  fields,
  method
}: {
  fields?: {
    [key: string]: number | string;
  };
  method: string;
}): Promise<T> {
  const [apiToken, baseUrl] = await Promise.all([
    configuration.apiToken(),
    configuration.baseUrl()
  ]);
  const url = new URL(`/api/${method}`, baseUrl);
  url.searchParams.set("api.token", apiToken);
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "vscode-phabricator"
    }
  });
  return await response.json();
}

const items = async ({
  fields,
  method
}: {
  fields?: {
    [key: string]: number | string;
  };
  method: "project.search" | "user.search";
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
    } = await get({
      fields: {
        ...fields,
        ...(after ? { after } : {}),
        queryKey: "active"
      },
      method
    });

    if (response.result && response.result.data) {
      after =
        response.result &&
        response.result.cursor &&
        response.result.cursor.after;

      log.append(`Cache: ${method} - ${after}`);

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

const currentUser = async (): Promise<{
  phid: string;
  realName: string;
  userName: string;
}> => {
  const baseUrl = await configuration.baseUrl();

  const response: {
    result?: {
      phid: string;
      realName: string;
      userName: string;
    };
  } = await get({
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

export default { currentUser, items, get };
