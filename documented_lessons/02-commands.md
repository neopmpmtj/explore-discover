# 02 — Commands: Prompt Files vs Registered Commands

## The two faces of `/` commands

Pi has two completely different ways to create slash commands. They look the same to the user but work very differently.

---

## Prompt Files (`prompts/` folder)

**What they are:** Markdown files that Pi auto-discovers. When you type `/document`, Pi takes the file's content and sends it to the AI as if you typed it.

**File:** `prompts/document.md`

```markdown
---
description: Auto-document the most recent fix, implementation, or setup...
---
Review the conversation history of this session. Identify the most recent...
```

**How they work:**
1. Pi scans `prompts/` at startup
2. Shows them in the header: `[Prompts] /document`
3. When invoked, Pi replaces your input with the file's markdown body
4. The AI sees it as your message and responds

**Capabilities:**
- ✅ Simple — just write markdown, no code
- ✅ Portable — copy the `.md` file anywhere
- ✅ Auto-discovered — no configuration needed
- ❌ Can't run code
- ❌ Can't access `ctx` (no session info, no UI popups)
- ❌ Can't call APIs or external tools

**Best for:** Long, reusable AI instructions. Checklists, templates, writing guides.

---

## Registered Commands (`.pi/extensions/` folder)

**What they are:** TypeScript code that calls `pi.registerCommand()`. When you type `/commit` or `/save-memory`, Pi runs your handler function with full access to the system.

**Files:** `save-memory-command.ts`, `git-commit.ts`

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerCommand("save-memory", {
    description: "Save a summary of the current session",
    handler: async (args, ctx) => {
      await ctx.waitForIdle();           // ← command-only feature
      // Run any code: shell commands, API calls, file I/O
      ctx.ui.notify("Summary saved!", "info");  // ← show popups
    },
  });
}
```

**Capabilities:**
- ✅ Can run ANY code
- ✅ Full `ExtensionCommandContext` — `waitForIdle()`, `newSession()`, `fork()`
- ✅ Can call external APIs (our summarizer calls DeepSeek)
- ✅ Can modify files, run shell commands (`pi.exec`)
- ✅ Can show UI popups, confirm dialogs
- ❌ Requires TypeScript knowledge
- ❌ Must handle errors gracefully

**Best for:** Automated actions. Git commits, triggering summarizers, session management.

---

## Comparison

| Feature | Prompt File | Registered Command |
|---|---|---|
| **File type** | `.md` (Markdown) | `.ts` (TypeScript) |
| **Location** | `prompts/` | `.pi/extensions/` |
| **Discovery** | Automatic | Automatic (via extension loading) |
| **Shows in header** | `[Prompts]` | `[Extensions]` (but appears as `/` command) |
| **What it does** | Sends text to AI | Runs handler function |
| **Can run code** | ❌ | ✅ |
| **Can use `ctx`** | ❌ | ✅ (Extended: `waitForIdle()`, etc.) |
| **Can show popups** | ❌ | ✅ (`ctx.ui.notify()`) |
| **Can call APIs** | ❌ | ✅ |
| **Can run shell** | ❌ | ✅ (`pi.exec()`) |

---

## Examples in our project

| Command | Type | What it does |
|---|---|---|
| `/document` | Prompt file | Sends documentation template to AI |
| `/commit` | Registered command | Runs `git add -A && git commit` |
| `/save-memory` | Registered command | Triggers the session summarizer |

---

## A note on event handlers (the third category)

Most of our extensions (`event-logger.ts`, `safety-guard.ts`, etc.) are NOT commands — they're **background workers** that use `pi.on("event", ...)`. They don't appear as slash commands. They run automatically when events fire.
