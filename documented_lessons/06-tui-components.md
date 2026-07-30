# 06 — TUI Components

## What they are

Extensions can render **custom UI inside Pi's terminal**. Beyond popups (`ctx.ui.notify()`) and dialogs (`ctx.ui.confirm()`), you can build:
- Custom panels, sidebars, overlays
- Color-coded message rendering
- Interactive selectors, inputs, custom displays

## Source

All components come from the `@earendil-works/pi-tui` package, included in Pi's installation:
`/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui/`

Documentation: `/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`

## Core concept: the Component interface

Every TUI element implements this interface:

```typescript
interface Component {
  render(width: number): string[];  // Return lines (each ≤ width)
  handleInput?(data: string): void;  // Receive keyboard input
  wantsKeyRelease?: boolean;        // Kitty keyboard protocol
  invalidate(): void;               // Clear render cache
}
```

You `render()` your component line-by-line. Pi calls `handleInput()` for keyboard events.

## Built-in components

Import from `@earendil-works/pi-tui`:

| Component | What it does |
|---|---|
| `Text(content, padX, padY, bgFn?)` | Multi-line text with wrapping |
| `Box(padX, padY, bgFn)` | Container with padding & background |
| `Container()` | Groups children vertically |
| `Spacer(lines)` | Empty vertical space |
| `Markdown(text, padX, padY, theme)` | Renders markdown with syntax highlighting |
| `Image(base64, mimeType, theme, opts)` | Renders images (Kitty/iTerm2 terminals) |

## Using custom components: `ctx.ui.custom()`

Create interactive components within extensions or tools:

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) =>
    new MyComponent({
      theme,
      keybindings,
      onChange: () => tui.requestRender(),
      onSelect: (value) => done(value),
      onCancel: () => done(null),
    })
);
```

**Parameters:**
- `tui` — the TUI instance (for `requestRender()`)
- `theme` — current theme (colors, styles)
- `keybindings` — registered keybindings
- `done(value)` — call to close the component and return a result

## Overlays

Render on top of existing content:

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new SidePanel({ onClose: done }),
  { overlay: true }
);
```

Positioning: anchor (`"top-left"` through `"center"`), offset, margin, responsive visibility.

## Registering custom renderers

### Message renderer — customize how messages look

```typescript
pi.registerMessageRenderer("myCustomType", (message, options, theme) => {
  // Return a Component that renders the message
  return new Box(1, 1, theme.bg("infoBg"))
    .addChild(new Text(`[${message.customType}] ${message.display}`, 0, 0));
});
```

### Entry renderer — customize session entries in /tree

```typescript
pi.registerEntryRenderer("myCustomType", (entry, options, theme) => {
  return new Text(`📌 ${entry.metadata.summary}`, 0, 0);
});
```

## Styles and themes

Access the current theme via the second argument in `ctx.ui.custom()`:

```typescript
const result = await ctx.ui.custom((tui, theme, keybindings, done) => {
  const coloredText = theme.fg("success", "Task completed!");
  return new Text(coloredText, 1, 1);
});
```

**Available foreground colors (`theme.fg`):**

| Category | Colors |
|---|---|
| General | `"text"`, `"accent"`, `"muted"`, `"dim"` |
| Semantic | `"success"` (green), `"error"` (red), `"warning"` (yellow) |
| Messages | `"userMessageText"`, `"customMessageText"`, `"customMessageLabel"` |
| Tools | `"toolTitle"`, `"toolOutput"` |
| Syntax | `"syntaxComment"`, `"syntaxKeyword"`, `"syntaxString"`, `"syntaxNumber"`, etc. |
| Thinking | `"thinkingOff"`, `"thinkingLow"`, `"thinkingMedium"`, `"thinkingHigh"` |
| Diff | `"toolDiffAdded"`, `"toolDiffRemoved"`, `"toolDiffContext"` |

**Available background colors (`theme.bg`):**

| Color | Where used |
|---|---|
| `"selectedBg"` | Selected items |
| `"userMessageBg"` | User messages |
| `"customMessageBg"` | Custom entries |
| `"toolPendingBg"` | Tool in progress |
| `"toolSuccessBg"` | Tool succeeded |
| `"toolErrorBg"` | Tool failed |

Usage: `theme.bg("toolPendingBg", theme.fg("accent", "Working..."))`

---

## What we built

### `/dashboard` — Extension health overlay

`/home/pmpmt/.pi/explore-discover/.pi/extensions/dashboard-command.ts`

Opens an overlay panel listing all extensions (active/suppressed) and memory pipeline status. Uses `Container`, `Text`, `Spacer`, `Box`, `theme.fg()`, `theme.bg()`, and `ctx.ui.custom({ overlay: true })`.

### Reference: `pi-hud` package (v0.9.5)

A real-world example of advanced TUI customization:
- Repository: `https://github.com/ludevdot/pi-hud`
- Persistent right-side overlay or footer mode
- Uses `ctx.ui.custom({ overlay, overlayOptions: { anchor, width, margin } })` with `OverlayHandle`
- Live refresh with `setInterval(() => tui.requestRender(), 1000)`
- Keyboard shortcuts: `pi.registerShortcut()` for hide/show, overlay↔footer
- Commands: `/hud`, `/hud-mode`, `/hud-settings`

Install: `pi install npm:pi-hud`

---

## 🔜 Tutoring Plan

1. Read the full docs at `docs/tui.md`
2. Build a custom message renderer — color-code messages by role
3. (Optional) Build an overlay panel
4. (Optional) Register a custom entry renderer for our session-memory entries

---

*(This document will grow as we explore TUI components.)*
