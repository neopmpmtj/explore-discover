# 05 — Session Management

## What sessions are

Every Pi conversation is saved as a **JSONL file** (one JSON object per line). Each line is an "entry" — a message, tool result, or event. Entries link together via `id` / `parentId`, forming a **tree**.

## Where they live

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

Our explore-discover sessions live at:
```
/home/pmpmt/.pi/explore-discover/sessions/--home-pmpmt-.pi-explore-discover--/
```

## Session file structure

### Header (first line)

```json
{
  "type": "session",
  "version": 3,
  "id": "019fae85-3bb2-...",
  "timestamp": "2026-07-29T15:36:34.994Z",
  "cwd": "/home/pmpmt/.pi/explore-discover"
}
```

### Entry types

| Type | What it is | Has `message`? |
|---|---|---|
| `message` | A user/assistant/toolResult message | ✅ |
| `modelSelect` | Model change | ❌ |
| `thinkingLevelSelect` | Thinking level change | ❌ |
| `label` | Named bookmark in the tree | ❌ |
| `compaction` | Conversation was squished here | ❌ |
| `branchSummary` | Summary of an abandoned branch | ❌ |
| `extension` | Custom extension entry | ❌ |

### Tree structure — every entry links to its parent

```
id          parentId    type            role
──────────────────────────────────────────────
019fae85    (root)      session         -
24f0a1b2    019fae85    message         user
ef0c8d3e    24f0a1b2    message         assistant
6a4b5f10    ef0c8d3e    message         toolResult
...
```

This is the SAME data we saw earlier when reading the JSONL during our session-memory discussion!

## Branching

Pi doesn't just save linear conversations. When you use `/tree` to go back to an earlier message and continue from there, Pi creates a new `message` entry whose `parentId` points to the OLD message — not the most recent one. This creates a branch:

```
user: "try approach A"
  └─ assistant: "here's A"
       ├─ user: "now try B"     ← branch 1
       │   └─ assistant: "here's B"
       └─ user: "actually, C"   ← branch 2 (forked from assistant, not from B)
            └─ assistant: "here's C"
```

Same file, two branches. The "leaf" (current position) determines which branch is active.

## Why this matters for your memory system

Your `session-memory.ts` calls `manager.buildSessionContext().messages` — this gets the **current branch** only, not the full tree. That's correct for capturing context.

But for a future vector database, you might want:
- The FULL tree (all branches) — richer retrieval
- The compaction entries — to know what got summarized
- Labels — named bookmarks you set with `/tree` + Shift+L

## How we already use sessions

| Component | What it does with sessions |
|---|---|
| `session-memory.ts` | Reads `sessionFile` + `buildSessionContext()` → saves JSON |
| `summarize.mjs` | Reads the JSON → creates `.summary.md` |
| `event-logger.ts` | Doesn't touch sessions directly — observes the pipeline |

## 🔜 Tutoring Plan

1. Walk through a real session file — see every entry type
2. Understand branching — create a branch with `/tree`, observe it in the file
3. Compaction — what happens when conversations get too long
4. How our memory system connects to Pi's session format
5. (Optional) Build an extension that queries session files directly

---

## Real session file analysis

We examined the actual session file at:
`/home/pmpmt/.pi/explore-discover/sessions/--home-pmpmt-.pi-explore-discover--/2026-07-27T13-57-46-914Z_019fa3de-0f22-757a-9ff3-571cd9cf39c0.jsonl`

**Entry type distribution (1050+ messages):**

| Type | Count | What it is |
|---|---|---|
| `message` | 1050 | User, assistant, and toolResult messages (the conversation) |
| `thinking_level_change` | 13 | Thinking level was toggled during the session |
| `session_info` | 3 | Session name was changed |
| `custom` | 2 | Custom extension entries |
| `compaction` | 1 | Conversation was compressed at ~160K tokens |
| `model_change` | 1 | Model was switched |
| `session` | 1 | Header |

**Compaction entry details:**
- Triggered at **160,500 tokens** — conversation grew too large
- Pi called the AI to generate a structured summary (Goals, Progress, Key Decisions, Next Steps)
- The compaction entry replaces ALL messages before it — the AI only sees the summary + new messages
- Contains `firstKeptEntryId` — where the new branch starts
- Contains `details.readFiles` and `details.modifiedFiles` — files relevant to the old context
- Cost: 0.05 cents for the summarization

This is Pi's **automatic version** of our `summarize.mjs` — but fired internally when needed.

## Session tree navigation

| Command | What it does | Creates new file? |
|---|---|---|
| `/tree` | Open visual tree navigator, jump to any point | No (same file, new branch) |
| `/fork` | Start new session from an earlier message | Yes |
| `/clone` | Duplicate current active branch to new session | Yes |
| `/new` | Start fresh session | Yes |

## Connection to our memory pipeline

```
Pi's native session format (JSONL tree)
        │
        ├─→ session-memory.ts: reads buildSessionContext()
        │   (current branch only) → saves JSON → session-summaries/
        │
        ├─→ summarize.mjs: reads saved JSON
        │   → AI summary → sessions-memory/*.summary.md
        │
        └─→ Pi's compaction: auto-fires at ~160K tokens
            Creates summary of old messages, AI sees summary only
```

**Key insight:** Our `session-memory.ts` and `summarize.mjs` are a MANUAL version
of what Pi does automatically with compaction. The difference: our system saves
the FULL context (not just the summary), which is better for future vector database retrieval.
