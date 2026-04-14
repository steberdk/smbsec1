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
import {
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
  loginWithEmail,
  getServiceClient,
  baseUrl,
} from "./helpers/fixtures";
import { setupO1, setupO2Org, setupO3 } from "./smoke/personaHelpers";

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
// Stubs — remaining Team-related invariants the F-048 partner or a follow-up
// will fill. Each is skipped with a TODO naming the follow-up.
// ===========================================================================

test.skip("INV-email-case-normalised-on-delete: TODO (F-049 follow-up) — seed Mixed@Case invite, delete with lowercase, assert gone", () => {
  // TODO: depends on migration 024 being applied; cross-references
  // member-deletion.spec.ts E2E-DELMEM-03 as the existing realistic case.
});

test.skip("INV-gdpr-delete-coherent: TODO (F-033/F-049 follow-up) — delete via Team, assert absent from Dashboard + Report", () => {
  // TODO: requires dashboard/report rendering with team-member-presence checks.
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
      // locale, IT executor). Wait for the members fetch to populate its
      // options, then read the selected label.
      const itSelect = p.locator("select").last();
      await expect
        .poll(async () => itSelect.locator("option").count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
      const selectedText = await itSelect.evaluate((el) => {
        const sel = el as HTMLSelectElement;
        return sel.options[sel.selectedIndex]?.textContent ?? "";
      });
      // O1's solo owner membership is the only option; its label ends with
      // "(Owner)" per OrgSettingsPage line 257.
      expect(selectedText).toMatch(/Owner/i);
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
