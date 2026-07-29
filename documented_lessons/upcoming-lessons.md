# Upcoming Lesson Ideas

## Completed ✅

### 1. Blocking dangerous commands (rm -rf)
- **Built:** `safety-guard.ts` — uses `tool_call` + `user_bash` events
- Pattern: `{ block: true, reason: "..." }` for AI calls, fake error result for user `!` commands
- Covers: `rm -rf`, `sudo`, `mkfs`, `dd`, fork bombs, raw disk writes, `chmod /etc`

### 2. Cancelling & modifying events
- **Learned:** `tool_call` blocking pattern, `input` mutation pattern, `context` mutation pattern
- All follow the same rule: mutate `event.*` properties in-place, never `.push()` duplicates

### 3. Phase 2: Session Summaries
- **Built:** standalone summarizer at `session-summarizer/summarize.mjs`
- Output: `sessions-memory/*.summary.md` with YAML frontmatter
- 5 providers supported (DeepSeek default for cost), 17 unit tests, all passing

### 4. Full conveyor belt coverage — all stations built

| Station | Extension | What it does |
|---|---|---|
| `input` | `text-shortcuts.ts` | `::fix`, `::explain`, etc. — expand shortcuts |
| `input` | `git-diff-shortcut.ts` | `::diff` — inject git diff context |
| `before_agent_start` | `date-injector.ts` | Injects today's date into system prompt |
| `context` | `event-logger.ts` | Observes message stack |
| `before_provider_request` | `rate-limiter.ts` | Spaces API calls 500ms apart |
| `before_provider_headers` | `custom-headers.ts` | Adds `X-Pi-App` tracking headers |
| `after_provider_response` | `response-logger.ts` | Logs response time + status |
| `tool_call` | `safety-guard.ts` | Blocks dangerous bash commands |
| `tool_result` | `secret-scrubber.ts` | Redacts API keys from tool output |
| Turn/message events | `observability/index.ts` | Tracks tokens, cost, failures per run |
| Session events | `session-memory.ts` | Captures conversations on exit |
| — | `event-logger.ts` | Shows the full pipeline in events.log |

### 5. Supporting tools
- `event-properties-cheatsheet.md` — all 32 events documented
- `session-summarizer/` — standalone AI summarizer with config and tests
- `session-memory.ts` — Phase 1 data capture (Phase 2 handled by summarizer)

---

## Still to explore

### 1. Sub-agents (spawned agents)
Pi can spawn child agents for parallel work. Events: `sub_agent_start`, `sub_agent_end`. Use case: run tests while AI continues working.

### 2. Discovery events
`file_watched_changed`, `git_branch_changed` — react to filesystem/Git changes in real time.

### 3. TUI components
Building custom UI panels inside Pi (beyond notifications). See `docs/tui.md`.

### 4. Custom commands (!)
Creating new slash commands that users can invoke — not just shortcuts, but commands with custom dialogs.

### 5. Deep dive: system prompt composition
How Pi builds the 8-section system prompt. Could an extension inject or modify sections?

### 6. Understanding `ctx` — the context object
Available in every handler. It has `sessionManager`, `ui`, `cwd`, `extensions`, and more. We've used it but never explored it systematically.
