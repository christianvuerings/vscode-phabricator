import configuration from "./configuration";
import fetch from "node-fetch";
import { URL } from "url";

export default async function request<T>({
  after,
  fields,
  method,
  order,
  setQueryKey = false
}: {
  after?: string | null;
  fields?: {
    [key: string]: number | string;
  };
  method: string;
  order?: string;
  setQueryKey?: boolean;
}): Promise<T> {
  const { apiToken, baseUrl } = await configuration();
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
