/**
 * POST /api/guidance — AI-powered checklist item guidance
 *
 * Accepts an item title + optional question, returns platform-aware
 * step-by-step guidance using Claude API.
 *
 * Rate limited: 10 requests per user per hour.
 * Responses cached in-memory per item+platform combo.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseForRequest } from "../../../lib/supabase/server";
import { apiError, getUser, getOrgMembership } from "../../../lib/api/helpers";

export const runtime = "nodejs";

// Simple in-memory cache (survives across requests in the same serverless instance)
const cache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// Per-user rate limiting (in-memory, resets on deploy)
const userRequests = new Map<string, number[]>();
const RATE_LIMIT = 10; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const requests = userRequests.get(userId) ?? [];
  const recent = requests.filter((t) => now - t < RATE_WINDOW);
  userRequests.set(userId, recent);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  return true;
}

type GuidanceBody = {
  item_title: string;
  item_description?: string;
  item_why?: string;
  item_steps?: string[];
  question?: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = process.env.ANTROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return apiError("AI guidance is not configured", 503);
  }

  const supabase = supabaseForRequest(req);
  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: "You've used all your guidance requests for this hour. Try again later." },
      { status: 429 }
    );
  }

  const membership = await getOrgMembership(supabase, user.id);
  const platform = membership
    ? await getPlatform(supabase, membership.org_id)
    : null;

  const body: GuidanceBody = await req.json().catch(() => null);
  if (!body?.item_title) {
    return apiError("item_title is required", 400);
  }

  // Cache key: item title + platform
  const cacheKey = `${body.item_title}::${platform ?? "unknown"}::${body.question ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ guidance: cached.text, cached: true });
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(body, platform);

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: body.question
            ? `Help me with this checklist item: "${body.item_title}". My specific question: ${body.question}`
            : `Help me implement this checklist item: "${body.item_title}". Give me clear, step-by-step instructions.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Cache the response
    cache.set(cacheKey, { text, ts: Date.now() });

    return NextResponse.json({ guidance: text, cached: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI guidance unavailable";
    if (msg.includes("rate_limit") || msg.includes("429")) {
      return NextResponse.json(
        { error: "AI service is busy. Please try again in a minute." },
        { status: 429 }
      );
    }
    return apiError(msg, 500);
  }
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
  return data?.email_platform ?? null;
}

function buildSystemPrompt(body: GuidanceBody, platform: string | null): string {
  const platformName =
    platform === "google_workspace"
      ? "Google Workspace"
      : platform === "microsoft_365"
      ? "Microsoft 365"
      : platform === "gmail_personal"
      ? "Gmail (personal)"
      : platform
      ? platform
      : "unknown";

  return `You are a security advisor helping a small business implement a security checklist item.

RULES:
- Give clear, specific, step-by-step instructions
- Use simple language — the user may not be technical
- If the organisation uses ${platformName}, tailor instructions to that platform with specific menu paths
- Keep responses concise (under 300 words)
- Only discuss security topics related to this specific checklist item
- Do not discuss unrelated topics, products, or services
- If asked about something outside this item's scope, politely redirect

CHECKLIST ITEM: "${body.item_title}"
${body.item_description ? `DESCRIPTION: ${body.item_description}` : ""}
${body.item_why ? `WHY IT MATTERS: ${body.item_why}` : ""}
${body.item_steps?.length ? `EXISTING STEPS:\n${body.item_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}
PLATFORM: ${platformName}

Provide practical, actionable guidance. Include specific admin console paths or settings locations where applicable.`;
}
