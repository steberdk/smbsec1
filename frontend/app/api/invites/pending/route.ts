/**
 * GET /api/invites/pending?token=<token>
 *
 * Public (unauthenticated) endpoint — used by the accept-invite page to show
 * invite context (org name, role, invited email) BEFORE the user logs in.
 *
 * Rate-limited by IP to prevent token enumeration.
 */

import { NextResponse } from "next/server";
import { supabaseServiceClient } from "../../../../lib/supabase/service";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  // Rate limit by IP (unauthenticated route)
  const rl = rateLimit(rateLimitKey(req));
  if (rl) return rl;

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || typeof token !== "string" || token.trim() === "") {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const service = supabaseServiceClient();

  const { data: invite, error } = await service
    .from("invites")
    .select("email, role, accepted_at, expires_at, org_id")
    .eq("token", token.trim())
    .maybeSingle();

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.accepted_at !== null) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 404 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 404 });
  }

  // Fetch org name
  const { data: org } = await service
    .from("orgs")
    .select("name")
    .eq("id", invite.org_id)
    .maybeSingle();

  return NextResponse.json({
    email: invite.email,
    orgName: (org as { name: string } | null)?.name ?? "your organisation",
    role: invite.role as string,
  });
}
