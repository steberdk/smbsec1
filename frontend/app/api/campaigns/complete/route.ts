/**
 * POST /api/campaigns/complete — auto-complete campaigns where all emails were sent 72+ hours ago
 *
 * Protected by CRON_SECRET header. Finds active campaigns where all recipients have been
 * sent emails 72+ hours ago, marks remaining pending/sent recipients as `ignored`,
 * sets campaign status to `completed`, and updates corresponding assessment_responses
 * with verification_status.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  // Verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return apiError("CRON_SECRET not configured", 500);

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== cronSecret) return apiError("Unauthorized", 401);

  const supabase = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { schema: "smbsec1" },
    }
  );

  // Find active campaigns
  const { data: activeCampaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id, org_id, template_id")
    .eq("status", "active");

  if (campErr) return apiError(campErr.message, 500);
  if (!activeCampaigns || activeCampaigns.length === 0) {
    return NextResponse.json({ completed: 0, message: "No active campaigns to process" });
  }

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  let completedCount = 0;

  for (const campaign of activeCampaigns as { id: string; org_id: string; template_id: string }[]) {
    // Get all recipients for this campaign
    const { data: recipients, error: recipErr } = await supabase
      .from("campaign_recipients")
      .select("id, user_id, status, sent_at")
      .eq("campaign_id", campaign.id);

    if (recipErr || !recipients) continue;

    const recipientList = recipients as { id: string; user_id: string; status: string; sent_at: string | null }[];

    // Check if ALL sent recipients were sent 72+ hours ago
    const sentRecipients = recipientList.filter((r) => r.sent_at !== null);
    if (sentRecipients.length === 0) continue; // No emails sent yet

    const allSentBefore = sentRecipients.every(
      (r) => r.sent_at !== null && r.sent_at < cutoff
    );
    if (!allSentBefore) continue; // Some emails still within the 72-hour window

    // Mark pending/sent recipients as ignored
    const pendingOrSent = recipientList.filter(
      (r) => r.status === "pending" || r.status === "sent"
    );
    if (pendingOrSent.length > 0) {
      const pendingIds = pendingOrSent.map((r) => r.id);
      await supabase
        .from("campaign_recipients")
        .update({ status: "ignored", acted_at: new Date().toISOString() })
        .in("id", pendingIds);
    }

    // Update campaign status to completed
    await supabase
      .from("campaigns")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", campaign.id);

    // Link campaign results to assessment responses
    // Find the active assessment for this org
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id")
      .eq("org_id", campaign.org_id)
      .eq("status", "active")
      .maybeSingle();

    if (assessment) {
      // Find the checklist_item_id linked to this campaign's template
      const { data: template } = await supabase
        .from("campaign_templates")
        .select("checklist_item_id")
        .eq("id", campaign.template_id)
        .maybeSingle();

      if (template?.checklist_item_id) {
        // Find the assessment_item that corresponds to this checklist_item
        const { data: assessmentItem } = await supabase
          .from("assessment_items")
          .select("id")
          .eq("assessment_id", (assessment as { id: string }).id)
          .eq("checklist_item_id", template.checklist_item_id)
          .maybeSingle();

        if (assessmentItem) {
          // Update verification_status for recipients who acted
          for (const recipient of recipientList) {
            let verificationStatus: string | null = null;
            if (recipient.status === "reported") {
              verificationStatus = "verified";
            } else if (recipient.status === "clicked") {
              verificationStatus = "failed";
            }

            if (verificationStatus) {
              await supabase
                .from("assessment_responses")
                .update({ verification_status: verificationStatus })
                .eq("assessment_id", (assessment as { id: string }).id)
                .eq("assessment_item_id", (assessmentItem as { id: string }).id)
                .eq("user_id", recipient.user_id);
            }
          }
        }
      }
    }

    completedCount++;
  }

  return NextResponse.json({
    completed: completedCount,
    message: `Completed ${completedCount} campaign(s)`,
  });
}
