/**
 * GET /api/dashboard  — progress stats scoped to the caller's role
 *
 * Returns:
 *   - Active or most recent assessment
 *   - Completion stats (done / unsure / skipped / total) for the caller's scope
 *   - Per-member breakdown (manager + org_admin only)
 *   - Cadence indicator: last_completed_at + days_since + status (green/amber/red)
 *
 * Scope rules:
 *   employee  → own responses only
 *   manager   → subtree (self + all direct/indirect reports)
 *   org_admin → entire org
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  buildSubtree,
} from "../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../lib/api/rateLimit";
import { type OrgMemberRow } from "../../../lib/db/types";

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

  // Load all org members (needed for subtree computation and member breakdown)
  const { data: allMembers, error: membersErr } = await supabase
    .from("org_members")
    .select("user_id, manager_user_id, role, is_it_executor, email")
    .eq("org_id", membership.org_id);

  if (membersErr || !allMembers) return apiError("Failed to load org members", 500);

  // Determine which user_ids are in scope for this caller
  let scopedUserIds: string[];
  if (membership.role === "org_admin") {
    scopedUserIds = allMembers.map((m) => m.user_id);
  } else if (membership.role === "manager") {
    scopedUserIds = buildSubtree(
      allMembers as Pick<OrgMemberRow, "user_id" | "manager_user_id">[],
      user.id
    );
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
    return NextResponse.json({
      assessment: null,
      stats: { total: 0, done: 0, unsure: 0, skipped: 0, percent: 0 },
      members: [],
      cadence: {
        last_completed_at: null,
        status: "never" as const,
      },
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

  const allResponses = responses ?? [];

  // Aggregate overall stats
  const done = allResponses.filter((r) => r.status === "done").length;
  const unsure = allResponses.filter((r) => r.status === "unsure").length;
  const skipped = allResponses.filter((r) => r.status === "skipped").length;

  const scopeSize = scopedUserIds.length;
  const totalPossible = totalItems * scopeSize;
  const percent =
    totalPossible === 0
      ? 0
      : Math.round(((done + unsure + skipped) / totalPossible) * 100);

  // Per-track stats aggregation (AC-TRACK-AGG-01/02/03)
  function trackStats(itemIds: Set<string>) {
    const trackResponses = allResponses.filter((r) => itemIds.has(r.assessment_item_id));
    const tDone = trackResponses.filter((r) => r.status === "done").length;
    const tUnsure = trackResponses.filter((r) => r.status === "unsure").length;
    const tSkipped = trackResponses.filter((r) => r.status === "skipped").length;
    const tTotal = itemIds.size * scopeSize;
    return {
      total: itemIds.size,
      done: tDone,
      unsure: tUnsure,
      skipped: tSkipped,
      percent: tTotal === 0 ? 0 : Math.round(((tDone + tUnsure + tSkipped) / tTotal) * 100),
    };
  }

  // Per-member breakdown (only for manager + org_admin)
  type MemberStat = {
    user_id: string;
    email: string | null;
    display_name: string | null;
    role: string;
    is_it_executor: boolean;
    done: number;
    unsure: number;
    skipped: number;
    total: number;
    percent: number;
  };

  let memberBreakdown: MemberStat[] = [];

  if (membership.role !== "employee") {
    memberBreakdown = scopedUserIds.map((uid) => {
      const memberResponses = allResponses.filter((r) => r.user_id === uid);
      const mDone = memberResponses.filter((r) => r.status === "done").length;
      const mUnsure = memberResponses.filter((r) => r.status === "unsure").length;
      const mSkipped = memberResponses.filter((r) => r.status === "skipped").length;
      const memberMembership = allMembers.find((m) => m.user_id === uid);
      const isItExecutor = memberMembership?.is_it_executor ?? false;

      // Fix denominator: non-IT-executors only have awareness items (AC-TRACK-AGG-02)
      const memberTotal = isItExecutor ? totalItems : awarenessCount;

      return {
        user_id: uid,
        email: memberMembership?.email ?? null,
        display_name: (memberMembership as Record<string, unknown>)?.display_name as string ?? null,
        role: memberMembership?.role ?? "employee",
        is_it_executor: isItExecutor,
        done: mDone,
        unsure: mUnsure,
        skipped: mSkipped,
        total: memberTotal,
        percent:
          memberTotal === 0
            ? 0
            : Math.round(((mDone + mUnsure + mSkipped) / memberTotal) * 100),
      };
    });
  }

  return NextResponse.json({
    assessment: latestAssessment,
    stats: {
      total: totalItems,
      done,
      unsure,
      skipped,
      percent,
      by_track: {
        it_baseline: trackStats(itBaselineItemIds),
        awareness: trackStats(awarenessItemIds),
      },
    },
    members: memberBreakdown,
    cadence: {
      last_completed_at: lastCompletedAt,
      status: cadenceStatus(lastCompletedAt),
    },
  });
}
