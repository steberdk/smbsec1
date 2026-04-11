/**
 * F-038 / F-039 / F-040 / F-035 — Dashboard math end-to-end coverage.
 *
 * These tests exercise the shared helper `lib/dashboard/computeStats.ts`
 * through the live `/api/dashboard` route, using the F-043 multi-user
 * harness (`createOrgWithMembers`, `setupCanonicalStefanFixture`,
 * `seedResponses`). They are the forever-regression-guard that F-038's
 * numbers stay correct and that F-039's "My checklist" card is isolated
 * per-user and that F-040's report agrees with the dashboard.
 *
 * Note on "canonical 47/36" numbers: the Stefan fixture's item counts
 * (25 IT + 11 awareness) match a specific snapshot of the checklist master.
 * The current DB can drift by a few items without breaking the tests,
 * so every E2E here computes expected values DYNAMICALLY from the actual
 * `assessment_items` counts for the fixture's assessment, then asserts on
 * those derived values.
 */

import { test, expect, request, type APIRequestContext, type Page } from "@playwright/test";
import {
  createOrgWithMembers,
  setupCanonicalStefanFixture,
  seedResponses,
} from "./helpers/multiUser";
import { getServiceClient, loginWithEmail, createTempUser } from "./helpers/fixtures";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function extractTokenFromPage(page: Page): Promise<string> {
  // The app stores the Supabase session in localStorage under a key of the
  // form `sb-<project>-auth-token`. Pull the access_token out directly so the
  // test can call /api/dashboard with a real Bearer.
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        try {
          const val = JSON.parse(localStorage.getItem(k) ?? "{}");
          return (val?.access_token as string | undefined) ?? null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  if (!token) {
    throw new Error("extractTokenFromPage: no Supabase access_token in localStorage");
  }
  return token;
}

async function fetchDashboard(
  ctx: APIRequestContext,
  baseURL: string,
  token: string,
): Promise<{
  assessment: { id: string } | null;
  stats: {
    total: number;
    denominator: number;
    done: number;
    unsure: number;
    skipped: number;
    resolved: number;
    percent: number;
    by_track: {
      it_baseline: {
        total: number;
        denominator: number;
        done: number;
        unsure: number;
        skipped: number;
        resolved: number;
        percent: number;
      };
      awareness: {
        total: number;
        denominator: number;
        done: number;
        unsure: number;
        skipped: number;
        resolved: number;
        percent: number;
      };
    };
    me: {
      total: number;
      denominator: number;
      done: number;
      unsure: number;
      skipped: number;
      resolved: number;
      percent: number;
    };
  };
  members: Array<{
    user_id: string;
    email: string | null;
    pending?: boolean;
    total: number;
    percent: number;
  }>;
}> {
  const res = await ctx.get(`${baseURL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status(), `GET /api/dashboard returned ${res.status()}`).toBe(200);
  return await res.json();
}

async function loadItemCounts(
  assessmentId: string,
): Promise<{ totalItems: number; itBaseline: number; awareness: number }> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("assessment_items")
    .select("id, track")
    .eq("assessment_id", assessmentId);
  const all = (data ?? []) as Array<{ id: string; track: string }>;
  return {
    totalItems: all.length,
    itBaseline: all.filter((i) => i.track === "it_baseline").length,
    awareness: all.filter((i) => i.track === "awareness").length,
  };
}

// ---------------------------------------------------------------------------
// E2E-MATH-01 — Stefan canonical fixture
// ---------------------------------------------------------------------------

test("E2E-MATH-01 (F-038): Stefan canonical fixture — every cell of the table", async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(120_000);

  const fixture = await setupCanonicalStefanFixture(browser);
  try {
    // Derive expected numbers from actual DB item counts so drift in the
    // checklist master doesn't break the test.
    const counts = await loadItemCounts(fixture.assessmentId);
    const { totalItems, itBaseline, awareness } = counts;

    // Seeded rows: owner has 11 done (7 IT + 4 Awa), 4 unsure (3 IT + 1 Awa), 4 skipped.
    const ownerIsItExec = true;
    const ownerAppl = ownerIsItExec ? totalItems : awareness;
    const empAppl = awareness;
    const denominator = ownerAppl + empAppl;

    const done = 11;
    const unsure = 4;
    const skipped = 4;
    const resolved = done + skipped;
    const percent = denominator === 0 ? 0 : Math.round((resolved / denominator) * 100);

    const itDenom = itBaseline * 1; // 1 IT exec
    const itDone = 7;
    const itUnsure = 3;
    const itSkipped = 3;
    const itResolved = itDone + itSkipped;
    const itPercent = itDenom === 0 ? 0 : Math.round((itResolved / itDenom) * 100);

    const awDenom = awareness * 2; // owner + employee
    const awDone = 4;
    const awUnsure = 1;
    const awSkipped = 1;
    const awResolved = awDone + awSkipped;
    const awPercent = awDenom === 0 ? 0 : Math.round((awResolved / awDenom) * 100);

    const meDenom = ownerAppl;
    const meResolved = resolved;
    const mePercent = meDenom === 0 ? 0 : Math.round((meResolved / meDenom) * 100);

    // API assertions via signed-in owner
    const token = await extractTokenFromPage(fixture.owner.page);
    const ctx = await request.newContext();
    const d = await fetchDashboard(ctx, baseURL!, token);

    expect(d.stats.denominator, "org denominator").toBe(denominator);
    expect(d.stats.done).toBe(done);
    expect(d.stats.unsure).toBe(unsure);
    expect(d.stats.skipped).toBe(skipped);
    expect(d.stats.resolved).toBe(resolved);
    expect(d.stats.percent).toBe(percent);

    expect(d.stats.by_track.it_baseline.denominator).toBe(itDenom);
    expect(d.stats.by_track.it_baseline.done).toBe(itDone);
    expect(d.stats.by_track.it_baseline.unsure).toBe(itUnsure);
    expect(d.stats.by_track.it_baseline.skipped).toBe(itSkipped);
    expect(d.stats.by_track.it_baseline.resolved).toBe(itResolved);
    expect(d.stats.by_track.it_baseline.percent).toBe(itPercent);

    expect(d.stats.by_track.awareness.denominator).toBe(awDenom);
    expect(d.stats.by_track.awareness.done).toBe(awDone);
    expect(d.stats.by_track.awareness.unsure).toBe(awUnsure);
    expect(d.stats.by_track.awareness.skipped).toBe(awSkipped);
    expect(d.stats.by_track.awareness.resolved).toBe(awResolved);
    expect(d.stats.by_track.awareness.percent).toBe(awPercent);

    expect(d.stats.me.denominator).toBe(meDenom);
    expect(d.stats.me.resolved).toBe(meResolved);
    expect(d.stats.me.percent).toBe(mePercent);

    // DOM assertions
    await fixture.owner.page.goto("/workspace/dashboard");
    await fixture.owner.page.waitForLoadState("networkidle");
    await expect(fixture.owner.page.getByTestId("dashboard-resolved-total")).toHaveText(
      new RegExp(`${resolved}\\s*/\\s*${denominator}\\s*responses`),
    );
    await expect(fixture.owner.page.getByTestId("dashboard-percent")).toHaveText(
      new RegExp(`${percent}\\s*%`),
    );
    // Pills in order
    await expect(fixture.owner.page.getByText(/^Resolved$/).first()).toBeVisible();
    await expect(fixture.owner.page.getByText(/^Done$/).first()).toBeVisible();
    await expect(fixture.owner.page.getByText(/^Not applicable$/).first()).toBeVisible();
    await expect(fixture.owner.page.getByText(/Unsure\s*\/\s*Not yet/).first()).toBeVisible();

    await ctx.dispose();
  } finally {
    await fixture.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-MATH-02 — Denominator stability (no flicker)
// ---------------------------------------------------------------------------

test("E2E-MATH-02 (F-038): dashboard top-line stable across reload (no flicker)", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(120_000);

  const fixture = await setupCanonicalStefanFixture(browser);
  try {
    await fixture.owner.page.goto("/workspace/dashboard");
    await fixture.owner.page.waitForLoadState("networkidle");
    const first = await fixture.owner.page.getByTestId("dashboard-resolved-total").textContent();
    const firstPercent = await fixture.owner.page.getByTestId("dashboard-percent").textContent();
    expect(first).toBeTruthy();

    await fixture.owner.page.reload();
    await fixture.owner.page.waitForLoadState("networkidle");
    const second = await fixture.owner.page.getByTestId("dashboard-resolved-total").textContent();
    const secondPercent = await fixture.owner.page.getByTestId("dashboard-percent").textContent();

    expect(second).toBe(first);
    expect(secondPercent).toBe(firstPercent);
  } finally {
    await fixture.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-MATH-03 — Unsure NOT in resolved
// ---------------------------------------------------------------------------

test("E2E-MATH-03 (F-038): all-unsure responses yield resolved=0, percent=0", async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(120_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "UnsureOwner",
    ownerIsItExecutor: true,
    startAssessment: true,
  });
  try {
    if (!org.assessmentId) throw new Error("no assessment");

    // Seed: answer 5 IT items with "unsure".
    const supabase = getServiceClient();
    const { data: items } = await supabase
      .from("assessment_items")
      .select("id, track")
      .eq("assessment_id", org.assessmentId)
      .eq("track", "it_baseline")
      .order("order_index", { ascending: true })
      .limit(5);
    const itRows = (items ?? []) as Array<{ id: string }>;
    expect(itRows.length).toBeGreaterThanOrEqual(1);

    await supabase.from("assessment_responses").insert(
      itRows.map((it) => ({
        assessment_id: org.assessmentId,
        assessment_item_id: it.id,
        user_id: org.owner.user.id,
        status: "unsure",
      })),
    );

    const token = await extractTokenFromPage(org.owner.page);
    const ctx = await request.newContext();
    const d = await fetchDashboard(ctx, baseURL!, token);

    expect(d.stats.unsure).toBeGreaterThan(0);
    expect(d.stats.resolved).toBe(0);
    expect(d.stats.percent).toBe(0);
    expect(d.stats.denominator).toBeGreaterThan(0);
    await ctx.dispose();
  } finally {
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-MATH-04 — F-039 cross-user "My checklist" isolation
// ---------------------------------------------------------------------------

test("E2E-MATH-04 (F-039): My checklist bar is per-caller, isolated across users", async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(180_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "F039Owner",
    ownerIsItExecutor: true,
    employees: [{ displayName: "F039Emp", isItExecutor: false }],
    startAssessment: true,
  });
  try {
    if (!org.assessmentId) throw new Error("no assessment");
    const emp = org.employees[0];

    // Load item counts for expected math.
    const counts = await loadItemCounts(org.assessmentId);
    const ownerApplicable = counts.totalItems;      // owner is IT exec
    const empApplicable = counts.awareness;

    // Seed: owner 5 IT items "done".
    const supabase = getServiceClient();
    const { data: itItems } = await supabase
      .from("assessment_items")
      .select("id")
      .eq("assessment_id", org.assessmentId)
      .eq("track", "it_baseline")
      .order("order_index", { ascending: true })
      .limit(5);
    await supabase.from("assessment_responses").insert(
      ((itItems ?? []) as Array<{ id: string }>).map((it) => ({
        assessment_id: org.assessmentId,
        assessment_item_id: it.id,
        user_id: org.owner.user.id,
        status: "done",
      })),
    );

    // Owner snapshot (API)
    const ownerToken = await extractTokenFromPage(org.owner.page);
    const empToken = await extractTokenFromPage(emp.page);
    const ctx = await request.newContext();

    const d1Owner = await fetchDashboard(ctx, baseURL!, ownerToken);
    expect(d1Owner.stats.me.denominator).toBe(ownerApplicable);
    expect(d1Owner.stats.me.resolved).toBe(5);

    const d1Emp = await fetchDashboard(ctx, baseURL!, empToken);
    expect(d1Emp.stats.me.denominator).toBe(empApplicable);
    expect(d1Emp.stats.me.resolved).toBe(0);

    // Employee answers 3 awareness items "done".
    const { data: awItems } = await supabase
      .from("assessment_items")
      .select("id")
      .eq("assessment_id", org.assessmentId)
      .eq("track", "awareness")
      .order("order_index", { ascending: true })
      .limit(3);
    await supabase.from("assessment_responses").insert(
      ((awItems ?? []) as Array<{ id: string }>).map((it) => ({
        assessment_id: org.assessmentId,
        assessment_item_id: it.id,
        user_id: emp.user.id,
        status: "done",
      })),
    );

    // Owner's stats.me UNCHANGED (they answered nothing new).
    const d2Owner = await fetchDashboard(ctx, baseURL!, ownerToken);
    expect(d2Owner.stats.me.resolved).toBe(5);
    expect(d2Owner.stats.me.denominator).toBe(ownerApplicable);

    // Employee's stats.me now 3/11.
    const d2Emp = await fetchDashboard(ctx, baseURL!, empToken);
    expect(d2Emp.stats.me.resolved).toBe(3);
    expect(d2Emp.stats.me.denominator).toBe(empApplicable);

    // Workspace home DOM — owner label shows 5 / N unchanged after employee's write.
    await org.owner.page.goto("/workspace");
    await org.owner.page.waitForLoadState("networkidle");
    await expect(org.owner.page.getByTestId("my-checklist-progress")).toHaveText(
      new RegExp(`5\\s*/\\s*${ownerApplicable}`),
    );

    await emp.page.goto("/workspace");
    await emp.page.waitForLoadState("networkidle");
    await expect(emp.page.getByTestId("my-checklist-progress")).toHaveText(
      new RegExp(`3\\s*/\\s*${empApplicable}`),
    );

    await ctx.dispose();
  } finally {
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-MATH-05 — F-040 dashboard ↔ report parity
// ---------------------------------------------------------------------------

test("E2E-MATH-05 (F-040): dashboard and security report show identical stats.denominator/resolved", async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(120_000);

  const fixture = await setupCanonicalStefanFixture(browser);
  try {
    // Both pages read from the same API. Pull the API once, then assert both
    // DOMs render the same denominator/resolved values.
    const token = await extractTokenFromPage(fixture.owner.page);
    const ctx = await request.newContext();
    const d = await fetchDashboard(ctx, baseURL!, token);

    await fixture.owner.page.goto("/workspace/dashboard");
    await fixture.owner.page.waitForLoadState("networkidle");
    await expect(fixture.owner.page.getByTestId("dashboard-resolved-total")).toHaveText(
      new RegExp(`${d.stats.resolved}\\s*/\\s*${d.stats.denominator}\\s*responses`),
    );

    await fixture.owner.page.goto("/workspace/report");
    await fixture.owner.page.waitForLoadState("networkidle");
    await expect(fixture.owner.page.getByTestId("report-denominator")).toHaveText(
      String(d.stats.denominator),
    );
    await expect(fixture.owner.page.getByTestId("report-resolved")).toHaveText(
      new RegExp(`${d.stats.resolved}\\s*/\\s*${d.stats.denominator}`),
    );
    await expect(fixture.owner.page.getByTestId("report-percent")).toHaveText(
      new RegExp(`${d.stats.percent}\\s*%`),
    );
    await ctx.dispose();
  } finally {
    await fixture.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-MATH-06 — F-035 pending invitee contributes zero to denominator
// ---------------------------------------------------------------------------

test("E2E-MATH-06 (F-035): sending invite does NOT change stats.denominator", async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(120_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "InviteOwner",
    ownerIsItExecutor: true,
    startAssessment: true,
  });
  try {
    const token = await extractTokenFromPage(org.owner.page);
    const ctx = await request.newContext();

    const before = await fetchDashboard(ctx, baseURL!, token);
    const beforeDenom = before.stats.denominator;
    expect(beforeDenom).toBeGreaterThan(0);

    // Insert a pending invite directly via service-role (no email send).
    const supabase = getServiceClient();
    const inviteEmail = `e2e-pi14-pending-${Date.now()}@example.invalid`;
    const { error } = await supabase.from("invites").insert({
      org_id: org.orgId,
      invited_by: org.owner.user.id,
      email: inviteEmail,
      role: "employee",
      is_it_executor: false,
      token: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(error?.message ?? null).toBeNull();

    // Denominator unchanged.
    const after = await fetchDashboard(ctx, baseURL!, token);
    expect(after.stats.denominator).toBe(beforeDenom);

    // Pending member row present with pending=true, total=0.
    const pendingRow = after.members.find((m) => m.email === inviteEmail);
    expect(pendingRow).toBeTruthy();
    expect(pendingRow?.pending).toBe(true);
    expect(pendingRow?.total).toBe(0);

    // DOM: pending section visible.
    await org.owner.page.goto("/workspace/dashboard");
    await org.owner.page.waitForLoadState("networkidle");
    await expect(org.owner.page.getByText(/Pending invitations/i)).toBeVisible();
    await expect(org.owner.page.getByTestId("pending-invitees")).toContainText(inviteEmail);

    await ctx.dispose();
  } finally {
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-MATH-07 — F-035 invitee accept flips contribution
// ---------------------------------------------------------------------------

test("E2E-MATH-07 (F-035): after accept, contribution flips from zero to awarenessCount", async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(180_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "FlipOwner",
    ownerIsItExecutor: true,
    startAssessment: true,
  });
  let acceptedUser: { id: string; email: string; delete: () => Promise<void> } | null = null;
  try {
    if (!org.assessmentId) throw new Error("no assessment");

    const counts = await loadItemCounts(org.assessmentId);
    const awareness = counts.awareness;

    const token = await extractTokenFromPage(org.owner.page);
    const ctx = await request.newContext();

    const before = await fetchDashboard(ctx, baseURL!, token);
    const beforeDenom = before.stats.denominator;

    // Simulate accept by directly adding a joined employee member row. This
    // bypasses the actual invite-accept flow but tests the *denominator*
    // invariant that is the whole point of F-035.
    const supabase = getServiceClient();
    acceptedUser = await createTempUser("e2e-pi14-flip");
    await supabase.from("org_members").insert({
      org_id: org.orgId,
      user_id: acceptedUser.id,
      role: "employee",
      is_it_executor: false,
      email: acceptedUser.email,
    });

    const after = await fetchDashboard(ctx, baseURL!, token);
    expect(after.stats.denominator).toBe(beforeDenom + awareness);

    await ctx.dispose();
  } finally {
    if (acceptedUser) {
      try { await acceptedUser.delete(); } catch { /* ignore */ }
    }
    await org.cleanup();
  }
});

// Keep loginWithEmail referenced so the linter doesn't complain about unused
// imports in future test additions.
void loginWithEmail;
