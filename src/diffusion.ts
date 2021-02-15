import * as vscode from "vscode";
import findUp from 'find-up';
import open from "open";
import path from 'path';
import { URL } from "url";

import configuration from "./configuration";
import track from "./track";

const openLink = async (filePath: vscode.Uri) => {
  const fsPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? '';

  const [arcConfigPath, repositoryCallsign, baseUrl] = await Promise.all([findUp('.arcconfig', {
    cwd: fsPath
  }), configuration.repositoryCallsign(), configuration.baseUrl()]);

  const relativeFilePath = filePath.fsPath.replace(path.dirname(arcConfigPath ?? ''), '');

  const url = new URL(`diffusion/${repositoryCallsign}/browse/master${relativeFilePath}`, baseUrl);
  await open(url.toString());
  track.event({
    category: "Event",
    action: "Count",
    label: "OpenDiffusionLink",
    value: String(1),
  });
};


export default {
  openLink,
};
