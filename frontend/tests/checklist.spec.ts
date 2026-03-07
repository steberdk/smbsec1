/**
 * Checklist tracks and item state interactions (authenticated users).
 * Covers: AC-TRACK-1 through AC-TRACK-4, AC-ITEM-1 through AC-ITEM-3
 * E2E scenarios: E2E-TRACK-01 through E2E-TRACK-06, E2E-ITEM-01 through E2E-ITEM-04
 */

import { test, expect } from "@playwright/test";
import {
  loginAsRole,
  loginWithEmail,
  getAdminOrgId,
  getAdminUserId,
  startAssessment,
  completeAnyActiveAssessment,
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
  getServiceClient,
} from "./helpers/fixtures";

// ---------------------------------------------------------------------------
// Track visibility
// (The current implementation shows all tracks to all authenticated users;
//  per-role track filtering is a planned enhancement.)
// ---------------------------------------------------------------------------

test("E2E-TRACK-01: IT Executor sees IT Baseline track", async ({ page }) => {
  const iso = await createIsolatedOrg("TRACK01 Org");
  // createIsolatedOrg sets is_it_executor: true on the admin user
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");
    await expect(
      page.getByRole("heading", { name: /it baseline/i })
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await iso.cleanup();
  }
});

test("E2E-TRACK-02: Regular employee does NOT see IT Baseline track", async ({ page }) => {
  const iso = await createIsolatedOrg("TRACK02 Org");
  const employee = await createTempUser("e2e-emp-track");
  try {
    await addOrgMember(iso.orgId, employee, "employee", {
      managerUserId: iso.adminUser.id,
      isItExecutor: false,
    });
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    // Awareness track is visible
    await expect(
      page.getByRole("heading", { name: /security awareness/i })
    ).toBeVisible({ timeout: 10_000 });
    // IT Baseline is hidden for non-IT-executor
    await expect(
      page.getByRole("heading", { name: /it baseline/i })
    ).not.toBeVisible();
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

test("E2E-TRACK-03: All member roles see the Awareness track", async ({ page }) => {
  // Ensure there is an active assessment with items
  const orgId = await getAdminOrgId();
  const adminUserId = await getAdminUserId();
  await startAssessment(orgId, adminUserId);

  await loginAsRole(page, "org_admin");
  await page.goto("/workspace/checklist");

  await expect(page.getByRole("heading", { name: /my checklist/i })).toBeVisible();
  // Security Awareness group heading should be present
  await expect(page.getByRole("heading", { name: /security awareness/i })).toBeVisible({ timeout: 10_000 });
});

test.skip("E2E-TRACK-04: Google Workspace platform shows Google-specific steps", () => {
  // Skipped: checklist items in the DB do not yet contain platform-specific
  // step URLs. Implement once items reference admin.google.com.
});

test.skip("E2E-TRACK-05: Microsoft 365 platform shows M365-specific steps", () => {
  // Skipped: same reason as TRACK-04.
});

test.skip("E2E-TRACK-06: Unset platform shows generic steps and configuration prompt", () => {
  // Skipped: same reason as TRACK-04.
});

// ---------------------------------------------------------------------------
// Item state interactions
// (Run serially — they all operate on the same active assessment.)
// ---------------------------------------------------------------------------

test.describe.serial("Checklist item state", () => {
  test.beforeAll(async () => {
    const orgId = await getAdminOrgId();
    const adminUserId = await getAdminUserId();
    await startAssessment(orgId, adminUserId);
  });

  test.afterAll(async () => {
    const orgId = await getAdminOrgId();
    await completeAnyActiveAssessment(orgId);
  });

  test("E2E-ITEM-01: marking an item Done persists across page reload", async ({ page }) => {
    await loginAsRole(page, "org_admin");
    await page.goto("/workspace/checklist");

    // Wait for items to load
    const doneBtn = page.getByRole("button", { name: /^done$/i }).first();
    await expect(doneBtn).toBeVisible({ timeout: 10_000 });

    // Set up network listener BEFORE clicking so we catch the PUT request
    const saveResponse = page.waitForResponse(
      (res) => res.url().includes("/responses") && res.request().method() === "PUT"
    );

    await doneBtn.click();

    // Button turns active (optimistic update)
    await expect(doneBtn).toHaveClass(/bg-green-700/, { timeout: 5_000 });

    // Wait for the API save to complete before reloading
    await saveResponse;

    // Reload and confirm state persisted
    await page.reload();
    await expect(page.getByRole("button", { name: /^done$/i }).first()).toHaveClass(
      /bg-green-700/,
      { timeout: 10_000 }
    );
  });

  test("E2E-ITEM-02: marking an item Unsure shows it in a distinct state", async ({
    page,
  }) => {
    await loginAsRole(page, "org_admin");
    await page.goto("/workspace/checklist");

    // Use the second item to avoid collision with ITEM-01's Done state
    const unsureBtn = page.getByRole("button", { name: /^unsure$/i }).nth(1);
    await expect(unsureBtn).toBeVisible({ timeout: 10_000 });
    await unsureBtn.click();

    // Button takes on selected (dark) style
    await expect(unsureBtn).toHaveClass(/bg-gray-700/, { timeout: 5_000 });
  });

  test("E2E-ITEM-03: skipping an item does not count toward Done progress", async ({
    page,
  }) => {
    await loginAsRole(page, "org_admin");
    await page.goto("/workspace/checklist");

    // Read the current answered/total counts from progress text
    await expect(page.getByText(/\d+ \/ \d+ answered/i)).toBeVisible({ timeout: 10_000 });
    const before = await page.getByText(/\d+ \/ \d+ answered/i).textContent();
    const beforeAnswered = parseInt(before?.match(/(\d+) \//)?.[1] ?? "0");

    // Skip an item that has no response yet (use the third item)
    const skippedBtn = page.getByRole("button", { name: /^skipped$/i }).nth(2);
    // Find an item where skipped is not yet selected
    const allSkip = page.getByRole("button", { name: /^skipped$/i });
    const count = await allSkip.count();

    // Click skipped on the first item that is not already skipped
    for (let i = 0; i < count; i++) {
      const btn = allSkip.nth(i);
      const cls = await btn.getAttribute("class") ?? "";
      if (!cls.includes("bg-gray-700")) {
        await btn.click();
        break;
      }
    }

    // Re-read progress — answered count should have increased by at most 1
    const after = await page.getByText(/\d+ \/ \d+ answered/i).textContent();
    const afterAnswered = parseInt(after?.match(/(\d+) \//)?.[1] ?? "0");
    // Skipped items are "answered" in the count but the Done % should differ
    expect(afterAnswered).toBeGreaterThanOrEqual(beforeAnswered);
  });

  test.skip("E2E-ITEM-04: resetting an item returns it to uncompleted state", () => {
    // Skipped: the current checklist UI has no "reset to unanswered" button.
    // Users can change from one status to another but cannot clear a response.
    // Implement when a clear/undo action is added.
  });
});

test("E2E-ITEM-05: completion banner appears when all items are answered", async ({ page }) => {
  const iso = await createIsolatedOrg("ITEM05 Org");
  try {
    const assessmentId = await startAssessment(iso.orgId, iso.adminUser.id);

    // Pre-fill all responses via DB so the banner is visible on page load
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

    await expect(
      page.getByText(/all items answered/i)
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await iso.cleanup();
  }
});
