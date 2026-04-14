/**
 * F-041 PI 14 Iter 3 — Atomic IT Executor reassignment.
 *
 * The PUT /api/orgs/executor route delegates to smbsec1.reassign_it_executor,
 * which unsets the old executor FIRST, sets the new one, preserves every
 * existing IT Baseline response on its original user_id, and writes ONE
 * audit row with the response count transferred.
 *
 * Migrated to the F-043 multi-user harness in F-057 (PI 17 Iter 1) — replaces
 * the PKCE-incompatible `tokenFor()` helper with `createOrgWithMembers` +
 * `extractTokenFromPage()`.
 *
 * Tests skip cleanly until Stefan applies migration 025.
 */

import { test, expect, type Browser, type Page } from "@playwright/test";
import {
  startAssessment,
  getServiceClient,
  baseUrl,
  createTempUser,
  type TempUser,
} from "./helpers/fixtures";
import { createOrgWithMembers, type MultiUserOrg } from "./helpers/multiUser";

// ---------------------------------------------------------------------------
// Pre-flight — skip until migration 025 applied.
// ---------------------------------------------------------------------------

async function migration025Applied(): Promise<boolean> {
  const svc = getServiceClient();
  const probe = await svc.rpc("reassign_it_executor", {
    p_org_id: "00000000-0000-0000-0000-000000000000",
    p_new_user_id: "00000000-0000-0000-0000-000000000000",
    p_actor_user_id: "00000000-0000-0000-0000-000000000000",
  });
  if (probe.error) {
    const msg = probe.error.message ?? "";
    if (
      /does not exist/i.test(msg) ||
      /could not find the function/i.test(msg)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Pull the Supabase access token out of a signed-in page's localStorage.
 * PKCE-safe replacement for the old URL-borne `tokenFor()` helper.
 */
async function extractTokenFromPage(page: Page): Promise<string> {
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

async function reassign(
  token: string,
  newUserId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl()}/api/orgs/executor`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: newUserId }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body: body as Record<string, unknown> };
}

async function fetchDashboard(token: string): Promise<{
  stats: {
    denominator: number;
    by_track: {
      it_baseline: { denominator: number; resolved: number; percent: number };
      awareness: { denominator: number; resolved: number; percent: number };
    };
  };
}> {
  const res = await fetch(`${baseUrl()}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  return (await res.json()) as {
    stats: {
      denominator: number;
      by_track: {
        it_baseline: { denominator: number; resolved: number; percent: number };
        awareness: { denominator: number; resolved: number; percent: number };
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Build a 2-member org using the F-043 multi-user harness: owner is IT Exec,
// employee is non-IT-exec employee. Owner has 5 IT Baseline `done` responses
// seeded directly via service-role.
// ---------------------------------------------------------------------------

type ReassignFixture = {
  org: MultiUserOrg;
  assessmentId: string;
  ownerId: string;
  ownerEmail: string;
  ownerPage: Page;
  empId: string;
  empEmail: string;
  empPage: Page;
};

async function seedOrgWithFiveResponses(browser: Browser): Promise<ReassignFixture> {
  const org = await createOrgWithMembers(browser, {
    ownerName: "Reassign Owner",
    ownerIsItExecutor: true,
    employees: [{ displayName: "Employee", isItExecutor: false }],
  });

  const ownerUser = org.owner.user;
  const employee = org.employees[0].user;

  const assessmentId = await startAssessment(org.orgId, ownerUser.id);

  const svc = getServiceClient();
  // Seed 5 IT Baseline "done" responses by the owner (the current IT exec).
  const { data: items } = await svc
    .from("assessment_items")
    .select("id, track, order_index")
    .eq("assessment_id", assessmentId)
    .eq("track", "it_baseline")
    .order("order_index", { ascending: true });
  const itItems = (items ?? []) as Array<{ id: string }>;
  if (itItems.length < 5) {
    await org.cleanup();
    throw new Error(
      `seedOrgWithFiveResponses: need >=5 IT Baseline items, got ${itItems.length}`,
    );
  }
  const rows = itItems.slice(0, 5).map((i) => ({
    assessment_id: assessmentId,
    assessment_item_id: i.id,
    user_id: ownerUser.id,
    status: "done" as const,
  }));
  const { error: insErr } = await svc.from("assessment_responses").insert(rows);
  if (insErr) {
    await org.cleanup();
    throw new Error(`seedOrgWithFiveResponses: insert failed: ${insErr.message}`);
  }

  return {
    org,
    assessmentId,
    ownerId: ownerUser.id,
    ownerEmail: ownerUser.email,
    ownerPage: org.owner.page,
    empId: employee.id,
    empEmail: employee.email,
    empPage: org.employees[0].page,
  };
}

// ---------------------------------------------------------------------------
// E2E-REASSIGN-01
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-01 (F-041): reassign preserves existing IT Baseline answers", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );
  testInfo.setTimeout(180_000);

  const fx = await seedOrgWithFiveResponses(browser);
  try {
    const svc = getServiceClient();

    const ownerToken = await extractTokenFromPage(fx.ownerPage);
    const before = await fetchDashboard(ownerToken);

    const res = await reassign(ownerToken, fx.empId);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.response_count_transferred).toBe(5);

    // The 5 responses still exist with the ORIGINAL user_id (owner).
    const { data: respAfter } = await svc
      .from("assessment_responses")
      .select("id, user_id")
      .eq("assessment_id", fx.assessmentId)
      .eq("user_id", fx.ownerId);
    expect((respAfter ?? []).length).toBe(5);

    // Flag flip landed.
    const { data: flagsAfter } = await svc
      .from("org_members")
      .select("user_id, is_it_executor")
      .eq("org_id", fx.org.orgId);
    const flags = Object.fromEntries(
      (flagsAfter ?? []).map(
        (r: { user_id: string; is_it_executor: boolean }) => [
          r.user_id,
          r.is_it_executor,
        ],
      ),
    );
    expect(flags[fx.ownerId]).toBe(false);
    expect(flags[fx.empId]).toBe(true);

    // Audit row present with response_count_transferred=5.
    const { data: audits } = await svc
      .from("audit_logs")
      .select("event_type, details")
      .eq("org_id", fx.org.orgId)
      .eq("event_type", "it_executor_reassigned");
    expect((audits ?? []).length).toBe(1);
    const details = (audits![0] as { details: Record<string, unknown> }).details;
    expect(details.response_count_transferred).toBe(5);
    expect(details.previous_it_executor_user_id).toBe(fx.ownerId);
    expect(details.new_it_executor_user_id).toBe(fx.empId);

    // New executor's dashboard shows the same IT Baseline resolved count.
    const newExecToken = await extractTokenFromPage(fx.empPage);
    const after = await fetchDashboard(newExecToken);
    expect(after.stats.by_track.it_baseline.resolved).toBe(
      before.stats.by_track.it_baseline.resolved,
    );
  } finally {
    await fx.org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-02 — pending invitee is rejected.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-02 (F-041): reassignment to pending invitee is rejected", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );
  testInfo.setTimeout(120_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "Reassign02 Owner",
    ownerIsItExecutor: true,
  });

  let stranger: TempUser | null = null;
  try {
    // A user that is NOT a member of this org — simulates "pending invitee"
    // from the RPC's perspective (pending invitees don't live in org_members).
    stranger = await createTempUser("e2e-stranger-reassign");

    const ownerToken = await extractTokenFromPage(org.owner.page);
    const res = await reassign(ownerToken, stranger.id);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("new_assignee_not_in_org");
  } finally {
    if (stranger) {
      try {
        await stranger.delete();
      } catch {
        /* ignore */
      }
    }
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-03 — dashboard math unchanged pre/post reassignment.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-03 (F-041): dashboard math unchanged pre/post reassignment", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );
  testInfo.setTimeout(180_000);

  const fx = await seedOrgWithFiveResponses(browser);
  try {
    const ownerToken = await extractTokenFromPage(fx.ownerPage);
    const before = await fetchDashboard(ownerToken);

    const res = await reassign(ownerToken, fx.empId);
    expect(res.status).toBe(200);

    const after = await fetchDashboard(ownerToken);
    expect(after.stats.denominator).toBe(before.stats.denominator);
    expect(after.stats.by_track.it_baseline.denominator).toBe(
      before.stats.by_track.it_baseline.denominator,
    );
    expect(after.stats.by_track.it_baseline.resolved).toBe(
      before.stats.by_track.it_baseline.resolved,
    );
    expect(after.stats.by_track.it_baseline.percent).toBe(
      before.stats.by_track.it_baseline.percent,
    );
  } finally {
    await fx.org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-04 — old IT exec no longer sees IT Baseline.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-04 (F-041): old IT exec no longer sees IT Baseline section", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );
  testInfo.setTimeout(180_000);

  const fx = await seedOrgWithFiveResponses(browser);
  try {
    const ownerToken = await extractTokenFromPage(fx.ownerPage);
    const res = await reassign(ownerToken, fx.empId);
    expect(res.status).toBe(200);

    // Reuse the old IT Exec's (owner) signed-in page to visit /workspace/checklist.
    await fx.ownerPage.goto(`${baseUrl()}/workspace/checklist`);

    await expect(
      fx.ownerPage.getByRole("heading", { name: /security awareness/i }),
    ).toBeVisible({ timeout: 10_000 });

    // IT Baseline section heading must NOT be present.
    await expect(
      fx.ownerPage.getByRole("heading", { name: /^it baseline$/i }),
    ).toHaveCount(0);
  } finally {
    await fx.org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-05 — new IT exec sees existing pre-answered items.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-05 (F-041): new IT exec sees existing answers", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );
  testInfo.setTimeout(180_000);

  const fx = await seedOrgWithFiveResponses(browser);
  try {
    const ownerToken = await extractTokenFromPage(fx.ownerPage);
    const res = await reassign(ownerToken, fx.empId);
    expect(res.status).toBe(200);

    // New IT exec: their dashboard API confirms the 5 IT responses are
    // visible and `by_track.it_baseline.resolved` is > 0 (since done = resolved).
    const newExecToken = await extractTokenFromPage(fx.empPage);
    const dash = await fetchDashboard(newExecToken);
    expect(dash.stats.by_track.it_baseline.resolved).toBeGreaterThanOrEqual(5);

    // And the checklist page itself renders the IT Baseline section for the
    // new IT Exec. Reuse the already-signed-in employee page.
    await fx.empPage.goto(`${baseUrl()}/workspace/checklist`);
    await expect(
      fx.empPage.getByRole("heading", { name: /it baseline/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await fx.org.cleanup();
  }
});

