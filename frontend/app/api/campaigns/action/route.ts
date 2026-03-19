/**
 * POST /api/campaigns/action — record a click or report action (public, no auth)
 *
 * Body: { token: string, action: 'clicked' | 'reported' }
 * The token serves as the identifier — no JWT required.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  const rl = rateLimit(rateLimitKey(req));
  if (rl) return rl;

  type ActionBody = { token: string; action: "clicked" | "reported" };

  const body: ActionBody | null = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  if (!body.token || typeof body.token !== "string") {
    return apiError("token is required", 400);
  }
  if (body.action !== "clicked" && body.action !== "reported") {
    return apiError("action must be 'clicked' or 'reported'", 400);
  }

  // Use service-role client directly (no auth needed for public action)
  const supabase = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: { schema: "smbsec1" },
    }
  );

  // Look up recipient by token
  const { data: recipient, error: recipErr } = await supabase
    .from("campaign_recipients")
    .select("id, campaign_id, status")
    .eq("token", body.token)
    .maybeSingle();

  if (recipErr) return apiError(recipErr.message, 500);
  if (!recipient) return apiError("Invalid token", 404);

  // Check campaign is active
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", recipient.campaign_id)
    .maybeSingle();

  if (campErr) return apiError(campErr.message, 500);
  if (!campaign || campaign.status !== "active") {
    return apiError("Campaign is not active", 400);
  }

  // Only record if recipient hasn't already acted
  if (recipient.status === "clicked" || recipient.status === "reported") {
    return NextResponse.json({
      ok: true,
      action: recipient.status,
      alreadyActed: true,
    });
  }

  // Update recipient status
  const { error: updateErr } = await supabase
    .from("campaign_recipients")
    .update({
      status: body.action,
      acted_at: new Date().toISOString(),
    })
    .eq("id", recipient.id);

  if (updateErr) return apiError(updateErr.message, 500);

  return NextResponse.json({ ok: true, action: body.action });
}
