/**
 * GET /api/gdpr/export  — export all org data (org_admin only)
 *
 * Returns a JSON document containing all personal data stored for the org:
 *   - Org record
 *   - All members (user_id, role, is_it_executor)
 *   - All assessments + items
 *   - All responses per user
 *   - All invites (accepted + pending)
 *
 * Satisfies AC-GDPR-1.
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

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  const orgId = membership.org_id;

  // Fetch all data in parallel
  const [orgResult, membersResult, assessmentsResult, invitesResult] =
    await Promise.all([
      supabase
        .from("orgs")
        .select("id, name, created_by, created_at, email_platform, primary_os, company_size")
        .eq("id", orgId)
        .single(),

      supabase
        .from("org_members")
        .select("user_id, role, manager_user_id, is_it_executor, created_at")
        .eq("org_id", orgId),

      supabase
        .from("assessments")
        .select("id, created_by, scope, root_user_id, status, created_at, completed_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),

      supabase
        .from("invites")
        .select("id, invited_by, email, role, is_it_executor, created_at, expires_at, accepted_at")
        .eq("org_id", orgId),
    ]);

  if (orgResult.error || !orgResult.data) return apiError("Organisation not found", 404);

  // Fetch items + responses for each assessment
  const assessmentIds = (assessmentsResult.data ?? []).map((a) => a.id);

  const [itemsResult, responsesResult] = await Promise.all([
    assessmentIds.length > 0
      ? supabase
          .from("assessment_items")
          .select("id, assessment_id, checklist_item_id, group_id, title, track, order_index")
          .in("assessment_id", assessmentIds)
      : Promise.resolve({ data: [], error: null }),

    assessmentIds.length > 0
      ? supabase
          .from("assessment_responses")
          .select("assessment_id, assessment_item_id, user_id, status, updated_at")
          .in("assessment_id", assessmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (membersResult.error) return apiError(membersResult.error.message, 500);
  if (assessmentsResult.error) return apiError(assessmentsResult.error.message, 500);

  const exportData = {
    exported_at: new Date().toISOString(),
    exported_by: user.id,
    org: orgResult.data,
    members: membersResult.data ?? [],
    assessments: (assessmentsResult.data ?? []).map((assessment) => ({
      ...assessment,
      items: (itemsResult.data ?? []).filter(
        (i) => i.assessment_id === assessment.id
      ),
      responses: (responsesResult.data ?? []).filter(
        (r) => r.assessment_id === assessment.id
      ),
    })),
    invites: invitesResult.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="smbsec-export-${orgId}-${Date.now()}.json"`,
    },
  });
}
