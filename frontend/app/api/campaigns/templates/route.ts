/**
 * GET /api/campaigns/templates — list active campaign templates
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import { apiError, getUser } from "../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const { data, error } = await supabase
    .from("campaign_templates")
    .select("id, title, type, subject, preview_text, difficulty, checklist_item_id")
    .eq("active", true)
    .order("title", { ascending: true });

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ templates: data ?? [] });
}
