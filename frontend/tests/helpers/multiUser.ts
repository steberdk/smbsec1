/**
 * F-043 — Reusable multi-user E2E test harness.
 *
 * Spins up an isolated org with a configurable roster (1 owner + N employees),
 * each signed in via their own BrowserContext/Page, and returns a bundle with
 * a single `cleanup()` entry point that tears down every row + every browser
 * context in dependency order.
 *
 * Key design decisions (see docs/product/pi14/product_team_consensus.md and
 * docs/product/pi14/round2_business_analyst.md §2):
 *   - Org names are prefixed `e2e-pi14-` so the nightly sweeper can find
 *     orphans with a single LIKE clause.
 *   - Test user emails use `@example.invalid` (RFC 2606 reserved TLD) so no
 *     email can ever escape to a real mailbox.
 *   - Per-test teardown is the primary cleanup; the nightly sweeper
 *     (scripts/cleanup-e2e-orgs.ts) is the safety net.
 *   - NEVER run against PROD — harness is DEV/CI Supabase only.
 *
 * Composes (does not duplicate) the primitives in ./fixtures.ts:
 *   getServiceClient, loginWithEmail, addOrgMember, startAssessment.
 */

import type { Browser, BrowserContext, Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addOrgMember,
  getServiceClient,
  loginWithEmail,
  startAssessment,
  type TempUser,
} from "./fixtures";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemberSpec = {
  displayName: string;
  isItExecutor?: boolean;
};

export type OrgSpec = {
  ownerName: string;
  ownerIsItExecutor?: boolean;
  employees?: MemberSpec[];
  orgName?: string;
  startAssessment?: boolean;
  /**
   * When true, skip the per-user browser-context + loginWithEmail step.
   * Used by infrastructure tests (the F-043 10-iteration stability loop)
   * that only exercise the DB create/teardown plumbing and do not need
   * real signed-in sessions. The returned `owner.page` / `employees[*].page`
   * will be a freshly opened blank page (still backed by a real context so
   * cleanup still closes contexts).
   */
  skipLogin?: boolean;
};

export type HarnessOwner = {
  user: TempUser;
  context: BrowserContext;
  page: Page;
};

export type HarnessEmployee = {
  user: TempUser;
  context: BrowserContext;
  page: Page;
  spec: MemberSpec;
};

export type MultiUserOrg = {
  orgId: string;
  orgName: string;
  owner: HarnessOwner;
  employees: HarnessEmployee[];
  assessmentId: string | null;
  cleanup: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Internal helpers — harness-scoped user + org creation
// ---------------------------------------------------------------------------

const HARNESS_PREFIX = "e2e-pi14-";
const HARNESS_DOMAIN = "example.invalid";

/** Short, collision-resistant token used inside org names + emails. */
function harnessToken(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rnd}`;
}

/**
 * Sleep helper used by the loginWithEmail retry wrapper.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap loginWithEmail with exponential backoff. Supabase's magic-link admin
 * endpoint rate-limits under rapid burst traffic (the 10-iteration stability
 * gate bursts ~20 calls in under a minute), and a transient failure surfaces
 * as "Could not extract access_token from redirect: <empty>". Retrying after
 * a short delay consistently recovers.
 */
async function loginWithRetry(page: Page, email: string, maxAttempts = 6): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await loginWithEmail(page, email);
      return;
    } catch (err) {
      lastErr = err;
      const msg = (err as Error).message || "";
      const isTransient =
        /Could not extract access_token/i.test(msg) ||
        /rate.?limit/i.test(msg) ||
        /over_email_send_rate_limit/i.test(msg) ||
        /429|500|502|503|504/.test(msg);
      if (!isTransient || attempt === maxAttempts) break;
      // Exponential backoff with jitter, capped at 15s: 1s → 2s → 4s → 8s → 15s.
      const base = Math.min(1000 * 2 ** (attempt - 1), 15_000);
      const jitter = Math.floor(Math.random() * 500);
      await sleep(base + jitter);
    }
  }
  throw lastErr;
}

function sanitizeForEmail(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20) || "user";
}

/**
 * Create a harness-scoped Supabase auth user with the mandatory
 * `e2e-pi14-<token>-<role>@example.invalid` email shape.
 * This is harness-specific and intentionally separate from the
 * `@example.com` convention in `createTempUser`.
 */
async function createHarnessUser(
  supabase: SupabaseClient,
  token: string,
  roleLabel: string,
): Promise<TempUser> {
  const email = `${HARNESS_PREFIX}${token}-${sanitizeForEmail(roleLabel)}@${HARNESS_DOMAIN}`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !data?.user) {
    throw new Error(`createHarnessUser failed (${email}): ${error?.message}`);
  }
  const id = data.user.id;
  return {
    id,
    email,
    delete: async () => {
      await supabase.auth.admin.deleteUser(id);
    },
  };
}

/**
 * Create a harness-scoped org row with an `e2e-pi14-` prefix. Returns the
 * org id. Owner membership is inserted separately so the caller can control
 * the `is_it_executor` flag.
 */
async function createHarnessOrg(
  supabase: SupabaseClient,
  ownerUserId: string,
  orgName: string,
): Promise<string> {
  const { data: org, error } = await supabase
    .from("orgs")
    .insert({ name: orgName, created_by: ownerUserId })
    .select()
    .single();
  if (error || !org) {
    throw new Error(`createHarnessOrg failed (${orgName}): ${error?.message}`);
  }
  return (org as { id: string }).id;
}

/**
 * Full 10-step teardown per BA Round 2 §2 — scoped to ONE org id.
 * Ordering respects FK dependencies and is idempotent: it never throws.
 * Errors are swallowed + logged so one broken test never blocks another.
 */
async function teardownOrg(
  supabase: SupabaseClient,
  orgId: string,
  userIds: string[],
): Promise<void> {
  const safe = async (
    label: string,
    fn: () => Promise<{ error: { message: string } | null }>,
    opts: { ignoreMissingTable?: boolean } = {},
  ): Promise<void> => {
    try {
      const res = await fn();
      if (res.error) {
        if (
          opts.ignoreMissingTable &&
          /(does not exist|could not find the table|schema cache)/i.test(res.error.message)
        ) {
          return;
        }
        // eslint-disable-next-line no-console
        console.warn(`[multiUser.teardown] ${label} error:`, res.error.message);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[multiUser.teardown] ${label} threw:`, (err as Error).message);
    }
  };

  // 1. assessment_responses (via assessments → items)
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id")
    .eq("org_id", orgId);
  const assessmentIds = (assessments ?? []).map((a: { id: string }) => a.id);

  if (assessmentIds.length) {
    const { data: items } = await supabase
      .from("assessment_items")
      .select("id")
      .in("assessment_id", assessmentIds);
    const itemIds = (items ?? []).map((i: { id: string }) => i.id);

    if (itemIds.length) {
      await safe("delete assessment_responses", async () =>
        supabase
          .from("assessment_responses")
          .delete()
          .in("assessment_item_id", itemIds),
      );
      // 2. assessment_items
      await safe("delete assessment_items", async () =>
        supabase
          .from("assessment_items")
          .delete()
          .in("assessment_id", assessmentIds),
      );
    }
    // 3. assessments
    await safe("delete assessments", async () =>
      supabase.from("assessments").delete().eq("org_id", orgId),
    );
  }

  // 4. campaign_recipients + campaigns
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("org_id", orgId);
  const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);
  if (campaignIds.length) {
    await safe("delete campaign_recipients", async () =>
      supabase.from("campaign_recipients").delete().in("campaign_id", campaignIds),
    );
    await safe("delete campaigns", async () =>
      supabase.from("campaigns").delete().eq("org_id", orgId),
    );
  }

  // 5. invites (by org)
  await safe("delete invites", async () =>
    supabase.from("invites").delete().eq("org_id", orgId),
  );

  // 6. audit_logs (by org)
  await safe("delete audit_logs", async () =>
    supabase.from("audit_logs").delete().eq("org_id", orgId),
  );

  // 7. ai_guidance_usage / ai_guidance_flags — tables may not exist yet
  //    (F-012 ships in the same iteration). Swallow "relation does not exist".
  if (userIds.length) {
    await safe(
      "delete ai_guidance_usage",
      async () => supabase.from("ai_guidance_usage").delete().in("user_id", userIds),
      { ignoreMissingTable: true },
    );
    await safe(
      "delete ai_guidance_flags",
      async () => supabase.from("ai_guidance_flags").delete().in("user_id", userIds),
      { ignoreMissingTable: true },
    );
  }

  // 8. org_members
  await safe("delete org_members", async () =>
    supabase.from("org_members").delete().eq("org_id", orgId),
  );

  // 9. orgs
  await safe("delete org", async () =>
    supabase.from("orgs").delete().eq("id", orgId),
  );

  // 10. auth.users (hardest — done last, one-by-one so one failure doesn't
  //     block the rest)
  for (const uid of userIds) {
    try {
      const res = await supabase.auth.admin.deleteUser(uid);
      if (res.error && !/not found/i.test(res.error.message)) {
        // eslint-disable-next-line no-console
        console.warn(`[multiUser.teardown] delete auth user ${uid}:`, res.error.message);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[multiUser.teardown] delete auth user ${uid} threw:`, (err as Error).message);
    }
  }
}

// ---------------------------------------------------------------------------
// Public: createOrgWithMembers
// ---------------------------------------------------------------------------

/**
 * Create a fresh, isolated org + owner + N employees and sign each one in
 * inside their own BrowserContext. Returns a bundle whose `cleanup()` tears
 * down every row (via the 10-step sequence) and closes every context.
 *
 * All resources are prefixed `e2e-pi14-` and all emails use `@example.invalid`
 * so the nightly sweeper can find orphans trivially.
 */
export async function createOrgWithMembers(
  browser: Browser,
  spec: OrgSpec,
): Promise<MultiUserOrg> {
  const supabase = getServiceClient();
  const token = harnessToken();
  const orgName = spec.orgName ?? `${HARNESS_PREFIX}${token}-org`;

  // Track everything we create so cleanup can tear it down even on partial failure.
  const createdUsers: TempUser[] = [];
  const createdContexts: BrowserContext[] = [];
  let orgId: string | null = null;

  const cleanup = async (): Promise<void> => {
    // Close browser contexts first (releases sessions).
    for (const ctx of createdContexts) {
      try {
        await ctx.close();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[multiUser.cleanup] context close failed:", (err as Error).message);
      }
    }
    if (orgId) {
      await teardownOrg(
        supabase,
        orgId,
        createdUsers.map((u) => u.id),
      );
    } else {
      // Partial-failure path: no org, just delete users we managed to create.
      for (const u of createdUsers) {
        try {
          await u.delete();
        } catch {
          /* ignore */
        }
      }
    }
  };

  try {
    // --- Owner -------------------------------------------------------------
    const ownerUser = await createHarnessUser(supabase, token, `owner-${spec.ownerName}`);
    createdUsers.push(ownerUser);

    orgId = await createHarnessOrg(supabase, ownerUser.id, orgName);

    // Owner membership (default: org_admin + IT Executor = true unless caller opts out)
    const { error: ownerMembershipErr } = await supabase.from("org_members").insert({
      org_id: orgId,
      user_id: ownerUser.id,
      role: "org_admin",
      is_it_executor: spec.ownerIsItExecutor ?? true,
    });
    if (ownerMembershipErr) {
      throw new Error(`owner membership insert failed: ${ownerMembershipErr.message}`);
    }

    // --- Employees ---------------------------------------------------------
    const employeeRecords: Array<{ user: TempUser; spec: MemberSpec }> = [];
    for (const empSpec of spec.employees ?? []) {
      const empUser = await createHarnessUser(supabase, token, `emp-${empSpec.displayName}`);
      createdUsers.push(empUser);
      await addOrgMember(orgId, empUser, "employee", {
        isItExecutor: empSpec.isItExecutor ?? false,
      });
      employeeRecords.push({ user: empUser, spec: empSpec });
    }

    // --- Optional assessment ----------------------------------------------
    let assessmentId: string | null = null;
    if (spec.startAssessment) {
      assessmentId = await startAssessment(orgId, ownerUser.id);
    }

    // --- Browser contexts + login for every member ------------------------
    const ownerContext = await browser.newContext();
    createdContexts.push(ownerContext);
    const ownerPage = await ownerContext.newPage();
    if (!spec.skipLogin) {
      await loginWithRetry(ownerPage, ownerUser.email);
    }

    const employees: HarnessEmployee[] = [];
    for (const rec of employeeRecords) {
      const ctx = await browser.newContext();
      createdContexts.push(ctx);
      const page = await ctx.newPage();
      if (!spec.skipLogin) {
        await loginWithRetry(page, rec.user.email);
      }
      employees.push({ user: rec.user, context: ctx, page, spec: rec.spec });
    }

    return {
      orgId,
      orgName,
      owner: { user: ownerUser, context: ownerContext, page: ownerPage },
      employees,
      assessmentId,
      cleanup,
    };
  } catch (err) {
    // Best-effort rollback on partial failure, then rethrow.
    try {
      await cleanup();
    } catch {
      /* ignore — original error is the important one */
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public: expectDashboardCounts
// ---------------------------------------------------------------------------

type ExpectedDashboardCounts = {
  resolved: number;
  done: number;
  unsureNotYet: number;
  notApplicable: number;
  denominator: number;
  percent: number;
};

/**
 * Navigate to /workspace/dashboard and assert the canonical count pills.
 *
 * IMPORTANT: F-038 has not shipped yet (PI 14 Iter 2). The current
 * dashboard DOM uses different labels ("Done / Unsure / Skipped") and a
 * different top-line shape. This helper therefore asserts LENIENT text
 * patterns that pass against both the pre-F-038 DOM and the post-F-038 DOM.
 * Once F-038 ships with the canonical labels from the consensus fixture,
 * this helper will be tightened in the same PR (AC-3 of F-038) to assert
 * the exact labels "Resolved / Done / Unsure or not yet / Not applicable".
 */
export async function expectDashboardCounts(
  page: Page,
  expected: ExpectedDashboardCounts,
): Promise<void> {
  const { expect } = await import("@playwright/test");

  await page.goto("/workspace/dashboard");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({
    timeout: 10_000,
  });

  // Top-line: tolerates both "X / Y responses" (post-F-038) and
  // "N responses" / "N answered" (pre-F-038). We assert the *denominator*
  // appears somewhere on the page because that's the most stable signal
  // across both shapes.
  const body = page.locator("body");

  // Denominator (appears in top-line fraction or in aggregate stats).
  await expect(body).toContainText(String(expected.denominator), { timeout: 10_000 });

  // The four canonical pill values — we look for the numeric value near its
  // label word. This is intentionally lenient: matching by co-located text is
  // resilient to CSS class changes but will be tightened in F-038.
  const assertPill = async (label: RegExp, value: number): Promise<void> => {
    // Find any element whose text matches the label; then assert that the
    // numeric value appears somewhere on the dashboard. Lenient on purpose.
    const labelLoc = page.getByText(label).first();
    await expect(labelLoc).toBeVisible({ timeout: 10_000 });
    await expect(body).toContainText(String(value));
  };

  await assertPill(/resolved/i, expected.resolved);
  await assertPill(/done/i, expected.done);
  await assertPill(/not applicable|skipped/i, expected.notApplicable);
  await assertPill(/unsure|not yet/i, expected.unsureNotYet);

  // Percent — allow ±1 rounding drift. Once F-038 lands, this tightens to
  // exact equality via the computeStats helper.
  await expect(body).toContainText(new RegExp(`${expected.percent}\\s*%`));
}

// ---------------------------------------------------------------------------
// Public: seedResponses
// ---------------------------------------------------------------------------

export type ResponseStatus = "done" | "unsure" | "skipped";

export type ResponseSeed = {
  titleSubstring: string;
  status: ResponseStatus;
};

/**
 * Insert deterministic responses directly via service-role (bypasses UI).
 * Items are matched by case-insensitive substring against
 * assessment_items.title; each substring MUST match exactly one item or
 * the function throws (catches typos + ambiguous substrings at test time).
 */
export async function seedResponses(
  orgId: string,
  assessmentId: string,
  userId: string,
  responses: ResponseSeed[],
): Promise<void> {
  const supabase = getServiceClient();

  const { data: items, error } = await supabase
    .from("assessment_items")
    .select("id, title")
    .eq("assessment_id", assessmentId);

  if (error) {
    throw new Error(`seedResponses: failed to load items: ${error.message}`);
  }
  const allItems = (items ?? []) as Array<{ id: string; title: string }>;
  if (allItems.length === 0) {
    throw new Error(
      `seedResponses: assessment ${assessmentId} has zero items (did you pass startAssessment=true to createOrgWithMembers?)`,
    );
  }

  const rows = responses.map((seed) => {
    const needle = seed.titleSubstring.toLowerCase();
    const matches = allItems.filter((it) => it.title.toLowerCase().includes(needle));
    if (matches.length === 0) {
      throw new Error(
        `seedResponses: no assessment_items matched titleSubstring="${seed.titleSubstring}" in org ${orgId}`,
      );
    }
    if (matches.length > 1) {
      throw new Error(
        `seedResponses: titleSubstring="${seed.titleSubstring}" matched ${matches.length} items (ambiguous): ${matches
          .map((m) => m.title)
          .join(" | ")}`,
      );
    }
    return {
      assessment_id: assessmentId,
      assessment_item_id: matches[0].id,
      user_id: userId,
      status: seed.status,
    };
  });

  // Upsert so the helper is idempotent when re-seeding the same user.
  const { error: insertErr } = await supabase
    .from("assessment_responses")
    .upsert(rows, { onConflict: "assessment_item_id,user_id" });
  if (insertErr) {
    throw new Error(`seedResponses: insert failed: ${insertErr.message}`);
  }
}

// ---------------------------------------------------------------------------
// Public: setupCanonicalStefanFixture
// ---------------------------------------------------------------------------

/**
 * Build the EXACT 2-user canonical fixture from
 * docs/product/pi14/product_team_consensus.md ("Canonical F-038 fixture"):
 *
 *   - 1 owner who is IT Executor
 *   - 1 employee who is NOT IT Executor
 *   - Owner's IT Baseline:  Done=7 · Unsure(=not yet)=3 · N/A(=skipped)=3  (13 rows)
 *   - Owner's Awareness:    Done=4 · NotYet(=unsure)=1   · N/A(=skipped)=1  ( 6 rows)
 *   - Employee:             no responses
 *
 * Totals seeded: done=11, unsure=4, skipped=4  (= 19 rows)
 * Expected F-038 top-line (proved in PI 14 Iter 2): resolved=15 (done+skipped),
 * denominator=47, percent=32.
 *
 * Items are picked deterministically (ordered by `order_index`) so the
 * fixture is independent of checklist text changes. If the underlying
 * checklist shrinks below the fixture's requirements the function throws
 * with a clear error.
 */
export async function setupCanonicalStefanFixture(
  browser: Browser,
): Promise<MultiUserOrg & { assessmentId: string }> {
  const org = await createOrgWithMembers(browser, {
    ownerName: "Stefan",
    ownerIsItExecutor: true,
    employees: [{ displayName: "Employee", isItExecutor: false }],
    startAssessment: true,
  });

  if (!org.assessmentId) {
    await org.cleanup();
    throw new Error("setupCanonicalStefanFixture: assessmentId missing after startAssessment");
  }

  const supabase = getServiceClient();

  // Pick the first 13 IT Baseline items (ordered) + first 6 Awareness items.
  const { data: itItems, error: itErr } = await supabase
    .from("assessment_items")
    .select("id, order_index")
    .eq("assessment_id", org.assessmentId)
    .eq("track", "it_baseline")
    .order("order_index", { ascending: true });

  if (itErr) {
    await org.cleanup();
    throw new Error(`canonical fixture: load it_baseline items failed: ${itErr.message}`);
  }
  const itRows = (itItems ?? []) as Array<{ id: string; order_index: number }>;
  if (itRows.length < 13) {
    await org.cleanup();
    throw new Error(
      `canonical fixture: need >=13 it_baseline items, got ${itRows.length}. The checklist master is smaller than the fixture requires; update the fixture or seed more items.`,
    );
  }

  const { data: awItems, error: awErr } = await supabase
    .from("assessment_items")
    .select("id, order_index")
    .eq("assessment_id", org.assessmentId)
    .eq("track", "awareness")
    .order("order_index", { ascending: true });

  if (awErr) {
    await org.cleanup();
    throw new Error(`canonical fixture: load awareness items failed: ${awErr.message}`);
  }
  const awRows = (awItems ?? []) as Array<{ id: string; order_index: number }>;
  if (awRows.length < 6) {
    await org.cleanup();
    throw new Error(
      `canonical fixture: need >=6 awareness items, got ${awRows.length}.`,
    );
  }

  // Build the owner's 19 response rows.
  const ownerId = org.owner.user.id;
  const assessmentId = org.assessmentId;

  const rows: Array<{
    assessment_id: string;
    assessment_item_id: string;
    user_id: string;
    status: ResponseStatus;
  }> = [];

  // IT: 7 done, 3 unsure (not yet), 3 skipped (n/a)  — picked in order
  const itSlice = itRows.slice(0, 13);
  const itStatuses: ResponseStatus[] = [
    ...Array<ResponseStatus>(7).fill("done"),
    ...Array<ResponseStatus>(3).fill("unsure"),
    ...Array<ResponseStatus>(3).fill("skipped"),
  ];
  itSlice.forEach((it, idx) => {
    rows.push({
      assessment_id: assessmentId,
      assessment_item_id: it.id,
      user_id: ownerId,
      status: itStatuses[idx],
    });
  });

  // Awareness: 4 done, 1 unsure, 1 skipped
  const awSlice = awRows.slice(0, 6);
  const awStatuses: ResponseStatus[] = [
    ...Array<ResponseStatus>(4).fill("done"),
    ...Array<ResponseStatus>(1).fill("unsure"),
    ...Array<ResponseStatus>(1).fill("skipped"),
  ];
  awSlice.forEach((aw, idx) => {
    rows.push({
      assessment_id: assessmentId,
      assessment_item_id: aw.id,
      user_id: ownerId,
      status: awStatuses[idx],
    });
  });

  const { error: insertErr } = await supabase
    .from("assessment_responses")
    .upsert(rows, { onConflict: "assessment_item_id,user_id" });
  if (insertErr) {
    await org.cleanup();
    throw new Error(`canonical fixture: response insert failed: ${insertErr.message}`);
  }

  return { ...org, assessmentId };
}
