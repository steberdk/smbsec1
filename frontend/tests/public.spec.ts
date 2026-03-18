/**
 * Public pages — no login required.
 * Covers: AC-PUB-1, AC-PUB-2, AC-PUB-3
 * E2E scenarios: E2E-PUB-01, E2E-PUB-02, E2E-PUB-03
 */

import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/fixtures";

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

test("E2E-PUB-01: landing page shows 'what breaches SMBs' section and CTA", async ({
  page,
}) => {
  await page.goto("/");

  // Section heading or content referencing how SMBs get breached
  await expect(
    page.getByText(/breaches|how smbs get hacked|how businesses get hacked/i).first()
  ).toBeVisible();

  // At least one of the five named attack types must appear
  const attackTerms = [/phishing/i, /ransomware/i, /password/i, /invoice/i, /email compromise/i];
  let visibleCount = 0;
  for (const term of attackTerms) {
    const count = await page.getByText(term).count();
    if (count > 0) visibleCount++;
  }
  expect(visibleCount).toBeGreaterThanOrEqual(3); // require at least 3 of 5

  // CTA to checklist or sign up
  await expect(
    page.getByRole("link", { name: /start the checklist|get started|sign up/i }).first()
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Checklist (anonymous)
// ---------------------------------------------------------------------------

test("E2E-PUB-02: anonymous checklist is read-only", async ({ page }) => {
  await page.goto("/checklist");

  // Checklist renders
  await expect(page.getByRole("heading", { name: /checklist/i })).toBeVisible();

  // At least one item title visible
  await expect(page.locator("h3, h2").first()).toBeVisible();

  // No action buttons
  await expect(page.getByRole("button", { name: /^done$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /not sure/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^skip$/i })).toHaveCount(0);

  // Sign-in prompt visible
  await expect(page.getByText(/sign in|log in/i).first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Summary (anonymous)
// ---------------------------------------------------------------------------

test("E2E-PUB-04: public checklist does not show errors when logged in", async ({
  page,
}) => {
  // Log in first, then visit the public checklist
  await loginAsRole(page, "org_admin");
  await page.waitForURL(/\/workspace/);

  // Navigate to public checklist
  await page.goto("/checklist");

  // Should render without error messages
  await expect(page.getByRole("heading", { name: /checklist/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/error|invalid schema|failed/i)).toHaveCount(0);
});

test("E2E-PUB-03: summary page prompts sign-in for anonymous user", async ({
  page,
}) => {
  await page.goto("/summary");

  await expect(page.getByText(/sign in to see your progress/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
});
