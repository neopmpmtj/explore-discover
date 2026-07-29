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

  /**
   * session_info_changed — fires when the session name is set or cleared.
   * - event.name: the new name (string), or undefined if cleared
   */
  pi.on("session_info_changed", async (event, ctx) => {
    log(`EVENT: session_info_changed`);
    log(`  name: ${event.name ?? "(cleared)"}`);
    log(`  sessionFile: ${ctx.sessionManager.getSessionFile() ?? "none"}`);
  });

  /**
   * session_before_switch — fires before switching to another session.
   * - event.reason: "new" | "resume"
   * - event.targetSessionFile: the session file being switched TO
   * Can be cancelled by returning { cancel: true }
   */
  pi.on("session_before_switch", async (event, ctx) => {
    log(`EVENT: session_before_switch`);
    log(`  reason: ${event.reason}`);
    log(`  targetSessionFile: ${event.targetSessionFile ?? "none"}`);
    log(`  currentSessionFile: ${ctx.sessionManager.getSessionFile() ?? "none"}`);
  });

  /**
   * context — fires before each LLM call. Can modify messages.
   * - event.messages: all messages being sent (mutable array)
   * Messages are too large to log in full, so we log role summary.
   */
  pi.on("context", async (event, ctx) => {
    const roles = event.messages.map((m: any) => m.role);
    log(`EVENT: context`);
    log(`  messageCount: ${event.messages.length}`);
    log(`  roles: ${roles.join(" → ")}`);
  });
}
