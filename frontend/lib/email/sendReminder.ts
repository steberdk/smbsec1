/**
 * Server-side reassessment reminder email via Resend.
 * Sent at day 80 post-completion: "Your quarterly security review is due in 10 days."
 */

import { Resend } from "resend";

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendReminderEmail(opts: {
  toEmail: string;
  orgName: string;
  daysSinceCompletion: number;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — reminder email not sent.");
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const daysLeft = 90 - opts.daysSinceCompletion;
  const reassessUrl = `${appUrl()}/workspace/assessments`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">
    Your quarterly security review is due${daysLeft > 0 ? ` in ${daysLeft} days` : ""}
  </h2>
  <p style="color:#444;margin-bottom:16px">
    It has been ${opts.daysSinceCompletion} days since <strong>${opts.orgName}</strong>
    completed its last security assessment. Regular reviews help you stay ahead of new threats
    and catch controls that may have drifted.
  </p>
  <a href="${reassessUrl}"
     style="display:inline-block;background:#111;color:#fff;text-decoration:none;
            padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">
    Start reassessment
  </a>
  <p style="margin-top:20px;font-size:12px;color:#888">
    You are receiving this because you are a member of ${opts.orgName} on SMB Security Check.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#aaa">SMB Security Check</p>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from,
    to: opts.toEmail,
    subject: `Security review due${daysLeft > 0 ? ` in ${daysLeft} days` : ""} — ${opts.orgName}`,
    html,
  });

  if (error) {
    console.error("Resend reminder email failed:", error);
  }
}
