import * as vscode from "vscode";
import execa from "execa";

type Arcrc = {
  config?: {
    "phabricator.uri": string;
  };
  hosts?: {
    [host: string]: {
      token: string;
    };
  };
};

const arcrc: () => Promise<Arcrc> = async () => {
  try {
    const result = await execa("cat", [`${process.env.HOME}/.arcrc`]);
    if (result && result.stdout) {
      return JSON.parse(result.stdout);
    }
  } catch (e) {
    console.error(e);
    return {};
  }
};

const phabricatorUriFromArc = async () => {
  const response = await arcrc();
  return response.config && response.config["phabricator.uri"]
    ? response.config["phabricator.uri"]
    : "";
};

const phabricatorTokenFromArc = async () => {
  const response = await arcrc();
  try {
    if (!response.hosts) {
      throw new Error("No hosts found in .arcrc file");
    }
    const firstHost: any = Object.entries(response.hosts)[0][1];
    return String(firstHost.token);
  } catch (e) {
    console.error(e);
    return "";
  }
};

const apiToken = async (): Promise<string> =>
  vscode.workspace.getConfiguration().get("phabricator.apiToken") ||
  (await phabricatorTokenFromArc()) ||
  "";

const baseUrl = async (): Promise<string> =>
  vscode.workspace.getConfiguration().get("phabricator.baseUrl") ||
  (await phabricatorUriFromArc()) ||
  "";

const diffNotifications = async (): Promise<boolean> =>
  !!vscode.workspace.getConfiguration().get("phabricator.diffNotifications");

const enableTelemetry = async (): Promise<boolean> =>
  !!vscode.workspace.getConfiguration().get("phabricator.enableTelemetry");

export default {
  apiToken,
  baseUrl,
  diffNotifications,
  enableTelemetry
};
