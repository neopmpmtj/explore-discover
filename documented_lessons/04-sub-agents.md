# 04 — Sub-Agents

## What Pi says

Pi does **not** have built-in sub-agents. From the README:

> "No sub-agents. There's many ways to do this. Spawn pi instances via tmux, or build your own with extensions, or install a package that does it your way."

From `/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md` (line 2943):

| Example | Description | Key APIs |
|---|---|---|
| `subagent/` | Spawn sub-agents | `registerTool`, `exec` |

## What this means

Sub-agents are a **pattern you build**, not a feature you enable. An extension registers a custom tool (e.g., `subagent`) that spawns a new Pi process with specific instructions. The orchestrator (your global AGENTS.md) delegates to it.

## Your current setup

Your `~/.pi/agent/AGENTS.md` already references a `subagent` tool:

```
Delegation Protocol:
3. Delegate using the subagent tool with the agent name and a clear prompt
```

But this tool doesn't exist yet — it would need to be built as an extension.

## 🔜 Tutoring Plan

1. Understand the `registerTool` API — how extensions add custom tools the AI can call
2. Understand `pi.exec()` — how extensions can run shell commands (including spawning Pi itself)
3. Build a simple `subagent` tool extension
4. Test it: orchestrator → subagent → report back

---

*(This document will grow as we explore sub-agents.)*
