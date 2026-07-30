# Extensions Inventory

Quick reference for what's built and where. New session? Start here.

## Extensions (`.pi/extensions/`)

| File | Station | Purpose | Key pattern |
|---|---|---|---|
| `event-logger.ts` | 10 stations | Pipeline observer → `.pi/events.log` | `appendFileSync` logging |
| `event-logger.ts.old` | — | Previous version (kept for reference) | — |
| `session-memory.ts` | session events | Capture conversations on `/new`, `/fork`, `quit` | `ctx.sessionManager` |
| `safety-guard.ts` | `tool_call` + `user_bash` | Block dangerous commands (`rm -rf`, etc.) | `{ block: true }` / fake result |
| `secret-scrubber.ts` | `tool_result` | Redact API keys from tool output | `event.content` mutation |
| `text-shortcuts.ts` | `input` | `::fix`, `::explain`, etc. | `event.text` mutation |
| `git-diff-shortcut.ts` | `input` | `::diff` — inject git diff | `execSync("git diff")` |
| `rate-limiter.ts` | `before_provider_request` | 500ms spacing between API calls | `setTimeout` delay |
| `custom-headers.ts` | `before_provider_headers` | Add `X-Pi-App` tracking header | `event.headers` mutation |
| `response-logger.ts` | `after_provider_response` | Log response time + status | Pair with `before_provider_request` |
| `date-injector.ts` | `before_agent_start` | Inject today's date | `event.systemPrompt` mutation |
| `persona-injector.ts` | `before_agent_start` | Add "user is HS student" persona | `appendSystemPrompt` |
| `custom-guideline.ts` | `before_agent_start` | Add emoji-summary guideline | `promptGuidelines` |
| `readonly-mode.ts` | `before_agent_start` | Remove edit/write when PI_READONLY=1 | `selectedTools.filter()` |
| `readme-injector.ts` | `before_agent_start` | Auto-load README as context | `contextFiles.push()` |
| `calculator-tool.ts` | `registerTool` | AI can call calculator for math | `pi.registerTool()` |
| `interactive-guard.ts` | `tool_call` + `user_bash` | Ask yes/no before dangerous commands | `ctx.ui.confirm()` |
| `save-memory-command.ts` | `registerCommand` | `/save-memory` slash command | `pi.registerCommand()` |
| `observability/index.ts` | turn/message events | Token/cost/failure tracking → JSONL | Structured run records |
| `agent-browser.js` (+ `lib/`) | `registerTool` | `web_search` + `agent_browser` tools | Copied from pi-agent-browser-native |

## Supporting tools

| Path | What |
|---|---|
| `session-summarizer/summarize.mjs` | AI-powered session summarizer (DeepSeek default) |
| `session-summarizer/summarizer-config.json` | 5 provider configs |
| `session-summarizer/tests/summarize.test.mjs` | 17 unit tests |
| `prompts/document.md` | `/document` prompt template |

## Key docs

| File | Purpose |
|---|---|
| `documented_lessons/upcoming-lessons.md` | What's done + what's next |
| `documented_lessons/event-properties-cheatsheet.md` | All 32 events + ctx toolbox + Extension APIs + nested properties |
| `documented_lessons/01-extension-discovery-and-loading.md` | How Pi loads extensions |
| `documented_lessons/02-commands.md` | Prompt files vs registered commands |
| `documented_lessons/03-system-prompt-composition.md` | 9 sections, BuildSystemPromptOptions, all extensions |
| `documented_lessons/04-sub-agents.md` | How sub-agents work, agent .md format, registerTool, pi.exec |
| `documented_lessons/05-session-management.md` | JSONL format, tree structure, branching, compaction |
| `documented_lessons/extensions-inventory.md` | This file |
| `AGENTS.md` | Project instructions for Pi |

## Agents (`~/.pi/agent/agents/`)

| File | Tools | Model | Purpose |
|---|---|---|---|
| `frontend.md` | read, write, edit, bash | deepseek-v4-flash | Website HTML/CSS/JS |
| `researcher.md` | read, grep, find, ls | deepseek-chat | Web research & fact-checking |

## Conveyor belt (event order)

```
input → before_agent_start → turn_start → message_start/end
→ context → before_provider_headers → before_provider_request
→ after_provider_response → message_start/end
→ tool_call → tool_result → turn_end
→ (repeat if more turns)
```

Session events wrap the entire session: `session_start`, `session_before_switch`, `session_shutdown`, etc.
