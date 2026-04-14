/**
 * /api/orgs/members
 *
 *   GET  — list all members of the caller's org (org_admin only).
 *   DELETE — remove a member (joined OR pending invite) with full GDPR cascade
 *            via smbsec1.delete_member_with_data RPC (F-033 PI 14 Iter 3).
 *
 * Both handlers require org_admin role. The DELETE handler accepts the target
 * email via the `?email=` query string (supports pending invites that have no
 * member_id yet).
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import { apiError, getUser, getOrgMembership, hasRole } from "../../../../lib/api/helpers";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, is_it_executor, email, display_name, created_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ members: data ?? [] });
}

/**
 * DELETE /api/orgs/members?email=<target>
 *
 * F-033: Owner removes a team member (joined or pending invite) with full
 * GDPR cascade. Calls smbsec1.delete_member_with_data RPC (migration 024).
 *
 * Graceful fallback: if migration 024 has not been applied yet, returns
 * 503 { error: "migration_pending" } so the UI can skip cleanly.
 */
export async function DELETE(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").trim();
  if (!email) return apiError("email query parameter is required", 400);

  // Sanity: must look like an email (keep loose — RPC also lowercases).
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return apiError("email must be a valid email address", 400);
  }

  let data: unknown;
  let error: { message?: string; code?: string } | null = null;
  try {
    const rpc = await supabase.rpc("delete_member_with_data", {
      p_org_id: membership.org_id,
      p_target_email: email,
      p_actor_user_id: user.id,
    });
    data = rpc.data;
    error = rpc.error as { message?: string; code?: string } | null;
  } catch (e) {
    // Network/transport or unexpected throw from the client.
    error = { message: e instanceof Error ? e.message : String(e) };
  }

  if (error) {
    const msg = error.message ?? "";
    const code = error.code ?? "";
    // F-049 AC-2: classify "any missing function in the RPC chain" (incl. the
    // RPC itself, and pgcrypto's digest() called from inside the RPC when the
    // extension is absent) as `migration_pending` so the client's 503 branch
    // fires. SQLSTATE 42883 = undefined_function.
    const missingFunction =
      code === "42883" ||
      /function .* does not exist/i.test(msg) ||
      /could not find the function/i.test(msg);
    if (missingFunction) {
      return NextResponse.json(
        {
          error: "migration_pending",
          detail:
            "apply docs/sql/024_pi14_member_deletion_rpc.sql + ensure pgcrypto extension is enabled",
        },
        { status: 503 }
      );
    }
    // INV-no-raw-db-errors: never let a raw Postgres error body reach the
    // client. Log the detail server-side; respond with a generic message.
    console.error("[DELETE /api/orgs/members] RPC error:", { code, msg });
    return apiError("Member deletion failed — please retry or contact support.", 500);
  }

  // The RPC returns jsonb — supabase-js returns it as a JS object.
  const result = (data ?? {}) as {
    success?: boolean;
    error?: string;
    responses_deleted?: number;
    campaigns_deleted?: number;
    invites_deleted?: number;
    was_it_executor?: boolean;
    target_was_member?: boolean;
  };

  if (!result.success) {
    const errCode = result.error ?? "unknown_error";
    // F-060 AC-2 defense-in-depth: the RPC catches its own errors via
    // `EXCEPTION WHEN OTHERS` and returns { success:false, error: SQLERRM }.
    // If SQLERRM references a missing function (typical cause: pgcrypto not
    // on the function's search_path → `digest(text, unknown) does not exist`),
    // map to the same 503 `migration_pending` branch as the outer
    // supabase-js error path. Apply migration 027 to fix permanently.
    if (
      /function .* does not exist/i.test(errCode) ||
      /SQLSTATE 42883/i.test(errCode)
    ) {
      return NextResponse.json(
        {
          error: "migration_pending",
          detail: "apply docs/sql/027_pi17_fix_pgcrypto_on_supabase.sql",
        },
        { status: 503 }
      );
    }
    const status =
      errCode === "cannot_remove_self" || errCode === "cannot_remove_last_owner"
        ? 400
        : 500;
    // INV-no-raw-db-errors: never leak raw Postgres text. Map unknown
    // internal RPC errors to a non-raw response.
    const safeErr =
      /function |SQLSTATE|relation |column /i.test(errCode)
        ? "Member deletion failed — please retry or contact support."
        : errCode;
    return apiError(safeErr, status);
  }

  return NextResponse.json({
    success: true,
    responses_deleted: result.responses_deleted ?? 0,
    campaigns_deleted: result.campaigns_deleted ?? 0,
    invites_deleted: result.invites_deleted ?? 0,
    was_it_executor: result.was_it_executor ?? false,
    target_was_member: result.target_was_member ?? false,
  });
}
