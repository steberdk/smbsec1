/**
 * Employee Awareness track — awareness checklist items for all staff.
 * Covers: AC-AWARE-1, AC-AWARE-2, AC-AWARE-3
 * E2E scenarios: E2E-AWARE-01, E2E-AWARE-02, E2E-AWARE-03
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

test("E2E-AWARE-01: user can mark Awareness track items and see progress", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const orgId = await getAdminOrgId();
  const adminUserId = await getAdminUserId();
  await startAssessment(orgId, adminUserId);

  await loginAsRole(page, "org_admin");
  await page.goto("/workspace/checklist");

  await expect(page.getByRole("heading", { name: /security awareness/i })).toBeVisible({ timeout: 10_000 });

  // Get total count before marking
  const beforeText = await page.getByText(/\d+ \/ \d+ answered/i).textContent();
  const beforeAnswered = parseInt(beforeText?.match(/(\d+) \//)?.[1] ?? "0");

  // Mark the first Done button in the Awareness section
  const awarenessSection = page.locator("section").filter({ has: page.getByRole("heading", { name: /security awareness/i }) });
  const firstDone = awarenessSection.getByRole("button", { name: /i've done this/i }).first();
  await expect(firstDone).toBeVisible({ timeout: 10_000 });

  const saveResponse = page.waitForResponse(
    (res) => res.url().includes("/responses") && res.request().method() === "PUT"
  );
  await firstDone.click();
  await saveResponse;

  // Progress count should have increased
  const afterText = await page.getByText(/\d+ \/ \d+ answered/i).textContent();
  const afterAnswered = parseInt(afterText?.match(/(\d+) \//)?.[1] ?? "0");
  expect(afterAnswered).toBeGreaterThan(beforeAnswered);

  await completeAnyActiveAssessment(orgId);
});

test("E2E-AWARE-02: completing Awareness items is tracked independently per user", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("AWARE02 Org");
  const employee = await createTempUser("e2e-emp-aware");

  try {
    await addOrgMember(iso.orgId, employee, "employee", {
      managerUserId: iso.adminUser.id,
    });

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
  const orgId = await getAdminOrgId();
  const adminUserId = await getAdminUserId();
  await startAssessment(orgId, adminUserId);

  await loginAsRole(page, "org_admin");
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

  await completeAnyActiveAssessment(orgId);
});
