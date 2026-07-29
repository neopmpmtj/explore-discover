/**
 * error-logger.ts — Crash & Error History Tracker
 *
 * Catches uncaught exceptions and unhandled rejections at the Node.js level
 * and logs them to .pi/observability/errors.jsonl for later querying.
 *
 * Also tracks what Pi was doing when the crash happened by listening to
 * key lifecycle events and recording the "last action".
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ── Output path ─────────────────────────────────────────────────────────────

const OBS_DIR = join(import.meta.dirname, "..", "..", "observability");
const ERRORS_FILE = join(OBS_DIR, "errors.jsonl");

function ensureDir() {
  mkdirSync(OBS_DIR, { recursive: true });
}

// ── Track what Pi was doing ─────────────────────────────────────────────────

let lastAction: {
  activity: string;
  since: string;
  detail?: string;
} = { activity: "startup", since: new Date().toISOString() };

function setActivity(activity: string, detail?: string) {
  lastAction = {
    activity,
    since: new Date().toISOString(),
    detail,
  };
}

// ── Record an error ─────────────────────────────────────────────────────────

interface ErrorRecord {
  timestamp: string;
  type: "uncaughtException" | "unhandledRejection";
  message: string;
  stack: string[];
  lastAction: typeof lastAction;
  piVersion?: string;
  nodeVersion: string;
}

function recordError(type: ErrorRecord["type"], error: Error | unknown) {
  ensureDir();

  const err = error instanceof Error ? error : new Error(String(error));
  const stack = err.stack ? err.stack.split("\n").map((s) => s.trim()) : [];

  // Try to get Pi version from package.json (best effort)
  let piVersion: string | undefined;
  try {
    // Pi is installed alongside Node.js in nvm
    const nodeDir = join(process.execPath, "..", "..", "lib", "node_modules");
    const pkgPath = join(nodeDir, "@earendil-works/pi-coding-agent/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    piVersion = pkg.version;
  } catch {
    // not available
  }

  const record: ErrorRecord = {
    timestamp: new Date().toISOString(),
    type,
    message: err.message,
    stack,
    lastAction: { ...lastAction },
    piVersion,
    nodeVersion: process.version,
  };

  appendFileSync(ERRORS_FILE, JSON.stringify(record) + "\n");
}

// ── Extension ───────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // ── Node.js crash traps ────────────────────────────────────────────────

  const originalExceptionHandler = process.listeners("uncaughtException");

  process.on("uncaughtException", (error) => {
    recordError("uncaughtException", error);

    // Call any original handlers (e.g., Pi's own error display)
    for (const listener of originalExceptionHandler) {
      try {
        (listener as (err: Error) => void)(error);
      } catch {
        // don't let a broken handler prevent others from running
      }
    }

    // Still exit — uncaught exceptions are fatal
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    recordError("unhandledRejection", reason);

    // Don't exit — unhandled rejections are not always fatal
  });

  // Prevent Pi from removing our handlers on reload
  process.setMaxListeners(process.getMaxListeners() + 2);

  // ── Activity tracking ──────────────────────────────────────────────────

  pi.on("agent_start", () => setActivity("agent_start"));
  pi.on("agent_end", () => setActivity("agent_end"));
  pi.on("turn_start", (event) =>
    setActivity("turn_start", `turn #${event.turnIndex}`),
  );
  pi.on("turn_end", (event) =>
    setActivity("turn_end", `turn #${event.turnIndex}`),
  );
  pi.on("tool_execution_start", (event) =>
    setActivity("tool_call", event.toolName),
  );
  pi.on("tool_execution_end", (event) =>
    setActivity(
      event.isError ? "tool_error" : "tool_done",
      event.toolName,
    ),
  );
  pi.on("input", (event) =>
    setActivity("user_input", event.text?.slice(0, 80)),
  );
  pi.on("session_before_compact", () => setActivity("compacting"));
  pi.on("session_start", async (_event, ctx) => {
    setActivity("session_start");
    ensureDir();
    ctx.ui.notify("🛡 Error logger active", "info");
  });
}
