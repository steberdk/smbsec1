/**
 * DELETE /api/gdpr/me  — hard delete the calling user's own account
 *
 * Blockers:
 *   - org_admin with other members → must delete org first
 *
 * On success removes:
 *   - org_members row (cascades: assessment_responses)
 *   - pending invites created by this user
 *   - Supabase auth user record
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import { apiError, getUser, getOrgMembership } from "../../../../lib/api/helpers";

export const runtime = "nodejs";

export async function DELETE(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  // Blocker: org_admin cannot self-delete while other members exist
  if (membership.role === "org_admin") {
    const { count } = await supabase
      .from("org_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", membership.org_id)
      .neq("user_id", user.id);

    if ((count ?? 0) > 0) {
      return apiError(
        "You are the org admin and other members exist. Delete the organisation first, or have another admin remove you.",
        409
      );
    }
  }

  // Delete org_members row — cascades to assessment_responses
  const { error: memberErr } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", membership.org_id)
    .eq("user_id", user.id);

  if (memberErr) return apiError(memberErr.message, 500);

  // Clean up pending invites created by this user
  await supabase
    .from("invites")
    .delete()
    .eq("org_id", membership.org_id)
    .eq("invited_by", user.id);

  // Delete Supabase auth user (requires service role)
  const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
  if (authErr) return apiError("Account data removed but auth deletion failed: " + authErr.message, 500);

  return NextResponse.json({ ok: true });
}
