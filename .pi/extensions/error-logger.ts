/**
 * error-logger.ts — Crash & Error History Tracker
 *
 * Catches uncaught exceptions and unhandled rejections at the Node.js level
 * and logs them to .pi/observability/errors.jsonl for later querying.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ── Output path (same as observability extension) ───────────────────────────

const OBS_DIR = join(import.meta.dirname, "..", "observability");
const ERRORS_FILE = join(OBS_DIR, "errors.jsonl");

function ensureDir() {
  mkdirSync(OBS_DIR, { recursive: true });
}

// ── Record an error ─────────────────────────────────────────────────────────

interface ErrorRecord {
  timestamp: string;
  type: "uncaughtException" | "unhandledRejection";
  message: string;
  stack: string[];
  lastAction: string;
  piVersion?: string;
  nodeVersion: string;
}

function recordError(type: ErrorRecord["type"], error: Error | unknown) {
  ensureDir();
  const err = error instanceof Error ? error : new Error(String(error));
  const stack = err.stack ? err.stack.split("\n").map((s) => s.trim()) : [];

  let piVersion: string | undefined;
  try {
    const pkgDir = join(process.execPath, "..", "..", "lib", "node_modules");
    const pkg = JSON.parse(
      readFileSync(join(pkgDir, "@earendil-works/pi-coding-agent/package.json"), "utf-8")
    );
    piVersion = pkg.version;
  } catch {}

  const record: ErrorRecord = {
    timestamp: new Date().toISOString(),
    type,
    message: err.message,
    stack,
    lastAction,
    piVersion,
    nodeVersion: process.version,
  };
  appendFileSync(ERRORS_FILE, JSON.stringify(record) + "\n");
}

// ── Activity tracking ───────────────────────────────────────────────────────

let lastAction = "startup";

function setActivity(what: string) {
  lastAction = what;
}

// ── Extension ───────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // Signal we loaded
  setActivity("loaded");

  pi.on("session_start", async (_event, ctx) => {
    ensureDir();
    ctx.ui.notify("🛡 Error logger active", "info");
  });

  // Track what Pi is doing
  pi.on("agent_start", () => setActivity("agent_start"));
  pi.on("turn_start", (e) => setActivity(`turn_start #${e.turnIndex}`));
  pi.on("tool_execution_start", (e) => setActivity(`tool:${e.toolName}`));
  pi.on("input", (e) => setActivity("user_input"));

  // ── Node.js crash traps ──────────────────────────────────────────────

  const originalHandler = process.listeners("uncaughtException");

  process.on("uncaughtException", (error) => {
    recordError("uncaughtException", error);
    for (const h of originalHandler) {
      try { (h as (err: Error) => void)(error); } catch {}
    }
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    recordError("unhandledRejection", reason);
  });

  process.setMaxListeners(process.getMaxListeners() + 2);
}
