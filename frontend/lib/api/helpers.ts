/**
 * Shared helpers for API route handlers.
 *
 * Provides: typed error responses, auth validation, org membership lookup,
 * and role checks.
 */

import { NextResponse } from "next/server";
import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { type OrgMemberRow, type OrgRole } from "../db/types";

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Validates the JWT already embedded in the Supabase client and returns the
 * authenticated user, or null if the token is missing/invalid.
 */
export async function getUser(supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

// ---------------------------------------------------------------------------
// Org membership
// ---------------------------------------------------------------------------

/**
 * Returns the org_members row for the given user, or null if they are not a
 * member of any org.
 *
 * MVP assumption: each user belongs to at most one org.
 */
export async function getOrgMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgMemberRow | null> {
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, user_id, role, is_it_executor, email, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrgMemberRow;
}

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<OrgRole, number> = {
  org_admin: 2,
  employee: 1,
};

/**
 * Returns true if the membership role is at least minRole.
 * org_admin >= employee
 */
export function hasRole(membership: OrgMemberRow, minRole: OrgRole): boolean {
  return ROLE_RANK[membership.role] >= ROLE_RANK[minRole];
}
