/**
 * PATCH /api/assessments/:id  — complete an active assessment
 * GET   /api/assessments/:id  — get assessment + its items
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  const { data: assessment, error: assessErr } = await supabase
    .from("assessments")
    .select("id, org_id, created_by, scope, root_user_id, status, created_at, completed_at")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (assessErr || !assessment) return apiError("Assessment not found", 404);

  const { data: items, error: itemsErr } = await supabase
    .from("assessment_items")
    .select("id, checklist_item_id, group_id, title, description, order_index, track, impact, effort")
    .eq("assessment_id", id)
    .order("order_index", { ascending: true });

  if (itemsErr) return apiError(itemsErr.message, 500);

  return NextResponse.json({ assessment, items: items ?? [] });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  // Fetch assessment — RLS scopes to caller's org
  const { data: assessment, error: fetchErr } = await supabase
    .from("assessments")
    .select("id, org_id, created_by, status")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (fetchErr || !assessment) return apiError("Assessment not found", 404);

  // Only creator or org_admin can complete (AC-ASMT-2 state machine)
  if (assessment.created_by !== user.id && !hasRole(membership, "org_admin")) {
    return apiError("Forbidden", 403);
  }

  const body: { status: string } = await req.json().catch(() => null);
  if (!body || body.status !== "completed") {
    return apiError("Only status 'completed' is a valid transition", 400);
  }

  // Can only transition active → completed (AC-ASMT-2)
  if (assessment.status !== "active") {
    return apiError("Assessment is not active", 409);
  }

  const { data: updated, error: updateErr } = await supabase
    .from("assessments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr || !updated) {
    return apiError(updateErr?.message ?? "Failed to complete assessment", 500);
  }

  return NextResponse.json({ assessment: updated });
}
