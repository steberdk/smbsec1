/**
 * DELETE /api/campaigns/templates/custom/[id] — delete a custom template (org_admin only)
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin"))
    return apiError("Only org admins can delete custom templates", 403);

  // Verify the template belongs to this org and is custom
  const { data: template, error: findErr } = await supabase
    .from("campaign_templates")
    .select("id, org_id, custom")
    .eq("id", id)
    .maybeSingle();

  if (findErr) return apiError(findErr.message, 500);
  if (!template) return apiError("Template not found", 404);
  if (!template.custom || template.org_id !== membership.org_id) {
    return apiError("Cannot delete system templates", 403);
  }

  // Check if template is used in any campaigns
  const { count } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("template_id", id);

  if ((count ?? 0) > 0) {
    // Soft-delete by marking inactive instead of hard delete
    await supabase
      .from("campaign_templates")
      .update({ active: false })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      message: "Template deactivated (in use by existing campaigns)",
    });
  }

  const { error: deleteErr } = await supabase
    .from("campaign_templates")
    .delete()
    .eq("id", id);

  if (deleteErr) return apiError(deleteErr.message, 500);

  return NextResponse.json({ ok: true });
}
