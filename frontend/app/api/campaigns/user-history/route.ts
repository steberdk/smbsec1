/**
 * GET /api/campaigns/user-history — per-user campaign participation history
 *
 * Returns a list of org members with their performance across all campaigns.
 * Only accessible to org_admin.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin"))
    return apiError("Only org admins can view user history", 403);

  // Get all campaigns for this org
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, template_id, status, created_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: true });

  if (campErr) return apiError(campErr.message, 500);

  const campaignList = (campaigns ?? []) as {
    id: string;
    template_id: string;
    status: string;
    created_at: string;
  }[];

  if (campaignList.length === 0) {
    return NextResponse.json({ users: [], campaigns: [] });
  }

  // Get template titles
  const templateIds = [...new Set(campaignList.map((c) => c.template_id))];
  const { data: templates } = await supabase
    .from("campaign_templates")
    .select("id, title, type")
    .in("id", templateIds);

  const templateMap: Record<string, { title: string; type: string }> = {};
  for (const t of (templates ?? []) as { id: string; title: string; type: string }[]) {
    templateMap[t.id] = { title: t.title, type: t.type };
  }

  // Get all recipients across all campaigns
  const campaignIds = campaignList.map((c) => c.id);
  const { data: recipients, error: recipErr } = await supabase
    .from("campaign_recipients")
    .select("campaign_id, user_id, email, status, sent_at, acted_at")
    .in("campaign_id", campaignIds);

  if (recipErr) return apiError(recipErr.message, 500);

  const recipientList = (recipients ?? []) as {
    campaign_id: string;
    user_id: string;
    email: string;
    status: string;
    sent_at: string | null;
    acted_at: string | null;
  }[];

  // Group by user
  const userMap: Record<
    string,
    {
      user_id: string;
      email: string;
      campaigns: {
        campaign_id: string;
        template_title: string;
        template_type: string;
        status: string;
        sent_at: string | null;
        acted_at: string | null;
        response_time_ms: number | null;
        campaign_date: string;
      }[];
      total_campaigns: number;
      times_reported: number;
      times_clicked: number;
      times_ignored: number;
    }
  > = {};

  for (const r of recipientList) {
    if (!userMap[r.user_id]) {
      userMap[r.user_id] = {
        user_id: r.user_id,
        email: r.email,
        campaigns: [],
        total_campaigns: 0,
        times_reported: 0,
        times_clicked: 0,
        times_ignored: 0,
      };
    }

    const camp = campaignList.find((c) => c.id === r.campaign_id);
    const tpl = camp ? templateMap[camp.template_id] : null;

    // Compute response time
    let responseTimeMs: number | null = null;
    if (r.sent_at && r.acted_at) {
      responseTimeMs =
        new Date(r.acted_at).getTime() - new Date(r.sent_at).getTime();
    }

    userMap[r.user_id].campaigns.push({
      campaign_id: r.campaign_id,
      template_title: tpl?.title ?? "Unknown",
      template_type: tpl?.type ?? "unknown",
      status: r.status,
      sent_at: r.sent_at,
      acted_at: r.acted_at,
      response_time_ms: responseTimeMs,
      campaign_date: camp?.created_at ?? "",
    });

    userMap[r.user_id].total_campaigns++;
    if (r.status === "reported") userMap[r.user_id].times_reported++;
    if (r.status === "clicked") userMap[r.user_id].times_clicked++;
    if (r.status === "ignored") userMap[r.user_id].times_ignored++;
  }

  // Build campaign summary list
  const campaignSummaries = campaignList.map((c) => ({
    id: c.id,
    template_title: templateMap[c.template_id]?.title ?? "Unknown",
    template_type: templateMap[c.template_id]?.type ?? "unknown",
    status: c.status,
    date: c.created_at,
  }));

  return NextResponse.json({
    users: Object.values(userMap),
    campaigns: campaignSummaries,
  });
}
