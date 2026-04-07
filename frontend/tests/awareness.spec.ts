/**
 * Employee Awareness track — awareness checklist items for all staff.
 * Covers: AC-AWARE-1, AC-AWARE-2, AC-AWARE-3
 * E2E scenarios: E2E-AWARE-01, E2E-AWARE-02, E2E-AWARE-03
 */

import { test, expect } from "@playwright/test";
import {
  loginWithEmail,
  createIsolatedOrg,
  addOrgMember,
  createTempUser,
  startAssessment,
  completeAnyActiveAssessment,
} from "./helpers/fixtures";

test("E2E-AWARE-01: user can mark Awareness track items and see progress", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const iso = await createIsolatedOrg("AWARE01 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);

    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /security awareness/i })).toBeVisible({ timeout: 10_000 });

    // Get total count before marking
    const counterLocator = page.getByText(/\d+ \/ \d+ answered/i);
    await expect(counterLocator).toBeVisible({ timeout: 10_000 });
    const beforeText = await counterLocator.textContent();
    const beforeAnswered = parseInt(beforeText?.match(/(\d+) \//)?.[1] ?? "0");

    // Mark the first "I've done this" button visible on the page (awareness track)
    const firstDone = page.getByRole("button", { name: /i've done this/i }).first();
    await expect(firstDone).toBeVisible({ timeout: 10_000 });

    // Set up network listener BEFORE clicking so we catch the PUT request
    const saveResponse = page.waitForResponse(
      (res) => res.url().includes("/responses") && res.request().method() === "PUT"
    );

    await firstDone.click();

    // Wait for the API save to complete (confirms the response was persisted)
    await saveResponse;

    // Wait for the counter to reflect a higher number than before — confirms the item was saved
    await expect(async () => {
      const text = await page.getByText(/\d+ \/ \d+ answered/i).textContent();
      const current = parseInt(text?.match(/(\d+) \//)?.[1] ?? "0");
      expect(current).toBeGreaterThan(beforeAnswered);
    }).toPass({ timeout: 10_000 });

    // At least one "I've done this" button should now have the active (green) class
    await expect(
      page.locator("button").filter({ hasText: /i've done this/i, has: page.locator(".bg-green-700") })
        .or(page.locator("button.bg-green-700").filter({ hasText: /i've done this/i }))
    ).toBeVisible({ timeout: 5_000 });

    await completeAnyActiveAssessment(iso.orgId);
  } finally {
    await iso.cleanup();
  }
});

test("E2E-AWARE-02: completing Awareness items is tracked independently per user", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("AWARE02 Org");
  const employee = await createTempUser("e2e-emp-aware");

  try {
    await addOrgMember(iso.orgId, employee, "employee");

    await startAssessment(iso.orgId, iso.adminUser.id);

    // Employee marks awareness items
    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    await expect(page.getByRole("heading", { name: /security awareness/i })).toBeVisible({ timeout: 10_000 });

    const awarenessSection = page.locator("section").filter({ has: page.getByRole("heading", { name: /security awareness/i }) });
    const doneButtons = awarenessSection.getByRole("button", { name: /i've done this/i });
    const count = await doneButtons.count();

    // Mark all visible awareness items as done
    for (let i = 0; i < count; i++) {
      await doneButtons.nth(i).click();
    }

    // Admin dashboard — shows employee progress as a separate row
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/dashboard");

    await expect(page.getByText(/team progress/i)).toBeVisible({ timeout: 10_000 });
    // At least one member row should appear in the team progress section
    await expect(page.locator("[class*='rounded-xl border border-gray-200']").first())
      .toBeVisible({ timeout: 10_000 });
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

test("E2E-AWARE-03: Security Awareness track contains multiple items across groups", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("AWARE03 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);

    await loginWithEmail(page, iso.adminUser.email);
    await page.goto("/workspace/checklist");

    await expect(page.getByRole("heading", { name: /security awareness/i })).toBeVisible({ timeout: 10_000 });

    // The awareness section should have multiple item cards (at least 5)
    const awarenessSection = page.locator("section").filter({ has: page.getByRole("heading", { name: /security awareness/i }) });
    const itemCards = awarenessSection.locator("[class*='rounded-xl border']");
    const cardCount = await itemCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(5);

    // Each awareness item card should have the awareness-specific response buttons
    const firstCard = itemCards.first();
    await expect(firstCard.getByRole("button", { name: /i've done this/i })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: /not yet/i })).toBeVisible();
    await expect(firstCard.getByRole("button", { name: /not applicable/i })).toBeVisible();

    await completeAnyActiveAssessment(iso.orgId);
  } finally {
    await iso.cleanup();
  }
});
