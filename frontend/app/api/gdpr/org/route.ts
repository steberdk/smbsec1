/**
 * DELETE /api/gdpr/org  — hard delete the entire organisation (org_admin only)
 *
 * Requires { confirm_name: "<org name>" } in the request body as a step-up
 * confirmation guard.
 *
 * Before deletion, writes an audit log entry (survives CASCADE delete) with:
 *   - org_id, org_name, actor email, member count, timestamp
 *
 * ON DELETE CASCADE in the DB handles:
 *   org → org_members → (assessment_responses via user cascade)
 *   org → assessments → assessment_items
 *   org → assessments → assessment_responses
 *   org → invites
 *   org → campaigns → campaign_recipients
 *
 * Satisfies AC-DEL-4.
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

export async function DELETE(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  const body: { confirm_name?: string } = await req.json().catch(() => null);
  if (!body?.confirm_name || typeof body.confirm_name !== "string") {
    return apiError("confirm_name is required", 400);
  }

  // Fetch org to verify the confirmation name
  const { data: org, error: orgErr } = await supabase
    .from("orgs")
    .select("id, name")
    .eq("id", membership.org_id)
    .single();

  if (orgErr || !org) return apiError("Organisation not found", 404);

  if (body.confirm_name.trim() !== org.name.trim()) {
    return apiError("Organisation name does not match. Deletion cancelled.", 400);
  }

  // Gather audit context before deletion (member count, actor email)
  const { count: memberCount } = await supabase
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", membership.org_id);

  const actorEmail = user.email ?? membership.email ?? "unknown";

  // Write audit log BEFORE deletion (audit_logs has no FK to orgs — survives CASCADE)
  const { error: auditErr } = await supabase
    .from("audit_logs")
    .insert({
      event_type: "org_deleted",
      org_id: org.id,
      org_name: org.name,
      actor_user_id: user.id,
      actor_email: actorEmail,
      details: {
        member_count: memberCount ?? 0,
        reason: "user_requested",
        confirm_name: body.confirm_name.trim(),
      },
    });

  if (auditErr) {
    // Log but do not block deletion — audit failure should not prevent GDPR compliance
    console.error("Failed to write org deletion audit log:", auditErr.message);
  }

  // Hard delete — cascades destroy all dependent records
  const { error: deleteErr } = await supabase
    .from("orgs")
    .delete()
    .eq("id", membership.org_id);

  if (deleteErr) return apiError(deleteErr.message, 500);

  return NextResponse.json({ ok: true });
}
