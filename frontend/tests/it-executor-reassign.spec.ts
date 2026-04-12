/**
 * F-041 PI 14 Iter 3 — Atomic IT Executor reassignment.
 *
 * The PUT /api/orgs/executor route delegates to smbsec1.reassign_it_executor,
 * which unsets the old executor FIRST, sets the new one, preserves every
 * existing IT Baseline response on its original user_id, and writes ONE
 * audit row with the response count transferred.
 *
 * Tests skip cleanly until Stefan applies migration 025.
 */

import { test, expect } from "@playwright/test";
import {
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
  startAssessment,
  getServiceClient,
  baseUrl,
  loginWithEmail,
} from "./helpers/fixtures";

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

async function tokenFor(email: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  if (!res.ok) throw new Error(`generate_link failed: ${await res.text()}`);
  const data = await res.json();
  const redirect = await fetch(data.action_link, { redirect: "manual" });
  const loc = redirect.headers.get("location") ?? "";
  const m = loc.match(/access_token=([^&]+)/);
  if (!m) throw new Error(`no access_token in redirect: ${loc.slice(0, 200)}`);
  return decodeURIComponent(m[1]);
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
// Build a 2-member org: owner is IT Exec, employee is non-IT-exec employee.
// Owner has 5 IT Baseline `done` responses seeded.
// ---------------------------------------------------------------------------

async function seedOrgWithFiveResponses(): Promise<{
  orgId: string;
  assessmentId: string;
  ownerId: string;
  ownerEmail: string;
  empId: string;
  empEmail: string;
  cleanup: () => Promise<void>;
}> {
  const iso = await createIsolatedOrg("REASSIGN Org");
  const employee = await createTempUser("e2e-reassign-emp");

  const svc = getServiceClient();
  await addOrgMember(iso.orgId, employee, "employee", { isItExecutor: false });
  await svc
    .from("org_members")
    .update({ email: employee.email })
    .eq("org_id", iso.orgId)
    .eq("user_id", employee.id);

  const assessmentId = await startAssessment(iso.orgId, iso.adminUser.id);

  // Seed 5 IT Baseline "done" responses by the owner (the current IT exec).
  const { data: items } = await svc
    .from("assessment_items")
    .select("id, track, order_index")
    .eq("assessment_id", assessmentId)
    .eq("track", "it_baseline")
    .order("order_index", { ascending: true });
  const itItems = (items ?? []) as Array<{ id: string }>;
  if (itItems.length < 5) {
    throw new Error(
      `seedOrgWithFiveResponses: need >=5 IT Baseline items, got ${itItems.length}`,
    );
  }
  const rows = itItems.slice(0, 5).map((i) => ({
    assessment_id: assessmentId,
    assessment_item_id: i.id,
    user_id: iso.adminUser.id,
    status: "done" as const,
  }));
  const { error: insErr } = await svc.from("assessment_responses").insert(rows);
  expect(insErr).toBeNull();

  return {
    orgId: iso.orgId,
    assessmentId,
    ownerId: iso.adminUser.id,
    ownerEmail: iso.adminUser.email,
    empId: employee.id,
    empEmail: employee.email,
    cleanup: async () => {
      try {
        await employee.delete();
      } catch {
        /* ignore */
      }
      await iso.cleanup();
    },
  };
}

// ---------------------------------------------------------------------------
// E2E-REASSIGN-01
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-01 (F-041): reassign preserves existing IT Baseline answers", async () => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );

  const fx = await seedOrgWithFiveResponses();
  try {
    const svc = getServiceClient();

    const ownerToken = await tokenFor(fx.ownerEmail);
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
      .eq("org_id", fx.orgId);
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
      .eq("org_id", fx.orgId)
      .eq("event_type", "it_executor_reassigned");
    expect((audits ?? []).length).toBe(1);
    const details = (audits![0] as { details: Record<string, unknown> }).details;
    expect(details.response_count_transferred).toBe(5);
    expect(details.previous_it_executor_user_id).toBe(fx.ownerId);
    expect(details.new_it_executor_user_id).toBe(fx.empId);

    // New executor's dashboard shows the same IT Baseline resolved count.
    const newExecToken = await tokenFor(fx.empEmail);
    const after = await fetchDashboard(newExecToken);
    expect(after.stats.by_track.it_baseline.resolved).toBe(
      before.stats.by_track.it_baseline.resolved,
    );
  } finally {
    await fx.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-02 — pending invitee is rejected.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-02 (F-041): reassignment to pending invitee is rejected", async () => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );

  const iso = await createIsolatedOrg("REASSIGN02 Org");
  try {
    // A user that is NOT a member of this org — simulates "pending invitee"
    // from the RPC's perspective (pending invitees don't live in org_members).
    const stranger = await createTempUser("e2e-stranger");
    try {
      const ownerToken = await tokenFor(iso.adminUser.email);
      const res = await reassign(ownerToken, stranger.id);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("new_assignee_not_in_org");
    } finally {
      await stranger.delete();
    }
  } finally {
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-03 — dashboard math unchanged pre/post reassignment.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-03 (F-041): dashboard math unchanged pre/post reassignment", async () => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );

  const fx = await seedOrgWithFiveResponses();
  try {
    const ownerToken = await tokenFor(fx.ownerEmail);
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
    await fx.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-04 — old IT exec no longer sees IT Baseline.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-04 (F-041): old IT exec no longer sees IT Baseline section", async ({
  page,
}) => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );

  const fx = await seedOrgWithFiveResponses();
  try {
    const ownerToken = await tokenFor(fx.ownerEmail);
    const res = await reassign(ownerToken, fx.empId);
    expect(res.status).toBe(200);

    // Log in as the old IT Exec (owner) and navigate to /workspace/checklist.
    await loginWithEmail(page, fx.ownerEmail);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    await expect(
      page.getByRole("heading", { name: /security awareness/i }),
    ).toBeVisible({ timeout: 10_000 });

    // IT Baseline section heading must NOT be present.
    await expect(
      page.getByRole("heading", { name: /^it baseline$/i }),
    ).toHaveCount(0);
  } finally {
    await fx.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-REASSIGN-05 — new IT exec sees existing pre-answered items.
// ---------------------------------------------------------------------------

test("E2E-REASSIGN-05 (F-041): new IT exec sees existing answers", async ({
  page,
}) => {
  test.skip(
    !(await migration025Applied()),
    "migration 025 (reassign_it_executor) not applied yet",
  );

  const fx = await seedOrgWithFiveResponses();
  try {
    const ownerToken = await tokenFor(fx.ownerEmail);
    const res = await reassign(ownerToken, fx.empId);
    expect(res.status).toBe(200);

    // New IT exec: their dashboard API confirms the 5 IT responses are
    // visible and `by_track.it_baseline.resolved` is > 0 (since done = resolved).
    const newExecToken = await tokenFor(fx.empEmail);
    const dash = await fetchDashboard(newExecToken);
    expect(dash.stats.by_track.it_baseline.resolved).toBeGreaterThanOrEqual(5);

    // And the checklist page itself renders the IT Baseline section.
    await loginWithEmail(page, fx.empEmail);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");
    await expect(
      page.getByRole("heading", { name: /it baseline/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await fx.cleanup();
  }
});
