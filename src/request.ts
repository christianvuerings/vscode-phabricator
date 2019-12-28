import fetch from "node-fetch";
import { URL } from "url";

export type Response = {
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

export default async function request({
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
}): Promise<Response> {
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
}
