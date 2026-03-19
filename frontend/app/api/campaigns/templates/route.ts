/**
 * GET /api/campaigns/templates — list active campaign templates
 *
 * Returns system templates (org_id IS NULL) plus custom templates for the caller's org.
 * Supports optional ?locale=xx query parameter to filter templates.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import { apiError, getUser, getOrgMembership } from "../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);

  const url = new URL(req.url);
  const locale = url.searchParams.get("locale");

  // Fetch system templates (org_id IS NULL)
  let systemQuery = supabase
    .from("campaign_templates")
    .select("id, title, type, subject, preview_text, body_html, difficulty, checklist_item_id, locale, custom")
    .eq("active", true)
    .is("org_id", null);

  if (locale && locale !== "all") {
    systemQuery = systemQuery.in("locale", [locale, "en"]);
  }

  const { data: systemTemplates, error: sysErr } = await systemQuery
    .order("locale", { ascending: true })
    .order("title", { ascending: true });

  if (sysErr) return apiError(sysErr.message, 500);

  // Fetch custom templates for this org (if user has an org)
  let customTemplates: typeof systemTemplates = [];
  if (membership) {
    let customQuery = supabase
      .from("campaign_templates")
      .select("id, title, type, subject, preview_text, body_html, difficulty, checklist_item_id, locale, custom")
      .eq("active", true)
      .eq("org_id", membership.org_id)
      .eq("custom", true);

    if (locale && locale !== "all") {
      customQuery = customQuery.in("locale", [locale, "en"]);
    }

    const { data: orgTemplates } = await customQuery
      .order("created_at", { ascending: false });

    customTemplates = orgTemplates ?? [];
  }

  const allTemplates = [...(systemTemplates ?? []), ...(customTemplates ?? [])];

  return NextResponse.json({ templates: allTemplates });
}
