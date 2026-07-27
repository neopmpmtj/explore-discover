# 01 — Extension Discovery & Loading

**Date:** 2025-07-26  
**System:** Pi coding-agent (npm global install), Node v24.18.0  
**Sources:**
- `~/.nvm/.../pi-coding-agent/dist/core/extensions/loader.js` — discovery, loading, caching
- `~/.nvm/.../pi-coding-agent/dist/core/extensions/runner.js` — runtime, event dispatch
- `~/.nvm/.../pi-coding-agent/dist/core/extensions/wrapper.js` — tool wrapping
- `~/.nvm/.../pi-coding-agent/dist/core/resource-loader.js` — orchestration
- `~/.nvm/.../pi-coding-agent/dist/extensions/index.js` — built-in extensions
- Official docs: `extensions.md`, `packages.md`

---

## Overview

Pi extensions are **TypeScript modules** that hook into Pi to add tools, commands, shortcuts, UI, and more. Before an extension can do anything, Pi must **find it** (discovery) and **run it** (loading). This document covers both phases.

Think of it like this: Pi scans a few specific folders looking for `.ts` files, loads each one into memory, runs its setup function, and only then starts the actual AI chat session.

---

## 1. Where Pi Looks for Extensions

Pi searches in these places, in this order:

| # | Location | Scope | Example |
|---|----------|-------|---------|
| 1 | `.pi/extensions/` | Project-local | `/home/me/my-project/.pi/extensions/my-tool.ts` |
| 2 | `~/.pi/agent/extensions/` | Global (all projects) | `/home/me/.pi/agent/extensions/my-tool.ts` |
| 3 | Paths from `settings.json` | Config-based | `"extensions": ["/path/to/ext.ts"]` |
| 4 | Pi packages (npm/git) | Installed packages | `~/.pi/agent/npm/@foo/pi-tools/extensions/` |
| 5 | CLI `-e` flag | One-off | `pi -e ./my-ext.ts` |
| 6 | Inline factories (SDK) | Programmatic | Passed via `createAgentSession({ extensionFactories })` |

### Discovery Rules Inside Each Directory

When Pi scans a directory like `~/.pi/agent/extensions/`, it applies these rules:

1. **Direct files** — `*.ts` or `*.js` files are loaded directly (e.g., `my-ext.ts`).

2. **Subdirectory with `index.ts` or `index.js`** — If a folder has an index file, Pi loads that one file as the entry point. Example:
   ```
   extensions/
   └── my-extension/
       ├── index.ts        ← loaded as the entry point
       ├── tools.ts        ← only reachable via imports from index.ts
       └── utils.ts
   ```

3. **Subdirectory with `package.json`** — If the folder has a `package.json` with a `pi.extensions` field, Pi uses the paths declared there. This is the most flexible option — it lets you have npm dependencies and custom entry points:
   ```json
   {
     "name": "my-package",
     "dependencies": { "zod": "^3.0.0" },
     "pi": {
       "extensions": ["./src/index.ts"]
     }
   }
   ```

4. **No recursion beyond one level** — Pi only looks one folder deep. If you have `extensions/foo/bar/index.ts`, Pi won't find it unless a `package.json` explicitly declares it.

### How Pi Avoids Duplicates

Pi tracks which extension files it has already seen (by their resolved absolute path) and skips duplicates. This means if the same extension appears in both project-local and CLI paths, it only loads once.

---

## 2. How Pi Loads an Extension

Once Pi has the list of file paths, it loads each one. Here's what happens step by step:

### Step 1: Module Resolution with jiti

Pi uses **jiti** (a "just-in-time TypeScript" tool) to load `.ts` files without needing to compile them first. jiti reads the TypeScript file, compiles it on the fly, and runs it as a Node.js module.

**Two modes, depending on how Pi is installed:**

- **Bun binary** (compiled standalone): Pi bundles all its dependencies inside the binary. jiti uses `virtualModules` — a lookup table that maps import names (like `@earendil-works/pi-coding-agent`) to the already-loaded code in memory. No filesystem access needed.

- **Node.js / npm install**: jiti uses `alias` — a map of import names to filesystem paths in `node_modules/`. This is how `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"` resolves to the right file.

**Available imports for extensions:**

| Import | What it's for |
|--------|--------------|
| `@earendil-works/pi-coding-agent` | Extension types, tools, all public API |
| `typebox` / `@sinclair/typebox` | Schema definitions for tool parameters |
| `@earendil-works/pi-ai` | AI utilities (`StringEnum`, provider creation) |
| `@earendil-works/pi-tui` | Terminal UI components |
| `node:*` built-ins | `node:fs`, `node:path`, etc. |

### Step 2: Extracting the Factory Function

After jiti loads the file, Pi looks at the **default export**. It must be a function — this is called the **factory function**. If the file doesn't export a function as default, Pi reports an error and skips it.

```typescript
// my-extension.ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // This is the factory function
  pi.registerTool({ ... });
}
```

The factory can be:
- **Synchronous** — runs and returns immediately
- **Async** (`async function`) — Pi waits for it to complete before continuing startup. This is useful for fetching remote data during initialization.

### Step 3: Creating the Extension Object

Pi creates an `Extension` object with empty collections:

```
Extension {
  path,           // logical path (e.g., "~/.pi/agent/extensions/my-ext.ts")
  resolvedPath,   // absolute filesystem path
  sourceInfo,     // where it came from (local/package/cli, user/project scope)
  handlers: Map,  // event → array of handler functions
  tools: Map,     // name → tool definition
  commands: Map,  // name → command config
  flags: Map,     // name → flag config
  shortcuts: Map, // key → shortcut config
  messageRenderers: Map,  // customType → renderer
  entryRenderers: Map,    // customType → renderer
}
```

### Step 4: Creating the ExtensionAPI

Pi wraps the empty Extension object with an **ExtensionAPI** — the `pi` parameter that extensions receive. This API has two kinds of methods:

- **Registration methods** — fill in the Extension object's collections:
  - `pi.on(event, handler)` — subscribe to lifecycle events
  - `pi.registerTool(definition)` — add a tool the LLM can call
  - `pi.registerCommand(name, options)` — add a `/command`
  - `pi.registerShortcut(key, options)` — add a keyboard shortcut
  - `pi.registerFlag(name, options)` — add a CLI flag
  - `pi.registerMessageRenderer(type, renderer)` — custom TUI rendering
  - `pi.registerEntryRenderer(type, renderer)` — custom TUI rendering

- **Action methods** — delegate to a shared `runtime` object:
  - `pi.sendMessage()` / `pi.sendUserMessage()` — inject messages
  - `pi.appendEntry()` — persist data
  - `pi.setSessionName()` / `pi.getSessionName()`
  - `pi.exec()` — run shell commands
  - `pi.getActiveTools()` / `pi.getAllTools()` / `pi.setActiveTools()`
  - `pi.registerProvider()` — register AI model providers

During loading, the action methods are **stubs** that throw errors — they only work after Pi's core has been fully initialized and `bindCore()` connects them to real implementations.

### Step 5: Calling the Factory

Pi calls `factory(api)` — your extension's default export receives the API and can register things:

```typescript
export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => { ... });
  pi.registerTool({ name: "my_tool", ... });
  pi.registerCommand("hello", { ... });
}
```

After the factory returns (or after `await factory(api)` resolves, if async), the extension is fully loaded into Pi's memory.

### Step 6: Caching

Pi caches each extension's factory function by file path. The cache is tied to the **current working directory** (cwd) and a **generation counter**. If cwd changes or `/reload` is called, the cache is cleared.

---

## 3. Extension Runtime — Connecting Everything

After all extensions are loaded, Pi creates an **ExtensionRunner** — this is the runtime that manages all loaded extensions.

### bindCore()

Once Pi's internal systems (session manager, model registry, etc.) are ready, it calls `runner.bindCore()` to wire up all the action methods. Before this, calling `pi.sendMessage()` would throw; after this, it works.

### Event Dispatch

When Pi emits an event (like `session_start` or `tool_call`), `runner.emit()` iterates through all extensions in **load order** and calls each handler.

Different events have different dispatch behavior:

| Event Type | Behavior |
|-----------|----------|
| `project_trust` | First handler returning `yes`/`no` wins; `undecided` falls through |
| `input` | Handlers chain; `"handled"` stops; `"transform"` passes to next |
| `tool_call` | Handlers chain; returning `{ block: true }` stops the tool |
| `tool_result` | Handlers chain; each can modify `content`, `details`, `isError`, `usage` |
| `message_end` | Handlers chain; each can replace the message (same role required) |
| `context` | Handlers chain; each can filter/modify the messages array |
| `before_agent_start` | Handlers chain; each can inject messages or change system prompt |
| `before_provider_request` | Handlers chain; each can inspect or replace the request payload |
| `after_provider_response` | Handlers chain; receives status + headers |
| `before_provider_headers` | Handlers mutate `event.headers` in place |
| `resources_discover` | All handlers run; paths are accumulated |
| `session_before_*` | Handlers chain; returning `{ cancel: true }` stops the action |
| All others | Handlers run in order; errors are caught and reported |

### Error Handling

If a handler throws an error, Pi catches it, logs it, and continues with the next extension. One extension's error doesn't crash the whole system.

---

## 4. The Full Startup Sequence

When you run `pi`, here's what happens end-to-end for extensions:

```
1. CLI parses arguments (-e, --no-extensions, etc.)
       │
2. DefaultResourceLoader.reload() is called
       │
3. [If project not yet trusted]:
   ├─ Load only user/global + CLI extensions (no project-local)
   ├─ Emit "project_trust" event → extension can answer yes/no
   └─ If trusted: proceed with full load
       │
4. PackageManager.resolve() — resolves npm/git pi packages
       │
5. Extension discovery:
   ├─ Scan .pi/extensions/
   ├─ Scan ~/.pi/agent/extensions/
   ├─ Merge settings.json extension paths
   ├─ Merge package extension paths
   └─ Merge CLI -e paths
       │
6. Extension loading (per file):
   ├─ Check cache (skip if already loaded for this cwd)
   ├─ jiti imports the .ts file
   ├─ Extract default export (factory function)
   ├─ Create ExtensionAPI (registration + stubs)
   ├─ Call factory(api)
   └─ Store in extension list
       │
7. Inline extension factories loaded (SDK)
       │
8. ExtensionRunner created with all extensions
       │
9. Tools, skills, prompts, themes loaded
       │
10. Session starts → "session_start" event emitted to extensions
```

---

## 5. Built-in Extensions

Pi ships with one built-in extension (loaded before any user extensions):

**llama.cpp** — Located at `dist/extensions/llama/`. Registers the `/llama` command for managing local models. It's marked `hidden: true` so it doesn't appear in certain listings.

```javascript
// dist/extensions/index.js
export const builtInExtensions = [
  { name: "llama.cpp", factory: llamaExtension, hidden: true }
];
```

---

## 6. Extension Conflict Detection

Pi detects when two extensions register the same:
- **Tool name** — first registration wins, later ones get a warning
- **Flag name** — first registration wins, later ones get a warning
- **Command name** — all are kept, but given numeric suffixes like `/review:1`, `/review:2`
- **Shortcut key** — last registration wins (with a diagnostic message)

Conflicts don't prevent loading — Pi reports them as diagnostics and continues.

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| `dist/core/extensions/loader.js` | Discovery, jiti loading, caching, ExtensionAPI creation |
| `dist/core/extensions/runner.js` | ExtensionRunner: event dispatch, context creation, lifecycle |
| `dist/core/extensions/wrapper.js` | Wraps extension tools into the agent tool format |
| `dist/core/extensions/types.js` | TypeScript type exports and type guard utilities |
| `dist/core/resource-loader.js` | DefaultResourceLoader: orchestrates all resource loading |
| `dist/extensions/index.js` | Built-in extensions registry |
| `dist/core/source-info.js` | Metadata tracking (where each resource came from) |

---

## Next

**Topic 2: Event Lifecycle** — Now that we know how extensions are loaded, we need to understand the 32 events they can hook into. This covers the full lifecycle from startup through the agent loop to shutdown.
