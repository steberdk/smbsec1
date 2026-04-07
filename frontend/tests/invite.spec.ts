/**
 * Invite flows — org admin and manager inviting team members.
 * Covers: AC-INV-1, AC-INV-2, AC-INV-3
 * E2E scenarios: E2E-INV-01 through E2E-INV-04
 */

import { test, expect } from "@playwright/test";
import {
  loginWithEmail,
  createIsolatedOrg,
  addOrgMember,
  createTempUser,
  getServiceClient,
} from "./helpers/fixtures";

test("E2E-INV-01: Org Admin can invite an employee", async ({ page }) => {
  const inviteEmail = `inv-emp-${Date.now()}@example.com`;
  const supabase = getServiceClient();
  const iso = await createIsolatedOrg("INV01 Org");

  try {
    await loginWithEmail(page, iso.adminUser.email);
    await page.goto("/workspace/team");

    await page.getByPlaceholder(/colleague@company\.com/i).fill(inviteEmail);
    await page.getByRole("button", { name: /send invite/i }).click();

    // Success message and invite appears in pending list
    await expect(page.getByText(/invite sent/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(inviteEmail, { exact: true }).first()).toBeVisible();
    // Confirm the employee role badge appears in the invite list
    await expect(page.locator("p, td, span").filter({ hasText: /employee/i }).first()).toBeVisible();

    // Cleanup invite before org cleanup
    await supabase.from("invites").delete().eq("email", inviteEmail).eq("org_id", iso.orgId);
  } finally {
    await iso.cleanup();
  }
});

test("E2E-INV-02: Invite form has no role dropdown — role is always employee", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("INV02 Org");
  try {
    await loginWithEmail(page, iso.adminUser.email);
    await page.goto("/workspace/team");

    // No role combobox should exist (role is hardcoded to employee)
    await expect(page.getByRole("combobox")).toHaveCount(0);

    // Invite form is still present
    await expect(page.getByPlaceholder(/colleague@company\.com/i)).toBeVisible({ timeout: 10_000 });
  } finally {
    await iso.cleanup();
  }
});

test("E2E-INV-03: Employee has no invite capability", async ({ page }) => {
  const iso = await createIsolatedOrg("INV03 Org");
  const employee = await createTempUser("e2e-emp");
  try {
    await addOrgMember(iso.orgId, employee, "employee");

    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);

    // Team card is not shown on workspace hub for employees
    await expect(page.getByRole("link", { name: /^team$/i })).toHaveCount(0);

    // Navigating directly to /workspace/team should not show the invite form
    await page.goto("/workspace/team");
    // Either redirect or access-restricted message; no invite form
    await expect(page.getByPlaceholder(/colleague@company\.com/i)).toHaveCount(0);
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

test("E2E-INV-04: Invited user accepts invite and lands in workspace", async ({ page }) => {
  const iso = await createIsolatedOrg("INV04 Org");
  const invitee = await createTempUser("e2e-invitee");
  const supabase = getServiceClient();

  try {
    // Admin creates an invite
    const { data: invite } = await supabase
      .from("invites")
      .insert({
        org_id: iso.orgId,
        invited_by: iso.adminUser.id,
        email: invitee.email,
        role: "employee",
        is_it_executor: false,
      })
      .select()
      .single();

    const inviteToken = (invite as { id: string; token: string }).token;

    // Invitee logs in (they'll land at /onboarding initially since no org yet)
    await loginWithEmail(page, invitee.email);
    await page.waitForURL(/\/(workspace|onboarding)/);

    // Accept the invite via the accept-invite page
    await page.goto(`/accept-invite?token=${inviteToken}`);

    // Confirmation card appears — click Accept invitation to proceed
    await expect(page.getByRole("button", { name: /accept invitation/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /accept invitation/i }).click();

    // Should redirect to workspace after accepting
    await page.waitForURL(/\/workspace/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Invitee should see their role
    await expect(page.getByText(/employee/i)).toBeVisible();
  } finally {
    await invitee.delete();
    await iso.cleanup();
  }
});
