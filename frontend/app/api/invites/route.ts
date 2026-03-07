/**
 * POST /api/invites  — create a pending invite
 * GET  /api/invites  — list pending invites for the caller's org
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../lib/api/helpers";
import { sendInviteEmail } from "../../../lib/email/sendInvite";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  // Employees cannot view invites
  if (!hasRole(membership, "manager")) return apiError("Forbidden", 403);

  let query = supabase
    .from("invites")
    .select(
      "id, token, org_id, invited_by, email, role, manager_user_id, is_it_executor, created_at, expires_at, accepted_at"
    )
    .eq("org_id", membership.org_id)
    .is("accepted_at", null) // pending only
    .order("created_at", { ascending: false });

  // Managers only see their own invites; org_admin sees all
  if (membership.role === "manager") {
    query = query.eq("invited_by", user.id);
  }

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ invites: data ?? [] });
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "manager")) return apiError("Forbidden", 403);

  type InviteBody = {
    email: string;
    role: "manager" | "employee";
    is_it_executor?: boolean;
  };

  const body: InviteBody = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  if (!body.email || typeof body.email !== "string") {
    return apiError("email is required", 400);
  }
  if (!body.role || !["manager", "employee"].includes(body.role)) {
    return apiError("role must be manager or employee", 400);
  }

  const email = body.email.trim().toLowerCase();

  // Prevent inviting yourself
  const { data: inviterUser } = await supabase.auth.getUser();
  if (inviterUser?.user?.email?.toLowerCase() === email) {
    return apiError("Cannot invite yourself", 400);
  }

  // Note: checking existing membership by email requires a user lookup which is not
  // available server-side via the anon key. The DB unique partial index on invites
  // (org_id, lower(email)) prevents duplicate pending invites. The acceptance flow
  // handles the case where the invitee is already a member.

  // If is_it_executor requested, clear any existing it_executor in this org
  // so only one person holds the flag at a time.
  if (body.is_it_executor) {
    await supabase
      .from("org_members")
      .update({ is_it_executor: false })
      .eq("org_id", membership.org_id)
      .eq("is_it_executor", true);
  }

  const { data: invite, error: inviteErr } = await supabase
    .from("invites")
    .insert({
      org_id: membership.org_id,
      invited_by: user.id,
      email,
      role: body.role,
      manager_user_id: user.id, // invitee reports to inviter
      is_it_executor: body.is_it_executor ?? false,
    })
    .select(
      "id, token, org_id, invited_by, email, role, manager_user_id, is_it_executor, created_at, expires_at"
    )
    .single();

  if (inviteErr) {
    if (inviteErr.code === "23505") {
      // Unique constraint violation — pending invite already exists
      return apiError("A pending invite already exists for this email", 409);
    }
    return apiError(inviteErr.message, 500);
  }

  // Fetch org name for the email
  const { data: org } = await supabase
    .from("orgs")
    .select("name")
    .eq("id", membership.org_id)
    .single();

  // Send invite email — non-fatal if it fails
  const inviteRow = invite as unknown as {
    token: string; expires_at: string; role: string; is_it_executor: boolean;
  };
  await sendInviteEmail({
    toEmail: email,
    inviterEmail: user.email ?? "your admin",
    orgName: (org as { name: string } | null)?.name ?? "your organisation",
    role: inviteRow.role,
    isItExecutor: inviteRow.is_it_executor,
    inviteToken: inviteRow.token,
    expiresAt: inviteRow.expires_at,
  });

  return NextResponse.json({ invite }, { status: 201 });
}
