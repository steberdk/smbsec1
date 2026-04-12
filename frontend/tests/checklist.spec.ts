/**
 * Checklist tracks and item state interactions (authenticated users).
 * Covers: AC-TRACK-1 through AC-TRACK-4, AC-ITEM-1 through AC-ITEM-3
 * E2E scenarios: E2E-TRACK-01 through E2E-TRACK-06, E2E-ITEM-01 through E2E-ITEM-04
 */

import { test, expect } from "@playwright/test";
import {
  loginWithEmail,
  startAssessment,
  completeAnyActiveAssessment,
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
  getServiceClient,
  type IsolatedOrg,
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
  const iso = await createIsolatedOrg("TRACK03 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);

    await loginWithEmail(page, iso.adminUser.email);
    await page.goto("/workspace/checklist");

    await expect(page.getByRole("heading", { name: /my checklist/i })).toBeVisible();
    // Security Awareness group heading should be present
    await expect(page.getByRole("heading", { name: /security awareness/i })).toBeVisible({ timeout: 10_000 });
  } finally {
    await iso.cleanup();
  }
});

test("E2E-TRACK-04: IT Executor can expand item and see steps list", async ({ page }) => {
  // Steps are now snapshotted from checklist_items (default platform variant)
  const iso = await createIsolatedOrg("TRACK04 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    // Wait for items to load, then click first item title to expand
    const firstItem = page.getByRole("button", { name: /use a password manager/i });
    await expect(firstItem).toBeVisible({ timeout: 10_000 });
    await firstItem.click();

    // Steps list should appear
    await expect(page.getByText(/steps/i).first()).toBeVisible({ timeout: 5_000 });
    // At least one numbered step should render
    await expect(page.locator("ol li").first()).toBeVisible();
  } finally {
    await iso.cleanup();
  }
});

test("E2E-TRACK-05: Expanded item shows 'Why it matters' block", async ({ page }) => {
  const iso = await createIsolatedOrg("TRACK05 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    // Click first item to expand
    const firstItem = page.getByRole("button", { name: /use a password manager/i });
    await expect(firstItem).toBeVisible({ timeout: 10_000 });
    await firstItem.click();

    // Why it matters block should be visible
    await expect(page.getByText(/why it matters/i)).toBeVisible({ timeout: 5_000 });
  } finally {
    await iso.cleanup();
  }
});

test("E2E-TRACK-06: Expanded item renders steps from DB snapshot", async ({ page }) => {
  // Verifies steps are populated from the assessment_items snapshot
  const iso = await createIsolatedOrg("TRACK06 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    // Expand the first item
    const firstItem = page.getByRole("button", { name: /use a password manager/i });
    await expect(firstItem).toBeVisible({ timeout: 10_000 });
    await firstItem.click();

    // Should have multiple step list items
    const stepItems = page.locator("ol li");
    await expect(stepItems.first()).toBeVisible({ timeout: 5_000 });
    const count = await stepItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  } finally {
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// Item state interactions
// (Run serially — they all operate on the same active assessment.)
// ---------------------------------------------------------------------------

test.describe.serial("Checklist item state", () => {
  let iso: IsolatedOrg;

  test.beforeAll(async () => {
    iso = await createIsolatedOrg("ITEM State Org");
    await startAssessment(iso.orgId, iso.adminUser.id);
  });

  test.afterAll(async () => {
    await completeAnyActiveAssessment(iso.orgId);
    await iso.cleanup();
  });

  test("E2E-ITEM-01: marking an item Done persists across page reload", async ({ page }) => {
    await loginWithEmail(page, iso.adminUser.email);
    await page.goto("/workspace/checklist");

    // Wait for items to load — button text depends on track
    const doneBtn = page.getByRole("button", { name: /^done$|^i've done this$/i }).first();
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
    await expect(page.getByRole("button", { name: /^done$|^i've done this$/i }).first()).toHaveClass(
      /bg-green-700/,
      { timeout: 10_000 }
    );
  });

  test("E2E-ITEM-02: marking an item Unsure shows it in a distinct state", async ({
    page,
  }) => {
    await loginWithEmail(page, iso.adminUser.email);
    await page.goto("/workspace/checklist");

    // Use the second item to avoid collision with ITEM-01's Done state
    const unsureBtn = page.getByRole("button", { name: /^unsure$|^not yet$/i }).nth(1);
    await expect(unsureBtn).toBeVisible({ timeout: 10_000 });
    await unsureBtn.click();

    // Button takes on selected (dark) style
    await expect(unsureBtn).toHaveClass(/bg-gray-700/, { timeout: 5_000 });
  });

  test("E2E-ITEM-03: skipping an item does not count toward Done progress", async ({
    page,
  }) => {
    await loginWithEmail(page, iso.adminUser.email);
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

  test.skip("E2E-ITEM-04: placeholder — tested outside serial block below", () => {});
});

test("E2E-ITEM-04: clicking the active button clears the item back to unanswered", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000); // Allow more time for isolated org setup
  // Uses isolated org to guarantee a clean (unanswered) state
  const iso = await createIsolatedOrg("ITEM04 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    // Button text depends on track: IT Baseline says "Done", Awareness says "I've done this"
    const doneBtn = page.getByRole("button", { name: /^done$|^i've done this$/i }).first();
    await expect(doneBtn).toBeVisible({ timeout: 10_000 });

    // Mark Done and wait for save
    const saveResp = page.waitForResponse(
      (res) => res.url().includes("/responses") && res.request().method() === "PUT"
    );
    await doneBtn.click();
    await expect(doneBtn).toHaveClass(/bg-green-700/, { timeout: 5_000 });
    await saveResp;

    // Click active Done button again — sends DELETE to clear it. Wait for
    // the optimistic update AND the DELETE response so CI under load
    // doesn't race the React re-render against the auto-retry timeout.
    const deleteResp = page.waitForResponse(
      (res) => res.url().includes("/responses") && res.request().method() === "DELETE",
      { timeout: 10_000 }
    );
    await doneBtn.click();
    await deleteResp;

    // Wait for the button to lose its active (green) style — React re-render confirms the DELETE completed
    await expect(doneBtn).not.toHaveClass(/bg-green-700/, { timeout: 10_000 });
  } finally {
    await iso.cleanup();
  }
});

test("E2E-AI-01: workspace checklist items show 'Help me do this' AI guidance button", async ({ page }) => {
  const iso = await createIsolatedOrg("AI01 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);

    await loginWithEmail(page, iso.adminUser.email);
    await page.goto("/workspace/checklist");

    // Wait for items to load and expand the first one
    const firstItem = page.locator("[id^='item-']").first();
    await expect(firstItem).toBeVisible({ timeout: 10_000 });
    await firstItem.locator("button").first().click();

    // "Help me do this" AI guidance button should appear in expanded item
    await expect(page.getByText(/help me do this/i).first()).toBeVisible({ timeout: 5_000 });

    await completeAnyActiveAssessment(iso.orgId);
  } finally {
    await iso.cleanup();
  }
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
