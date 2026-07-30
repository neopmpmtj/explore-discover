# 07 — Discovery Events

## What they are

Two events that fire during Pi's startup sequence. They let extensions control project access and resource loading.

## `project_trust`

Fires when Pi encounters a new project (directory with `.pi/`). Extensions can answer before Pi asks the user.

```typescript
pi.on("project_trust", async (event, ctx) => {
  // event.cwd — the project directory

  // Auto-trust all projects under ~/projects/
  if (event.cwd.startsWith("/home/user/projects/")) {
    return { trusted: "yes", remember: true };
  }

  // Block unknown directories
  return { trusted: "undecided" }; // let Pi ask the user
});
```

**Return values:**

| Value | What happens |
|---|---|
| `{ trusted: "yes" }` | Trust immediately |
| `{ trusted: "no" }` | Block access |
| `{ trusted: "yes", remember: true }` | Trust and save decision |
| `{ trusted: "undecided" }` | Let next handler decide |

## `resources_discover`

Fires after `session_start`. Extensions can contribute additional paths for skills, prompts, and themes without placing files in the standard directories.

```typescript
pi.on("resources_discover", async (event, _ctx) => {
  // event.cwd — current working directory
  // event.reason — "startup" or "reload"

  return {
    skillPaths: ["/path/to/shared/skills"],
    promptPaths: ["/path/to/shared/prompts"],
    themePaths: ["/path/to/shared/themes"],
  };
});
```

**Use case:** Share skills/prompts/themes across multiple projects without copying files.

## Where they fire in startup

```
Pi starts
  ├─ Extensions loaded
  ├─ project_trust        ← decide to trust project?
  ├─ session_start
  ├─ resources_discover   ← extensions contribute resource paths
  └─ Agent ready
```

---

## 🔜 Tutoring Plan

1. Build a `project-trust.ts` extension — auto-trust the explore-discover directory
2. (Optional) Build a shared resources discovery extension

---

*(This document will grow as we explore discovery events.)*
