/**
 * GDPR data export.
 * Covers: AC-GDPR-1
 * E2E scenarios: E2E-GDPR-01
 */

import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/fixtures";

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
