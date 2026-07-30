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

The `@mjakl/pi-subagent` package IS already installed at:
`/home/pmpmt/.pi/agent/npm/node_modules/@mjakl/pi-subagent/`

It provides this tool. The orchestrator can already delegate.

---

## How sub-agents work (from reading the source)

### 1. Agents are `.md` files — not TypeScript, not extensions

```markdown
---
name: explorer
description: Read-only codebase exploration specialist
tools: read, grep, find, ls
model: deepseek-chat        ← optional
thinking: low               ← optional
---

You are a codebase exploration specialist. Your job is...
```

**Discovery locations:**

| Location | Scope | Source label |
|---|---|---|
| `~/.pi/agent/agents/*.md` | User (all projects) | `"user"` |
| `.pi/agents/*.md` (walked up from cwd) | Project (one repo) | `"project"` |

If no agents exist, a starter `explorer.md` is auto-created. Precedence: project overrides user (same name → project wins).

### 2. The conveyor belt — how the `subagent` tool runs

```
Orchestrator AI calls subagent tool
        │
        ▼
index.ts: validate request
  ├─ Is the agent name known?
  ├─ Are we at max depth? (default 3)
  ├─ Cycle check: is this agent already in the delegation stack?
  └─ Project agents: confirm with user (ctx.ui.confirm)
        │
        ▼
runner.ts: spawn isolated pi process
  pi --mode json -p "Task: ..." [--no-session | --session fork.jsonl]
        │
        ▼
Child agent writes JSON events to stdout (one per line)
        │
        ▼
runner-events.js: parses each line, tracks messages & token usage
  → emits progress updates to parent via onUpdate callback
        │
        ▼
Child finishes → exit code + output returned to orchestrator AI
```

### 3. The two context modes

| Mode | CLI flag | What the child agent sees | Token cost |
|---|---|---|---|
| **spawn** | `--no-session` | Only the task prompt. Blank slate. | Lower |
| **fork** | `--session fork.jsonl` | Current session context + task prompt | Higher |

### 4. Safety rails (all env-var based)

| Guard | Env var | Default | What happens |
|---|---|---|---|
| Depth limit | `PI_SUBAGENT_DEPTH` increments, `PI_SUBAGENT_MAX_DEPTH` caps | max=3 | "You are at max depth" — blocked |
| Cycle prevention | `PI_SUBAGENT_STACK` JSON array of ancestor names | enabled | "Requested agent already in stack" — blocked |
| Project agent confirm | (runtime `ctx.ui.confirm`) | true | Popup: "Run project-local agents?" |

### 5. Parallel execution

Single `{ agent, task }` vs parallel `{ tasks: [{agent, task}, ...] }`:
- Max 8 tasks total, 4 concurrent
- Progress updates every second while running
- Final summary: "3/4 succeeded"

### 6. Key APIs used (what we can learn)

| API | Where | What it does |
|---|---|---|
| `pi.registerTool({...})` | `index.ts` | Registers the `subagent` tool the AI can call |
| `pi.registerFlag(...)` | `index.ts` | Adds `--subagent-max-depth` and `--subagent-prevent-cycles` CLI flags |
| `pi.on("session_start", ...)` | `index.ts` | Discovers agents on startup, shows notification |
| `pi.on("before_agent_start", ...)` | `index.ts` | Injects agent list into system prompt |
| `ctx.ui.confirm(...)` | `index.ts` | Asks user before running project agents |
| `ctx.sessionManager` | `index.ts` | Gets session snapshot for fork mode |
| `child_process.spawn(...)` | `runner.ts` | Actually spawns the child pi process |
| `parseFrontmatter(...)` | `agents.ts` | Parses YAML frontmatter from agent .md files |
| `pi.exec(...)` | (not used here, but in `git-commit.ts`) | Simpler alternative to spawn for one-shot commands |

---

## Our hands-on examples

### `registerTool` — calculator-tool.ts

We built a calculator tool to learn the API:

```typescript
pi.registerTool({
  name: "calculator",
  description: "Evaluate a mathematical expression...",
  parameters: Type.Object({
    expression: Type.String({ description: "e.g. '2 + 3 * 4'" }),
  }),
  async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
    const result = eval(sanitize(params.expression));
    return { content: [{ type: "text", text: String(result) }] };
  },
});
```

**Key parts:**
- `name` → identifier the AI uses
- `description` → tells AI when to call it
- `parameters` → TypeBox schema (the AI must provide matching args)
- `execute` → returns `{ content: [...] }`

### `pi.exec()` — git-commit.ts

Run shell commands from extensions. Simpler than `child_process.spawn` — only for one-shot commands (no streaming):

```typescript
const result = await pi.exec("git", ["add", "-A"], { cwd: ctx.cwd });
// result.stdout, result.stderr, result.code, result.killed
```

The subagent package uses `child_process.spawn` instead because it needs streaming stdout (line-by-line JSON events from the child pi process).

### `registerCommand()` — save-memory-command.ts

Add a slash command the user invokes:

```typescript
pi.registerCommand("save-memory", {
  description: "Save a summary of the current session",
  handler: async (args, ctx) => { ... },  // ctx is ExtensionCommandContext
});
```

---

## Existing agents

### User agents (`~/.pi/agent/agents/`)

| Agent | File | Tools | Model | Purpose |
|---|---|---|---|---|
| `frontend` | `frontend.md` | read, write, edit, bash | deepseek-v4-flash | Website HTML/CSS/JS work |
| `researcher` | `researcher.md` | read, grep, find, ls | deepseek-chat | Web research & fact-checking |

### Agent file format

```markdown
---
name: agent-name
description: What this agent does
tools: read, grep, find       ← optional, comma-separated
model: deepseek-chat          ← optional
thinking: low                 ← optional
---

The system prompt body — instructions for this agent.
```

---

## Tutoring plan

| Step | What we'll do | Status |
|---|---|---|
| 1 | Find your existing agents | ✅ frontend + researcher |
| 2 | Read and understand an agent `.md` file | ✅ frontend.md analyzed |
| 3 | Create a new agent `.md` file and test it | ✅ researcher.md created & tested |
| 4 | Trace a delegation in events.log | (skipped — no orchestrator log available) |
| 5 | Understand `registerTool` by building one | ✅ calculator-tool.ts |
| 6 | Understand `pi.exec()` vs `spawn` | ✅ git-commit.ts example |

*(This document will grow as we explore sub-agents.)*
