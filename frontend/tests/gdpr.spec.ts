/**
 * GDPR data export, data residency disclosure, self-deletion.
 * Covers: AC-GDPR-1, AC-GDPR-2
 * E2E scenarios: E2E-GDPR-01 through E2E-GDPR-03
 */

import { test, expect } from "@playwright/test";
import {
  loginAsRole,
  loginWithEmail,
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
} from "./helpers/fixtures";

test("E2E-GDPR-01: Org Admin exports all org data as a JSON download", async ({ page }) => {
  await loginAsRole(page, "org_admin");
  await page.goto("/workspace/settings/gdpr");

  await expect(page.getByRole("heading", { name: /settings & data/i })).toBeVisible();

  // Set up download listener before clicking
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download json export/i }).click(),
  ]);

  // A file was downloaded
  expect(download.suggestedFilename()).toBe("org-data-export.json");

  // Read content and validate structure
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const json = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as Record<string, unknown>;

  // Must contain org and members
  expect(json).toHaveProperty("org");
  expect(json).toHaveProperty("members");
  expect(Array.isArray(json.members)).toBe(true);
});

test("E2E-GDPR-02: Settings & data page shows EU data residency notice to all users", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("GDPR02 Org");
  const employee = await createTempUser("e2e-gdpr-emp");
  try {
    await addOrgMember(iso.orgId, employee, "employee", {
      managerUserId: iso.adminUser.id,
    });
    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/settings/gdpr");

    await expect(page.getByText(/west eu/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/ireland/i)).toBeVisible();
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

test("E2E-GDPR-03: user with direct reports cannot self-delete", async ({ page }) => {
  const iso = await createIsolatedOrg("GDPR03 Org");
  const manager = await createTempUser("e2e-gdpr-mgr");
  const report = await createTempUser("e2e-gdpr-rpt");
  try {
    await addOrgMember(iso.orgId, manager, "manager", {
      managerUserId: iso.adminUser.id,
    });
    await addOrgMember(iso.orgId, report, "employee", {
      managerUserId: manager.id,
    });

    await loginWithEmail(page, manager.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/settings/gdpr");

    // Delete button should be disabled due to direct reports blocker
    await expect(
      page.getByRole("button", { name: /delete my account permanently/i })
    ).toBeDisabled({ timeout: 10_000 });

    // Blocker message should be visible
    await expect(page.getByText(/direct reports/i)).toBeVisible();
  } finally {
    await report.delete();
    await manager.delete();
    await iso.cleanup();
  }
});
