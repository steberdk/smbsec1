/**
 * POST /api/invites/accept  — accept a pending invite by token
 *
 * This is the one route that uses the service role client because the
 * accepting user is not yet in org_members when the insert runs, so their
 * JWT alone cannot satisfy the RLS INSERT policy.
 *
 * Flow:
 *   1. User signs up / logs in via Supabase Auth (standard flow)
 *   2. Browser calls this endpoint with the invite token
 *   3. We validate: token exists, not accepted, not expired, email matches
 *   4. Service client inserts org_members row + marks invite accepted
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import { supabaseServiceClient } from "../../../../lib/supabase/service";
import { apiError, getUser } from "../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Validate the calling user's JWT
  const supabase = supabaseForRequest(req);
  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const body: { token: string; display_name?: string } = await req.json().catch(() => null);
  if (!body?.token || typeof body.token !== "string") {
    return apiError("token is required", 400);
  }
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() || null : null;

  // 2. Look up invite using service client (bypasses RLS — invite row is not
  //    behind a policy the unauthenticated-to-org user can satisfy)
  const service = supabaseServiceClient();

  const { data: invite, error: inviteErr } = await service
    .from("invites")
    .select("id, org_id, email, role, is_it_executor, accepted_at, expires_at")
    .eq("token", body.token)
    .maybeSingle();

  if (inviteErr || !invite) return apiError("Invite not found", 404);

  // 3. Validate invite state
  if (invite.accepted_at !== null) {
    return apiError("Invite has already been accepted", 409);
  }
  if (new Date(invite.expires_at) < new Date()) {
    return apiError("Invite has expired", 410);
  }

  // 4. Confirm the authenticated user's email matches the invite email
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return apiError("This invite was sent to a different email address", 403);
  }

  // 5. Check not already a member of this org
  const { data: existingMember } = await service
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) {
    // Prevent org admin from accepting an invite to their own org
    if ((existingMember as { role?: string }).role === "org_admin") {
      return apiError("You are already the administrator of this organisation", 409);
    }
    return apiError("Already a member of this organisation", 409);
  }

  // 6. If this invite sets is_it_executor, clear any existing executor first
  if (invite.is_it_executor) {
    await service
      .from("org_members")
      .update({ is_it_executor: false })
      .eq("org_id", invite.org_id)
      .eq("is_it_executor", true);
  }

  // 7. Insert org_members row (privileged — bypasses RLS)
  //    Store email from invite for dashboard display (AC-NAMES-01)
  //    display_name added in migration 011 — include if provided, omit null to avoid
  //    error when column doesn't exist yet
  const memberRow: Record<string, unknown> = {
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
    is_it_executor: invite.is_it_executor,
    email: invite.email,
  };
  if (displayName) memberRow.display_name = displayName;

  const { error: memberErr } = await service.from("org_members").insert(memberRow);

  if (memberErr) return apiError(memberErr.message, 500);

  // 8. Mark invite as accepted
  const { error: acceptErr } = await service
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (acceptErr) {
    // Member row was inserted — non-fatal, but log for visibility
    console.error("Failed to mark invite accepted:", acceptErr.message);
  }

  return NextResponse.json({ ok: true, org_id: invite.org_id });
}
