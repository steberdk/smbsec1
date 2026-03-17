import { test, expect } from "@playwright/test";

test("home page loads and shows checklist CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /browse the checklist/i })).toBeVisible();
});

test("checklist page (anon) shows item titles but no status buttons", async ({ page }) => {
  await page.goto("/checklist");

  // Wait for the readonly view to render (auth check completes)
  await expect(page.getByRole("heading", { name: /security checklist/i })).toBeVisible();

  // At least one item title should be visible
  await expect(page.locator("h3").first()).toBeVisible();

  // No action buttons should be present
  await expect(page.getByRole("button", { name: /done/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /not sure/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /skip/i })).toHaveCount(0);
});

test("summary page (anon) shows sign-in prompt", async ({ page }) => {
  await page.goto("/summary");

  await expect(page.getByText(/sign in to see your progress/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
});
