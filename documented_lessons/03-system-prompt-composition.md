# 03 — System Prompt Composition

## What is the system prompt?

The system prompt is the **hidden instruction message** Pi sends to the AI before every conversation. You never see it — but the AI reads it first, and it shapes everything the AI does.

Pi builds it fresh every time an agent starts, using the `buildSystemPrompt()` function at:
`/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/system-prompt.js`.

---

## The 9 sections

Assembled in this exact order:

```
┌─────────────────────────────────────────────────────┐
│ 1. IDENTITY                                         │
│    "You are an expert coding assistant operating    │
│     inside pi, a coding agent harness..."           │
│    ← Hardcoded, never changes                       │
├─────────────────────────────────────────────────────┤
│ 2. AVAILABLE TOOLS                                  │
│    "- read: Read file contents"                     │
│    "- bash: Execute bash commands"                  │
│    ← Generated from selectedTools + toolSnippets    │
│    ← Custom tools from extensions appear here       │
├─────────────────────────────────────────────────────┤
│ 3. CUSTOM TOOLS NOTE                                │
│    "In addition to the tools above, you may have    │
│     access to other custom tools..."                │
│    ← Hardcoded bridge sentence                      │
├─────────────────────────────────────────────────────┤
│ 4. GUIDELINES                                       │
│    "- Use bash for file operations like ls, rg..."  │
│    "- Be concise in your responses"                 │
│    "- Show file paths clearly..."                   │
│    ← Defaults (hardcoded) + project-specific extras │
├─────────────────────────────────────────────────────┤
│ 5. PI DOCUMENTATION                                 │
│    "Pi documentation (read only when the user asks  │
│     about pi itself...):"                           │
│    "- Main documentation: /path/to/README.md"       │
│    "- Additional docs: /path/to/docs"               │
│    ← Paths resolved from Pi's install location      │
├─────────────────────────────────────────────────────┤
│ 6. APPEND SECTION (optional)                        │
│    From --append-system-prompt CLI flag or config   │
│    ← Usually empty in interactive mode              │
├─────────────────────────────────────────────────────┤
│ 7. PROJECT CONTEXT                                  │
│    <project_context>                                │
│      <project_instructions path="AGENTS.md">        │
│        ...your project instructions...              │
│      </project_instructions>                        │
│    </project_context>                               │
│    ← From project .pi/AGENTS.md and ~/.pi/AGENTS.md │
├─────────────────────────────────────────────────────┤
│ 8. SKILLS (optional)                                │
│    If the project has skills configured             │
│    ← Shows available skill names                    │
├─────────────────────────────────────────────────────┤
│ 9. WORKING DIRECTORY                                │
│    "Current working directory: /home/pmpmt/..."     │
│    ← Always last line                               │
└─────────────────────────────────────────────────────┘
```

---

## Where the guidelines come from

The guidelines are **hardcoded** at `/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/system-prompt.js`:

```javascript
// Always included:
addGuideline("Be concise in your responses");
addGuideline("Show file paths clearly when working with files");

// Conditional (only if bash is available but grep/find/ls aren't):
addGuideline("Use bash for file operations like ls, rg, find");
```

Plus whatever is passed in `options.promptGuidelines` from the caller (usually from the project's AGENTS.md or CLI flags).

---

## How to interact with the system prompt

### Method 1: Modify at `before_agent_start` (string level)

Our `date-injector.ts` uses this. You get the **full built string** and can prepend/append/replace:

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  // event.systemPrompt is the FULL string — all 9 sections assembled
  event.systemPrompt = "Note: today is Tuesday.\n" + event.systemPrompt;
});
```

**Pros:** Simple, works on the final product.
**Cons:** Brittle — if Pi's format changes, your string manipulation might break.

### Method 2: Modify via `event.systemPromptOptions` (structured)

The `BuildSystemPromptOptions` object gives you structured access to specific sections:

| Property | Section | What it controls |
|---|---|---|
| `customPrompt` | 1–9 (all) | Replace the ENTIRE prompt with your own |
| `selectedTools` | 2 | Which tools to list (filter, add, or replace) |
| `toolSnippets` | 2 | One-line description per tool (add/remove) |
| `promptGuidelines` | 4 | Extra guideline bullets (push to add) |
| `appendSystemPrompt` | 6 | Text appended after docs, before context |
| `contextFiles` | 7 | Files shown in project context section |
| `skills` | 8 | Skills to advertise to the AI |
| `cwd` | 9 | Working directory (usually leave as-is) |

Full type definition at:
`/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/system-prompt.d.ts`

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  // Add an extra guideline before Pi builds the prompt
  if (event.systemPromptOptions?.promptGuidelines) {
    event.systemPromptOptions.promptGuidelines.push(
      "Always say 'please' and 'thank you'"
    );
  }
});
```

**Pros:** Clean, won't break with format changes.
**Cons:** Can't modify hardcoded sections 1, 3, 5 (identity, custom tools note, docs paths).

### Method 3: Edit `AGENTS.md` (project-level)

The simplest. Whatever you write in `.pi/AGENTS.md` lands in section 7. No code needed.

---

## Extensions we built that modify the system prompt

| Extension | Section | Method | What it does |
|---|---|---|---|
| `date-injector.ts` (`/home/pmpmt/.pi/explore-discover/.pi/extensions/date-injector.ts`) | (top) | String prepend | Adds today's date before section 1 |
| `custom-guideline.ts` (`/home/pmpmt/.pi/explore-discover/.pi/extensions/custom-guideline.ts`) | 4 | `promptGuidelines.push()` | Adds emoji-summary guideline |
| `persona-injector.ts` (`/home/pmpmt/.pi/explore-discover/.pi/extensions/persona-injector.ts`) | 6 | `appendSystemPrompt` | Adds "user is a high school student" persona |
| `readonly-mode.ts` (`/home/pmpmt/.pi/explore-discover/.pi/extensions/readonly-mode.ts`) | 2 | `selectedTools.filter()` | Removes edit/write when `PI_READONLY=1` |
| `readme-injector.ts` (`/home/pmpmt/.pi/explore-discover/.pi/extensions/readme-injector.ts`) | 7 | `contextFiles.push()` | Auto-loads project README as context |
| `AGENTS.md` (`/home/pmpmt/.pi/explore-discover/.pi/AGENTS.md`) | 7 | Static file | Project instructions (Pi auto-loads) |

### Nested properties for `before_agent_start`

Two ways to access the prompt from this event:

| Property | Type | What it is |
|---|---|---|
| `event.systemPrompt` | `string` | The FULL built prompt (all 9 sections) — can prepend, append, or replace |
| `event.systemPromptOptions` | `BuildSystemPromptOptions` | Structured config — modify individual sections |

For the full list of `event.systemPromptOptions` sub-properties, see the cheatsheet:
`/home/pmpmt/.pi/explore-discover/documented_lessons/event-properties-cheatsheet.md` → "Modifiable Nested Properties" section

---

## Key takeaway

The system prompt is the AI's "rulebook." Pi builds it from hardcoded defaults + your project's AGENTS.md + tool lists + guidelines. You can modify it at `before_agent_start` (as a string or via structured options), or simply edit your AGENTS.md for project-level changes.
