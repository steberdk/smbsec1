/**
 * DELETE /api/invites/:id  — revoke a pending invite
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../lib/api/helpers";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "manager")) return apiError("Forbidden", 403);

  // Fetch invite — RLS ensures it belongs to caller's org
  const { data: invite, error: fetchErr } = await supabase
    .from("invites")
    .select("id, org_id, invited_by, accepted_at")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (fetchErr || !invite) return apiError("Invite not found", 404);

  // Cannot revoke an already accepted invite
  if (invite.accepted_at !== null) {
    return apiError("Cannot revoke an invite that has already been accepted", 409);
  }

  // Managers can only revoke invites they created; org_admin can revoke any
  if (membership.role !== "org_admin" && invite.invited_by !== user.id) {
    return apiError("Forbidden", 403);
  }

  const { error: deleteErr } = await supabase
    .from("invites")
    .delete()
    .eq("id", id);

  if (deleteErr) return apiError(deleteErr.message, 500);

  return NextResponse.json({ ok: true });
}
