import * as vscode from "vscode";
import findUp from 'find-up';
import open from "open";
import path from 'path';
import { URL } from "url";

import configuration from "./configuration";
import track from "./track";

const getUrl = async (filePath: vscode.Uri) => {
  const fsPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? '';

  const [arcConfigPath, repositoryCallsign, baseUrl] = await Promise.all([findUp('.arcconfig', {
    cwd: fsPath
  }), configuration.repositoryCallsign(), configuration.baseUrl()]);

  const relativeFilePath = filePath.fsPath.replace(path.dirname(arcConfigPath ?? ''), '');

  const url = new URL(`diffusion/${repositoryCallsign}/browse/master${relativeFilePath}`, baseUrl);
  return url.toString();
};

const selectionToUrlRange = (selection?: vscode.Selection ) => {
  if (!selection) {
    return '';
  }

  return selection.isSingleLine
    ? `$${selection.start.line + 1}`
    : `$${selection.start.line + 1}-${selection.end.line + 1}`;
};

const openLink = async (filePath: vscode.Uri) => {
  const uri = filePath ?? vscode.window.activeTextEditor?.document.uri;

  if(!uri) {
    vscode.window.showInformationMessage('Open a file first to open its Diffusion link');
  }

  const appendLineNumber = selectionToUrlRange(vscode.window.activeTextEditor?.selection);
  const url = `${await getUrl(uri)}${appendLineNumber}`;

  await open(url);
  track.event({
    category: "Event",
    action: "Count",
    label: "OpenDiffusionLink",
    value: String(1),
  });
};

const copyUrl = async (filePath: vscode.Uri) => {
  const uri = filePath ?? vscode.window.activeTextEditor?.document.uri;

  if(!uri) {
    vscode.window.showInformationMessage('Open a file first to copy its Diffusion Url');
  }

  const appendLineNumber = selectionToUrlRange(vscode.window.activeTextEditor?.selection);
  const url = `${await getUrl(uri)}${appendLineNumber}`;

  await vscode.env.clipboard.writeText(url);
  track.event({
    category: "Event",
    action: "Count",
    label: "CopyDiffusionUrl",
    value: String(1),
  });
};


export default {
  copyUrl,
  openLink,
};
