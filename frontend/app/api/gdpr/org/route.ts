/**
 * DELETE /api/gdpr/org  — hard delete the entire organisation (org_admin only)
 *
 * Requires { confirm_name: "<org name>" } in the request body as a step-up
 * confirmation guard.
 *
 * ON DELETE CASCADE in the DB handles:
 *   org → org_members → (assessment_responses via user cascade)
 *   org → assessments → assessment_items
 *   org → assessments → assessment_responses
 *   org → invites
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

  // Hard delete — cascades destroy all dependent records
  const { error: deleteErr } = await supabase
    .from("orgs")
    .delete()
    .eq("id", membership.org_id);

  if (deleteErr) return apiError(deleteErr.message, 500);

  return NextResponse.json({ ok: true });
}
