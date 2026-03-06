/**
 * POST /api/assessments  — start a new assessment (snapshots checklist_items)
 * GET  /api/assessments  — list assessments for the caller's org
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../lib/api/helpers";
import { type ChecklistItemRow } from "../../../lib/db/types";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  const { data, error } = await supabase
    .from("assessments")
    .select("id, org_id, created_by, scope, root_user_id, status, created_at, completed_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ assessments: data ?? [] });
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "manager")) return apiError("Forbidden", 403);

  type AssessmentBody = {
    scope: "org" | "subtree";
    root_user_id?: string;
  };

  const body: AssessmentBody = await req.json().catch(() => null);
  if (!body || !["org", "subtree"].includes(body.scope)) {
    return apiError("scope must be 'org' or 'subtree'", 400);
  }

  // Subtree scope: only managers; root_user_id must be caller's own id
  if (body.scope === "subtree") {
    if (membership.role === "org_admin") {
      return apiError("Org admins must use scope 'org' for org-wide assessments", 400);
    }
    if (!body.root_user_id) {
      return apiError("root_user_id is required for subtree scope", 400);
    }
    if (body.root_user_id !== user.id) {
      // Managers can only start subtree assessments rooted at themselves (AC-SCOPE-2)
      return apiError("root_user_id must be your own user id for subtree assessments", 403);
    }
  }

  // Org scope requires org_admin
  if (body.scope === "org" && !hasRole(membership, "org_admin")) {
    return apiError("Only org admins can start an org-wide assessment", 403);
  }

  // Check for existing active assessment (AC-ASMT-1)
  // The DB unique partial index enforces this at DB level (409 from constraint),
  // but we check proactively for a clearer error message.
  const { data: active } = await supabase
    .from("assessments")
    .select("id")
    .eq("org_id", membership.org_id)
    .eq("status", "active")
    .maybeSingle();

  if (active) {
    return apiError("An assessment is already in progress for this organisation", 409);
  }

  // Read all active checklist items from the master table (source of truth)
  const { data: items, error: itemsErr } = await supabase
    .from("checklist_items")
    .select(
      "id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index"
    )
    .eq("active", true)
    .order("order_index", { ascending: true });

  if (itemsErr || !items || items.length === 0) {
    return apiError("Failed to load checklist items", 500);
  }

  // Insert assessment record
  const { data: assessment, error: assessErr } = await supabase
    .from("assessments")
    .insert({
      org_id: membership.org_id,
      created_by: user.id,
      scope: body.scope,
      root_user_id: body.scope === "subtree" ? user.id : null,
      status: "active",
    })
    .select()
    .single();

  if (assessErr || !assessment) {
    if (assessErr?.code === "23505") {
      // Unique partial index fired — race condition with another concurrent create
      return apiError("An assessment is already in progress for this organisation", 409);
    }
    return apiError(assessErr?.message ?? "Failed to create assessment", 500);
  }

  // Snapshot all active checklist items into assessment_items (AC-ASMT-3)
  // description field stores the outcome for display in historical views
  const snapshot = (items as ChecklistItemRow[]).map((item) => ({
    assessment_id: assessment.id,
    checklist_item_id: item.id,
    group_id: item.group_id,
    title: item.title,
    description: item.outcome,
    order_index: item.order_index,
    track: item.track,
    impact: item.impact,
    effort: item.effort,
  }));

  const { error: snapshotErr } = await supabase
    .from("assessment_items")
    .insert(snapshot);

  if (snapshotErr) {
    // Rollback assessment row on snapshot failure
    await supabase.from("assessments").delete().eq("id", assessment.id);
    return apiError("Failed to snapshot checklist items: " + snapshotErr.message, 500);
  }

  return NextResponse.json({ assessment }, { status: 201 });
}
