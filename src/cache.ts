import configuration from "./configuration";
import log from "./log";
import store from "./store";
import track from "./track";

async function update() {
  log.append(`Cache: Fetch data`);
  const baseUrl = await configuration.baseUrl();
  try {
    await store.initialize();
  } catch (e) {
    console.error(e);
    const errorMessage = `Could not update the cache. Ensure you can connect to ${baseUrl}`;
    track.event({
      category: "Error",
      action: "Error",
      label: errorMessage
    });
    log.append(errorMessage);
  }
}

export default {
  update
};
