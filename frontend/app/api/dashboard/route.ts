/**
 * GET /api/dashboard  — progress stats scoped to the caller's role
 *
 * Returns:
 *   - Active or most recent assessment
 *   - Completion stats (resolved / denominator / percent / per-track) via the
 *     shared helper at `lib/dashboard/computeStats.ts` (F-038/F-039/F-040).
 *   - `stats.me` sibling: the same shape scoped to just the caller (F-039).
 *   - Per-member breakdown (org_admin only), computed through the same helper.
 *   - Pending invitees as `members[]` rows with `pending: true` that do NOT
 *     contribute to `stats.denominator` (F-035).
 *   - Cadence indicator: last_completed_at + status.
 *
 * Scope rules:
 *   employee  → own responses only
 *   org_admin → entire org (joined members + pending invitees)
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
} from "../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../lib/api/rateLimit";
import {
  computeStats,
  computeTrackStats,
  computeMemberStats,
  type MemberLite,
  type ResponseRow,
} from "../../../lib/dashboard/computeStats";

export const runtime = "nodejs";

// Cadence thresholds (days)
const CADENCE_AMBER_DAYS = 76; // 90 - 14
const CADENCE_RED_DAYS = 90;

function cadenceStatus(lastCompletedAt: string | null): "green" | "amber" | "red" | "never" {
  if (!lastCompletedAt) return "never";
  const days = Math.floor(
    (Date.now() - new Date(lastCompletedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days >= CADENCE_RED_DAYS) return "red";
  if (days >= CADENCE_AMBER_DAYS) return "amber";
  return "green";
}

export async function GET(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);

  // Load all org members (needed for member breakdown)
  const { data: allMembersRaw, error: membersErr } = await supabase
    .from("org_members")
    .select("user_id, role, is_it_executor, email, display_name")
    .eq("org_id", membership.org_id);

  if (membersErr || !allMembersRaw) return apiError("Failed to load org members", 500);

  type MemberRow = {
    user_id: string;
    role: string;
    is_it_executor: boolean;
    email: string | null;
    display_name: string | null;
  };
  const allMembers = allMembersRaw as MemberRow[];

  // Determine which joined user_ids are in scope for this caller
  let scopedUserIds: string[];
  if (membership.role === "org_admin") {
    scopedUserIds = allMembers.map((m) => m.user_id);
  } else {
    // employee: own responses only
    scopedUserIds = [user.id];
  }

  // Load active assessment, or fall back to most recently completed
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, scope, root_user_id, status, created_at, completed_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const activeAssessment = assessments?.find((a) => a.status === "active") ?? null;
  const latestAssessment = activeAssessment ?? assessments?.[0] ?? null;

  // Last completed date (for cadence indicator)
  const lastCompleted = assessments?.find((a) => a.status === "completed") ?? null;
  const lastCompletedAt = lastCompleted?.completed_at ?? null;

  if (!latestAssessment) {
    // F-035: still expose pending invitees even without an assessment, so the
    // team list section can show them. Zero math contribution — harmless.
    const pendingRows = await loadPendingInviteRows(
      supabase,
      membership.org_id,
      membership.role === "org_admin",
    );
    return NextResponse.json({
      assessment: null,
      stats: {
        total: 0,
        denominator: 0,
        done: 0,
        unsure: 0,
        skipped: 0,
        resolved: 0,
        percent: 0,
        by_track: {
          it_baseline: emptyTrackStats(),
          awareness: emptyTrackStats(),
        },
        me: {
          total: 0,
          denominator: 0,
          done: 0,
          unsure: 0,
          skipped: 0,
          resolved: 0,
          percent: 0,
          by_track: {
            it_baseline: emptyTrackStats(),
            awareness: emptyTrackStats(),
          },
        },
      },
      members: pendingRows,
      cadence: {
        last_completed_at: null,
        status: "never" as const,
      },
      caller_is_it_executor: membership.is_it_executor,
    });
  }

  // Load all assessment items (to know total count and per-track breakdown)
  const { data: items, error: itemsErr } = await supabase
    .from("assessment_items")
    .select("id, track")
    .eq("assessment_id", latestAssessment.id);

  if (itemsErr) return apiError(itemsErr.message, 500);

  const allItems = items ?? [];
  const totalItems = allItems.length;
  const itBaselineItemIds = new Set(allItems.filter((i) => i.track === "it_baseline").map((i) => i.id));
  const awarenessItemIds = new Set(allItems.filter((i) => i.track === "awareness").map((i) => i.id));
  const awarenessCount = awarenessItemIds.size;

  // Load responses for scoped users only
  const { data: responses, error: responsesErr } = await supabase
    .from("assessment_responses")
    .select("user_id, assessment_item_id, status")
    .eq("assessment_id", latestAssessment.id)
    .in("user_id", scopedUserIds);

  if (responsesErr) return apiError(responsesErr.message, 500);

  const allResponses = (responses ?? []) as ResponseRow[];

  // Shape members for the helper (MemberLite expects { user_id, is_it_executor }).
  const memberLite: MemberLite[] = allMembers.map((m) => ({
    user_id: m.user_id,
    is_it_executor: m.is_it_executor,
  }));

  // --- Org-wide aggregate (F-038) -----------------------------------------
  const orgStats = computeStats({
    responses: allResponses,
    scopedUserIds,
    allMembers: memberLite,
    totalItems,
    awarenessCount,
  });
  const orgTrack = {
    it_baseline: computeTrackStats({
      responses: allResponses,
      itemIds: itBaselineItemIds,
      trackName: "it_baseline",
      scopedUserIds,
      allMembers: memberLite,
    }),
    awareness: computeTrackStats({
      responses: allResponses,
      itemIds: awarenessItemIds,
      trackName: "awareness",
      scopedUserIds,
      allMembers: memberLite,
    }),
  };

  // --- Caller-scoped aggregate (F-039) ------------------------------------
  const meStats = computeStats({
    responses: allResponses,
    scopedUserIds: [user.id],
    allMembers: memberLite,
    totalItems,
    awarenessCount,
  });
  const meTrack = {
    it_baseline: computeTrackStats({
      responses: allResponses,
      itemIds: itBaselineItemIds,
      trackName: "it_baseline",
      scopedUserIds: [user.id],
      allMembers: memberLite,
    }),
    awareness: computeTrackStats({
      responses: allResponses,
      itemIds: awarenessItemIds,
      trackName: "awareness",
      scopedUserIds: [user.id],
      allMembers: memberLite,
    }),
  };

  // --- Per-member breakdown (org_admin only) ------------------------------
  type MemberStat = {
    user_id: string;
    email: string | null;
    display_name: string | null;
    role: string;
    is_it_executor: boolean;
    pending: boolean;
    done: number;
    unsure: number;
    skipped: number;
    total: number;
    percent: number;
  };

  let memberBreakdown: MemberStat[] = [];

  if (membership.role !== "employee") {
    memberBreakdown = scopedUserIds.map((uid) => {
      const memberRow = allMembers.find((m) => m.user_id === uid);
      const isItExecutor = memberRow?.is_it_executor ?? false;
      const mStats = computeMemberStats({
        member: { user_id: uid, is_it_executor: isItExecutor },
        responses: allResponses,
        totalItems,
        awarenessCount,
      });
      return {
        user_id: uid,
        email: memberRow?.email ?? null,
        display_name: memberRow?.display_name ?? null,
        role: memberRow?.role ?? "employee",
        is_it_executor: isItExecutor,
        pending: false,
        done: mStats.done,
        unsure: mStats.unsure,
        skipped: mStats.skipped,
        total: mStats.denominator,
        percent: mStats.percent,
      };
    });

    // F-035 — append pending invitees with zero contribution.
    const pendingRows = await loadPendingInviteRows(
      supabase,
      membership.org_id,
      true,
    );
    memberBreakdown = [...memberBreakdown, ...pendingRows];
  }

  // Cadence status: time-based, but downgrade to amber if unsure ratio is too high
  let cStatus = cadenceStatus(lastCompletedAt);
  const answered = orgStats.done + orgStats.unsure + orgStats.skipped;
  if (cStatus === "green" && answered > 0 && orgStats.unsure / answered > 0.3) {
    cStatus = "amber";
  }

  return NextResponse.json({
    assessment: latestAssessment,
    stats: {
      // Authoritative F-038 fields:
      total: totalItems,
      denominator: orgStats.denominator,
      done: orgStats.done,
      unsure: orgStats.unsure,
      skipped: orgStats.skipped,
      resolved: orgStats.resolved,
      percent: orgStats.percent,
      by_track: orgTrack,
      // F-039 `stats.me` sibling:
      me: {
        total: meStats.total,
        denominator: meStats.denominator,
        done: meStats.done,
        unsure: meStats.unsure,
        skipped: meStats.skipped,
        resolved: meStats.resolved,
        percent: meStats.percent,
        by_track: meTrack,
      },
    },
    members: memberBreakdown,
    cadence: {
      last_completed_at: lastCompletedAt,
      status: cStatus,
    },
    caller_is_it_executor: membership.is_it_executor,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyTrackStats() {
  return {
    total: 0,
    denominator: 0,
    done: 0,
    unsure: 0,
    skipped: 0,
    resolved: 0,
    percent: 0,
  };
}

/**
 * F-035 — load pending (unaccepted, not-expired) invites for an org and
 * shape them as dashboard `members[]` rows with `pending: true`. They do NOT
 * contribute to `stats.denominator` because `computeStats` excludes `pending`
 * members from the sum.
 *
 * Returns `[]` for non-admins (the dashboard team list is admin-only).
 */
async function loadPendingInviteRows(
  supabase: ReturnType<typeof supabaseForRequest>,
  orgId: string,
  isAdmin: boolean,
): Promise<Array<{
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  is_it_executor: boolean;
  pending: boolean;
  invite_id: string;
  done: number;
  unsure: number;
  skipped: number;
  total: number;
  percent: number;
}>> {
  if (!isAdmin) return [];
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("invites")
    .select("id, email, role, is_it_executor, expires_at, accepted_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .gt("expires_at", nowIso)
    .order("email", { ascending: true });
  if (error || !data) return [];
  return (data as Array<{
    id: string;
    email: string;
    role: string;
    is_it_executor: boolean;
  }>).map((inv) => ({
    // `user_id` is a synthetic key — pending invitees have no auth.user yet.
    user_id: `pending:${inv.id}`,
    email: inv.email,
    display_name: null,
    role: inv.role,
    is_it_executor: inv.is_it_executor,
    pending: true,
    invite_id: inv.id,
    done: 0,
    unsure: 0,
    skipped: 0,
    total: 0,
    percent: 0,
  }));
}
