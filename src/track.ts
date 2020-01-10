import got from "got";
import { URL, URLSearchParams } from "url";
import configuration from "./configuration";
import log from "./log";
import packageJSON from "./packageJSON";
import store from "./store";
import uuid from "uuid/v5";

const GA_TRACKING_ID = "UA-190225-21";
const uuidNamespace = "f5ea8702-8da7-479d-bea9-f69049e2090b";

const event = async ({
  category,
  action,
  label,
  value
}: {
  category: "Event" | "Error";
  action: "Activate" | "Count" | "List" | "Open URL" | "Error";
  label: string;
  value?: string;
}) => {
  // Only track usage when the user enables telemetry for this extension
  const enableTelemetry = await configuration.enableTelemetry();
  if (!enableTelemetry) {
    return;
  }

  const baseUrl = await configuration.baseUrl();
  const userId =
    store.get({ id: baseUrl })?.currentUser?.userName || "_unknown";

  // List of all google analytics parameters: https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters
  const data = {
    // API Version.
    v: "1",
    // Tracking ID / Property ID.
    tid: GA_TRACKING_ID,
    // Anonymous Client Identifier. Ideally, this should be a UUID that
    // is associated with particular user, device, or browser instance.
    cid: uuid(
      `${baseUrl || "https://example.phabricator.com"}-${userId}`,
      uuidNamespace
    ),
    // Event hit type.
    t: "event",
    // Event category.
    ec: category,
    // Event action.
    ea: action,
    // Event label.
    el: label,
    // Event value.
    ...(value ? { ev: value } : {}),
    // Custom dimension: User ID
    cd1: userId,
    // Custom dimension: Repository URL
    cd2: baseUrl || "_unknown",
    // Custom dimension: Extension Version
    cd3: packageJSON.get()?.version || "_unknown"
  };

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    searchParams.append(key, value);
  }

  const url = new URL("http://www.google-analytics.com/collect");
  url.search = searchParams.toString();

  try {
    got.post(url.toString());
  } catch (e) {
    console.error(e);
    log.append(`Error trying to track: ${e.message}`);
  }
};

export default {
  event
};
