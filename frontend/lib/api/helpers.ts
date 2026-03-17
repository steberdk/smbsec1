/**
 * Shared helpers for API route handlers.
 *
 * Provides: typed error responses, auth validation, org membership lookup,
 * role checks, and subtree computation.
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
    .select("org_id, user_id, role, manager_user_id, is_it_executor, email, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrgMemberRow;
}

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<OrgRole, number> = {
  org_admin: 3,
  manager: 2,
  employee: 1,
};

/**
 * Returns true if the membership role is at least minRole.
 * org_admin >= manager >= employee
 */
export function hasRole(membership: OrgMemberRow, minRole: OrgRole): boolean {
  return ROLE_RANK[membership.role] >= ROLE_RANK[minRole];
}

// ---------------------------------------------------------------------------
// Subtree computation (in-memory, suitable for small SMB orgs)
// ---------------------------------------------------------------------------

/**
 * Returns the set of user_ids in the subtree rooted at rootUserId,
 * including rootUserId itself.
 *
 * Uses a BFS over the provided members list — no recursive DB query needed
 * for the small orgs this product targets.
 */
export function buildSubtree(
  members: Pick<OrgMemberRow, "user_id" | "manager_user_id">[],
  rootUserId: string
): string[] {
  const result: string[] = [];
  const queue: string[] = [rootUserId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    for (const m of members) {
      if (m.manager_user_id === current) {
        queue.push(m.user_id);
      }
    }
  }

  return result;
}

/**
 * Returns true if targetUserId is within the subtree rooted at rootUserId.
 */
export function isInSubtree(
  members: Pick<OrgMemberRow, "user_id" | "manager_user_id">[],
  rootUserId: string,
  targetUserId: string
): boolean {
  return buildSubtree(members, rootUserId).includes(targetUserId);
}
