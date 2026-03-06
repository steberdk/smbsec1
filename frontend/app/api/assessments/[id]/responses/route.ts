/**
 * PUT /api/assessments/:id/responses  — upsert a single item response
 *
 * Validates:
 *   - Assessment is active
 *   - Item belongs to this assessment
 *   - Caller is within the assessment's scope (AC-SCOPE-1)
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  buildSubtree,
} from "../../../../../lib/api/helpers";
import { type ResponseStatus, type OrgMemberRow } from "../../../../../lib/db/types";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: assessmentId } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  type ResponseBody = {
    assessment_item_id: string;
    status: ResponseStatus;
  };

  const body: ResponseBody = await req.json().catch(() => null);
  if (!body?.assessment_item_id || !body?.status) {
    return apiError("assessment_item_id and status are required", 400);
  }
  const validStatuses: ResponseStatus[] = ["done", "unsure", "skipped"];
  if (!validStatuses.includes(body.status)) {
    return apiError("status must be done, unsure, or skipped", 400);
  }

  // Load assessment
  const { data: assessment, error: assessErr } = await supabase
    .from("assessments")
    .select("id, org_id, scope, root_user_id, status")
    .eq("id", assessmentId)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (assessErr || !assessment) return apiError("Assessment not found", 404);
  if (assessment.status !== "active") {
    return apiError("Assessment is not active", 409);
  }

  // Validate the item belongs to this assessment
  const { data: item } = await supabase
    .from("assessment_items")
    .select("id")
    .eq("id", body.assessment_item_id)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (!item) return apiError("Assessment item not found", 404);

  // Scope validation (AC-SCOPE-1)
  if (assessment.scope === "subtree" && assessment.root_user_id) {
    const { data: allMembers } = await supabase
      .from("org_members")
      .select("user_id, manager_user_id")
      .eq("org_id", membership.org_id);

    const subtree = buildSubtree(
      (allMembers ?? []) as Pick<OrgMemberRow, "user_id" | "manager_user_id">[],
      assessment.root_user_id
    );

    if (!subtree.includes(user.id)) {
      return apiError("You are not within the scope of this assessment", 403);
    }
  }

  // Upsert response (primary key: assessment_item_id + user_id)
  const { error: upsertErr } = await supabase
    .from("assessment_responses")
    .upsert(
      {
        assessment_id: assessmentId,
        assessment_item_id: body.assessment_item_id,
        user_id: user.id,
        status: body.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "assessment_item_id,user_id" }
    );

  if (upsertErr) return apiError(upsertErr.message, 500);

  return NextResponse.json({ ok: true });
}
