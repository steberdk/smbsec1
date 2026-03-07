/**
 * Server-side invite email sender via Resend.
 *
 * Non-fatal: if RESEND_API_KEY is missing or the send fails, the error is
 * logged but the invite record is still created. Email delivery failure must
 * not block the invite flow.
 *
 * Required env vars:
 *   RESEND_API_KEY       — Resend API key (server-side only, never NEXT_PUBLIC_)
 *
 * Optional env vars:
 *   RESEND_FROM_EMAIL    — sender address (default: onboarding@resend.dev)
 *                          Set to your verified domain address when ready.
 *   NEXT_PUBLIC_APP_URL  — base URL for invite links (default: http://localhost:3000)
 */

import { Resend } from "resend";

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendInviteEmail(opts: {
  toEmail: string;
  inviterEmail: string;
  orgName: string;
  role: string;
  isItExecutor: boolean;
  inviteToken: string;
  expiresAt: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — invite email not sent.");
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const acceptUrl = `${appUrl()}/accept-invite?token=${opts.inviteToken}`;
  const expires = new Date(opts.expiresAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const roleLabel = opts.role === "manager" ? "Manager" : "Employee";
  const itNote = opts.isItExecutor ? " (IT Executor)" : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">
    You have been invited to join ${opts.orgName}
  </h2>
  <p style="color:#444;margin-bottom:16px">
    ${opts.inviterEmail} has invited you to join the security programme at
    <strong>${opts.orgName}</strong> as a <strong>${roleLabel}${itNote}</strong>.
  </p>
  <a href="${acceptUrl}"
     style="display:inline-block;background:#111;color:#fff;text-decoration:none;
            padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">
    Accept invitation
  </a>
  <p style="margin-top:20px;font-size:12px;color:#888">
    This link expires on ${expires}. If you were not expecting this invitation,
    you can safely ignore this email.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#aaa">SMB Security Check</p>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from,
    to: opts.toEmail,
    subject: `You have been invited to join ${opts.orgName}`,
    html,
  });

  if (error) {
    console.error("Resend invite email failed:", error);
  }
}
