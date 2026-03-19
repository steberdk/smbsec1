/**
 * POST /api/campaigns/[id]/rerun — re-run a completed campaign
 *
 * Creates a new campaign with the same template and current org members
 * (excluding opted-out users and the admin). Fresh tokens are generated.
 * Only org_admin can re-run. Only completed campaigns can be re-run.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function POST(
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
  if (!hasRole(membership, "org_admin"))
    return apiError("Only org admins can re-run campaigns", 403);

  // Load original campaign
  const { data: original, error: origErr } = await supabase
    .from("campaigns")
    .select("id, org_id, template_id, customisation")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (origErr) return apiError(origErr.message, 500);
  if (!original) return apiError("Campaign not found", 404);

  // Only completed campaigns can be re-run
  // (we need to check status separately since it might not be in the select)
  const { data: origStatus } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", id)
    .single();

  if (origStatus?.status !== "completed") {
    return apiError("Only completed campaigns can be re-run", 400);
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
      "A campaign is already active. Wait for it to complete before re-running.",
      409
    );
  }

  // Check credits (paid orgs bypass)
  const { data: org } = await supabase
    .from("orgs")
    .select("campaign_credits, subscription_status")
    .eq("id", membership.org_id)
    .single();

  const isPaid = org?.subscription_status === "active";
  if (!isPaid && (!org || (org.campaign_credits ?? 0) < 1)) {
    return apiError("No campaign credits remaining", 402);
  }

  // Get current org members (excluding admin and opted-out)
  const { data: orgMembers } = await supabase
    .from("org_members")
    .select("user_id, email, campaign_opt_out")
    .eq("org_id", membership.org_id)
    .neq("user_id", user.id);

  const eligibleMembers = (orgMembers ?? []).filter(
    (m: { user_id: string; email: string | null; campaign_opt_out?: boolean }) =>
      !m.campaign_opt_out && m.email
  ) as { user_id: string; email: string }[];

  if (eligibleMembers.length === 0) {
    return apiError("No eligible recipients for re-run", 400);
  }

  // Create new campaign
  const { data: newCampaign, error: createErr } = await supabase
    .from("campaigns")
    .insert({
      org_id: membership.org_id,
      template_id: original.template_id,
      created_by: user.id,
      status: "pending",
      customisation: original.customisation ?? {},
    })
    .select()
    .single();

  if (createErr) return apiError(createErr.message, 500);

  // Create recipients with fresh tokens
  const recipientRows = eligibleMembers.map((m) => ({
    campaign_id: newCampaign.id,
    user_id: m.user_id,
    email: m.email,
    status: "pending",
  }));

  const { error: recipErr } = await supabase
    .from("campaign_recipients")
    .insert(recipientRows);

  if (recipErr) {
    await supabase.from("campaigns").delete().eq("id", newCampaign.id);
    return apiError("Failed to create campaign recipients: " + recipErr.message, 500);
  }

  // Deduct credit (skip for paid)
  if (!isPaid) {
    await supabase
      .from("orgs")
      .update({ campaign_credits: (org?.campaign_credits ?? 1) - 1 })
      .eq("id", membership.org_id);
  }

  return NextResponse.json({ campaign: newCampaign }, { status: 201 });
}
