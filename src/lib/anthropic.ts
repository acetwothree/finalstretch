import Anthropic from "@anthropic-ai/sdk";

/**
 * The free scan runs on the cheapest capable model to keep per-user cost near
 * zero; the paid plan + co-pilot use a stronger model.
 * Both are env-overridable.
 */
export const SCAN_MODEL = process.env.FINISHLINE_SCAN_MODEL || "claude-haiku-4-5";
export const PLAN_MODEL =
  process.env.FINISHLINE_PLAN_MODEL || process.env.CLAUDE_MODEL || "claude-sonnet-5";

/**
 * Key resolution. `FINISHLINE_ANTHROPIC_API_KEY` is checked first so a value in
 * `.env.local` wins even when a stale `ANTHROPIC_API_KEY` is exported in the
 * shell (Next.js does not let .env.local override real process env vars).
 */
function resolveKey() {
  return (
    process.env.FINISHLINE_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    ""
  );
}

export const aiEnabled = () => resolveKey().length > 10;

let _client: Anthropic | null = null;
function client() {
  return (_client ??= new Anthropic({ apiKey: resolveKey() }));
}

/**
 * Pull the first balanced JSON value out of a model response, tolerating a
 * markdown fence, a prose preamble, and trailing text.
 */
export function parseJson<T>(text: string): T {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  const start = s.search(/[{[]/);
  if (start === -1) return JSON.parse(s) as T;

  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) {
      end = i;
      break;
    }
  }
  return JSON.parse(s.slice(start, end === -1 ? undefined : end + 1)) as T;
}

export async function askJson<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
}): Promise<T> {
  const model = opts.model ?? PLAN_MODEL;
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  };
  // These calls just need well-formed JSON — turn off adaptive thinking so the
  // whole token budget goes to the answer (and the call is faster + cheaper).
  // Haiku 4.5 predates the adaptive API and rejects the flag, so skip it there.
  if (!model.includes("haiku")) {
    (params as { thinking?: { type: "disabled" } }).thinking = { type: "disabled" };
  }
  const res = await client().messages.create(params);
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  try {
    return parseJson<T>(text);
  } catch (e) {
    console.error(
      "[askJson] JSON parse failed. stop_reason=%s len=%d\n---\n%s\n---",
      res.stop_reason,
      text.length,
      text.slice(0, 1200),
    );
    throw e;
  }
}
