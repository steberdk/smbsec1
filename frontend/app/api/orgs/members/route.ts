/**
 * GET /api/orgs/members  — list all members of the caller's org
 *
 * Requires org_admin role (used by Settings & data page for member removal).
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import { apiError, getUser, getOrgMembership, hasRole } from "../../../../lib/api/helpers";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "manager")) return apiError("Forbidden", 403);

  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, is_it_executor, manager_user_id, email, display_name, created_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ members: data ?? [] });
}
