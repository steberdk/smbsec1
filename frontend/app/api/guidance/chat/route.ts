/**
 * POST /api/guidance/chat — F-031 (PI 15 Iter 1) multi-turn AI chat.
 *
 * Stateless: the client sends the full conversation `history` each turn;
 * the server never persists chat messages. This is a v1 constraint per
 * F-031 AC-3 (chat state is `useState` per drawer in the UI).
 *
 * Security posture (F-012 PI 15 Iter 1):
 *
 *  - ALL checklist item fields used in the system prompt are looked up
 *    server-side by `item_id` via `lib/ai/itemLookup.ts`. The client
 *    never gets to dictate item_title/description/why/steps.
 *  - The hardened 4-block system prompt (IDENTITY/CAPABILITIES/REFUSALS/
 *    CONTEXT) is built via `lib/ai/systemPrompt.ts` and sanitised against
 *    marker and triple-backtick injection.
 *  - Rate limit: 3 daily buckets checked most-restrictive-first
 *      `guidance:item:<user_id>:<item_id>:day`  → 20/day
 *      `guidance:user:<user_id>:day`            → 60/day
 *      `guidance:org:<org_id>:day`              → 300/day
 *  - Kill switch: env `AI_GUIDANCE_DISABLED=true` returns 503 unconditionally.
 *  - Input cap: 500 chars per user message, 20 messages history max.
 *  - Context cap: character heuristic (~4 chars/token); total chars >32000
 *    drops the oldest messages pair-by-pair.
 *  - Output filter: `lib/ai/outputFilter.ts` runs on every reply, can
 *    reject (422) or flag (included in response). All filter hits log
 *    hashes to `smbsec1.ai_guidance_flags` (migration 026).
 *
 * Error handling:
 *  - 401 unauth
 *  - 400 message_too_long / bad body / missing item_id
 *  - 404 item not found in caller's active assessment
 *  - 429 rate limit (body includes which bucket)
 *  - 422 reply rejected by output filter
 *  - 502 Anthropic API upstream failure
 *  - 503 kill switch / org AI toggle off / missing API key
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
} from "../../../../lib/api/helpers";
import { rateLimitPersistent } from "../../../../lib/api/rateLimit";
import { lookupItemById } from "../../../../lib/ai/itemLookup";
import { buildHardenedSystemPrompt } from "../../../../lib/ai/systemPrompt";
import { runOutputFilter } from "../../../../lib/ai/outputFilter";
import { logFlags, sha256Hex } from "../../../../lib/ai/flagLog";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ONE_DAY_SEC = 24 * 60 * 60;

const ITEM_DAILY_CAP = 20;
const USER_DAILY_CAP = 60;
const ORG_DAILY_CAP = 300;

const MESSAGE_MAX_CHARS = 500;
const HISTORY_MAX_TURNS = 20; // 10 user + 10 assistant
const CONTEXT_CHAR_BUDGET = 32_000; // ~8000 tokens at 4 chars/token
const OUTPUT_MAX_TOKENS = 1024;

const MODEL = "claude-haiku-4-5-20251001";

type Msg = { role: "user" | "assistant"; content: string };

export type ChatRequest = {
  item_id: string;
  history: Msg[];
  message: string;
};

export type ChatRemaining = {
  item: number;
  user: number;
  org: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isKillSwitchEnabled(): boolean {
  return process.env.AI_GUIDANCE_DISABLED === "true";
}

function todayKey(): string {
  // UTC date bucket. Matches the 1-day window passed to rateLimitPersistent.
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Enforce max 20 messages + ~32k char context budget. */
function truncateHistory(history: Msg[]): Msg[] {
  // 1. Hard cap: at most HISTORY_MAX_TURNS entries (drop oldest first).
  const hist = history.slice(-HISTORY_MAX_TURNS);
  // 2. Token budget: drop oldest while total chars > budget.
  let total = hist.reduce((sum, m) => sum + m.content.length, 0);
  while (total > CONTEXT_CHAR_BUDGET && hist.length > 0) {
    const dropped = hist.shift()!;
    total -= dropped.content.length;
  }
  return hist;
}

function isValidMsg(m: unknown): m is Msg {
  return (
    !!m &&
    typeof m === "object" &&
    (("role" in m && ((m as Msg).role === "user" || (m as Msg).role === "assistant"))) &&
    typeof (m as Msg).content === "string"
  );
}

function uuidLike(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f-]{10,}$/i.test(s);
}

async function getPlatform(
  supabase: ReturnType<typeof supabaseForRequest>,
  orgId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("orgs")
    .select("email_platform")
    .eq("id", orgId)
    .single();
  return (data as { email_platform?: string | null } | null)?.email_platform ?? null;
}

// ---------------------------------------------------------------------------
// Shared handler — /api/guidance legacy wrapper calls this too
// ---------------------------------------------------------------------------

export type ChatHandlerInput = {
  req: Request;
  item_id: string;
  history: Msg[];
  message: string;
};

export type ChatHandlerSuccess = {
  reply: string;
  remaining: ChatRemaining;
  flagged?: string[];
};

export async function runChat(input: ChatHandlerInput): Promise<NextResponse> {
  const { req } = input;

  // 1. Kill switch (global env — API key check is deferred to step 8 so
  // body validation, item lookup, and rate limits work without Anthropic
  // configured, which lets non-Anthropic tests pass in CI).
  if (isKillSwitchEnabled()) {
    return NextResponse.json(
      { error: "ai_guidance_disabled", scope: "global" },
      { status: 503 }
    );
  }

  // 2. Auth + membership.
  const supabase = supabaseForRequest(req);
  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("No org membership", 403);
  const orgId = membership.org_id;

  // 3. Org-level AI guidance kill switch (F-012 PI 14 Iter 1).
  {
    const { data: org } = await supabase
      .from("orgs")
      .select("ai_guidance_enabled")
      .eq("id", orgId)
      .single();
    if (
      org &&
      (org as { ai_guidance_enabled?: boolean }).ai_guidance_enabled === false
    ) {
      return NextResponse.json(
        { error: "ai_guidance_disabled", scope: "org" },
        { status: 503 }
      );
    }
  }

  // 4. Validate + narrow request body.
  if (!input.item_id || !uuidLike(input.item_id)) {
    return apiError("item_id is required", 400);
  }
  if (typeof input.message !== "string") {
    return apiError("message is required", 400);
  }
  if (input.message.length > MESSAGE_MAX_CHARS) {
    return NextResponse.json(
      { error: "message_too_long", max_chars: MESSAGE_MAX_CHARS },
      { status: 400 }
    );
  }
  if (!Array.isArray(input.history)) {
    return apiError("history must be an array", 400);
  }
  const history = input.history.filter(isValidMsg);

  // 5. Server-side item lookup (closes Security R2 §10 injection hole).
  const canonical = await lookupItemById(supabase, user.id, input.item_id);
  if (!canonical) {
    return apiError("Checklist item not found", 404);
  }

  // 6. Rate limits — 3 buckets, most-restrictive first.
  const day = todayKey();
  const itemBucket = `guidance:item:${user.id}:${input.item_id}:${day}`;
  const userBucket = `guidance:user:${user.id}:${day}`;
  const orgBucket = `guidance:org:${orgId}:${day}`;

  const itemRL = await rateLimitPersistent(itemBucket, ONE_DAY_SEC, ITEM_DAILY_CAP);
  if (!itemRL.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        scope: itemBucket,
        reset_at: new Date(itemRL.resetAt).toISOString(),
        remaining_today: 0,
      },
      { status: 429 }
    );
  }

  const userRL = await rateLimitPersistent(userBucket, ONE_DAY_SEC, USER_DAILY_CAP);
  if (!userRL.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        scope: userBucket,
        reset_at: new Date(userRL.resetAt).toISOString(),
        remaining_today: 0,
      },
      { status: 429 }
    );
  }

  const orgRL = await rateLimitPersistent(orgBucket, ONE_DAY_SEC, ORG_DAILY_CAP);
  if (!orgRL.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        scope: orgBucket,
        reset_at: new Date(orgRL.resetAt).toISOString(),
        remaining_today: 0,
      },
      { status: 429 }
    );
  }

  // 7. Build system prompt + truncated history.
  const platform = await getPlatform(supabase, orgId);
  const systemPrompt = buildHardenedSystemPrompt(canonical, platform);
  const trimmedHistory = truncateHistory(history);

  // 8. Call Anthropic (API key check deferred from step 1 so body/item/rate-limit
  // validation works without the key — needed for CI tests).
  const apiKey = process.env.ANTROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return apiError("AI guidance is not configured", 503);
  }
  let replyText = "";
  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: OUTPUT_MAX_TOKENS,
      system: systemPrompt,
      messages: [
        ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: input.message },
      ],
    });
    replyText =
      resp.content[0] && resp.content[0].type === "text"
        ? resp.content[0].text
        : "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI upstream error";
    if (/rate[_ ]?limit|429/i.test(msg)) {
      return NextResponse.json(
        { error: "upstream_rate_limited" },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "upstream_unavailable", detail: msg }, { status: 502 });
  }

  // 9. Output filter.
  const filtered = runOutputFilter(replyText, canonical.title);
  const requestHash = sha256Hex(
    `${canonical.id}::${input.message}::${trimmedHistory.length}`
  );
  const responseHash = sha256Hex(replyText);

  if (!filtered.ok) {
    await logFlags([filtered.reject, ...filtered.flags], {
      userId: user.id,
      orgId,
      bucket: itemBucket,
      requestHash,
      responseHash,
    });
    return NextResponse.json(
      {
        error: "ai_response_rejected",
        reason: filtered.reject.rule,
      },
      { status: 422 }
    );
  }

  if (filtered.flags.length > 0) {
    await logFlags(filtered.flags, {
      userId: user.id,
      orgId,
      bucket: itemBucket,
      requestHash,
      responseHash,
    });
  }

  const response: ChatHandlerSuccess = {
    reply: replyText,
    remaining: {
      item: itemRL.remaining,
      user: userRL.remaining,
      org: orgRL.remaining,
    },
  };
  if (filtered.flags.length > 0) {
    response.flagged = filtered.flags.map((f) => f.rule);
  }
  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<NextResponse> {
  let body: Partial<ChatRequest> | null = null;
  try {
    body = (await req.json()) as Partial<ChatRequest>;
  } catch {
    return apiError("Invalid JSON body", 400);
  }
  if (!body) return apiError("Missing body", 400);

  return runChat({
    req,
    item_id: body.item_id ?? "",
    history: Array.isArray(body.history) ? (body.history as Msg[]) : [],
    message: typeof body.message === "string" ? body.message : "",
  });
}
