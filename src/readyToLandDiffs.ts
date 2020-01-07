import * as vscode from "vscode";
import configuration from "./configuration";
import log from "./log";
import request from "./request";
import statusBar from "./statusBar";
import store from "./store";

class DiffItem implements vscode.QuickPickItem {
  label: string;
  uri: string;

  constructor({ label, uri }: { label: string; uri: string }) {
    this.label = label;
    this.uri = uri;
  }
}

const diffToUrl: { [diffPHID: string]: string } = {};
let readyToLandDiffs: {
  label: string;
  phid: string;
  uri: string;
}[] = [];

async function list() {
  const selectedItem = await vscode.window.showQuickPick(
    readyToLandDiffs.map(
      ({ label, uri }) =>
        new DiffItem({
          label,
          uri
        })
    ),
    {
      placeHolder: "Select Accepted Diff"
    }
  );

  if (selectedItem && selectedItem.uri) {
    vscode.env.openExternal(vscode.Uri.parse(selectedItem.uri));
  }
}

async function update({
  context,
  initialLoad = false
}: {
  context: vscode.ExtensionContext;
  initialLoad?: boolean;
}) {
  try {
    const baseUrl = await configuration.baseUrl();
    const storeInstance = store.get({ context, id: baseUrl });

    if (initialLoad) {
      statusBar.text(`$(loading)`);
    }

    if (!storeInstance?.currentUser?.phid) {
      await store.initialize({ context });
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
    if (!acceptedRevisions.length) {
      vscode.window.showInformationMessage(
        "[Phabricator] Did not find accepted revisions"
      );
      return;
    }

    const diffPHIDs = acceptedRevisions.map(el => el.fields.diffPHID);
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
        vscode.window.showErrorMessage(errorMessage);
        log.append(errorMessage);
        return;
      }

      for (const [key, value] of Object.entries(diffsInfoResponse.result)) {
        diffToUrl[key] = value.uri;
      }
    }

    const diffsList = acceptedRevisions.map(el => ({
      phid: el.fields.diffPHID,
      label: el.fields.title,
      uri: diffToUrl[el.fields.diffPHID]
    }));
    const previousAcceptedDiffs = [...readyToLandDiffs];
    readyToLandDiffs = diffsList;

    statusBar.text(readyToLandDiffs.length);
    statusBar.get().tooltip = `Phabricator: ${readyToLandDiffs.length} diffs ready to land`;

    if (!initialLoad && (await configuration.diffNotifications())) {
      diffsList
        .filter(
          value => !previousAcceptedDiffs.find(item => item.phid === value.phid)
        )
        .forEach(async diff => {
          const open = "Open diff";
          const response = await vscode.window.showInformationMessage(
            `[Pabricator]: "${diff.label}" is ready to land`,
            open
          );

          if (response === open) {
            vscode.env.openExternal(vscode.Uri.parse(diff.uri));
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
  }
}

export default {
  list,
  update
};
