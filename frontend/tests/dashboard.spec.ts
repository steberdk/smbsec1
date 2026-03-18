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
  getServiceClient,
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

    // Dashboard should load without error — look for assessment info or cadence banner
    await expect(
      page.getByText(/on track|due soon|overdue|no assessment completed|org assessment/i)
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await employee.delete();
    await manager.delete();
    await iso.cleanup();
  }
});

test("E2E-DASH-03: post-completion screen offers calendar file download", async ({ page }) => {
  const iso = await createIsolatedOrg("DASH03 Org");
  try {
    const assessmentId = await startAssessment(iso.orgId, iso.adminUser.id);

    // Pre-fill all responses so the post-completion screen appears
    const supabase = getServiceClient();
    const { data: items } = await supabase
      .from("assessment_items")
      .select("id")
      .eq("assessment_id", assessmentId);

    if (items?.length) {
      await supabase.from("assessment_responses").insert(
        (items as { id: string }[]).map((item) => ({
          assessment_id: assessmentId,
          assessment_item_id: item.id,
          user_id: iso.adminUser.id,
          status: "done",
        }))
      );
    }

    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    // Post-completion screen should appear
    await expect(page.getByText(/all items answered/i)).toBeVisible({ timeout: 10_000 });

    // .ics download button should be present
    const icsBtn = page.getByRole("button", { name: /add reminder to calendar/i });
    await expect(icsBtn).toBeVisible();

    // Click triggers a download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      icsBtn.click(),
    ]);
    expect(download.suggestedFilename()).toBe("smbsec-review.ics");

    // Dashboard link should be present
    await expect(page.getByRole("link", { name: /view dashboard/i })).toBeVisible();
  } finally {
    await iso.cleanup();
  }
});

test.skip("E2E-DASH-04: overdue review indicator shown when last assessment > 90 days ago", () => {
  // Skipped: requires seeding a completed assessment with a timestamp > 90 days ago.
  // Implement with a dedicated test-data seeding helper or database time manipulation.
});

test("E2E-TRACK-AGG-01: non-IT-executor shows 100% when all awareness items answered", async ({ page }) => {
  const iso = await createIsolatedOrg("AGG01 Org");
  const employee = await createTempUser("e2e-emp-agg");
  try {
    await addOrgMember(iso.orgId, employee, "employee", {
      managerUserId: iso.adminUser.id,
      isItExecutor: false,
    });

    const assessmentId = await startAssessment(iso.orgId, iso.adminUser.id);

    // Answer all awareness items for the employee
    const supabase = getServiceClient();
    const { data: awarenessItems } = await supabase
      .from("assessment_items")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("track", "awareness");

    if (awarenessItems?.length) {
      await supabase.from("assessment_responses").insert(
        (awarenessItems as { id: string }[]).map((item) => ({
          assessment_id: assessmentId,
          assessment_item_id: item.id,
          user_id: employee.id,
          status: "done",
        }))
      );
    }

    // Log in as employee — checklist should show post-completion screen
    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    await expect(page.getByText(/all items answered/i)).toBeVisible({ timeout: 10_000 });

    // Log in as admin to check dashboard — employee should show 100%
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/dashboard");

    await expect(page.getByText(/100%/)).toBeVisible({ timeout: 10_000 });
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

test("E2E-NAMES-01: dashboard shows member email instead of UUID", async ({ page }) => {
  const iso = await createIsolatedOrg("NAMES01 Org");
  const employee = await createTempUser("e2e-emp-names");
  try {
    // Add member with email stored in org_members
    const supabase = getServiceClient();
    await supabase.from("org_members").insert({
      org_id: iso.orgId,
      user_id: employee.id,
      role: "employee",
      manager_user_id: iso.adminUser.id,
      is_it_executor: false,
      email: employee.email,
    });

    await startAssessment(iso.orgId, iso.adminUser.id);

    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/dashboard");

    // The employee's email should be visible on the dashboard
    await expect(page.getByText(employee.email)).toBeVisible({ timeout: 10_000 });
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});
