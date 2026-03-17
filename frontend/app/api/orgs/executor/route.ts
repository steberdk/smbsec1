/**
 * PUT /api/orgs/executor — reassign the IT executor role to a different member
 * Only org_admin can reassign.
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

export async function PUT(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  const body: { user_id: string } = await req.json().catch(() => null);
  if (!body?.user_id || typeof body.user_id !== "string") {
    return apiError("user_id is required", 400);
  }

  // Verify target is a member of this org
  const { data: targetMember } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", membership.org_id)
    .eq("user_id", body.user_id)
    .maybeSingle();

  if (!targetMember) return apiError("User is not a member of this organisation", 404);

  // Clear current executor
  await supabase
    .from("org_members")
    .update({ is_it_executor: false })
    .eq("org_id", membership.org_id)
    .eq("is_it_executor", true);

  // Set new executor
  const { error: setErr } = await supabase
    .from("org_members")
    .update({ is_it_executor: true })
    .eq("org_id", membership.org_id)
    .eq("user_id", body.user_id);

  if (setErr) return apiError(setErr.message, 500);

  return NextResponse.json({ ok: true });
}
