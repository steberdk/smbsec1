/**
 * F-038 / F-039 / F-040 — Single source of truth for dashboard arithmetic.
 *
 * This module is the ONLY place where the dashboard math lives. Any consumer
 * (api/dashboard route, workspace home, security report) MUST import from
 * here rather than re-derive totals client-side. That invariant is the thing
 * that F-040 ("security report drifted from dashboard") is fixing — and the
 * thing PI 13's phantom-Done closed the door on.
 *
 * Semantics (locked in docs/product/pi14/product_team_consensus.md §"F-038
 * AC-7"):
 *
 *  - `denominator` is a PER-MEMBER SUM. IT executors contribute `totalItems`,
 *    non-executors contribute `awarenessCount`. Pending invitees contribute
 *    ZERO (they are excluded from `scopedUserIds` or flagged `pending: true`).
 *  - `resolved = done + skipped`. Unsure is NOT in the numerator.
 *  - `percent = round(resolved / denominator * 100)`.
 *  - Per-track denominators multiply `itemIds.size` by the count of eligible
 *    scoped members for that track (IT baseline: only IT executors; Awareness:
 *    everyone non-pending).
 *  - When `scopedUserIds` is a single user, the same formula yields the
 *    `stats.me` shape used by F-039's "My checklist" card.
 */

export type ResponseRow = {
  user_id: string;
  assessment_item_id: string;
  status: "done" | "unsure" | "skipped";
};

export type MemberLite = {
  user_id: string;
  is_it_executor: boolean;
  /** When true, excludes this member from the denominator (F-035 pending invitee). */
  pending?: boolean;
};

export type Stats = {
  /** Informational: the largest unique-item set visible to the scoped set. */
  total: number;
  /** Per-member sum of applicable items — the denominator for `percent`. */
  denominator: number;
  done: number;
  unsure: number;
  skipped: number;
  /** `done + skipped`. Unsure is NOT counted as resolved. */
  resolved: number;
  /** `round(resolved / denominator * 100)`, or 0 when denominator == 0. */
  percent: number;
};

export type TrackStats = Stats;

/**
 * Compute org-wide (or caller-scoped) stats.
 *
 * Call with `scopedUserIds = [callerId]` to get the F-039 `stats.me` shape.
 * Call with all org member ids to get the dashboard top-line.
 * Pending invitees in `allMembers` are skipped — they contribute zero.
 */
export function computeStats(input: {
  responses: ResponseRow[];
  scopedUserIds: string[];
  allMembers: MemberLite[];
  totalItems: number;
  awarenessCount: number;
}): Stats {
  const memberByUid = new Map(input.allMembers.map((m) => [m.user_id, m]));

  // Denominator: sum over scoped, non-pending members of applicable item count.
  let denominator = 0;
  const activeScopedUids: string[] = [];
  for (const uid of input.scopedUserIds) {
    const m = memberByUid.get(uid);
    if (!m || m.pending) continue;
    denominator += m.is_it_executor ? input.totalItems : input.awarenessCount;
    activeScopedUids.push(uid);
  }

  const scoped = new Set(activeScopedUids);
  const rs = input.responses.filter((r) => scoped.has(r.user_id));
  const done = rs.filter((r) => r.status === "done").length;
  const unsure = rs.filter((r) => r.status === "unsure").length;
  const skipped = rs.filter((r) => r.status === "skipped").length;
  const resolved = done + skipped;

  // Informational "total": largest unique-item set any scoped active member sees.
  const anyItExec = activeScopedUids.some(
    (uid) => memberByUid.get(uid)?.is_it_executor,
  );
  const total = activeScopedUids.length === 0
    ? 0
    : anyItExec
      ? input.totalItems
      : input.awarenessCount;

  const percent =
    denominator === 0 ? 0 : Math.round((resolved / denominator) * 100);

  return { total, denominator, done, unsure, skipped, resolved, percent };
}

/**
 * Compute per-track stats (IT Baseline or Awareness) scoped to a user set.
 *
 * Denominator = itemIds.size × eligible_members.length, where eligibility is:
 *   - it_baseline: only non-pending IT executors
 *   - awareness:   all non-pending members
 */
export function computeTrackStats(input: {
  responses: ResponseRow[];
  itemIds: Set<string>;
  trackName: "it_baseline" | "awareness";
  scopedUserIds: string[];
  allMembers: MemberLite[];
}): TrackStats {
  const memberByUid = new Map(input.allMembers.map((m) => [m.user_id, m]));

  const eligibleUids = input.scopedUserIds.filter((uid) => {
    const m = memberByUid.get(uid);
    if (!m || m.pending) return false;
    if (input.trackName === "it_baseline") return m.is_it_executor;
    return true; // awareness is everyone non-pending
  });

  const scoped = new Set(eligibleUids);
  const rs = input.responses.filter(
    (r) => scoped.has(r.user_id) && input.itemIds.has(r.assessment_item_id),
  );
  const done = rs.filter((r) => r.status === "done").length;
  const unsure = rs.filter((r) => r.status === "unsure").length;
  const skipped = rs.filter((r) => r.status === "skipped").length;
  const resolved = done + skipped;

  const denominator = input.itemIds.size * eligibleUids.length;
  const percent =
    denominator === 0 ? 0 : Math.round((resolved / denominator) * 100);

  return {
    total: input.itemIds.size,
    denominator,
    done,
    unsure,
    skipped,
    resolved,
    percent,
  };
}

/**
 * Compute stats for a single member row (the per-member breakdown on the
 * dashboard team list). Pending invitees produce `{ denominator: 0 }`.
 *
 * This is semantically equivalent to `computeStats({ scopedUserIds: [uid], …})`
 * but is a thin wrapper for readability at the caller.
 */
export function computeMemberStats(input: {
  member: MemberLite;
  responses: ResponseRow[];
  totalItems: number;
  awarenessCount: number;
}): Stats {
  return computeStats({
    responses: input.responses,
    scopedUserIds: [input.member.user_id],
    allMembers: [input.member],
    totalItems: input.totalItems,
    awarenessCount: input.awarenessCount,
  });
}
