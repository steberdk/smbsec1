/**
 * Authentication flows.
 * Covers: AC-AUTH-1, AC-AUTH-2, AC-AUTH-3
 * E2E scenarios: E2E-AUTH-01, E2E-AUTH-02, E2E-AUTH-03
 */

import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/fixtures";

test("E2E-AUTH-01: /workspace redirects unauthenticated user to /login", async ({ page }) => {
  await page.goto("/workspace");
  await page.waitForURL(/\/login/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /send sign-in link/i })).toBeVisible();
});

test("E2E-AUTH-02: successful magic-link login lands on /workspace", async ({ page }) => {
  await loginAsRole(page, "org_admin");
  await expect(page).toHaveURL(/\/workspace/);
  // Workspace hub shows org name as h1
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("E2E-AUTH-03: submitting without an email stays on /login", async ({ page }) => {
  await page.goto("/login");
  // Click submit without filling in email (HTML5 required validation fires)
  await page.getByRole("button", { name: /send sign-in link/i }).click();
  // Page stays on /login — the required field blocks form submission
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /send sign-in link/i })).toBeVisible();
});
