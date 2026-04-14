// Coordinate with F-048 agent: files co-owned
//
// F-046 — cross-page invariants spec.
//
// Each test asserts ONE invariant from `docs/quality/invariants.md`.
// Tests that touch the server mock the RPC via Playwright's route interception
// so they do NOT require a real DB state — they exercise the UI's error-path
// mapping only. Tests that need real DB state use the service-role fixtures.
//
// Convention: test title begins with the invariant ID.

import { test, expect, type Page, type Route } from "@playwright/test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
  loginWithEmail,
  getServiceClient,
  baseUrl,
} from "./helpers/fixtures";
import { createOrgWithMembers } from "./helpers/multiUser";
import { setupO1, setupO3 } from "./smoke/personaHelpers";

// ---------------------------------------------------------------------------
// Shared regex for raw-DB-error leak detection.
// ---------------------------------------------------------------------------

const RAW_DB_ERROR_PATTERNS: RegExp[] = [
  /function\s+\S+\s*\(.*\)\s*does not exist/i,
  /\bSQLSTATE\b/i,
  /\brelation "/,
  /column ".+" does not exist/i,
  /\bdigest\s*\(/i, // e.g. `digest(text, unknown)` — PDF #46 specific
];

function assertNoRawDbError(text: string): void {
  for (const re of RAW_DB_ERROR_PATTERNS) {
    expect(text, `raw DB error leak matched ${re}`).not.toMatch(re);
  }
}

// Regex of jargon phrases that must NEVER appear in destructive confirm dialogs.
const DESTRUCTIVE_COPY_JARGON = /audit log PII|digest\(text|SQLSTATE/i;

// ---------------------------------------------------------------------------
// Helper: seed a pending invite directly via service-role.
// ---------------------------------------------------------------------------

async function seedPendingInvite(
  orgId: string,
  invitedBy: string,
  opts: { email?: string; isItExecutor?: boolean } = {},
): Promise<{ inviteId: string; email: string }> {
  const svc = getServiceClient();
  const email =
    opts.email ?? `inv-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await svc
    .from("invites")
    .insert({
      org_id: orgId,
      email,
      role: "employee",
      is_it_executor: opts.isItExecutor ?? false,
      token: `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      invited_by: invitedBy,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`seedPendingInvite failed: ${error?.message}`);
  return { inviteId: data.id as string, email };
}

// ---------------------------------------------------------------------------
// Helper: intercept DELETE /api/orgs/members and return a canned response.
// ---------------------------------------------------------------------------

async function mockDeleteMembers(
  page: Page,
  response: { status: number; body: Record<string, unknown> },
): Promise<void> {
  await page.route("**/api/orgs/members**", async (route: Route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
}

// ===========================================================================
// INV-no-raw-db-errors — Team page, Revoke + delete data path (PDF #46).
// ===========================================================================

test("INV-no-raw-db-errors (team revoke+delete): digest() error never leaks to DOM", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("INV-raw-db Org");
  try {
    const { email: inviteEmail } = await seedPendingInvite(
      iso.orgId,
      iso.adminUser.id,
    );

    // Intercept the DELETE to simulate migration 024 missing OR pgcrypto
    // missing — the raw Postgres error the real RPC would surface pre-fix.
    // The server is expected to already classify this as `migration_pending`
    // (503) — we force the raw shape here to prove the CLIENT defends in
    // depth even if the server ever regresses.
    await mockDeleteMembers(page, {
      status: 500,
      body: {
        error: "function digest(text, unknown) does not exist",
        code: "42883",
      },
    });

    await loginWithEmail(page, iso.adminUser.email);
    await page.goto(`${baseUrl()}/workspace/team`);
    await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 15_000 });

    // Open Revoke + delete data dialog on the pending invite row.
    await page
      .locator(`[data-testid^="revoke-delete-invite-"]`)
      .first()
      .click();
    await expect(page.getByTestId("remove-member-dialog")).toBeVisible();
    await page.getByTestId("remove-member-confirm").click();

    // The error banner should appear — and must NOT contain raw PG text.
    // Poll the dialog body for the error banner content.
    await page.waitForTimeout(500); // let the error surface
    const dialogText = await page.getByTestId("remove-member-dialog").innerText();
    assertNoRawDbError(dialogText);

    // And the invite row must still be visible (INV-team-pending-invite-actions-safe
    // also asserts this — see the dedicated test below).
    // Close dialog first so the row is unambiguously measurable.
    const cancelBtn = page.getByRole("button", { name: /cancel/i });
    if (await cancelBtn.isVisible()) await cancelBtn.click();
    await expect(page.getByText(inviteEmail)).toBeVisible();
  } finally {
    await iso.cleanup();
  }
});

// ===========================================================================
// INV-team-pending-invite-actions-safe — row stays visible on non-success.
// ===========================================================================

test("INV-team-pending-invite-actions-safe: Revoke+delete failure keeps row + non-raw error", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("INV-pending-safe Org");
  try {
    const { email: inviteEmail } = await seedPendingInvite(
      iso.orgId,
      iso.adminUser.id,
    );

    // Simulate the server's `migration_pending` 503 branch (the well-formed
    // shape after F-049 AC-2 ships).
    await mockDeleteMembers(page, {
      status: 503,
      body: { error: "migration_pending" },
    });

    await loginWithEmail(page, iso.adminUser.email);
    await page.goto(`${baseUrl()}/workspace/team`);
    await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 15_000 });

    await page
      .locator(`[data-testid^="revoke-delete-invite-"]`)
      .first()
      .click();
    await page.getByTestId("remove-member-confirm").click();

    await page.waitForTimeout(500);
    const dialogText = await page.getByTestId("remove-member-dialog").innerText();
    assertNoRawDbError(dialogText);
    // Plain-language migration message per F-049 AC-2.
    expect(dialogText.toLowerCase()).toContain("temporarily unavailable");

    // Close & verify row preserved.
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText(inviteEmail)).toBeVisible();
  } finally {
    await iso.cleanup();
  }
});

// ===========================================================================
// INV-destructive-action-double-confirm — no jargon in confirm dialog body.
// ===========================================================================

test("INV-destructive-action-double-confirm (team revoke+delete): confirm body is plain-language, no 'audit log PII'", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("INV-copy Org");
  try {
    const { email: inviteEmail } = await seedPendingInvite(
      iso.orgId,
      iso.adminUser.id,
    );

    await loginWithEmail(page, iso.adminUser.email);
    await page.goto(`${baseUrl()}/workspace/team`);
    await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 15_000 });

    await page
      .locator(`[data-testid^="revoke-delete-invite-"]`)
      .first()
      .click();
    await expect(page.getByTestId("remove-member-dialog")).toBeVisible();

    const body = await page.getByTestId("remove-member-dialog").innerText();

    // No jargon (PDF #45 regression guard).
    expect(body).not.toMatch(DESTRUCTIVE_COPY_JARGON);

    // Plain-language enumeration is present — must name at least two of the
    // categories the RPC actually deletes.
    expect(body.toLowerCase()).toMatch(/audit log entries|audit log/);
    expect(body.toLowerCase()).toContain("invite");

    // And a distinct red confirm button exists (second-click guard — the
    // invariant permits either typed-confirm OR distinct red button).
    await expect(page.getByTestId("remove-member-confirm")).toBeVisible();
  } finally {
    await iso.cleanup();
  }
});

// ===========================================================================
// INV-destructive-action-double-confirm (member remove branch) — same jargon
// guard on the member-removal dialog bullets.
// ===========================================================================

test("INV-destructive-action-double-confirm (member remove): dialog bullets plain-language", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("INV-member-copy Org");
  const employee = await createTempUser("inv-member-copy");
  try {
    await addOrgMember(iso.orgId, employee, "employee", { isItExecutor: false });
    const svc = getServiceClient();
    await svc
      .from("org_members")
      .update({ email: employee.email })
      .eq("org_id", iso.orgId)
      .eq("user_id", employee.id);

    await loginWithEmail(page, iso.adminUser.email);
    await page.goto(`${baseUrl()}/workspace/team`);
    await expect(page.getByText(employee.email)).toBeVisible({ timeout: 15_000 });

    await page
      .locator(`[data-testid^="remove-member-"]`)
      .filter({ hasText: /remove/i })
      .first()
      .click();
    await expect(page.getByTestId("remove-member-dialog")).toBeVisible();

    const body = await page.getByTestId("remove-member-dialog").innerText();
    expect(body).not.toMatch(DESTRUCTIVE_COPY_JARGON);
    expect(body.toLowerCase()).toContain("anonymous identifier");
  } finally {
    try {
      await employee.delete();
    } catch {
      /* ignore */
    }
    await iso.cleanup();
  }
});

// ===========================================================================
// F-049 post-migration — AC-1 real happy path (migration 024 applied).
// Proves Revoke+delete-data on a pending invite succeeds for real (NOT the
// graceful-fallback 503 branch covered in the mock test above) AND the
// resulting audit_logs row has the email redacted to a SHA-256 hash.
// ===========================================================================

test.describe("F-049 post-migration", () => {
  async function migration024Applied(): Promise<boolean> {
    const svc = getServiceClient();
    const probe = await svc.rpc("delete_member_with_data", {
      p_org_id: "00000000-0000-0000-0000-000000000000",
      p_target_email: "does-not-exist@example.invalid",
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

  test("F-049 AC-1 (post-migration): Revoke+delete data on pending invite — real success, invite row gone, audit redacted", async ({
    page,
  }, testInfo) => {
    test.skip(
      !(await migration024Applied()),
      "migration 024 (delete_member_with_data) not applied yet",
    );
    testInfo.setTimeout(120_000);

    const iso = await createIsolatedOrg("F049-happy Org");
    try {
      const { email: inviteEmail } = await seedPendingInvite(
        iso.orgId,
        iso.adminUser.id,
      );

      // NOTE: NO mockDeleteMembers here — we want the real RPC path.

      await loginWithEmail(page, iso.adminUser.email);
      await page.goto(`${baseUrl()}/workspace/team`);
      await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 15_000 });

      await page
        .locator(`[data-testid^="revoke-delete-invite-"]`)
        .first()
        .click();
      await expect(page.getByTestId("remove-member-dialog")).toBeVisible();
      await page.getByTestId("remove-member-confirm").click();

      // Row disappears once the real RPC returns success. The team page
      // re-fetches invites on delete success. Target the Pending-invites
      // row specifically — a success banner legitimately mentions the
      // removed email ("Invitation for {email} revoked.") so a whole-page
      // text match would false-positive.
      await expect(
        page.locator('[data-testid^="revoke-delete-invite-"]'),
      ).toHaveCount(0, { timeout: 15_000 });

      // DB assertion: invite row actually gone.
      const svc = getServiceClient();
      const { data: remaining } = await svc
        .from("invites")
        .select("id")
        .eq("org_id", iso.orgId)
        .eq("email", inviteEmail);
      expect(remaining ?? []).toHaveLength(0);

      // Audit row uses hashed email, not the plain email.
      const { data: audits } = await svc
        .from("audit_logs")
        .select("event_type, details")
        .eq("org_id", iso.orgId)
        .eq("event_type", "member_removed");
      expect((audits ?? []).length).toBeGreaterThanOrEqual(1);
      const details = (audits![0] as { details: Record<string, unknown> })
        .details;
      const expectedHash = createHash("sha256")
        .update(inviteEmail.toLowerCase().trim())
        .digest("hex");
      expect(details.removed_email_sha256).toBe(expectedHash);
      const dump = JSON.stringify(details).toLowerCase();
      expect(dump).not.toContain(inviteEmail.toLowerCase());
    } finally {
      await iso.cleanup();
    }
  });
});

// ===========================================================================
// Stubs — remaining Team-related invariants the F-048 partner or a follow-up
// will fill. Each is skipped with a TODO naming the follow-up.
// ===========================================================================

// ---------------------------------------------------------------------------
// F-058 AC-1 + AC-2 helpers
// ---------------------------------------------------------------------------

async function isDeleteMemberRpcApplied(): Promise<boolean> {
  const svc = getServiceClient();
  const probe = await svc.rpc("delete_member_with_data", {
    p_org_id: "00000000-0000-0000-0000-000000000000",
    p_target_email: "probe@example.invalid",
    p_actor_user_id: "00000000-0000-0000-0000-000000000000",
  });
  // Case 1: the RPC itself is missing (supabase-js surfaces the PG error on
  // `probe.error`).
  if (probe.error) {
    const msg = probe.error.message ?? "";
    if (/function .* does not exist/i.test(msg)) return false;
    if (/could not find the function/i.test(msg)) return false;
  }
  // Case 2: the RPC exists but catches an inner failure (pgcrypto missing →
  // "function digest(text, unknown) does not exist") and returns it via the
  // jsonb envelope `{success:false, error:"..."}`. The HTTP endpoint treats
  // this as `migration_pending`; we match by matching the inner error string.
  const data = probe.data as { success?: boolean; error?: string } | null | undefined;
  if (data && data.success === false) {
    const innerErr = (data.error ?? "").toLowerCase();
    if (innerErr.includes("digest(") || innerErr.includes("does not exist")) {
      return false;
    }
  }
  return true;
}

/** Extract PKCE-safe access_token from a signed-in page. */
async function accessTokenFromPage(p: Page): Promise<string> {
  const token = await p.evaluate(() => {
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
    throw new Error("accessTokenFromPage: no Supabase access_token in localStorage");
  }
  return token;
}

// ===========================================================================
// F-058 AC-1 — INV-email-case-normalised-on-delete
// Seed Mixed@Case invite, delete with lowercase variant, assert row gone.
// ===========================================================================

test("INV-email-case-normalised-on-delete: Mixed-case invite deleted by lowercase email", async ({
  page,
}, testInfo) => {
  test.skip(
    !(await isDeleteMemberRpcApplied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );
  testInfo.setTimeout(120_000);

  const iso = await createIsolatedOrg("INV-case-norm Org");
  try {
    const svc = getServiceClient();
    const mixedEmail = `Mixed-${Date.now()}@Case.Example.Invalid`;
    const { data: inviteRow, error: insErr } = await svc
      .from("invites")
      .insert({
        org_id: iso.orgId,
        email: mixedEmail,
        role: "employee",
        is_it_executor: false,
        token: `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        invited_by: iso.adminUser.id,
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      })
      .select("id, email")
      .single();
    if (insErr || !inviteRow) throw new Error(`seed mixed-case invite failed: ${insErr?.message}`);

    // Admin row needs email populated for the RPC's actor lookup.
    await svc
      .from("org_members")
      .update({ email: iso.adminUser.email })
      .eq("org_id", iso.orgId)
      .eq("user_id", iso.adminUser.id);

    await loginWithEmail(page, iso.adminUser.email);
    const token = await accessTokenFromPage(page);

    const lcEmail = mixedEmail.toLowerCase();
    const delRes = await fetch(
      `${baseUrl()}/api/orgs/members?email=${encodeURIComponent(lcEmail)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const delBody = (await delRes.json().catch(() => ({}))) as Record<string, unknown>;
    expect(delRes.status, JSON.stringify(delBody)).toBe(200);
    expect(delBody.success).toBe(true);
    expect((delBody.invites_deleted as number | undefined) ?? 0).toBeGreaterThanOrEqual(1);

    // The original mixed-case row must be gone by id.
    const { data: byId } = await svc
      .from("invites")
      .select("id")
      .eq("id", (inviteRow as { id: string }).id);
    expect(byId ?? []).toHaveLength(0);

    // Case-insensitive email lookup also finds nothing.
    const { data: byEmail } = await svc
      .from("invites")
      .select("id")
      .ilike("email", mixedEmail);
    expect(byEmail ?? []).toHaveLength(0);
  } finally {
    await iso.cleanup();
  }
});

// ===========================================================================
// F-058 AC-2 — INV-gdpr-delete-coherent
// Owner deletes an employee; assert absent from Team, Dashboard, Report,
// AND audit_logs rows referencing the email have been redacted.
// ===========================================================================

test("INV-gdpr-delete-coherent: deleted employee absent from Team + Dashboard + Report; audit logs redacted", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await isDeleteMemberRpcApplied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );
  testInfo.setTimeout(180_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "INV-gdpr Owner",
    ownerIsItExecutor: true,
    employees: [{ displayName: "INV-gdpr Employee", isItExecutor: false }],
    startAssessment: true,
  });

  try {
    const svc = getServiceClient();
    const owner = org.owner.user;
    const employee = org.employees[0].user;

    // Populate email column on org_members so the RPC can match + so
    // Dashboard / Report render a searchable email string pre-delete.
    await svc
      .from("org_members")
      .update({ email: owner.email, display_name: "INV-gdpr Owner" })
      .eq("org_id", org.orgId)
      .eq("user_id", owner.id);
    await svc
      .from("org_members")
      .update({ email: employee.email, display_name: "INV-gdpr Employee" })
      .eq("org_id", org.orgId)
      .eq("user_id", employee.id);

    // Seed one audit_logs row that references the employee email so we can
    // verify it's stripped post-delete.
    await svc.from("audit_logs").insert({
      org_id: org.orgId,
      actor_user_id: employee.id,
      actor_email: employee.email,
      event_type: "invite_sent",
      details: { email: employee.email, note: "pre-delete seed" },
    });

    // Seed one response for the employee (not strictly needed for the DOM
    // assertions but matches a realistic pre-delete state).
    const { data: awItems } = await svc
      .from("assessment_items")
      .select("id")
      .eq("assessment_id", org.assessmentId!)
      .eq("track", "awareness")
      .limit(1);
    const awId = (awItems?.[0] as { id: string } | undefined)?.id;
    if (awId) {
      await svc.from("assessment_responses").insert({
        assessment_id: org.assessmentId!,
        assessment_item_id: awId,
        user_id: employee.id,
        status: "done",
      });
    }

    // Call DELETE (same endpoint the Team page uses).
    const ownerToken = await accessTokenFromPage(org.owner.page);
    const delRes = await fetch(
      `${baseUrl()}/api/orgs/members?email=${encodeURIComponent(employee.email)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
      },
    );
    const delBody = (await delRes.json().catch(() => ({}))) as Record<string, unknown>;
    expect(delRes.status, JSON.stringify(delBody)).toBe(200);
    expect(delBody.success).toBe(true);

    // ---- 1. Team API: employee absent ----
    const teamRes = await fetch(`${baseUrl()}/api/orgs/members`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const teamBody = (await teamRes.json()) as { members?: Array<{ email: string | null }> };
    const teamEmails = (teamBody.members ?? []).map((m) => (m.email ?? "").toLowerCase());
    expect(teamEmails).not.toContain(employee.email.toLowerCase());

    // ---- 2. Dashboard page: employee absent from rendered DOM ----
    await org.owner.page.goto(`${baseUrl()}/workspace/dashboard`);
    await org.owner.page.waitForLoadState("networkidle");
    const dashText = await org.owner.page.locator("body").innerText();
    expect(dashText.toLowerCase()).not.toContain(employee.email.toLowerCase());

    // ---- 3. Report page: employee absent from rendered per-member table ----
    await org.owner.page.goto(`${baseUrl()}/workspace/report`);
    await org.owner.page.waitForLoadState("networkidle");
    const reportText = await org.owner.page.locator("body").innerText();
    expect(reportText.toLowerCase()).not.toContain(employee.email.toLowerCase());

    // ---- 4. audit_logs: no plaintext email anywhere; hashed sentinel present ----
    const { data: audits } = await svc
      .from("audit_logs")
      .select("event_type, actor_email, details")
      .eq("org_id", org.orgId);
    const all = (audits ?? []) as Array<{
      event_type: string;
      actor_email: string | null;
      details: Record<string, unknown> | null;
    }>;
    const emailLc = employee.email.toLowerCase();
    for (const row of all) {
      expect((row.actor_email ?? "").toLowerCase()).not.toBe(emailLc);
      const blob = JSON.stringify(row.details ?? {}).toLowerCase();
      expect(blob).not.toContain(emailLc);
    }
    const removedRows = all.filter((r) => r.event_type === "member_removed");
    expect(removedRows.length).toBeGreaterThanOrEqual(1);
    const expectedHash = createHash("sha256").update(emailLc.trim()).digest("hex");
    const hashSeen = removedRows.some(
      (r) =>
        (r.details as { removed_email_sha256?: string } | null)?.removed_email_sha256 ===
        expectedHash,
    );
    expect(hashSeen).toBe(true);
  } finally {
    await org.cleanup();
  }
});

// ===========================================================================
// F-058 AC-3 — INV-workspace-auth-boundary
// Loop every /workspace/* route, fetch with no cookie, assert either a 3xx
// redirect (not to another /workspace route) OR a body that contains none of
// the seeded sensitive strings.
// ===========================================================================

const WORKSPACE_ROUTES: string[] = [
  "/workspace",
  "/workspace/assessments",
  "/workspace/billing",
  "/workspace/campaigns",
  "/workspace/campaigns/new",
  "/workspace/campaigns/templates",
  "/workspace/campaigns/templates/new",
  "/workspace/checklist",
  "/workspace/dashboard",
  "/workspace/report",
  "/workspace/settings",
  "/workspace/settings/gdpr",
  "/workspace/team",
];

test("INV-workspace-auth-boundary: anon fetch of every /workspace/* leaks nothing", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(180_000);

  // Seed a known-sensitive fixture we will grep for in each response body.
  const org = await createOrgWithMembers(browser, {
    ownerName: "INV-authboundary Owner",
    ownerIsItExecutor: true,
    employees: [{ displayName: "INV-authboundary Employee", isItExecutor: false }],
    startAssessment: false,
    skipLogin: true,
  });

  try {
    const orgName = org.orgName.toLowerCase();
    const ownerEmail = org.owner.user.email.toLowerCase();
    const ownerUserId = org.owner.user.id.toLowerCase();
    const employeeEmail = org.employees[0].user.email.toLowerCase();
    const employeeUserId = org.employees[0].user.id.toLowerCase();

    const ctx = await browser.newContext();
    try {
      for (const route of WORKSPACE_ROUTES) {
        const resp = await ctx.request.get(`${baseUrl()}${route}`, {
          maxRedirects: 0,
          failOnStatusCode: false,
        });
        const status = resp.status();

        // Acceptable: redirect away from /workspace.
        if (status >= 300 && status < 400) {
          const loc = resp.headers()["location"] ?? "";
          expect(
            loc.startsWith("/workspace") ? loc : "ok",
            `route=${route} redirected back to another /workspace route: ${loc}`,
          ).toBe("ok");
          continue;
        }

        // 2xx / 4xx: body must not contain any seeded identifier.
        const body = (await resp.text()).toLowerCase();
        const leaks: string[] = [];
        if (body.includes(orgName)) leaks.push("orgName");
        if (body.includes(ownerEmail)) leaks.push("ownerEmail");
        if (body.includes(ownerUserId)) leaks.push("ownerUserId");
        if (body.includes(employeeEmail)) leaks.push("employeeEmail");
        if (body.includes(employeeUserId)) leaks.push("employeeUserId");
        expect(
          leaks,
          `route=${route} status=${status} leaked: ${leaks.join(", ")}`,
        ).toEqual([]);
      }
    } finally {
      await ctx.close();
    }
  } finally {
    await org.cleanup();
  }
});

// ===========================================================================
// F-058 AC-4 — INV-no-service-role-in-client-bundle
// Scan frontend/.next/static/** for the env-var name AND the JWT prefix of
// the current service-role key. Fail on any match.
// ===========================================================================

test("INV-no-service-role-in-client-bundle: client bundle contains neither the env-var name nor the current service-role JWT prefix", async () => {
  const nextStaticDir = path.resolve(__dirname, "..", ".next", "static");
  test.skip(
    !fs.existsSync(nextStaticDir),
    "frontend/.next/static not found — run `npm run build` before this test",
  );

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set for this test");
  }
  // First 24 chars of the JWT (header + start of payload). Unique enough to
  // catch accidental inlining, short enough to survive key rotation without
  // hard-coding.
  const jwtPrefix = serviceKey.slice(0, 24);
  const needles: Array<{ label: string; value: string }> = [
    { label: "SUPABASE_SERVICE_ROLE_KEY", value: "SUPABASE_SERVICE_ROLE_KEY" },
    { label: "JWT_PREFIX", value: jwtPrefix },
  ];

  function walk(dir: string, out: string[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (entry.isFile()) out.push(full);
    }
  }
  const files: string[] = [];
  walk(nextStaticDir, files);
  expect(files.length, "no files under .next/static").toBeGreaterThan(0);

  const hits: Array<{ file: string; label: string }> = [];
  for (const file of files) {
    if (!/\.(js|mjs|css|html|json|map|txt)$/i.test(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    for (const needle of needles) {
      if (content.includes(needle.value)) {
        hits.push({ file: path.relative(nextStaticDir, file), label: needle.label });
      }
    }
  }
  expect(
    hits,
    `service-role key / env-var name leaked into client bundle: ${hits
      .map((h) => `${h.file}::${h.label}`)
      .join("; ")}`,
  ).toEqual([]);
});

// ===========================================================================
// F-058 AC-5 — INV-rls-on-every-smbsec1-table
// For every smbsec1 table: rowsecurity=true AND at least one row in
// pg_policies. Requires a direct Postgres connection because PostgREST does
// not expose pg_catalog.
// ===========================================================================

test("INV-rls-on-every-smbsec1-table: every smbsec1 table has RLS enabled + ≥ 1 policy", async () => {
  const dbUrl =
    process.env.POSTGRES_URL ??
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    null;
  test.skip(
    !dbUrl,
    "POSTGRES_URL / SUPABASE_DB_URL / DATABASE_URL not set — set one (Supabase → Settings → Database → Connection string, ?sslmode=require) to enable this probe",
  );

  // `pg` has no bundled types and adding `@types/pg` as a dep is out of scope
  // for F-058 (no new packages). Use a local minimal ambient shape.
  type PgQueryResult<R> = { rows: R[] };
  type PgClientLike = {
    connect(): Promise<void>;
    end(): Promise<void>;
    query<R = unknown>(text: string): Promise<PgQueryResult<R>>;
  };
  type PgModule = { Client: new (opts: { connectionString: string }) => PgClientLike };
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error — `pg` ships no types; we use a local minimal shape above.
  const pgImport: unknown = await import("pg");
  const pg = pgImport as PgModule;
  const client = new pg.Client({ connectionString: dbUrl! });
  await client.connect();
  try {
    const tables = await client.query<{ tablename: string; rowsecurity: boolean }>(
      `select tablename, rowsecurity from pg_tables where schemaname = 'smbsec1' order by tablename`,
    );
    expect(
      tables.rows.length,
      "zero tables found in schema smbsec1 — is the schema correctly named?",
    ).toBeGreaterThan(0);

    const policies = await client.query<{ tablename: string; n: string }>(
      `select tablename, count(*) as n from pg_policies where schemaname = 'smbsec1' group by tablename`,
    );
    const policyByTable = new Map<string, number>(
      policies.rows.map((r: { tablename: string; n: string }) => [r.tablename, Number(r.n)]),
    );

    const violations: string[] = [];
    for (const row of tables.rows) {
      if (!row.rowsecurity) {
        violations.push(`${row.tablename}: rowsecurity=false`);
        continue;
      }
      const n = policyByTable.get(row.tablename) ?? 0;
      if (n < 1) violations.push(`${row.tablename}: zero policies`);
    }
    expect(
      violations,
      `RLS violations in schema smbsec1: ${violations.join("; ")}`,
    ).toEqual([]);
  } finally {
    await client.end();
  }
});

// ===========================================================================
// F-058 AC-6 — INV-public-checklist-readonly
// ANON /checklist: zero response buttons. Signed-in /workspace/checklist: > 0.
// ===========================================================================

const RESPONSE_BUTTON_TEXT =
  /^\s*(Done|Not sure|Unsure|Not yet|I've done this|Not applicable)\s*$/i;

test("INV-public-checklist-readonly: anon /checklist shows zero response buttons; signed-in shows > 0", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(120_000);

  // --- ANON ---
  const anonCtx = await browser.newContext();
  try {
    const anonPage = await anonCtx.newPage();
    await anonPage.goto(`${baseUrl()}/checklist`);
    await anonPage.waitForLoadState("networkidle");
    // Give the auth-check effect time to switch viewMode to "readonly".
    await anonPage.waitForTimeout(500);
    const anonButtons = anonPage.getByRole("button", { name: RESPONSE_BUTTON_TEXT });
    expect(await anonButtons.count()).toBe(0);
  } finally {
    await anonCtx.close();
  }

  // --- SIGNED-IN (owner on /workspace/checklist) ---
  const org = await createOrgWithMembers(browser, {
    ownerName: "INV-public-checklist Owner",
    ownerIsItExecutor: true,
    startAssessment: true,
  });
  try {
    const p = org.owner.page;
    await p.goto(`${baseUrl()}/workspace/checklist`);
    await p.waitForLoadState("networkidle");
    await p
      .getByRole("button", { name: RESPONSE_BUTTON_TEXT })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    const authedCount = await p
      .getByRole("button", { name: RESPONSE_BUTTON_TEXT })
      .count();
    expect(authedCount).toBeGreaterThan(0);
  } finally {
    await org.cleanup();
  }
});

// ===========================================================================
// INV-home-exec-parity + INV-home-steps-deterministic + INV-home-step-text-coherent
// F-048 coverage — Home page tests using the F-043 multi-user harness.
// ===========================================================================

test.describe("F-048 Home invariants", () => {
  test("INV-home-exec-parity (O1): subtitle says 'Owner · IT Executor'; Settings dropdown selects owner", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const org = await setupO1(browser);
    try {
      const p = org.owner.page;
      await p.goto(`${baseUrl()}/workspace`);
      await p.waitForLoadState("networkidle");

      await expect(p.getByTestId("home-subtitle")).toHaveText(
        /Owner\s*·\s*IT Executor/,
      );

      await p.goto(`${baseUrl()}/workspace/settings`);
      // The IT executor select is the last on the page (email platform,
      // locale, IT executor). F-048 Settings extension (2026-04-14) adds a
      // placeholder option `— not assigned —` at value="" that is the
      // initial selection until the members+invites fetch resolves and
      // `setExecutor(ownerId)` runs. Poll on the *selected* option's text
      // rather than just option count, so the assertion waits for state
      // to settle — not just for options to populate.
      const itSelect = p.locator("select").last();
      await expect
        .poll(
          async () =>
            itSelect.evaluate((el) => {
              const sel = el as HTMLSelectElement;
              return sel.options[sel.selectedIndex]?.textContent ?? "";
            }),
          { timeout: 10_000 },
        )
        .toMatch(/Owner/i);
    } finally {
      await org.cleanup();
    }
  });

  test("INV-home-exec-parity (O3): subtitle does NOT say IT Executor; pending invite surfaced in step 2", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const { org } = await setupO3(browser);
    try {
      const p = org.owner.page;
      await p.goto(`${baseUrl()}/workspace`);
      await p.waitForLoadState("networkidle");
      const subtitle = (await p.getByTestId("home-subtitle").textContent()) ?? "";
      expect(subtitle).not.toMatch(/IT Executor/i);

      await p.getByTestId("home-get-started").waitFor({ state: "visible" });
      const step2Title =
        (await p.getByTestId("home-step-it-executor-title").textContent()) ?? "";
      expect(step2Title).toMatch(/invite sent/i);
    } finally {
      await org.cleanup();
    }
  });

  test("INV-home-steps-deterministic (O3): Get-started block markup byte-equal across nav-away-and-back", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const { org } = await setupO3(browser);
    try {
      const p = org.owner.page;

      const snapshot = async (): Promise<string> => {
        await p.goto(`${baseUrl()}/workspace`);
        await p.waitForLoadState("networkidle");
        await p.getByTestId("home-get-started").waitFor({ state: "visible" });
        await p.waitForTimeout(300);
        return p.getByTestId("home-get-started").innerHTML();
      };

      const first = await snapshot();
      await p.goto(`${baseUrl()}/workspace/checklist`);
      await p.waitForLoadState("networkidle");
      const second = await snapshot();
      expect(second).toBe(first);
    } finally {
      await org.cleanup();
    }
  });

  test("INV-home-step-text-coherent (O1): step 2 says 'IT checklist assigned to you'", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const org = await setupO1(browser);
    try {
      const p = org.owner.page;
      await p.goto(`${baseUrl()}/workspace`);
      await p.waitForLoadState("networkidle");
      await p.getByTestId("home-get-started").waitFor({ state: "visible" });
      const title =
        (await p.getByTestId("home-step-it-executor-title").textContent()) ?? "";
      expect(title).toMatch(/IT checklist assigned to you/i);
    } finally {
      await org.cleanup();
    }
  });

  test("INV-home-step-text-coherent (O3): step 2 reflects pending invite, never 'Invite your IT Executor'", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const { org } = await setupO3(browser);
    try {
      const p = org.owner.page;
      await p.goto(`${baseUrl()}/workspace`);
      await p.waitForLoadState("networkidle");
      await p.getByTestId("home-get-started").waitFor({ state: "visible" });
      const title =
        (await p.getByTestId("home-step-it-executor-title").textContent()) ?? "";
      expect(title).toMatch(/invite sent/i);
      expect(title).not.toMatch(/^Invite your IT Executor$/i);
    } finally {
      await org.cleanup();
    }
  });

  test("INV-no-not-set-when-derivable (O3): Settings IT Executor field not 'Not set' when pending invite exists", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const { org } = await setupO3(browser);
    try {
      const p = org.owner.page;
      await p.goto(`${baseUrl()}/workspace/settings`);
      const itSelect = p.locator("select").last();
      await expect
        .poll(async () => itSelect.locator("option").count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      const selectedText = (await itSelect.evaluate((el) => {
        const sel = el as HTMLSelectElement;
        return sel.options[sel.selectedIndex]?.textContent ?? "";
      })) as string;
      // With no accepted exec, Settings must default to a real person (the
      // owner) — never render the literal empty-state "Not set" label for a
      // value that is derivable.
      expect(selectedText.trim()).not.toBe("Not set");
    } finally {
      await org.cleanup();
    }
  });
});
