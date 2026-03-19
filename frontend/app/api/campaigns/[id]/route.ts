/**
 * GET /api/campaigns/[id] — campaign details + recipients with statuses
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
} from "../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  // Fetch campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select(
      "id, org_id, template_id, created_by, status, send_window_start, send_window_end, created_at, completed_at, scheduled_for, customisation"
    )
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (campErr) return apiError(campErr.message, 500);
  if (!campaign) return apiError("Campaign not found", 404);

  // Fetch template info
  const { data: template } = await supabase
    .from("campaign_templates")
    .select("id, title, type, difficulty")
    .eq("id", campaign.template_id)
    .maybeSingle();

  // Fetch recipients
  const { data: recipients, error: recipErr } = await supabase
    .from("campaign_recipients")
    .select("id, user_id, email, status, sent_at, acted_at")
    .eq("campaign_id", id)
    .order("email", { ascending: true });

  if (recipErr) return apiError(recipErr.message, 500);

  return NextResponse.json({
    campaign: {
      ...campaign,
      template: template ?? null,
    },
    recipients: recipients ?? [],
  });
}
