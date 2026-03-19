/**
 * GET  /api/campaigns  — list campaigns for the caller's org
 * POST /api/campaigns  — create a new campaign (org_admin only, deducts 1 credit)
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, org_id, template_id, created_by, status, send_window_start, send_window_end, created_at, completed_at"
    )
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, 500);

  // Fetch template titles for display
  const templateIds = [
    ...new Set((data ?? []).map((c: { template_id: string }) => c.template_id)),
  ];

  let templates: Record<string, string> = {};
  if (templateIds.length > 0) {
    const { data: tplData } = await supabase
      .from("campaign_templates")
      .select("id, title")
      .in("id", templateIds);

    if (tplData) {
      templates = Object.fromEntries(
        tplData.map((t: { id: string; title: string }) => [t.id, t.title])
      );
    }
  }

  // Fetch recipient stats per campaign
  const campaignIds = (data ?? []).map((c: { id: string }) => c.id);
  const recipientStats: Record<
    string,
    { total: number; acted: number }
  > = {};

  if (campaignIds.length > 0) {
    const { data: recipients } = await supabase
      .from("campaign_recipients")
      .select("campaign_id, status")
      .in("campaign_id", campaignIds);

    if (recipients) {
      for (const r of recipients as { campaign_id: string; status: string }[]) {
        if (!recipientStats[r.campaign_id]) {
          recipientStats[r.campaign_id] = { total: 0, acted: 0 };
        }
        recipientStats[r.campaign_id].total++;
        if (r.status === "clicked" || r.status === "reported") {
          recipientStats[r.campaign_id].acted++;
        }
      }
    }
  }

  const campaigns = (data ?? []).map(
    (c: { id: string; template_id: string } & Record<string, unknown>) => ({
      ...c,
      template_title: templates[c.template_id] ?? "Unknown template",
      recipient_total: recipientStats[c.id]?.total ?? 0,
      recipient_acted: recipientStats[c.id]?.acted ?? 0,
    })
  );

  return NextResponse.json({ campaigns });
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin"))
    return apiError("Only org admins can create campaigns", 403);

  type CampaignBody = {
    template_id: string;
    recipient_user_ids: string[];
    customisation?: Record<string, string>;
    scheduled_for?: string; // ISO date string for scheduling
  };

  const body: CampaignBody | null = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  if (!body.template_id || typeof body.template_id !== "string") {
    return apiError("template_id is required", 400);
  }
  if (
    !Array.isArray(body.recipient_user_ids) ||
    body.recipient_user_ids.length === 0
  ) {
    return apiError("recipient_user_ids must be a non-empty array", 400);
  }

  // Verify template exists and is active
  const { data: template, error: tplErr } = await supabase
    .from("campaign_templates")
    .select("id")
    .eq("id", body.template_id)
    .eq("active", true)
    .maybeSingle();

  if (tplErr) return apiError(tplErr.message, 500);
  if (!template) return apiError("Template not found or inactive", 404);

  // Check campaign credits (paid orgs bypass credit check)
  const { data: org, error: orgErr } = await supabase
    .from("orgs")
    .select("campaign_credits, subscription_status")
    .eq("id", membership.org_id)
    .single();

  if (orgErr) return apiError(orgErr.message, 500);
  const isPaidOrg = org?.subscription_status === "active";
  if (!isPaidOrg && (!org || (org.campaign_credits ?? 0) < 1)) {
    return apiError("No campaign credits remaining", 402);
  }

  // Check no active campaign already exists
  const { data: activeCampaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("org_id", membership.org_id)
    .in("status", ["pending", "scheduled", "sending", "active"])
    .maybeSingle();

  if (activeCampaign) {
    return apiError(
      "A campaign is already active. Wait for it to complete before creating another.",
      409
    );
  }

  // Verify all recipient_user_ids are org members
  const { data: orgMembers } = await supabase
    .from("org_members")
    .select("user_id, email")
    .eq("org_id", membership.org_id)
    .in("user_id", body.recipient_user_ids);

  if (!orgMembers || orgMembers.length === 0) {
    return apiError("No valid recipients found", 400);
  }

  const validMembers = orgMembers as { user_id: string; email: string | null }[];

  // Determine if this is a scheduled campaign
  const isScheduled = body.scheduled_for && new Date(body.scheduled_for) > new Date();
  const campaignStatus = isScheduled ? "scheduled" : "pending";

  // Create campaign
  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .insert({
      org_id: membership.org_id,
      template_id: body.template_id,
      created_by: user.id,
      status: campaignStatus,
      customisation: body.customisation ?? {},
      ...(isScheduled && { scheduled_for: body.scheduled_for }),
    })
    .select()
    .single();

  if (campaignErr) return apiError(campaignErr.message, 500);

  // Create campaign_recipients
  const recipientRows = validMembers.map((m) => ({
    campaign_id: campaign.id,
    user_id: m.user_id,
    email: m.email ?? "",
    status: "pending",
  }));

  const { error: recipErr } = await supabase
    .from("campaign_recipients")
    .insert(recipientRows);

  if (recipErr) {
    // Rollback campaign on failure
    await supabase.from("campaigns").delete().eq("id", campaign.id);
    return apiError("Failed to create campaign recipients: " + recipErr.message, 500);
  }

  // Deduct 1 campaign credit (skip for paid orgs)
  if (!isPaidOrg) {
    const { error: creditErr } = await supabase
      .from("orgs")
      .update({ campaign_credits: (org.campaign_credits ?? 1) - 1 })
      .eq("id", membership.org_id);

    if (creditErr) {
      // Non-fatal — campaign is already created
      console.error("Failed to deduct campaign credit:", creditErr.message);
    }
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
