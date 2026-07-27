/**
 * session-memory.ts — Phase 2: LLM-Powered Session Summaries
 *
 * Captures session summaries whenever we leave a session via /new, /fork, or quit.
 * Each capture saves all messages AND calls the LLM to generate a smart summary.
 *
 * Phase 1 (done): raw messages + prompt saved to session-summaries/
 * Phase 2 (now): LLM generates the summary automatically
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * session-summaries/ lives at the project root (two levels up from this file)
 */
const SUMMARIES_DIR = join(import.meta.dirname, "..", "..", "session-summaries");

/**
 * DeepSeek API key — read from Pi's secrets file.
 * The .env is at ~/.pi/agent/.env and sourced by the Pi launcher.
 * We try process.env first, then fall back to reading the file directly.
 */
function getApiKey(): string | undefined {
  // Try environment variable first (sourced by Pi wrapper)
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;

  // Fallback: read the .env file directly
  try {
    const homeEnv = join(process.env.HOME || "/home/pmpmt", ".pi", "agent", ".env");
    if (existsSync(homeEnv)) {
      const content = readFileSync(homeEnv, "utf-8");
      const match = content.match(/DEEPSEEK_API_KEY=(.+)/);
      if (match) return match[1].trim();
    }
  } catch {
    // Silently fail — summary will be skipped
  }
  return undefined;
}

function ensureDir() {
  if (!existsSync(SUMMARIES_DIR)) {
    mkdirSync(SUMMARIES_DIR, { recursive: true });
  }
}

const SUMMARY_PROMPT = `You are a session memory archivist. Your task is to create a concise but thorough summary of this Pi coding session. Capture:

1. **Topics discussed**: What was the main subject? What concepts were explored?
2. **Key decisions**: What was decided and why?
3. **Problems solved**: What bugs were fixed or challenges overcome?
4. **Nuances & insights**: "Aha!" moments, metaphors that clicked, important observations.
5. **Files created/modified**: What code was written? What files changed?
6. **Future intentions**: Things the user wants to do later, upcoming ideas.
7. **Teaching moments**: Important clarifications, confusions resolved.

Format your summary in clear, scannable markdown so it can be used as memory recall in future sessions.`;

/**
 * Call the DeepSeek API to generate a summary.
 */
async function generateSummary(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("[session-memory] No API key found, skipping LLM summary");
    return null;
  }

  // Build the conversation for the LLM: the summary prompt as system, then messages
  const chatMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: SUMMARY_PROMPT },
  ];

  // Add the session messages (limit to last 50 to avoid token limits)
  const recentMessages = messages.slice(-50);
  for (const m of recentMessages) {
    chatMessages.push({ role: m.role, content: m.content.slice(0, 2000) });
  }

  // Final instruction
  chatMessages.push({ role: "user", content: "Please summarize the above conversation now." });

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: chatMessages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.log(`[session-memory] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.log(`[session-memory] API call failed: ${err}`);
    return null;
  }
}

/**
 * Save raw messages + summary to a timestamped JSON file.
 * Call generateSummary in the background — don't block the session switch.
 */
async function captureSession(manager: any, reason: string) {
  ensureDir();

  const messages: Array<{ role: string; content: string }> =
    (manager.buildSessionContext().messages ?? []).map((m: any) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

  const sessionFile = manager.getSessionFile() ?? "unknown";
  const sessionName = manager.getSessionName() ?? "unnamed";

  // Timestamp for the filename: YYYY-MM-DD_HH-MM-SS
  const now = new Date();
  const ts = now.toISOString().replace(/T/, "_").replace(/\..+/, "").replace(/:/g, "-");
  const filename = `${ts}_${reason}.json`;
  const filepath = join(SUMMARIES_DIR, filename);

  // Phase 1: save raw data immediately (safe, fast)
  const data = {
    sessionName,
    sessionFile,
    reason,
    capturedAt: now.toISOString(),
    messageCount: messages.length,
    summary: null as string | null,
    messages,
  };

  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`[session-memory] Captured: ${filename}`);

  // Phase 2: generate summary in background, then update the file
  const summary = await generateSummary(messages);
  if (summary) {
    data.summary = summary;
    writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[session-memory] Summary written: ${filename}`);
  }
}

export default function (pi: ExtensionAPI) {
  /**
   * /new — leaving current session for a new one.
   */
  pi.on("session_before_switch", async (event, ctx) => {
    if (event.reason === "new") {
      await captureSession(ctx.sessionManager, "new");
    }
  });

  /**
   * /fork — branching from current session.
   */
  pi.on("session_before_fork", async (event, ctx) => {
    await captureSession(ctx.sessionManager, "fork");
  });

  /**
   * quit — shutting down Pi.
   * Note: API call may not complete in time. The raw messages will still be saved.
   */
  pi.on("session_shutdown", async (event, ctx) => {
    if (event.reason === "quit") {
      await captureSession(ctx.sessionManager, "quit");
    }
  });
}
