/**
 * DELETE /api/gdpr/members/:id  — hard delete an employee (org_admin only)
 *
 * Removes:
 *   - org_members row (cascades: assessment_responses via ON DELETE CASCADE)
 *   - Any pending invites sent by this user
 *
 * Satisfies AC-DEL-1, AC-DEL-2.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../../lib/api/helpers";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: targetUserId } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  // Cannot delete yourself
  if (targetUserId === user.id) {
    return apiError(
      "Cannot delete yourself. Transfer ownership or delete the organisation instead.",
      400
    );
  }

  // Verify target is in the same org
  const { data: target, error: targetErr } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", membership.org_id)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetErr || !target) return apiError("Member not found in this organisation", 404);

  // Cannot delete another org_admin (safety guard)
  if (target.role === "org_admin") {
    return apiError("Cannot delete an org admin via this route", 400);
  }

  // Delete org_members row — ON DELETE CASCADE removes assessment_responses
  const { error: deleteErr } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", membership.org_id)
    .eq("user_id", targetUserId);

  if (deleteErr) return apiError(deleteErr.message, 500);

  // Also clean up any pending invites created by or sent to this user
  await supabase
    .from("invites")
    .delete()
    .eq("org_id", membership.org_id)
    .eq("invited_by", targetUserId);

  return NextResponse.json({ ok: true });
}
