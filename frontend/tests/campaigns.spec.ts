/**
 * Campaign E2E tests
 * E2E-CAMP-01: Org admin can see campaigns page
 * E2E-CAMP-02: Employee cannot access campaigns page
 * E2E-CAMP-03: Campaign templates endpoint returns templates
 */

import { test, expect } from "@playwright/test";
import {
  loginWithEmail,
  createIsolatedOrg,
  addOrgMember,
  createTempUser,
  baseUrl,
  getServiceClient,
} from "./helpers/fixtures";

test("E2E-CAMP-01: org admin can see campaigns page", async ({ page }) => {
  const iso = await createIsolatedOrg("CAMP01 Org");
  try {
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);

    await page.goto("/workspace/campaigns");
    await expect(
      page.getByRole("heading", { name: /campaigns/i })
    ).toBeVisible({ timeout: 15_000 });

    // Admin should see the campaign credits info or empty state
    await expect(
      page.getByText(/campaign/i).first()
    ).toBeVisible();
  } finally {
    await iso.cleanup();
  }
});

test("E2E-CAMP-02: employee cannot access campaigns create button", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("CAMP02 Org");
  const employee = await createTempUser("e2e-emp-camp");
  try {
    await addOrgMember(iso.orgId, employee, "employee");

    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);

    await page.goto("/workspace/campaigns");

    // Employee should see access restricted, not the campaigns page
    await expect(
      page.getByText(/access restricted/i)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/only organisation admins/i)
    ).toBeVisible();
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

test("E2E-CAMP-03: campaign templates endpoint returns templates", async () => {
  const iso = await createIsolatedOrg("CAMP03 Org");
  const supabase = getServiceClient();

  try {
    // Generate an access token for the admin user
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: iso.adminUser.email,
      options: { redirectTo: `${baseUrl()}/workspace` },
    });

    const verifyRes = await fetch(
      linkData?.properties?.action_link ?? "",
      { redirect: "manual" }
    );
    const location = verifyRes.headers.get("location") ?? "";
    const hashParams = new URLSearchParams(location.split("#")[1] ?? "");
    const accessToken = hashParams.get("access_token");

    if (accessToken) {
      const res = await fetch(`${baseUrl()}/api/campaigns/templates`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("templates");
      expect(Array.isArray(body.templates)).toBe(true);
    } else {
      // Token extraction can fail with PKCE — skip gracefully
      test.skip();
    }
  } finally {
    await iso.cleanup();
  }
});
