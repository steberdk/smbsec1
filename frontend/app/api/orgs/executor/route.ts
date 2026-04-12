/**
 * PUT /api/orgs/executor — reassign the IT executor role to a different member.
 *
 * F-041 PI 14 Iter 3: delegates to smbsec1.reassign_it_executor RPC so the
 * unset-then-set flip, response-count capture, and audit row all happen in a
 * single Postgres transaction. Only org_admin can reassign.
 *
 * Graceful fallback: if migration 025 is not yet applied, returns
 * 503 { error: "migration_pending" } so the UI + tests skip cleanly.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../lib/api/helpers";

export const runtime = "nodejs";

export async function PUT(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin")) return apiError("Forbidden", 403);

  const body: { user_id?: string } | null = await req.json().catch(() => null);
  if (!body?.user_id || typeof body.user_id !== "string") {
    return apiError("user_id is required", 400);
  }

  const { data, error } = await supabase.rpc("reassign_it_executor", {
    p_org_id: membership.org_id,
    p_new_user_id: body.user_id,
    p_actor_user_id: user.id,
  });

  if (error) {
    const msg = error.message ?? "";
    if (
      /function .*reassign_it_executor.* does not exist/i.test(msg) ||
      /could not find the function/i.test(msg)
    ) {
      return NextResponse.json(
        { error: "migration_pending", detail: "apply docs/sql/025_pi14_reassign_it_executor_rpc.sql" },
        { status: 503 }
      );
    }
    return apiError(msg || "RPC call failed", 500);
  }

  const result = (data ?? {}) as {
    success?: boolean;
    error?: string;
    response_count_transferred?: number;
    previous_it_executor_user_id?: string | null;
    new_it_executor_user_id?: string | null;
    active_assessment_id?: string | null;
    noop?: boolean;
  };

  if (!result.success) {
    const errCode = result.error ?? "unknown_error";
    const status = errCode === "new_assignee_not_in_org" ? 400 : 500;
    return apiError(errCode, status);
  }

  return NextResponse.json({
    ok: true,
    response_count_transferred: result.response_count_transferred ?? 0,
    previous_it_executor_user_id: result.previous_it_executor_user_id ?? null,
    new_it_executor_user_id: result.new_it_executor_user_id ?? body.user_id,
    active_assessment_id: result.active_assessment_id ?? null,
    noop: result.noop ?? false,
  });
}
