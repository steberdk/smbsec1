/**
 * GET   /api/orgs/me  — return current user's org + settings + membership
 * PATCH /api/orgs/me  — update org settings (org_admin only)
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../lib/api/helpers";
import {
  type EmailPlatform,
  type PrimaryOs,
  type CompanySize,
} from "../../../../lib/db/types";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  const { data: org, error: orgErr } = await supabase
    .from("orgs")
    .select("id, name, created_by, created_at, email_platform, primary_os, company_size, campaign_credits, subscription_status, locale")
    .eq("id", membership.org_id)
    .single();

  if (orgErr || !org) return apiError("Organisation not found", 404);

  return NextResponse.json({
    org,
    membership,
  });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  type PatchBody = {
    name?: string;
    email_platform?: EmailPlatform | null;
    primary_os?: PrimaryOs | null;
    company_size?: CompanySize | null;
    locale?: string;
  };

  const body: PatchBody = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Invalid JSON body", 400);

  // Only allow known fields to be patched
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return apiError("name must be a non-empty string", 400);
    }
    update.name = body.name.trim();
  }
  if (body.email_platform !== undefined) update.email_platform = body.email_platform;
  if (body.primary_os !== undefined) update.primary_os = body.primary_os;
  if (body.company_size !== undefined) update.company_size = body.company_size;
  if (body.locale !== undefined) {
    const validLocales = ["en", "da"];
    if (!validLocales.includes(body.locale)) {
      return apiError("locale must be one of: en, da", 400);
    }
    update.locale = body.locale;
  }

  if (Object.keys(update).length === 0) {
    return apiError("No valid fields to update", 400);
  }

  const { data: org, error: updateErr } = await supabase
    .from("orgs")
    .update(update)
    .eq("id", membership.org_id)
    .select()
    .single();

  if (updateErr || !org) {
    return apiError(updateErr?.message ?? "Failed to update organisation", 500);
  }

  return NextResponse.json({ org });
}
