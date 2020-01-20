import { after } from "mocha";
import * as assert from "assert";
import * as vscode from "vscode";
import log from "../../log";
import sinon from "sinon";

suite("Log", () => {
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });
  test("logs the current time in the log message", () => {
    sinon.useFakeTimers({
      now: 1483228800000
    });

    assert.equal(
      log.append("A log output message"),
      "[16:00:00] - A log output message"
    );
  });
});
