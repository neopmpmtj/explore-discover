# 08 — Provider Architecture

## What it is

Pi uses a separate package called **`pi-ai`** to communicate with AI providers. This package handles:

```
Your extension/agent
        │
        ▼
    pi-ai (Provider layer)
   ┌──────────────────────────────┐
   │ • Auth (API keys, OAuth)     │
   │ • Model discovery & catalog  │
   │ • HTTP requests & streaming  │
   │ • Token counting & cost      │
   │ • 30+ built-in providers     │
   └──────────────────────────────┘
        │
        ▼
   DeepSeek / OpenAI / Anthropic / etc.
```

The key insight: every AI call (your chat, sub-agents, compaction summaries) flows through `pi-ai`.

## What's built-in

30+ providers are pre-configured. Each provider has:
- An ID (e.g., `"deepseek"`, `"openai"`, `"anthropic"`)
- A list of supported models with capabilities and pricing
- Auth handling (API key, OAuth, subscription login)
- API format (`openai-completions`, `anthropic-messages`, etc.)

Source: `/home/pmpmt/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/providers/`

## How to customize

### `pi.registerProvider()` — Add or override providers

Three use cases:

**1. Add a proxy (most practical):**

```typescript
pi.registerProvider("openai", {
  baseUrl: "https://my-proxy.company.com",  // override endpoint
  apiKey: "$OPENAI_API_KEY",
});
```

**2. Add a completely new provider:**

```typescript
pi.registerProvider("corporate-ai", {
  name: "Corporate AI",
  baseUrl: "https://ai.corp.com",
  api: "openai-completions",
  apiKey: "$CORP_API_KEY",
  models: [
    {
      id: "corp-model-1",
      name: "Corporate Model v1",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    },
  ],
});
```

**3. Register OAuth provider (enterprise):**

```typescript
pi.registerProvider("corporate-ai", {
  baseUrl: "https://ai.corp.com",
  api: "openai-responses",
  models: [...],
  oauth: {
    name: "Corporate SSO",
    async login(callbacks) { /* open browser, get token */ },
    async refreshToken(credentials) { /* refresh before expiry */ },
    getApiKey(credentials) { return credentials.access; },
  },
});
```

### `pi.unregisterProvider(name)` — Remove a provider

Removes all models belonging to that provider.

## Provider config options

| Field | What it does |
|---|---|
| `baseUrl` | API endpoint URL |
| `api` | API format: `"openai-completions"`, `"anthropic-messages"`, `"openai-responses"` |
| `apiKey` | API key (use `$ENV_VAR` for env vars) |
| `name` | Display name in Pi |
| `models` | List of model definitions (id, name, contextWindow, maxTokens, cost, reasoning) |
| `oauth` | OAuth login/refresh/token flow |
| `headers` | Extra HTTP headers |

## Events related to providers

| Event | When it fires |
|---|---|
| `before_provider_request` | Before HTTP call — modify payload (we used in `rate-limiter.ts`) |
| `before_provider_headers` | Before sending headers — add custom headers (`custom-headers.ts`) |
| `after_provider_response` | After response — check status, log timing (`response-logger.ts`) |
| `model_select` | When user switches models |

## 🔜 Tutoring Plan

1. Read the DeepSeek provider source to understand how a provider is built
2. (Optional) Add a local model provider (Ollama/LM Studio) if you ever want offline AI

---

*(This document will grow as we explore providers.)*
