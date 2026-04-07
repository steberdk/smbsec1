/**
 * GET /api/dashboard/members/[userId]  — per-item drill-down for a team member
 *
 * Returns the member's profile info and their per-item assessment responses,
 * so an admin or manager can see exactly which items they answered and how.
 *
 * Auth rules:
 *   - Caller must be authenticated
 *   - Caller must be org_admin (sees any member) or manager (target must be in subtree)
 *   - Employees cannot access this endpoint
 *
 * Item visibility:
 *   - IT executors see all items (awareness + it_baseline)
 *   - Non-IT-executors see only awareness items
 *
 * Items are ordered by order_index.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  const { userId: targetUserId } = await params;
  const supabase = supabaseForRequest(req);

  // Authenticate caller
  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  // Caller must belong to an org
  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  // Only org_admin can access member drill-down
  if (!hasRole(membership, "org_admin")) {
    return apiError("Forbidden", 403);
  }

  // Load all org members
  const { data: allMembers, error: membersErr } = await supabase
    .from("org_members")
    .select("user_id, role, is_it_executor, email, display_name")
    .eq("org_id", membership.org_id);

  if (membersErr || !allMembers) return apiError("Failed to load org members", 500);

  // Find the target member
  const targetMember = allMembers.find((m) => m.user_id === targetUserId);
  if (!targetMember) return apiError("Member not found", 404);

  // Load active assessment (or most recent)
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, scope, root_user_id, status, created_at, completed_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const activeAssessment = assessments?.find((a) => a.status === "active") ?? null;
  const latestAssessment = activeAssessment ?? assessments?.[0] ?? null;

  if (!latestAssessment) {
    return NextResponse.json({
      member: {
        user_id: targetMember.user_id,
        email: targetMember.email ?? null,
        display_name: targetMember.display_name ?? null,
        role: targetMember.role,
        is_it_executor: targetMember.is_it_executor ?? false,
      },
      items: [],
    });
  }

  // Load all assessment items ordered by order_index
  const { data: items, error: itemsErr } = await supabase
    .from("assessment_items")
    .select("id, title, track, impact, order_index")
    .eq("assessment_id", latestAssessment.id)
    .order("order_index", { ascending: true });

  if (itemsErr) return apiError(itemsErr.message, 500);

  const allItems = items ?? [];

  // Filter items based on target member's visibility
  const isItExecutor = targetMember.is_it_executor ?? false;
  const visibleItems = isItExecutor
    ? allItems
    : allItems.filter((i) => i.track === "awareness");

  // Load target user's responses for this assessment
  const { data: responses, error: responsesErr } = await supabase
    .from("assessment_responses")
    .select("assessment_item_id, status")
    .eq("assessment_id", latestAssessment.id)
    .eq("user_id", targetUserId);

  if (responsesErr) return apiError(responsesErr.message, 500);

  // Build a lookup map for responses
  const responseMap = new Map(
    (responses ?? []).map((r) => [r.assessment_item_id, r.status])
  );

  // Build the response items array
  const itemsWithStatus = visibleItems.map((item) => ({
    id: item.id,
    title: item.title,
    track: item.track,
    impact: item.impact,
    status: responseMap.get(item.id) ?? null,
  }));

  return NextResponse.json({
    member: {
      user_id: targetMember.user_id,
      email: targetMember.email ?? null,
      display_name: targetMember.display_name ?? null,
      role: targetMember.role,
      is_it_executor: isItExecutor,
    },
    items: itemsWithStatus,
  });
}
