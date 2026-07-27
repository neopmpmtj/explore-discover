# Event Logger Extension — Setup & Implementation Report

**Date:** 2025-07-26  
**System:** Pi coding-agent (npm global install), Node v24.18.0, Linux  
**Working directory:** `/home/pmpmt/.pi/explore-discover/`

**Relevant files:**

| File | Role |
|------|------|
| `.pi/extensions/event-logger.ts` | Extension that logs events to disk |
| `.pi/events.log` | Append-only log output (created at runtime) |
| `.pi/AGENTS.md` | Project instructions for Pi |
| `miscelaneous_documentation/explore-discover/01-extension-discovery-and-loading.md` | Prior research on how Pi loads extensions |

---

## Problem

We needed a practical, hands-on way to explore Pi's extension event lifecycle. Reading documentation and compiled JS source was informative but abstract — we needed to **see events fire in real time** and inspect their payloads.

The goal: create a minimal extension that logs each lifecycle event to a file, then add events one at a time so a learner can observe the exact order and shape of every event Pi emits.

---

## Investigation / Prior Research

Before building, we traced Pi's extension loading pipeline through the compiled JavaScript:

| Source | What it revealed |
|--------|-----------------|
| `dist/core/extensions/loader.js` | jiti-based TS loading, factory extraction, caching, `discoverExtensionsInDir()` |
| `dist/core/extensions/runner.js` | `ExtensionRunner` class, `bindCore()`, event dispatch, `createContext()` |
| `dist/core/extensions/wrapper.js` | How extension tools get wrapped into agent tools |
| `dist/core/resource-loader.js` | `DefaultResourceLoader.reload()` — the full orchestration of extension → skills → prompts → themes → context files |
| `dist/extensions/index.js` | Built-in extensions (only `llama.cpp`) |
| Official `extensions.md` | Event lifecycle diagram, `ExtensionContext` API, tool/command/UI registration |

Key finding from the investigation: Pi discovers extensions in `.pi/extensions/` (project-local), `~/.pi/agent/extensions/` (global), and via CLI `-e`. Our project-local placement would be auto-discovered without any CLI flags.

---

## Architecture / Design Decisions

### Why a log file instead of console/notify?

| Approach | Pros | Cons |
|----------|------|------|
| `console.log()` | Immediate, no file needed | Lost after terminal closes, mixed with Pi output, no good in `-p` mode |
| `ctx.ui.notify()` | Shows in TUI, looks native | Only works in interactive mode, transient |
| **`appendFileSync` to `.pi/events.log`** ✅ | Persistent, inspectable with any editor, survives restarts, works in all modes | Requires cleanup between runs |

### Why synchronous writes?

Pi emits events during startup and shutdown where the event loop may be under pressure. `appendFileSync` guarantees each log line is written atomically and sequentially — no interleaving. For a development diagnostic tool this is the right tradeoff: simplicity over async I/O performance.

### Why project-local (`.pi/extensions/`) instead of global?

| Location | When to use |
|----------|------------|
| `~/.pi/agent/extensions/` | Extensions you want in every project |
| **`.pi/extensions/`** ✅ | Extensions specific to one project — keeps the exploration self-contained |
| CLI `-e` flag | One-off tests without touching the filesystem |

The exploration is project-scoped, so `.pi/extensions/` is the natural home.

---

## Implementation

### Phase 1: Directory & skeleton

```bash
mkdir -p .pi/extensions
```

Pi auto-discovers `.ts` files in `.pi/extensions/` with no additional configuration.

### Phase 2: Extension with log helper

**File:** `.pi/extensions/event-logger.ts` (54 lines)

```
Structure:
├── imports        (ExtensionAPI type, appendFileSync, join)
├── LOG_FILE       (resolves to .pi/events.log)
├── log() helper   (timestamp + append)
└── factory fn     (default export, registers pi.on() handlers)
```

**Log helper pattern:**

```typescript
const LOG_FILE = join(import.meta.dirname, "..", "events.log");

function log(msg: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}
```

`import.meta.dirname` is the folder containing the extension file (`.pi/extensions/`). Going up one level (`..`) puts `events.log` in `.pi/` — the project config root.

### Phase 3: First event — `session_start`

```typescript
pi.on("session_start", async (event, ctx) => {
  log(`EVENT: session_start`);
  log(`  reason: ${event.reason}`);
  log(`  previousSessionFile: ${event.previousSessionFile ?? "none"}`);
  log(`  sessionFile: ${ctx.sessionManager.getSessionFile() ?? "none"}`);
  log(`  cwd: ${ctx.cwd}`);
  log(`  mode: ${ctx.mode}`);
});
```

`session_start` is the **first event any extension sees** — it fires after all extensions are loaded but before the agent processes any input. Its payload tells us:
- **Why** the session started (`reason`: startup, reload, new, resume, fork)
- **Where we came from** (`previousSessionFile`: the old session when switching)
- **Where we are** (`ctx.sessionManager`, `ctx.cwd`, `ctx.mode`)

### Phase 4: Documentation comments on every block

Every import, constant, function, and event handler now carries a plain-language JSDoc comment explaining **what** it does and **why** it's there — written for a learner encountering the code for the first time.

### Phase 5: Verification

```bash
pi -p "say hello" --no-context-files
```

Output in `.pi/events.log`:

```
[2026-07-27T11:39:31.748Z] EVENT: session_start
[2026-07-27T11:39:31.749Z]   reason: startup
[2026-07-27T11:39:31.749Z]   previousSessionFile: none
[2026-07-27T11:39:31.749Z]   sessionFile: /home/pmpmt/.pi/explore-discover/sessions/.../2026-07-27T11-39-31-624Z_....jsonl
[2026-07-27T11:39:31.749Z]   cwd: /home/pmpmt/.pi/explore-discover
[2026-07-27T11:39:31.749Z]   mode: print
```

Confirmed: the extension auto-loads from `.pi/extensions/`, the factory runs, the `session_start` handler fires, and all fields appear as expected.

---

## Files Created/Modified

| File | Lines | Purpose |
|------|-------|---------|
| `.pi/extensions/event-logger.ts` | 54 | Extension: log helper + `session_start` handler with educational comments |
| `.pi/events.log` | 6 | Runtime output: one event captured (appended on each Pi run) |
| `miscelaneous_documentation/explore-discover/01-extension-discovery-and-loading.md` | ~297 | Research: how Pi discovers, loads, caches, and runs extensions |
| `miscelaneous_documentation/explore-discover/event-logger-extension-setup/event-logger-extension-setup.md` | this file | This report |

---

## Next Steps

The extension is ready to receive additional event handlers. The natural progression through Pi's lifecycle:

1. ✅ `session_start`
2. `resources_discover` (fires right after session_start — extensions can contribute skill/prompt/theme paths)
3. `before_agent_start` (fires when user submits a prompt, before the LLM sees it)
4. `agent_start` / `agent_end` (brackets a low-level agent run)
5. `turn_start` / `turn_end` (one LLM response + its tool calls)
6. `tool_call` / `tool_result` (before/after each tool execution — can block or modify)
7. `input` (raw user input, can transform or handle)
8. `session_shutdown` (on quit, reload, or session switch)

To add an event: uncomment or add a new `pi.on("event_name", ...)` block in `event-logger.ts`, run `pi -p "test" --no-context-files`, and inspect `.pi/events.log`.
