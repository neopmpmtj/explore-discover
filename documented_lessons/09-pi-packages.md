# 09 — Pi Packages

## What they are

Pi packages are **npm packages** that bundle extensions, skills, prompts, and themes so you can share them — with yourself across agents, with teammates, or with the community.

## How they work

A Pi package is just a regular npm package with one extra ingredient: a `pi` section in `package.json`:

```json
{
  "name": "my-pi-tools",
  "version": "1.0.0",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

The `pi-package` keyword makes it discoverable on [pi.dev/packages](https://pi.dev/packages).

## Convention directories (no manifest needed)

If you skip the `pi` manifest, Pi auto-discovers these folders:

| Directory | What Pi loads |
|---|---|
| `extensions/` | `.ts` and `.js` files |
| `skills/` | Folders with `SKILL.md` + top-level `.md` files |
| `prompts/` | `.md` files |
| `themes/` | `.json` files |

## Installing packages

```bash
pi install npm:@scope/package@1.0.0    # from npm
pi install git:github.com/user/repo     # from git
pi install /path/to/local/package       # from local folder
pi remove npm:@scope/package            # uninstall
pi list                                 # show installed
pi --extension npm:@scope/package       # try once (no install)
```

## Dependencies

| Dependency type | Where to declare |
|---|---|
| Pi core (`pi-ai`, `pi-tui`, `typebox`) | `peerDependencies` — don't bundle |
| Other Pi packages (bundled) | `dependencies` + `bundledDependencies` |
| Regular npm packages | `dependencies` |

## Practical example: our extensions as a package

Our `.pi/extensions/` folder could be published as:

```
my-pi-extensions/
├── package.json          ← with pi.extensions pointing to ./extensions
├── extensions/
│   ├── safety-guard.ts
│   ├── secret-scrubber.ts
│   ├── text-shortcuts.ts
│   ├── calculator-tool.ts
│   └── ... (20 extensions)
├── prompts/
│   └── document.md
└── README.md
```

Then installed on any agent: `pi install /path/to/my-pi-extensions`

## When to use packages

| Use case | Package helps? |
|---|---|
| Share extensions with your son | ✅ One install, not manual copy |
| Use same extensions across agents | ✅ Install once globally |
| Publish to community | ✅ npm publish |
| Single user, single agent | ❌ Overkill — just use `.pi/extensions/` |
| Learning/experimenting | ❌ Keep extensions project-local |

## Reference

Source: `/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`

Real-world examples we've seen:
- `@mjakl/pi-subagent` — sub-agent delegation
- `pi-agent-browser-native` — web search + browser automation
- `pi-hud` — persistent HUD overlay
