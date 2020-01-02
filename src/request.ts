import fetch from "node-fetch";
import { URL } from "url";

export type Response = {
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
        title: string;
      };
    }[];
    phid?: string;
  };
};

export default async function request({
  after,
  apiToken,
  baseUrl,
  fields,
  method,
  order,
  setQueryKey = false
}: {
  after?: string | null;
  apiToken: string;
  baseUrl: string;
  fields?: {
    [key: string]: number | string;
  };
  method: string;
  order?: string;
  setQueryKey?: boolean;
}): Promise<Response> {
  const url = new URL(`/api/${method}`, baseUrl);
  url.searchParams.set("api.token", apiToken);
  if (setQueryKey) {
    url.searchParams.set("queryKey", "active");
  }
  if (order) {
    url.searchParams.set("order[0]", order);
  }
  if (after) {
    url.searchParams.set("after", after);
  }
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
