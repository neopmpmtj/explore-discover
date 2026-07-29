# Event Properties Cheatsheet

Every event handler receives `(event, ctx)`. Here's what's available on `event.*` for each event type.

---

## Session Events

### `session_start`

| Property | Type | Meaning |
|---|---|---|
| `event.reason` | `"startup"` / `"reload"` / `"new"` / `"resume"` / `"fork"` | Why this session started |
| `event.previousSessionFile` | `string` or missing | Path to the old session file (only for "new", "resume", "fork") |

### `session_info_changed`

| Property | Type | Meaning |
|---|---|---|
| `event.name` | `string` or `undefined` | The session's current name (or undefined if cleared) |

### `session_before_switch` (can cancel)

| Property | Type | Meaning |
|---|---|---|
| `event.reason` | `"new"` / `"resume"` | Why a switch is happening |
| `event.targetSessionFile` | `string` or missing | The session file being switched *to* |

### `session_before_fork` (can cancel)

| Property | Type | Meaning |
|---|---|---|
| `event.entryId` | `string` | The ID of the entry we're forking from |
| `event.position` | `"before"` / `"at"` | Whether to fork before or at that entry |

### `session_before_compact` (can cancel)

| Property | Type | Meaning |
|---|---|---|
| `event.preparation` | object | Data about what will be compacted |
| `event.branchEntries` | array | Entries in the branch being compacted |
| `event.customInstructions` | `string` or missing | Optional custom compaction instructions |
| `event.reason` | `"manual"` / `"threshold"` / `"overflow"` | What triggered compaction |
| `event.willRetry` | `boolean` | If true, the aborted turn will retry after compacting |
| `event.signal` | `AbortSignal` | Signal to abort if needed |

### `session_compact`

| Property | Type | Meaning |
|---|---|---|
| `event.compactionEntry` | object | The compaction entry created |
| `event.fromExtension` | `boolean` | Was this triggered by an extension? |
| `event.reason` | `"manual"` / `"threshold"` / `"overflow"` | What triggered it |
| `event.willRetry` | `boolean` | Will the turn retry after this? |

### `session_shutdown`

| Property | Type | Meaning |
|---|---|---|
| `event.reason` | `"quit"` / `"reload"` / `"new"` / `"resume"` / `"fork"` | Why the session is shutting down |
| `event.targetSessionFile` | `string` or missing | Where we're going (if switching to another session) |

### `session_before_tree` (can cancel)

| Property | Type | Meaning |
|---|---|---|
| `event.preparation` | object | Data about the tree navigation (targetId, oldLeafId, entriesToSummarize, etc.) |
| `event.signal` | `AbortSignal` | Signal to abort if needed |

### `session_tree`

| Property | Type | Meaning |
|---|---|---|
| `event.newLeafId` | `string` or `null` | The leaf after navigation |
| `event.oldLeafId` | `string` or `null` | The leaf before navigation |
| `event.summaryEntry` | object or missing | Branch summary entry if one was created |
| `event.fromExtension` | `boolean` or missing | Was this triggered by an extension? |

---

## Provider / LLM Events

### `context`

| Property | Type | Meaning |
|---|---|---|
| `event.messages` | array (mutable) | All messages being sent to the LLM — you can modify these |

### `before_provider_request`

| Property | Type | Meaning |
|---|---|---|
| `event.payload` | `unknown` | The full request payload being sent to the LLM — you can replace it |

### `before_provider_headers`

| Property | Type | Meaning |
|---|---|---|
| `event.headers` | object (mutable) | HTTP headers being sent — mutate in place (set to null to delete) |

### `after_provider_response`

| Property | Type | Meaning |
|---|---|---|
| `event.status` | `number` | HTTP status code from the LLM provider |
| `event.headers` | `Record<string, string>` | Response headers |

---

## Agent Loop Events

### `before_agent_start` (can modify)

| Property | Type | Meaning |
|---|---|---|
| `event.prompt` | `string` | The user's raw prompt (after expansion) |
| `event.images` | array or missing | Attached images, if any |
| `event.systemPrompt` | `string` | The full system prompt being used |
| `event.systemPromptOptions` | object | Structured config used to build the system prompt |

### `agent_start`
*No special properties — just a signal that the agent loop started.*

### `agent_end`

| Property | Type | Meaning |
|---|---|---|
| `event.messages` | array | All messages from this agent run |

### `agent_settled`
*No special properties — fired when the agent has fully settled (no more retries/compactions/queued work).*

---

## Turn Events

### `turn_start`

| Property | Type | Meaning |
|---|---|---|
| `event.turnIndex` | `number` | Which turn this is (0, 1, 2...) |
| `event.timestamp` | `number` | Unix timestamp when the turn started |

### `turn_end`

| Property | Type | Meaning |
|---|---|---|
| `event.turnIndex` | `number` | Which turn just ended |
| `event.message` | object | The assistant's message from this turn |
| `event.toolResults` | array | All tool results from this turn |

---

## Message Events

### `message_start`

| Property | Type | Meaning |
|---|---|---|
| `event.message` | object | The message that just started (user, assistant, or tool result) |

### `message_update`

| Property | Type | Meaning |
|---|---|---|
| `event.message` | object | The current state of the streaming message |
| `event.assistantMessageEvent` | object | Token-by-token update from the provider |

### `message_end` (can replace)

| Property | Type | Meaning |
|---|---|---|
| `event.message` | object | The finalized message — can be replaced via return value |

---

## Tool Execution Events

### `tool_execution_start`

| Property | Type | Meaning |
|---|---|---|
| `event.toolCallId` | `string` | Unique ID for this tool call |
| `event.toolName` | `string` | Name of the tool being called |
| `event.args` | `any` | The arguments passed to the tool |

### `tool_execution_update`

| Property | Type | Meaning |
|---|---|---|
| `event.toolCallId` | `string` | Tool call ID |
| `event.toolName` | `string` | Tool name |
| `event.args` | `any` | Tool arguments |
| `event.partialResult` | `any` | Partial streaming result so far |

### `tool_execution_end`

| Property | Type | Meaning |
|---|---|---|
| `event.toolCallId` | `string` | Tool call ID |
| `event.toolName` | `string` | Tool name |
| `event.result` | `any` | Final result from the tool |
| `event.isError` | `boolean` | Was the result an error? |

---

## Tool Call/Result Events (before/after each tool)

### `tool_call` (can block; args are mutable in place)

| Property | Type | Meaning |
|---|---|---|
| `event.toolName` | `string` | Which tool (e.g., "bash", "read", "edit", or custom name) |
| `event.toolCallId` | `string` | Unique call ID |
| `event.input` | object (mutable) | Tool arguments — mutate in place to modify before execution |

Built-in tool names: `"bash"`, `"read"`, `"edit"`, `"write"`, `"grep"`, `"find"`, `"ls"`

### `tool_result` (can modify)

| Property | Type | Meaning |
|---|---|---|
| `event.toolName` | `string` | Which tool produced this |
| `event.toolCallId` | `string` | Tool call ID |
| `event.input` | object | The arguments that were used |
| `event.content` | array | The result content (text and/or images) |
| `event.isError` | `boolean` | Was it an error? |
| `event.usage` | object or missing | Token usage from the tool, if available |
| `event.details` | varies | Tool-specific details (bash details, edit details, etc.) |

---

## Model & Thinking Events

### `model_select`

| Property | Type | Meaning |
|---|---|---|
| `event.model` | object | The newly selected model |
| `event.previousModel` | object or `undefined` | The model before the switch |
| `event.source` | `"set"` / `"cycle"` / `"restore"` | How the model was chosen |

### `thinking_level_select`

| Property | Type | Meaning |
|---|---|---|
| `event.level` | ThinkingLevel | New thinking level |
| `event.previousLevel` | ThinkingLevel | Previous thinking level |

---

## User Input Events

### `user_bash` (fired when user uses `!command` or `!!command`)

| Property | Type | Meaning |
|---|---|---|
| `event.command` | `string` | The command the user wants to run |
| `event.excludeFromContext` | `boolean` | True if `!!` prefix was used (hidden from LLM) |
| `event.cwd` | `string` | Current working directory |

### `input` (can transform)

| Property | Type | Meaning |
|---|---|---|
| `event.text` | `string` | User's input text |
| `event.images` | array or missing | Attached images, if any |
| `event.source` | `"interactive"` / `"rpc"` / `"extension"` | How the input arrived |
| `event.streamingBehavior` | `"steer"` / `"followUp"` or missing | How it's delivered during streaming |

---

## Discovery Events

### `resources_discover`

| Property | Type | Meaning |
|---|---|---|
| `event.cwd` | `string` | Current working directory |
| `event.reason` | `"startup"` / `"reload"` | Why resources are being discovered |

### `project_trust`

| Property | Type | Meaning |
|---|---|---|
| `event.cwd` | `string` | Current working directory |

---

## The `ctx` Object (available in every handler)

`ctx` stands for **context** — a toolbox Pi hands you when your event fires. Same object, every handler.

### 📊 Dashboard — Read what's happening

| Property | Type | What it tells you |
|---|---|---|
| `ctx.cwd` | `string` | Project folder path |
| `ctx.mode` | `"tui"` \| `"rpc"` \| `"json"` \| `"print"` | How Pi is running |
| `ctx.hasUI` | `boolean` | Can we show popups/dialogs? |
| `ctx.sessionManager` | `ReadonlySessionManager` | Session data (name, file, messages) |
| `ctx.model` | `Model \| undefined` | Which AI model is active |
| `ctx.thinkingLevel` | `ThinkingLevel \| undefined` | How much thinking the AI does |
| `ctx.signal` | `AbortSignal \| undefined` | Is the agent running? (`undefined` = idle) |

### 🧰 Toolkit — Interact with the user

| Method | What it does |
|---|---|
| `ctx.ui.notify(msg, type)` | Show popup (type: `"info"` \| `"warning"` \| `"error"`) |
| `ctx.ui.select(choices)` | Ask user to pick from a list |
| `ctx.ui.confirm(question)` | Yes/no popup |
| `ctx.ui.input(prompt)` | Ask user to type something |

### 🕹️ Control Panel — Tell Pi what to do

| Method | What it does |
|---|---|
| `ctx.isIdle()` | Is the agent done streaming? |
| `ctx.abort()` | Stop the current agent immediately |
| `ctx.shutdown()` | Quit Pi gracefully |
| `ctx.compact(options?)` | Squeeze conversation to save tokens |
| `ctx.getContextUsage()` | Token usage stats (tokens, contextWindow, percent) |
| `ctx.getSystemPrompt()` | What's the current system prompt? |
| `ctx.hasPendingMessages()` | Any messages queued? |
| `ctx.isProjectTrusted()` | Has the user trusted this project? |

### ⭐ Command-only (Extended context)

Only available in slash command handlers, not regular event handlers:

| Method | What it does |
|---|---|
| `ctx.waitForIdle()` | Wait for agent to finish streaming |
| `ctx.newSession(options?)` | Start a new session programmatically |
| `ctx.fork(entryId, options?)` | Fork from a specific message |
| `ctx.navigateTree(targetId, options?)` | Jump to a different point in the tree |
| `ctx.getSystemPromptOptions()` | Get system prompt construction config |

---

> **Tip:** Events marked "(can cancel)" let you return `{ cancel: true }` to stop the action. Events marked "(can modify)" let you return an object to change behavior. Others just let you observe.
