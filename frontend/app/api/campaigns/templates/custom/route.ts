/**
 * POST /api/campaigns/templates/custom — create a custom campaign template (org_admin only)
 * GET  /api/campaigns/templates/custom — list custom templates for caller's org
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

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin"))
    return apiError("Only org admins can view custom templates", 403);

  const { data, error } = await supabase
    .from("campaign_templates")
    .select("id, title, type, subject, preview_text, body_html, difficulty, checklist_item_id, locale, custom, created_at")
    .eq("org_id", membership.org_id)
    .eq("custom", true)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin"))
    return apiError("Only org admins can create custom templates", 403);

  type TemplateBody = {
    title: string;
    subject: string;
    body_html: string;
    body_text?: string;
    preview_text?: string;
    difficulty?: string;
    type?: string;
    checklist_item_id?: string;
    locale?: string;
  };

  const body: TemplateBody | null = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
    return apiError("title is required", 400);
  }
  if (!body.subject || typeof body.subject !== "string" || body.subject.trim() === "") {
    return apiError("subject is required", 400);
  }
  if (!body.body_html || typeof body.body_html !== "string" || body.body_html.trim() === "") {
    return apiError("body_html is required", 400);
  }

  const validTypes = ["phishing_email", "fake_invoice", "credential_harvest", "ceo_fraud", "knowledge_test"];
  const templateType = body.type && validTypes.includes(body.type) ? body.type : "phishing_email";

  const validDifficulties = ["easy", "medium", "hard"];
  const difficulty = body.difficulty && validDifficulties.includes(body.difficulty) ? body.difficulty : "medium";

  // Generate a unique ID for the custom template
  const id = `custom-${membership.org_id.slice(0, 8)}-${Date.now()}`;

  // Auto-generate plain text from HTML if not provided
  const bodyText = body.body_text?.trim() || body.body_html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const { data: template, error: insertErr } = await supabase
    .from("campaign_templates")
    .insert({
      id,
      title: body.title.trim(),
      type: templateType,
      subject: body.subject.trim(),
      preview_text: body.preview_text?.trim() || "",
      body_html: body.body_html.trim(),
      body_text: bodyText,
      difficulty,
      checklist_item_id: body.checklist_item_id || null,
      locale: body.locale || "en",
      active: true,
      custom: true,
      org_id: membership.org_id,
    })
    .select()
    .single();

  if (insertErr) return apiError(insertErr.message, 500);

  return NextResponse.json({ template }, { status: 201 });
}
