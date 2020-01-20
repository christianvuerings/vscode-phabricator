import { after } from "mocha";
import * as assert from "assert";
import * as vscode from "vscode";
import log from "../../log";
import sinon from "sinon";

suite("Log", () => {
  after(() => {
    vscode.window.showInformationMessage("All tests done!");
  });
  test("logs the current time in the log message: midnight", () => {
    const clock = sinon.useFakeTimers({
      now: 1483228800000
    });

    assert.equal(
      log.append("A log output message"),
      "[00:00:00] - A log output message"
    );

    clock.restore();
  });

  test("logs the current time in the log message: 1 hour, 1 minute and 1 second after midnight", () => {
    const clock = sinon.useFakeTimers({
      now: 1483228800000 + 3661000
    });

    assert.equal(
      log.append("A log output message"),
      "[01:01:01] - A log output message"
    );

    clock.restore();
  });
});
