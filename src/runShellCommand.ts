import execa from "execa";
import log from "./log";

/**
 * Run shell command
 */
export default async function runShellCommand(
  command: string
): Promise<string | null> {
  try {
    const result = await execa.command(command, { shell: true });

    return result?.stdout ?? null;
  } catch (e) {
    console.error(e);
    if (e) {
      log.append(
        `Schell command error: \`${command}\` ${JSON.stringify(e, null, 2)}`
      );
    }
    return null;
  }
}
