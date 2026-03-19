/**
 * GET /api/assessments/:id/responses/me  — get the caller's responses for an assessment
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../../../lib/supabase/server";
import { apiError, getUser, getOrgMembership } from "../../../../../../lib/api/helpers";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: assessmentId } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  // Verify assessment belongs to caller's org
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id")
    .eq("id", assessmentId)
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (!assessment) return apiError("Assessment not found", 404);

  const { data: responses, error } = await supabase
    .from("assessment_responses")
    .select("assessment_item_id, status, updated_at, verification_status")
    .eq("assessment_id", assessmentId)
    .eq("user_id", user.id);

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ responses: responses ?? [] });
}
