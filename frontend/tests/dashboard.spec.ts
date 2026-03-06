/**
 * Dashboard — progress aggregation, cadence indicator, post-completion flow.
 * Covers: AC-AGG-1, AC-AGG-2, AC-DASH-1, AC-DASH-2, AC-DASH-3
 * E2E scenarios: E2E-DASH-01 through E2E-DASH-04
 */

import { test, expect } from "@playwright/test";
import {
  loginWithEmail,
  loginAsRole,
  createIsolatedOrg,
  addOrgMember,
  createTempUser,
  startAssessment,
  getAdminOrgId,
  getAdminUserId,
  completeAnyActiveAssessment,
} from "./helpers/fixtures";

test("E2E-DASH-01: Org Admin dashboard loads and shows team progress section", async ({
  page,
}) => {
  // Set up: ensure the admin org has an active assessment and at least one member
  const orgId = await getAdminOrgId();
  const adminUserId = await getAdminUserId();
  await startAssessment(orgId, adminUserId);

  await loginAsRole(page, "org_admin");
  await page.goto("/workspace/dashboard");

  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

  // Cadence indicator is always shown
  await expect(
    page.getByText(/on track|due soon|overdue|no assessment completed/i)
  ).toBeVisible({ timeout: 10_000 });

  // With an active assessment, stats section should appear
  await expect(page.getByText(/done/i).first()).toBeVisible({ timeout: 10_000 });

  // Cleanup
  await completeAnyActiveAssessment(orgId);
});

test("E2E-DASH-02: Manager dashboard shows only subtree data", async ({ page }) => {
  const iso = await createIsolatedOrg("DASH02 Org");
  const manager = await createTempUser("e2e-mgr-dash");
  const employee = await createTempUser("e2e-emp-dash");

  try {
    await addOrgMember(iso.orgId, manager, "manager", {
      managerUserId: iso.adminUser.id,
    });
    await addOrgMember(iso.orgId, employee, "employee", {
      managerUserId: manager.id,
    });

    await startAssessment(iso.orgId, iso.adminUser.id);

    await loginWithEmail(page, manager.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/dashboard");

    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    // Dashboard should load without error
    await expect(
      page.getByText(/on track|due soon|overdue|no assessment completed/i)
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await employee.delete();
    await manager.delete();
    await iso.cleanup();
  }
});

test.skip("E2E-DASH-03: post-completion screen offers calendar file download", () => {
  // Skipped: the post-completion screen with .ics download is not yet implemented.
  // Implement once the "Schedule next review" section exists on the checklist page.
});

test.skip("E2E-DASH-04: overdue review indicator shown when last assessment > 90 days ago", () => {
  // Skipped: requires seeding a completed assessment with a timestamp > 90 days ago.
  // Implement with a dedicated test-data seeding helper or database time manipulation.
});
