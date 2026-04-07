/**
 * Hard delete flows — member removal, self-deletion, and organisation deletion.
 * Covers: AC-DEL-1 through AC-DEL-4
 * E2E scenarios: E2E-DEL-01 through E2E-DEL-06
 *
 * Notes:
 * - Member removal is on /workspace/settings/gdpr (GDPR page), not /workspace/team.
 *   The team page is for invites; GDPR is for data & member management.
 * - The "Delete branch" flow (DEL-04) is skipped — that UI is not yet implemented.
 * - DEL-05 uses a dedicated isolated org to avoid deleting the real test org.
 */

import { test, expect } from "@playwright/test";
import {
  loginWithEmail,
  createIsolatedOrg,
  addOrgMember,
  createTempUser,
  getServiceClient,
  baseUrl,
} from "./helpers/fixtures";

// ---------------------------------------------------------------------------
// Delete employee (via GDPR settings page)
// ---------------------------------------------------------------------------

test.describe.serial("Delete member", () => {
  let iso: Awaited<ReturnType<typeof createIsolatedOrg>>;
  let employee: Awaited<ReturnType<typeof createTempUser>>;

  test.beforeAll(async () => {
    iso = await createIsolatedOrg("DEL Org");
    employee = await createTempUser("e2e-emp-del");
    await addOrgMember(iso.orgId, employee, "employee");
  });

  test.afterAll(async () => {
    // employee may already be deleted by DEL-01; ignore errors
    try { await employee.delete(); } catch { /* already gone */ }
    await iso.cleanup();
  });

  test("E2E-DEL-01: Org Admin removes an employee via Settings & data page", async ({
    page,
  }) => {
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/settings/gdpr");

    // Accept the browser confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Find and click "Remove" for the employee row
    await expect(page.getByRole("button", { name: /^remove$/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /^remove$/i }).first().click();

    // Employee row should disappear from the list
    await expect(
      page.getByRole("button", { name: /^remove$/i })
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test("E2E-DEL-02: cancelling the confirmation dialog prevents deletion", async ({
    page,
  }) => {
    // Add a new employee to delete-test against
    const newEmp = await createTempUser("e2e-emp-cancel");
    await addOrgMember(iso.orgId, newEmp, "employee");

    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/settings/gdpr");

    // Dismiss the confirm dialog
    page.on("dialog", (dialog) => dialog.dismiss());

    const removeBtn = page.getByRole("button", { name: /^remove$/i }).first();
    await expect(removeBtn).toBeVisible({ timeout: 10_000 });
    await removeBtn.click();

    // Member should still be in the list
    await expect(page.getByRole("button", { name: /^remove$/i })).toBeVisible({
      timeout: 5_000,
    });

    await newEmp.delete();
  });
});

// ---------------------------------------------------------------------------
// Manager cannot delete via API
// ---------------------------------------------------------------------------

test("E2E-DEL-03: Employee cannot delete a member via the API (403)", async ({ page }) => {
  const iso = await createIsolatedOrg("DEL03 Org");
  const employee1 = await createTempUser("e2e-emp-del03a");
  const employee2 = await createTempUser("e2e-emp-del03b");
  const supabase = getServiceClient();

  try {
    await addOrgMember(iso.orgId, employee1, "employee");
    await addOrgMember(iso.orgId, employee2, "employee");

    // Get employee's access token
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: employee1.email,
      options: { redirectTo: `${baseUrl()}/workspace` },
    });

    const verifyRes = await fetch(linkData?.properties?.action_link ?? "", {
      redirect: "manual",
    });
    const location = verifyRes.headers.get("location") ?? "";
    const hashParams = new URLSearchParams(location.split("#")[1] ?? "");
    const accessToken = hashParams.get("access_token");

    if (accessToken) {
      const res = await page.request.delete(
        `${baseUrl()}/api/gdpr/members/${employee2.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      expect(res.status()).toBe(403);
    } else {
      // Fallback: verify employee sees access-restricted message on GDPR page
      await loginWithEmail(page, employee1.email);
      await page.goto("/workspace/settings/gdpr");
      await expect(page.getByText(/only org admins/i)).toBeVisible({ timeout: 10_000 });
    }
  } finally {
    await employee2.delete();
    await employee1.delete();
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// Delete branch
// ---------------------------------------------------------------------------

test.skip("E2E-DEL-04: Org Admin deletes a branch (manager + all direct reports)", () => {
  // Skipped: "Delete branch" UI is not yet implemented in the current team or
  // GDPR pages. Individual member removal is available via Settings & data.
  // Implement once a branch-delete action exists in the UI.
});

// ---------------------------------------------------------------------------
// Delete organisation
// ---------------------------------------------------------------------------

test("E2E-DEL-05: Org Admin deletes the organisation with name confirmation", async ({
  page,
}) => {
  // Use a fresh isolated org — never delete the real test org
  const iso = await createIsolatedOrg("Delete Me Org");

  try {
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/settings/gdpr");

    await expect(page.getByRole("heading", { name: /delete organisation/i })).toBeVisible();

    // Type incorrect name first — button should remain disabled
    await page.getByPlaceholder(iso.orgName).fill("wrong name");
    const deleteBtn = page.getByRole("button", { name: /delete organisation permanently/i });
    await expect(deleteBtn).toBeDisabled();

    // Type correct org name — button becomes enabled
    await page.getByPlaceholder(iso.orgName).fill(iso.orgName);
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();

    // After deletion, redirected to landing page
    await page.waitForURL(`${baseUrl()}/`, { timeout: 15_000 });

    // The org no longer exists — navigating to /workspace goes to /onboarding
    // (we must log in again first since session is still valid but org is gone)
    await loginWithEmail(page, iso.adminUser.email);
    await expect(page).toHaveURL(/\/onboarding/);
  } finally {
    // iso.cleanup() would fail if org was already deleted — that's fine
    try { await iso.cleanup(); } catch { /* org already deleted by the test */ }
  }
});

// ---------------------------------------------------------------------------
// Self-deletion
// ---------------------------------------------------------------------------

test("E2E-DEL-06: user can delete their own account", async ({ page }) => {
  const iso = await createIsolatedOrg("DEL06 Org");
  const employee = await createTempUser("e2e-self-del");

  try {
    await addOrgMember(iso.orgId, employee, "employee");

    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/settings/gdpr");

    await expect(
      page.getByRole("heading", { name: /delete my account/i })
    ).toBeVisible({ timeout: 10_000 });

    // Accept the browser confirm dialog and click delete
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /delete my account permanently/i }).click();

    // Redirected to landing page after deletion
    await page.waitForURL(`${baseUrl()}/`, { timeout: 15_000 });
  } finally {
    // Auth user deleted by the action; DB cleanup only
    try { await employee.delete(); } catch { /* already deleted */ }
    await iso.cleanup();
  }
});
