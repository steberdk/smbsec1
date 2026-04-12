/**
 * POST /api/guidance — AI-powered checklist item guidance (legacy one-shot).
 *
 * @deprecated New callers SHOULD use `/api/guidance/chat` (PI 15 Iter 1,
 *   F-031) which supports multi-turn conversation. This endpoint is kept as
 *   a thin compatibility wrapper: it accepts the pre-existing body shape
 *   (`item_title` + optional `question`), looks up the canonical
 *   assessment_items row SERVER-SIDE (closes Security R2 §10 prompt
 *   injection hole), then delegates to the same hardened chat handler.
 *
 * Rate limited via the same 3-tier per-day bucket system as /api/guidance/chat
 * (item/user/org), so a legacy caller cannot bypass the chat caps by
 * pointing at the old URL.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../lib/supabase/server";
import { apiError, getUser } from "../../../lib/api/helpers";
import {
  lookupItemById,
  lookupItemByTitle,
} from "../../../lib/ai/itemLookup";
import { runChat } from "./chat/route";

export const runtime = "nodejs";

type GuidanceBody = {
  item_id?: string;
  item_title?: string;
  /** Legacy client-supplied fields — IGNORED for prompt interpolation. */
  item_description?: string;
  item_why?: string;
  item_steps?: string[];
  question?: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: GuidanceBody | null = null;
  try {
    body = (await req.json()) as GuidanceBody;
  } catch {
    return apiError("Invalid JSON body", 400);
  }
  if (!body) return apiError("Missing body", 400);

  // Early body validation so we can 400 before burning any lookups.
  if (!body.item_id && !body.item_title) {
    return apiError("item_title is required", 400);
  }

  // Resolve to a canonical item_id. The chat handler also looks up the item,
  // but we need the id here first because the legacy body shape delivers a
  // title, not an id.
  const supabase = supabaseForRequest(req);
  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  let canonicalItemId: string | null = null;
  if (body.item_id) {
    const viaId = await lookupItemById(supabase, user.id, body.item_id);
    canonicalItemId = viaId?.id ?? null;
  } else if (body.item_title) {
    const viaTitle = await lookupItemByTitle(supabase, user.id, body.item_title);
    canonicalItemId = viaTitle?.id ?? null;
  }

  if (!canonicalItemId) {
    return apiError("Checklist item not found", 404);
  }

  // Build the legacy "help me do this" opening message. Everything else
  // (system prompt, rate limits, output filter, flag logging) is shared
  // with the chat handler.
  const legacyMessage = body.question
    ? body.question
    : "Give me clear, step-by-step instructions for completing this checklist item.";

  const chatResp = await runChat({
    req,
    item_id: canonicalItemId,
    history: [],
    message: legacyMessage,
  });

  // Translate the chat response shape back to the legacy shape the existing
  // UI expects. The chat handler returns { reply, remaining, flagged? } on
  // success and a pass-through error body otherwise.
  if (chatResp.status !== 200) {
    return chatResp;
  }
  const data = (await chatResp.json()) as {
    reply: string;
    remaining: { item: number; user: number; org: number };
  };
  return NextResponse.json({ guidance: data.reply, cached: false });
}
