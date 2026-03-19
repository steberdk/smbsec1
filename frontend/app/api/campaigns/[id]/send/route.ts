/**
 * POST /api/campaigns/[id]/send — send campaign emails to all pending recipients
 *
 * Only org_admin can trigger. Sends via Resend, updates recipient statuses,
 * and transitions campaign status to 'active'.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseForRequest } from "../../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../../lib/api/rateLimit";

export const runtime = "nodejs";

const CAMPAIGN_BASE_URL = "https://smbsec1.vercel.app";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    return apiError("Only org admins can send campaigns", 403);

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id, org_id, template_id, status")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (campErr) return apiError(campErr.message, 500);
  if (!campaign) return apiError("Campaign not found", 404);

  // Only draft/pending campaigns can be sent
  if (campaign.status !== "draft" && campaign.status !== "pending") {
    return apiError(
      `Campaign cannot be sent — current status is '${campaign.status}'`,
      409
    );
  }

  // Load template
  const { data: template, error: tplErr } = await supabase
    .from("campaign_templates")
    .select("id, subject, body_html, body_text")
    .eq("id", campaign.template_id)
    .maybeSingle();

  if (tplErr) return apiError(tplErr.message, 500);
  if (!template) return apiError("Campaign template not found", 404);

  // Load sender display name (org admin) for CEO fraud template personalisation
  const { data: senderMember } = await supabase
    .from("org_members")
    .select("display_name, email")
    .eq("user_id", user.id)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  const senderName = senderMember?.display_name ?? senderMember?.email?.split("@")[0] ?? "Management";

  // Load pending recipients
  const { data: recipients, error: recipErr } = await supabase
    .from("campaign_recipients")
    .select("id, user_id, email, token, status")
    .eq("campaign_id", id)
    .eq("status", "pending");

  if (recipErr) return apiError(recipErr.message, 500);
  if (!recipients || recipients.length === 0) {
    return apiError("No pending recipients to send to", 400);
  }

  // Update campaign status to 'sending'
  await supabase
    .from("campaigns")
    .update({ status: "sending" })
    .eq("id", id);

  // Set up Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return apiError("Email service not configured (RESEND_API_KEY missing)", 500);
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  let sentCount = 0;
  const errors: string[] = [];

  for (const recipient of recipients as {
    id: string;
    user_id: string;
    email: string;
    token: string;
    status: string;
  }[]) {
    const recipientName = recipient.email.split("@")[0] ?? recipient.email;
    const clickUrl = `${CAMPAIGN_BASE_URL}/campaign/${recipient.token}`;
    const reportUrl = `${CAMPAIGN_BASE_URL}/campaign/${recipient.token}/report`;

    // Replace placeholders in HTML body
    let html = template.body_html as string;
    html = html.replace(/\{\{tracking_url\}\}/g, clickUrl);
    html = html.replace(/\{\{CLICK_URL\}\}/g, clickUrl);
    html = html.replace(/\{\{REPORT_URL\}\}/g, reportUrl);
    html = html.replace(/\{\{RECIPIENT_NAME\}\}/g, recipientName);
    html = html.replace(/\{\{SENDER_NAME\}\}/g, senderName);

    // Replace placeholders in text body
    let text = template.body_text as string;
    text = text.replace(/\{\{tracking_url\}\}/g, clickUrl);
    text = text.replace(/\{\{CLICK_URL\}\}/g, clickUrl);
    text = text.replace(/\{\{REPORT_URL\}\}/g, reportUrl);
    text = text.replace(/\{\{RECIPIENT_NAME\}\}/g, recipientName);
    text = text.replace(/\{\{SENDER_NAME\}\}/g, senderName);

    try {
      const { error: sendErr } = await resend.emails.send({
        from,
        to: recipient.email,
        subject: template.subject as string,
        html,
        text,
        headers: {
          "X-SMBsec-Simulation": "true",
        },
      });

      if (sendErr) {
        console.error(
          `Failed to send campaign email to ${recipient.email}:`,
          sendErr
        );
        errors.push(recipient.email);
      } else {
        // Update recipient status to 'sent'
        await supabase
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", recipient.id);
        sentCount++;
      }
    } catch (err) {
      console.error(
        `Error sending campaign email to ${recipient.email}:`,
        err
      );
      errors.push(recipient.email);
    }

    // Small random delay between sends (100-500ms)
    const delay = 100 + Math.floor(Math.random() * 400);
    await sleep(delay);
  }

  // Update campaign status to 'active'
  await supabase
    .from("campaigns")
    .update({ status: "active" })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    failed: errors.length,
    failedEmails: errors,
  });
}
