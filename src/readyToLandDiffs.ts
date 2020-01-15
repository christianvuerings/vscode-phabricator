import * as vscode from "vscode";
import configuration from "./configuration";
import log from "./log";
import request from "./request";
import statusBar from "./statusBar";
import store from "./store";
import track from "./track";

class DiffItem implements vscode.QuickPickItem {
  label: string;
  uri: string;

  constructor({ label, uri }: { label: string; uri: string }) {
    this.label = label;
    this.uri = uri;
  }
}

const getKeys = <T extends {}>(o: T): Array<keyof T> =>
  <Array<keyof T>>Object.keys(o);

const joinCommaAnd = (input: string[]) =>
  input.reduce(
    (acc, curr, i) =>
      i !== 0
        ? acc + `${input.length - 1 === i ? ` and ` : ", "}` + curr
        : curr,
    ""
  );

const buildStatusToIcon = Object.freeze({
  passed: `$(check)`,
  busy: `$(loading)`,
  failed: `$(error)`,
  unknown: `$(question)`
});
type BuildStatus = keyof typeof buildStatusToIcon;

const diffToUrl: { [diffPHID: string]: string } = {};

type DiffList = {
  label: string;
  phid: string;
  uri: string;
  status: BuildStatus;
}[];
let acceptedDiffs: DiffList | null;

const updateStatusBar = (diffsList: DiffList) => {
  const counts = diffsList.reduce(
    (acc, value) => ({
      ...acc,
      [value.status]: acc[value.status] ? acc[value.status] + 1 : 1
    }),
    <
      {
        [K in BuildStatus]: number;
      }
    >{}
  );

  statusBar.text(
    getKeys(buildStatusToIcon)
      .reduce(
        (acc, value) =>
          counts[value]
            ? `${acc} ${buildStatusToIcon[value]} ${counts[value]}`
            : acc,
        ""
      )
      .trim()
  );
  statusBar.get().tooltip = `Phabricator: ${joinCommaAnd(
    getKeys(buildStatusToIcon).reduce(
      (acc, value) =>
        counts[value] ? [...acc, `${counts[value]} ${value}`] : acc,
      <string[]>[]
    )
  )} ${diffsList.length > 1 ? "diffs" : "diff"}`;
};

const buildStatus: (
  diffPHIDs: string[]
) => Promise<{
  [diffPHID: string]: BuildStatus;
} | null> = async diffPHIDs => {
  try {
    const response: {
      result?: {
        data?: {
          fields: {
            objectPHID: string;
            buildableStatus: {
              value: "passed" | "preparing" | "buidling" | "failed";
            };
          };
        }[];
      };
    } = await request.get({
      method: "harbormaster.buildable.search",
      fields: diffPHIDs.reduce(
        (accumulator, currentValue) => ({
          ...accumulator,
          [`constraints[objectPHIDs][${
            Object.entries(accumulator).length
          }]`]: currentValue
        }),
        {}
      )
    });

    // Combine "building" and "preparing" status into "busy"
    const convertToBusy = (status: string) =>
      ["preparing", "building"].includes(status) ? "busy" : status;

    return (
      response.result?.data?.reduce(
        (acc, value) => ({
          ...acc,
          [value.fields.objectPHID]: convertToBusy(
            value.fields.buildableStatus.value
          )
        }),
        {}
      ) || null
    );
  } catch (e) {
    console.error(e);
    log.append(e.message);
    track.event({
      category: "Error",
      action: "Error",
      label: "Phabricator: could not fetch build status"
    });

    return null;
  }
};

async function list() {
  track.event({
    category: "Event",
    action: "List",
    label: "Accepted Diffs"
  });

  if (!acceptedDiffs) {
    vscode.window.showInformationMessage(
      "[Phabricator] Accepted diffs can not be fetched"
    );
    return;
  }

  if (!acceptedDiffs.length) {
    vscode.window.showInformationMessage(
      "[Phabricator] All accepted diffs have been merged"
    );
    return;
  }

  const selectedItem = await vscode.window.showQuickPick(
    acceptedDiffs.map(
      ({ status, label, uri }) =>
        new DiffItem({
          label: `${buildStatusToIcon[status]} ${label}`,
          uri
        })
    ),
    {
      placeHolder: "Select Accepted Diff"
    }
  );

  if (selectedItem && selectedItem.uri) {
    vscode.env.openExternal(vscode.Uri.parse(selectedItem.uri));

    track.event({
      category: "Event",
      action: "Open URL",
      label: "Accepted Diffs - List"
    });
  }
}

async function update(initialLoad: boolean = false) {
  try {
    const baseUrl = await configuration.baseUrl();
    const storeInstance = store.get({ id: baseUrl });
    const isFirstUndefinedFetch = typeof acceptedDiffs === "undefined";

    if (initialLoad) {
      statusBar.text(`$(loading)`);
    }

    if (!storeInstance?.currentUser?.phid) {
      await store.initialize();
    }

    const acceptedRevisionsResponse: {
      result?: {
        data?: {
          fields: {
            diffPHID: string;
            title: string;
          };
        }[];
      };
    } = await request.get({
      method: "differential.revision.search",
      fields: {
        "constraints[authorPHIDs][0]": storeInstance?.currentUser?.phid || "",
        "constraints[statuses][0]": "accepted"
      }
    });

    const acceptedRevisions = acceptedRevisionsResponse?.result?.data || [];

    track.event({
      category: "Event",
      action: "Count",
      label: "Accepted Diffs",
      value: String(acceptedRevisions.length)
    });

    if (!acceptedRevisions.length) {
      statusBar.text(0);
      return;
    }

    const diffPHIDs = acceptedRevisions.map(el => el.fields.diffPHID);
    const acceptedRevisionsBuildstatus = await buildStatus(diffPHIDs);
    const diffPHIDsWithoutLinks = diffPHIDs.filter(phid => !diffToUrl[phid]);

    if (diffPHIDsWithoutLinks && diffPHIDsWithoutLinks.length) {
      const diffsInfoResponse: {
        result?: {
          [key: string]: {
            uri: string;
          };
        };
      } = await request.get({
        method: "phid.query",
        fields: diffPHIDsWithoutLinks.reduce(
          (accumulator, currentValue) => ({
            ...accumulator,
            [`phids[${Object.entries(accumulator).length}]`]: currentValue
          }),
          {}
        )
      });

      if (!diffsInfoResponse || !diffsInfoResponse.result) {
        const errorMessage = "[Phabricator] Could not fetch diff URIs";
        log.append(errorMessage);
        return;
      }

      for (const [key, value] of Object.entries(diffsInfoResponse.result)) {
        diffToUrl[key] = value.uri;
      }
    }

    const diffsList: DiffList = acceptedRevisions.map(el => ({
      phid: el.fields.diffPHID,
      label: el.fields.title,
      uri: diffToUrl[el.fields.diffPHID],
      status: acceptedRevisionsBuildstatus?.[el.fields.diffPHID] || "unknown"
    }));
    const previousReadyToLandDiffs = [
      ...(acceptedDiffs || []).filter(el => el.status === "passed")
    ];
    acceptedDiffs = diffsList;

    updateStatusBar(diffsList);

    if (!isFirstUndefinedFetch && (await configuration.diffNotifications())) {
      diffsList
        .filter(
          value =>
            value.status === "passed" &&
            !previousReadyToLandDiffs.find(item => item.phid === value.phid)
        )
        .forEach(async diff => {
          const open = "Open Diff";
          const response = await vscode.window.showInformationMessage(
            `"${diff.label}" is ready to land`,
            open
          );

          if (response === open) {
            vscode.env.openExternal(vscode.Uri.parse(diff.uri));

            track.event({
              category: "Event",
              action: "Open URL",
              label: "Accepted Diffs - Notification"
            });
          }
        });
    }
  } catch (e) {
    if (initialLoad) {
      statusBar.text(`$(error)`);
      statusBar.get().tooltip = `Phabricator: could not load accepted diffs`;
    }

    console.error(e);
    log.append(e.message);
    track.event({
      category: "Error",
      action: "Error",
      label: "Phabricator: could not load accepted diffs"
    });
  }
}

export default {
  list,
  update
};
