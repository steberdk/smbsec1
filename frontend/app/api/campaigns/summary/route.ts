/**
 * GET /api/campaigns/summary — campaign summary stats for the caller's org
 *
 * Returns aggregate stats: total campaigns, sent/reported/clicked/ignored counts,
 * pass rate, and last campaign date. Only accessible to org_admin.
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
    return apiError("Only org admins can view campaign summary", 403);

  // Fetch all campaigns for the org
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, status, created_at, completed_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  if (campErr) return apiError(campErr.message, 500);

  const campaignList = campaigns ?? [];
  const totalCampaigns = campaignList.length;

  if (totalCampaigns === 0) {
    return NextResponse.json({
      total_campaigns: 0,
      total_sent: 0,
      total_reported: 0,
      total_clicked: 0,
      total_ignored: 0,
      pass_rate: 0,
      last_campaign_date: null,
    });
  }

  // Fetch all recipients across all campaigns
  const campaignIds = campaignList.map((c: { id: string }) => c.id);
  const { data: recipients, error: recipErr } = await supabase
    .from("campaign_recipients")
    .select("campaign_id, status")
    .in("campaign_id", campaignIds);

  if (recipErr) return apiError(recipErr.message, 500);

  const recipientList = (recipients ?? []) as { campaign_id: string; status: string }[];

  let totalSent = 0;
  let totalReported = 0;
  let totalClicked = 0;
  let totalIgnored = 0;

  for (const r of recipientList) {
    if (r.status !== "pending") totalSent++;
    if (r.status === "reported") totalReported++;
    if (r.status === "clicked") totalClicked++;
    if (r.status === "ignored") totalIgnored++;
  }

  // Pass rate = reported / (reported + clicked + ignored) — only count resolved recipients
  const resolved = totalReported + totalClicked + totalIgnored;
  const passRate = resolved > 0 ? Math.round((totalReported / resolved) * 100) : 0;

  const lastCampaignDate = campaignList[0]?.created_at ?? null;

  return NextResponse.json({
    total_campaigns: totalCampaigns,
    total_sent: totalSent,
    total_reported: totalReported,
    total_clicked: totalClicked,
    total_ignored: totalIgnored,
    pass_rate: passRate,
    last_campaign_date: lastCampaignDate,
  });
}
