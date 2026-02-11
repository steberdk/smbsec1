import { test, expect } from "@playwright/test";

test("home loads and links to checklist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /fix the biggest cyber risks/i })).toBeVisible();

  await page.getByRole("link", { name: /start the checklist/i }).click();
  await expect(page).toHaveURL(/\/checklist$/);
  await expect(page.getByRole("heading", { name: /security checklist/i })).toBeVisible();
});

test("can mark an item done and see progress change", async ({ page }) => {
  await page.goto("/checklist");

  // Click first "Done" button
  const doneButtons = page.getByRole("button", { name: /done/i });
  await expect(doneButtons.first()).toBeVisible();
  await doneButtons.first().click();

  // Go to summary
  await page.getByRole("link", { name: /view summary/i }).click();
  await expect(page).toHaveURL(/\/summary$/);

  // We expect progress not to be 0%. (Text: "Progress: X%")
  await expect(page.getByText(/progress:\s*[1-9]\d*%/i)).toBeVisible();
});

test("summary clear progress works", async ({ page }) => {
  await page.goto("/summary");

  // Clear progress
  await page.getByRole("button", { name: /clear local progress/i }).click();

  // Progress should become 0%
  await expect(page.getByText(/progress:\s*0%/i)).toBeVisible();
});
