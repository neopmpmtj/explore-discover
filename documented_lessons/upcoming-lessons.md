# Upcoming Lesson Ideas

## 1. Actionable Events (Cancel & Modify)
After we finish the event discovery walkthrough: test `session_before_switch` as a "cancel" example — subscribe, return `{ cancel: true }`, and observe that `/new`, `/resume`, etc. get blocked. Then try a "modify" event like `input` where we can transform user text.

### Key concept: "Cancel" is a safety gate, not a roadblock
When a user types `/new`, it's deliberate. Cancelling isn't about questioning the user's intent — it's about letting extensions step in and say "Hold on, let me check something first." Uses: unsaved-work warnings, pre-cleanup, blocking dangerous operations until conditions are met.

## 2. Blocking dangerous commands (rm -rf)
Use `tool_call` event to intercept bash commands. When `event.toolName === "bash"` and the command contains `rm -rf`, block execution and warn the user. This is the same "cancel" pattern — return `{ block: true }` to stop the tool from running.

## 3. Phase 2: LLM-Powered Session Summaries

### Status
Phase 1 is deployed: `session-memory.ts` captures raw messages + summary prompt to `session-summaries/` on `/new`, `/fork`, and `quit`.

### What Phase 2 needs to do
Replace the static `SUMMARY_PROMPT` in `session-memory.ts` with actual LLM calls. Steps:

1. **Import the pi-ai package** to access provider/Model APIs
2. **Call the LLM** inside each event handler, sending the collected messages + summary prompt
3. **Save the LLM's response** as the summary, replacing the raw messages (or alongside them)
4. **Handle edge cases**: timeout during shutdown, API errors, empty sessions

### Files
- Extension: `.pi/extensions/session-memory.ts`
- Output: `session-summaries/`
- Related: upcoming-lessons.md (this file)

### Notes for next session
- API keys are in `.env` (check Pi source for exact location)
- The `ctx.model` available in event handlers may work for making the LLM call — investigate this approach first
- If calling AI during `session_shutdown` is unreliable, consider writing a command handler that the user runs manually to summarize the current session
