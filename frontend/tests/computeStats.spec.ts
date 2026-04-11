/**
 * Unit tests for the F-038/F-039/F-040 shared helper
 * `frontend/lib/dashboard/computeStats.ts`.
 *
 * These are pure-function tests — no Supabase, no browser. They run inside
 * Playwright only because that's the test runner this project ships with.
 *
 * Coverage targets (from PI 14 Iter 2 brief):
 *   1. Stefan canonical fixture (org-wide + per-track + caller-scoped)
 *   2. Empty org (no members, no responses) — denominator 0, no divide-by-zero
 *   3. Owner-only org with no IT exec — denominator == awarenessCount
 *   4. Pending invitee contributes ZERO to denominator
 *   5. Caller-scoped `stats.me`
 *   6. Track formulas (IT baseline excludes non-IT-execs; awareness includes all)
 *   7. Unsure not counted in resolved
 */

import { test, expect } from "@playwright/test";
import {
  computeStats,
  computeTrackStats,
  computeMemberStats,
  type ResponseRow,
  type MemberLite,
} from "../lib/dashboard/computeStats";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

// Stefan's canonical parameters.
const TOTAL_ITEMS = 36; // 25 IT baseline + 11 awareness
const AWARENESS_COUNT = 11;
const IT_BASELINE_COUNT = 25;

// Stable synthetic ids.
const ownerId = "owner-uuid";
const employeeId = "employee-uuid";
const pendingId = "pending-uuid";

// Fake item ids: 25 IT-baseline (it-0..it-24) + 11 awareness (aw-0..aw-10)
const itItemIds = new Set(
  Array.from({ length: IT_BASELINE_COUNT }, (_, i) => `it-${i}`),
);
const awItemIds = new Set(
  Array.from({ length: AWARENESS_COUNT }, (_, i) => `aw-${i}`),
);

function stefanCanonicalResponses(): ResponseRow[] {
  // Owner IT:  7 done, 3 unsure, 3 skipped
  // Owner Awa: 4 done, 1 unsure, 1 skipped
  // Employee:  nothing
  const rows: ResponseRow[] = [];
  const itStatuses: Array<"done" | "unsure" | "skipped"> = [
    "done", "done", "done", "done", "done", "done", "done",
    "unsure", "unsure", "unsure",
    "skipped", "skipped", "skipped",
  ];
  itStatuses.forEach((status, i) => {
    rows.push({ user_id: ownerId, assessment_item_id: `it-${i}`, status });
  });
  const awStatuses: Array<"done" | "unsure" | "skipped"> = [
    "done", "done", "done", "done",
    "unsure",
    "skipped",
  ];
  awStatuses.forEach((status, i) => {
    rows.push({ user_id: ownerId, assessment_item_id: `aw-${i}`, status });
  });
  return rows;
}

const stefanMembers: MemberLite[] = [
  { user_id: ownerId, is_it_executor: true },
  { user_id: employeeId, is_it_executor: false },
];

// ---------------------------------------------------------------------------
// 1. Stefan canonical fixture — the forever-regression-guard
// ---------------------------------------------------------------------------

test.describe("computeStats — F-038 canonical Stefan fixture", () => {
  const responses = stefanCanonicalResponses();

  test("org-wide: 15 / 47 @ 32%", () => {
    const s = computeStats({
      responses,
      scopedUserIds: [ownerId, employeeId],
      allMembers: stefanMembers,
      totalItems: TOTAL_ITEMS,
      awarenessCount: AWARENESS_COUNT,
    });
    // owner contributes 36, employee contributes 11 → 47
    expect(s.denominator).toBe(47);
    expect(s.done).toBe(11);       // 7 IT + 4 Awa
    expect(s.unsure).toBe(4);      // 3 IT + 1 Awa
    expect(s.skipped).toBe(4);     // 3 IT + 1 Awa
    expect(s.resolved).toBe(15);   // done + skipped
    expect(s.percent).toBe(32);    // round(15/47 * 100) = 31.91... → 32
  });

  test("track it_baseline: 10 / 25 @ 40%", () => {
    const t = computeTrackStats({
      responses,
      itemIds: itItemIds,
      trackName: "it_baseline",
      scopedUserIds: [ownerId, employeeId],
      allMembers: stefanMembers,
    });
    // eligible = owner only (IT exec) → denominator = 25 * 1 = 25
    expect(t.denominator).toBe(25);
    expect(t.done).toBe(7);
    expect(t.unsure).toBe(3);
    expect(t.skipped).toBe(3);
    expect(t.resolved).toBe(10); // 7 + 3
    expect(t.percent).toBe(40);  // round(10/25*100)
  });

  test("track awareness: 5 / 22 @ 23%", () => {
    const t = computeTrackStats({
      responses,
      itemIds: awItemIds,
      trackName: "awareness",
      scopedUserIds: [ownerId, employeeId],
      allMembers: stefanMembers,
    });
    // eligible = owner + employee → denominator = 11 * 2 = 22
    expect(t.denominator).toBe(22);
    expect(t.done).toBe(4);
    expect(t.unsure).toBe(1);
    expect(t.skipped).toBe(1);
    expect(t.resolved).toBe(5);  // 4 + 1
    expect(t.percent).toBe(23);  // round(5/22*100) = 22.7 → 23
  });

  test("caller-scoped (stats.me for owner): 15 / 36 @ 42%", () => {
    const me = computeStats({
      responses,
      scopedUserIds: [ownerId],
      allMembers: stefanMembers,
      totalItems: TOTAL_ITEMS,
      awarenessCount: AWARENESS_COUNT,
    });
    expect(me.denominator).toBe(36);
    expect(me.resolved).toBe(15);
    expect(me.percent).toBe(42); // round(15/36*100) = 41.67 → 42
  });

  test("caller-scoped (stats.me for employee): 0 / 11 @ 0%", () => {
    const me = computeStats({
      responses,
      scopedUserIds: [employeeId],
      allMembers: stefanMembers,
      totalItems: TOTAL_ITEMS,
      awarenessCount: AWARENESS_COUNT,
    });
    expect(me.denominator).toBe(11);
    expect(me.resolved).toBe(0);
    expect(me.percent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Empty org — no divide-by-zero
// ---------------------------------------------------------------------------

test("computeStats: empty org yields denominator=0, percent=0", () => {
  const s = computeStats({
    responses: [],
    scopedUserIds: [],
    allMembers: [],
    totalItems: TOTAL_ITEMS,
    awarenessCount: AWARENESS_COUNT,
  });
  expect(s.denominator).toBe(0);
  expect(s.resolved).toBe(0);
  expect(s.percent).toBe(0);
  expect(s.total).toBe(0);
});

test("computeTrackStats: empty scope yields denominator=0, percent=0", () => {
  const t = computeTrackStats({
    responses: [],
    itemIds: itItemIds,
    trackName: "it_baseline",
    scopedUserIds: [],
    allMembers: [],
  });
  expect(t.denominator).toBe(0);
  expect(t.percent).toBe(0);
});

// ---------------------------------------------------------------------------
// 3. Owner-only org without IT exec
// ---------------------------------------------------------------------------

test("computeStats: owner-only non-IT-exec uses awarenessCount as denominator", () => {
  const onlyOwner: MemberLite[] = [{ user_id: ownerId, is_it_executor: false }];
  const s = computeStats({
    responses: [],
    scopedUserIds: [ownerId],
    allMembers: onlyOwner,
    totalItems: TOTAL_ITEMS,
    awarenessCount: AWARENESS_COUNT,
  });
  expect(s.denominator).toBe(AWARENESS_COUNT);
});

// ---------------------------------------------------------------------------
// 4. Pending invitee contributes ZERO (F-035 locked decision)
// ---------------------------------------------------------------------------

test("computeStats: pending invitee contributes zero to denominator", () => {
  const members: MemberLite[] = [
    { user_id: ownerId, is_it_executor: true },
    { user_id: pendingId, is_it_executor: false, pending: true },
  ];
  const s = computeStats({
    responses: [],
    scopedUserIds: [ownerId, pendingId],
    allMembers: members,
    totalItems: TOTAL_ITEMS,
    awarenessCount: AWARENESS_COUNT,
  });
  // Only the owner contributes: 36. Not 36 + 11 = 47.
  expect(s.denominator).toBe(TOTAL_ITEMS);
});

test("computeTrackStats: pending invitee excluded from awareness eligibility", () => {
  const members: MemberLite[] = [
    { user_id: ownerId, is_it_executor: true },
    { user_id: employeeId, is_it_executor: false },
    { user_id: pendingId, is_it_executor: false, pending: true },
  ];
  const t = computeTrackStats({
    responses: [],
    itemIds: awItemIds,
    trackName: "awareness",
    scopedUserIds: [ownerId, employeeId, pendingId],
    allMembers: members,
  });
  // eligible members = owner + employee (NOT pending) → 11 * 2 = 22
  expect(t.denominator).toBe(22);
});

// ---------------------------------------------------------------------------
// 5. Unsure NOT counted in resolved
// ---------------------------------------------------------------------------

test("computeStats: all-unsure responses yield resolved=0 (F-038 AC)", () => {
  const members: MemberLite[] = [{ user_id: ownerId, is_it_executor: true }];
  const responses: ResponseRow[] = Array.from({ length: 10 }, (_, i) => ({
    user_id: ownerId,
    assessment_item_id: `it-${i}`,
    status: "unsure" as const,
  }));
  const s = computeStats({
    responses,
    scopedUserIds: [ownerId],
    allMembers: members,
    totalItems: TOTAL_ITEMS,
    awarenessCount: AWARENESS_COUNT,
  });
  expect(s.unsure).toBe(10);
  expect(s.resolved).toBe(0);
  expect(s.percent).toBe(0);
  expect(s.denominator).toBeGreaterThan(0); // sanity: not a divide-by-zero short-circuit
});

// ---------------------------------------------------------------------------
// 6. computeMemberStats — per-member row shape
// ---------------------------------------------------------------------------

test("computeMemberStats: single member wrapper matches computeStats", () => {
  const responses = stefanCanonicalResponses();
  const direct = computeStats({
    responses,
    scopedUserIds: [ownerId],
    allMembers: stefanMembers,
    totalItems: TOTAL_ITEMS,
    awarenessCount: AWARENESS_COUNT,
  });
  const wrapper = computeMemberStats({
    member: stefanMembers[0],
    responses,
    totalItems: TOTAL_ITEMS,
    awarenessCount: AWARENESS_COUNT,
  });
  expect(wrapper).toEqual(direct);
});

test("computeMemberStats: pending member yields denominator=0", () => {
  const pending: MemberLite = {
    user_id: pendingId,
    is_it_executor: false,
    pending: true,
  };
  const s = computeMemberStats({
    member: pending,
    responses: [],
    totalItems: TOTAL_ITEMS,
    awarenessCount: AWARENESS_COUNT,
  });
  expect(s.denominator).toBe(0);
  expect(s.percent).toBe(0);
});
