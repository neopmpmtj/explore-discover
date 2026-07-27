# Upcoming Lesson Ideas

## 1. Actionable Events (Cancel & Modify)
After we finish the event discovery walkthrough: test `session_before_switch` as a "cancel" example — subscribe, return `{ cancel: true }`, and observe that `/new`, `/resume`, etc. get blocked. Then try a "modify" event like `input` where we can transform user text.

### Key concept: "Cancel" is a safety gate, not a roadblock
When a user types `/new`, it's deliberate. Cancelling isn't about questioning the user's intent — it's about letting extensions step in and say "Hold on, let me check something first." Uses: unsaved-work warnings, pre-cleanup, blocking dangerous operations until conditions are met.

## 2. Blocking dangerous commands (rm -rf)
Use `tool_call` event to intercept bash commands. When `event.toolName === "bash"` and the command contains `rm -rf`, block execution and warn the user. This is the same "cancel" pattern — return `{ block: true }` to stop the tool from running.
