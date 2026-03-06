/**
 * Invite flows — org admin and manager inviting team members.
 * Covers: AC-INV-1, AC-INV-2, AC-INV-3
 * E2E scenarios: E2E-INV-01 through E2E-INV-04
 */

import { test, expect } from "@playwright/test";
import {
  loginAsRole,
  loginWithEmail,
  createIsolatedOrg,
  addOrgMember,
  createTempUser,
  getServiceClient,
  getAdminOrgId,
} from "./helpers/fixtures";

test("E2E-INV-01: Org Admin can invite a manager", async ({ page }) => {
  const inviteEmail = `inv-mgr-${Date.now()}@example.com`;
  const supabase = getServiceClient();
  const orgId = await getAdminOrgId();

  await loginAsRole(page, "org_admin");
  await page.goto("/workspace/team");

  await page.getByPlaceholder(/colleague@company\.com/i).fill(inviteEmail);
  await page.getByRole("combobox").selectOption("manager");
  await page.getByRole("button", { name: /send invite/i }).click();

  // Success message and invite appears in pending list
  await expect(page.getByText(/invite sent/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(inviteEmail, { exact: true }).first()).toBeVisible();
  // Confirm the role badge appears in the invite list (look for visible text in the list, not in the select)
  await expect(page.locator("p, td, span").filter({ hasText: /manager/i }).first()).toBeVisible();

  // Cleanup
  await supabase.from("invites").delete().eq("email", inviteEmail).eq("org_id", orgId);
});

test("E2E-INV-02: Manager's invite form does not offer the org_admin role", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("INV02 Org");
  const manager = await createTempUser("e2e-mgr");
  try {
    await addOrgMember(iso.orgId, manager, "manager", {
      managerUserId: iso.adminUser.id,
    });

    await loginWithEmail(page, manager.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/team");

    const roleSelect = page.getByRole("combobox");
    await expect(roleSelect).toBeVisible({ timeout: 10_000 });

    // Collect available options
    const options = await roleSelect.locator("option").allTextContents();
    const lower = options.map((o) => o.toLowerCase());

    // org_admin must NOT be an option for managers
    expect(lower.some((o) => o.includes("org_admin") || o.includes("org admin"))).toBe(false);
    // manager and employee SHOULD be options
    expect(lower.some((o) => o.includes("manager"))).toBe(true);
    expect(lower.some((o) => o.includes("employee"))).toBe(true);
  } finally {
    await manager.delete();
    await iso.cleanup();
  }
});

test("E2E-INV-03: Employee has no invite capability", async ({ page }) => {
  const iso = await createIsolatedOrg("INV03 Org");
  const employee = await createTempUser("e2e-emp");
  try {
    await addOrgMember(iso.orgId, employee, "employee", {
      managerUserId: iso.adminUser.id,
    });

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
        manager_user_id: iso.adminUser.id,
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
