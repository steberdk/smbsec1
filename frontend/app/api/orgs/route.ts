/**
 * POST /api/orgs  — create a new organisation (onboarding)
 * GET  /api/orgs  — (unused; use /api/orgs/me for current user's org)
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../lib/supabase/server";
import { apiError, getUser, getOrgMembership } from "../../../lib/api/helpers";
import {
  type EmailPlatform,
  type PrimaryOs,
  type CompanySize,
} from "../../../lib/db/types";

export const runtime = "nodejs";

type ItHandling = "self" | "staff_member" | "external_it" | "not_sure";

type CreateOrgBody = {
  name: string;
  display_name?: string;
  email_platform?: EmailPlatform;
  primary_os?: PrimaryOs;
  company_size?: CompanySize;
  it_handling: ItHandling;
  // Required when it_handling = "staff_member"; optional for "external_it"
  it_person_email?: string;
  it_person_name?: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  // Block if user already has an org (MVP: one org per user)
  const existing = await getOrgMembership(supabase, user.id);
  if (existing) return apiError("User already belongs to an organisation", 409);

  // Block if user has a pending (unaccepted, unexpired) invite — they should accept it, not create a new org
  const { data: pendingInvite } = await supabase
    .from("invites")
    .select("id")
    .eq("email", user.email ?? "")
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (pendingInvite) {
    return apiError("You have a pending invitation. Please accept it instead of creating a new organisation.", 409);
  }

  const body: CreateOrgBody = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return apiError("name is required", 400);
  }
  if (!body.it_handling) {
    return apiError("it_handling is required", 400);
  }
  const validHandling: ItHandling[] = [
    "self",
    "staff_member",
    "external_it",
    "not_sure",
  ];
  if (!validHandling.includes(body.it_handling)) {
    return apiError("it_handling must be one of: self, staff_member, external_it, not_sure", 400);
  }
  if (
    body.it_handling === "staff_member" &&
    (!body.it_person_email || typeof body.it_person_email !== "string")
  ) {
    return apiError("it_person_email is required when it_handling is staff_member", 400);
  }

  // 1. Insert org
  const { data: org, error: orgErr } = await supabase
    .from("orgs")
    .insert({
      name: body.name.trim(),
      created_by: user.id,
      email_platform: body.email_platform ?? null,
      primary_os: body.primary_os ?? null,
      company_size: body.company_size ?? null,
    })
    .select()
    .single();

  if (orgErr || !org) {
    return apiError(orgErr?.message ?? "Failed to create organisation", 500);
  }

  // 2. Insert org_admin member row for creator
  // is_it_executor = true when owner handles IT themselves or chose "not_sure"
  const ownerIsItExecutor =
    body.it_handling === "self" || body.it_handling === "not_sure";

  const { error: memberErr } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "org_admin",
    is_it_executor: ownerIsItExecutor,
    display_name: body.display_name?.trim() || null,
    email: user.email ?? null,
  });

  if (memberErr) {
    // Best-effort cleanup — delete org if member insert fails
    await supabase.from("orgs").delete().eq("id", org.id);
    return apiError(memberErr.message, 500);
  }

  // 3. Create invite for IT person if applicable
  let inviteCreated = false;
  const itEmail = body.it_person_email?.trim().toLowerCase();

  if (
    (body.it_handling === "staff_member" || body.it_handling === "external_it") &&
    itEmail
  ) {
    const { error: inviteErr } = await supabase.from("invites").insert({
      org_id: org.id,
      invited_by: user.id,
      email: itEmail,
      role: "employee",
      is_it_executor: true,
    });

    if (inviteErr) {
      // Non-fatal — org and member were created successfully.
      // The owner can re-invite from Team Settings.
      console.error("Failed to create IT invite during onboarding:", inviteErr.message);
    } else {
      inviteCreated = true;
    }
  }

  return NextResponse.json({
    org,
    it_handling: body.it_handling,
    owner_is_it_executor: ownerIsItExecutor,
    it_invite_created: inviteCreated,
  });
}
