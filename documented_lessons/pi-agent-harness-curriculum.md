# Pi Agent Harness — Curriculum & Learning Course

A step-by-step exploration of Pi's internals. Each module builds on the previous.
Work through them in order, or jump to a topic that interests you.

---

## 📚 Module Index

| # | Module | Document | What you'll learn |
|---|---|---|---|
| 1 | Extension Discovery & Loading | [01-extension-discovery-and-loading.md](01-extension-discovery-and-loading.md) | Where Pi finds extensions, how jiti loads them, factory functions, ExtensionAPI |
| 2 | Commands | [02-commands.md](02-commands.md) | Prompt files vs registered commands, when to use each |
| 3 | System Prompt Composition | [03-system-prompt-composition.md](03-system-prompt-composition.md) | 9 sections, BuildSystemPromptOptions, modifying via extensions |
| 4 | Sub-Agents | [04-sub-agents.md](04-sub-agents.md) | Agent .md files, spawn vs fork, registerTool, pi.exec, depth/cycle guards |
| 5 | Session Management | [05-session-management.md](05-session-management.md) | JSONL format, tree structure, branching, compaction, memory pipeline |
| 6 | TUI Components | [06-tui-components.md](06-tui-components.md) | Overlays, themes, custom components, pi-hud reference |
| 7 | Discovery Events | [07-discovery-events.md](07-discovery-events.md) | project_trust, resources_discover |
| 8 | Provider Architecture | [08-provider-architecture.md](08-provider-architecture.md) | pi-ai package, 30+ providers, registerProvider, proxy setup |
| 9 | Pi Packages | [09-pi-packages.md](09-pi-packages.md) | Bundling extensions for sharing, install, publish |

## 📋 Reference Documents

| Document | What it contains |
|---|---|
| [event-properties-cheatsheet.md](event-properties-cheatsheet.md) | All 32 events, `event.*` properties, `ctx` toolbox, Extension APIs, nested properties |
| [extensions-inventory.md](extensions-inventory.md) | Every extension we built, what it does, which station |
| [event-logger-extension-setup/event-logger-extension-setup.md](event-logger-extension-setup/event-logger-extension-setup.md) | Historical: how we built the first extension |

## 🛠️ Extensions Built (in `/home/pmpmt/.pi/explore-discover/.pi/extensions/`)

See [extensions-inventory.md](extensions-inventory.md) for the full list. All 20+ extensions are live and running.

## 🧠 Memory Pipeline

```
session-memory.ts (auto)        summarize.mjs (manual or /save-memory)
─────────────────────            ─────────────────────────────────────
session-summaries/*.json   →    sessions-memory/*.summary.md
(stable session-ID naming)      (YAML frontmatter, AI-generated)
```

## 📊 Lesson Progress

### Completed ✅

- [x] Extension discovery & loading
- [x] Event lifecycle (32 events catalogued)
- [x] Conveyor belt (all stations covered with extensions)
- [x] System prompt composition (9 sections, 5 extensions modifying it)
- [x] Commands (prompt files + registered commands)
- [x] ctx object (Dashboard, Toolkit, Control Panel, Command-only)
- [x] Sub-agents (agent .md files, registerTool, pi.exec)
- [x] Safety guard (blocking dangerous commands)
- [x] Memory pipeline (capture + summarize)
- [x] Session management (JSONL trees, branching, compaction)
- [x] TUI components (overlays, colors, dashboard panel, pi-hud reference)
- [x] Discovery events (project_trust, resources_discover)
- [x] Provider architecture (pi-ai, 30+ providers, registerProvider)
- [x] Pi packages (bundling, sharing, installing)

### Still to Explore

- [ ] SDK & Programmatic usage (embedding Pi in apps — advanced)

## 📖 How to Use This Course

1. **Start with Module 1** if you're new — it covers how extensions are loaded, which is the foundation
2. **The cheatsheet** is your quick reference — open it alongside any module
3. **The inventory** shows what's built — useful for seeing real examples
4. **Each module** has a "Tutoring Plan" at the end with step-by-step learning
5. **Build as you learn** — every module includes hands-on extension building

## 🔑 Key Concepts Cheat Sheet

| Concept | One-line explanation |
|---|---|
| Conveyor belt | Input → context → provider → tools → output. Extensions sit at stations |
| Mutation pattern | Change `event.*` properties in-place, never `.push()` duplicates |
| Blocking pattern | Return `{ block: true, reason: "..." }` to stop an action |
| ctx | The "Pi remote control" — read state, interact with user, control Pi |
| ExtensionAPI | `pi.on()`, `pi.registerCommand()`, `pi.registerTool()`, `pi.exec()` |
| Agent .md | YAML frontmatter + system prompt = a sub-agent |
| JSONL tree | Entries linked by `id`/`parentId`, branches via `/tree` |
| Compaction | Pi auto-summarizes when context exceeds ~160K tokens |
