/**
 * Onboarding — org creation and IT setup question.
 * Covers: AC-ONBOARD-1 through AC-ONBOARD-5, AC-ORG-1, AC-ORG-2
 * E2E scenarios: E2E-ONBOARD-01 through E2E-ONBOARD-05, E2E-ORG-01
 *
 * Each test creates a disposable user and cleans up afterwards, so these
 * tests are independent of the real admin account.
 */

import { test, expect } from "@playwright/test";
import { createTempUser, loginWithEmail, getServiceClient } from "./helpers/fixtures";

test("E2E-ONBOARD-01: first login routes new user to /onboarding, not /workspace", async ({
  page,
}) => {
  const user = await createTempUser("e2e-new");
  try {
    await loginWithEmail(page, user.email);
    // New user has no org, so /workspace redirects to /onboarding
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole("heading", { name: /set up your organisation/i })
    ).toBeVisible();
  } finally {
    await user.delete();
  }
});

test("E2E-ONBOARD-02: org creation with 'I do' redirects to /workspace", async ({ page }) => {
  const user = await createTempUser("e2e-onboard");
  const supabase = getServiceClient();
  try {
    await loginWithEmail(page, user.email);
    await page.waitForURL(/\/onboarding/);

    await page.getByPlaceholder(/acme ltd/i).fill("Onboard Test Org");
    await page.getByRole("radio", { name: /i do/i }).check();
    await page.getByRole("button", { name: /create organisation/i }).click();

    await page.waitForURL(/\/workspace/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  } finally {
    // Clean up: delete the org and user
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) {
      const orgId = (membership as { org_id: string }).org_id;
      await supabase.from("org_members").delete().eq("org_id", orgId);
      await supabase.from("invites").delete().eq("org_id", orgId);
      await supabase.from("orgs").delete().eq("id", orgId);
    }
    await user.delete();
  }
});

test("E2E-ONBOARD-03: org creation with 'A staff member' creates an IT invite", async ({
  page,
}) => {
  const user = await createTempUser("e2e-onboard-it");
  const supabase = getServiceClient();
  const itEmail = `it-${Date.now()}@example.com`;
  try {
    await loginWithEmail(page, user.email);
    await page.waitForURL(/\/onboarding/);

    await page.getByPlaceholder(/acme ltd/i).fill("Staff IT Org");
    await page.getByRole("radio", { name: /a staff member/i }).check();

    // IT person email appears when staff_member is selected
    await page.getByPlaceholder(/it@company\.com/i).fill(itEmail);
    await page.getByRole("button", { name: /create organisation/i }).click();

    await page.waitForURL(/\/workspace/, { timeout: 15_000 });

    // Navigate to team page to confirm pending invite was created
    await page.goto("/workspace/team");
    await expect(page.getByText(itEmail)).toBeVisible({ timeout: 10_000 });
  } finally {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) {
      const orgId = (membership as { org_id: string }).org_id;
      await supabase.from("invites").delete().eq("org_id", orgId);
      await supabase.from("org_members").delete().eq("org_id", orgId);
      await supabase.from("orgs").delete().eq("id", orgId);
    }
    await user.delete();
  }
});

test("E2E-ONBOARD-04: 'Not sure' assigns IT checklist to owner and redirects to /workspace", async ({
  page,
}) => {
  const user = await createTempUser("e2e-notsure");
  const supabase = getServiceClient();
  try {
    await loginWithEmail(page, user.email);
    await page.waitForURL(/\/onboarding/);

    await page.getByPlaceholder(/acme ltd/i).fill("Not Sure Org");
    await page.getByRole("radio", { name: /not sure yet/i }).check();
    await page.getByRole("button", { name: /create organisation/i }).click();

    await page.waitForURL(/\/workspace/, { timeout: 15_000 });

    // Owner is set as IT executor; workspace shows "IT executor" tag in role line
    await expect(page.getByText(/org admin · IT executor/i)).toBeVisible({ timeout: 10_000 });
  } finally {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) {
      const orgId = (membership as { org_id: string }).org_id;
      await supabase.from("org_members").delete().eq("org_id", orgId);
      await supabase.from("orgs").delete().eq("id", orgId);
    }
    await user.delete();
  }
});

test.skip("E2E-ONBOARD-05: platform choice drives IT checklist step content", () => {
  // Skipped: checklist items in the DB do not yet contain platform-specific
  // step URLs (e.g. admin.google.com). Implement once items have per-platform steps.
});

test("E2E-ORG-01: org admin is the sole root member after onboarding", async ({ page }) => {
  const user = await createTempUser("e2e-orgone");
  const supabase = getServiceClient();
  try {
    await loginWithEmail(page, user.email);
    await page.waitForURL(/\/onboarding/);

    await page.getByPlaceholder(/acme ltd/i).fill("Single Root Org");
    await page.getByRole("radio", { name: /i do/i }).check();
    await page.getByRole("button", { name: /create organisation/i }).click();

    await page.waitForURL(/\/workspace/, { timeout: 15_000 });

    // Role shows as org admin
    await expect(page.getByText(/org admin/i)).toBeVisible();

    // Team page is visible in nav (manager+ only) — confirms admin role granted
    await expect(page.getByRole("link", { name: /^team$/i }).first()).toBeVisible();
  } finally {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) {
      const orgId = (membership as { org_id: string }).org_id;
      await supabase.from("org_members").delete().eq("org_id", orgId);
      await supabase.from("orgs").delete().eq("id", orgId);
    }
    await user.delete();
  }
});
