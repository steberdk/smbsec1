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
  // F-024 — default /login heading is "Welcome back" (existing-user context).
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /send sign-in link/i })).toBeVisible();
});

// F-024 — /login renders the Welcome back heading (existing-user context).
test("E2E-AUTH-04 (F-024): /login shows 'Welcome back' heading by default", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /create your free account/i })).toHaveCount(0);
});

// F-024 — /login?intent=signup renders the Create your free account heading.
test("E2E-AUTH-05 (F-024): /login?intent=signup shows 'Create your free account' heading", async ({
  page,
}) => {
  await page.goto("/login?intent=signup");
  await expect(
    page.getByRole("heading", { name: /create your free account/i })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /welcome back/i })).toHaveCount(0);
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
