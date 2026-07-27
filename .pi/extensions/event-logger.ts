/**
 * Pi provides this type so TypeScript can check our code.
 * It describes all the methods available on the `pi` object.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * appendFileSync adds text to the end of a file without overwriting it.
 * We use the synchronous version so log messages don't interleave.
 */
import { appendFileSync } from "node:fs";

/**
 * join glues path segments together correctly for the current OS.
 */
import { join } from "node:path";

/**
 * import.meta.dirname is the folder containing THIS extension file.
 * ".." goes up one level → the .pi/ folder.
 * So LOG_FILE points to .pi/events.log
 */
const LOG_FILE = join(import.meta.dirname, "..", "events.log");

/**
 * Helper: writes a timestamped message to our log file.
 * Every call appends one line — the file grows as events fire.
 */
function log(msg: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

/**
 * This is the factory function — Pi calls it once at startup.
 * The `pi` parameter is our ExtensionAPI: we use .on() to
 * subscribe to lifecycle events.
 */
export default function (pi: ExtensionAPI) {
  /**
   * session_start — fires once when a session begins.
   * - event.reason: "startup" | "reload" | "new" | "resume" | "fork"
   * - event.previousSessionFile: the old session path (if switching)
   * - ctx.sessionManager: lets us inspect the current session
   */
  pi.on("session_start", async (event, ctx) => {
    log(`EVENT: session_start`);
    log(`  reason: ${event.reason}`);
    log(`  previousSessionFile: ${event.previousSessionFile ?? "none"}`);
    log(`  sessionFile: ${ctx.sessionManager.getSessionFile() ?? "none"}`);
    log(`  cwd: ${ctx.cwd}`);
    log(`  mode: ${ctx.mode}`);
  });
}
