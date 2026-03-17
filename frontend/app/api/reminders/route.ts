/**
 * POST /api/reminders  — send reassessment reminder emails
 *
 * Finds orgs whose last completed assessment is between 76–90 days ago
 * and sends a reminder to all org_admin members.
 *
 * Designed to be called by a cron job (e.g. Vercel Cron, GitHub Actions).
 * Protected by a simple bearer token (CRON_SECRET env var).
 */

import { NextResponse } from "next/server";
import { supabaseServiceClient } from "../../../lib/supabase/service";
import { sendReminderEmail } from "../../../lib/email/sendReminder";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  // Authenticate cron caller
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = supabaseServiceClient();

  // Find orgs with last completed assessment between 76-90 days ago
  const { data: orgs, error } = await supabase.rpc("get_reminder_candidates").select();

  // Fallback: query directly if RPC doesn't exist
  const candidates: { org_id: string; org_name: string; admin_email: string; days_since: number }[] = [];

  if (error || !orgs) {
    // Direct query approach
    const { data: rawCandidates } = await supabase
      .from("assessments")
      .select("org_id, completed_at, orgs(name)")
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    if (rawCandidates) {
      const orgMap = new Map<string, { org_id: string; org_name: string; completed_at: string }>();
      for (const row of rawCandidates as Array<{ org_id: string; completed_at: string; orgs: { name: string } | { name: string }[] | null }>) {
        if (!orgMap.has(row.org_id)) {
          orgMap.set(row.org_id, {
            org_id: row.org_id,
            org_name: (Array.isArray(row.orgs) ? row.orgs[0]?.name : row.orgs?.name) ?? "Unknown",
            completed_at: row.completed_at,
          });
        }
      }

      for (const [, org] of orgMap) {
        const daysSince = Math.floor(
          (Date.now() - new Date(org.completed_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince >= 76 && daysSince <= 95) {
          // Get admin emails for this org
          const { data: admins } = await supabase
            .from("org_members")
            .select("email")
            .eq("org_id", org.org_id)
            .eq("role", "org_admin");

          for (const admin of admins ?? []) {
            if (admin.email) {
              candidates.push({
                org_id: org.org_id,
                org_name: org.org_name,
                admin_email: admin.email,
                days_since: daysSince,
              });
            }
          }
        }
      }
    }
  }

  // Send emails
  let sent = 0;
  for (const c of candidates) {
    await sendReminderEmail({
      toEmail: c.admin_email,
      orgName: c.org_name,
      daysSinceCompletion: c.days_since,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, candidates: candidates.length });
}
