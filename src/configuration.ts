import * as vscode from "vscode";
import execa from "execa";

const arcrc = async () => {
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
    const firstHost: any = Object.entries(response.hosts)[0][1];
    return String(firstHost.token);
  } catch (e) {
    console.error(e);
    return "";
  }
};

const configuration = async (): Promise<{
  apiToken: string;
  baseUrl: string;
}> => {
  const vsCodeConfiguration = vscode.workspace.getConfiguration();

  return {
    apiToken:
      vsCodeConfiguration.get("phabricator.apiToken") ||
      (await phabricatorTokenFromArc()) ||
      "",
    baseUrl:
      vsCodeConfiguration.get("phabricator.baseUrl") ||
      (await phabricatorUriFromArc()) ||
      ""
  };
};

export default configuration;
