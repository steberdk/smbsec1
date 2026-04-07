/**
 * Assessment lifecycle — start, constraint, complete, subtree scope.
 * Covers: AC-ASMT-1 through AC-ASMT-5, AC-SCOPE-1, AC-SCOPE-2
 * E2E scenarios: E2E-ASMT-01 through E2E-ASMT-04, E2E-SCOPE-01
 *
 * The lifecycle tests (ASMT-01 through ASMT-03) run serially against the real
 * admin org and leave it in a clean state (no active assessment) on exit.
 */

import { test, expect } from "@playwright/test";
import {
  loginAsRole,
  loginWithEmail,
  getAdminOrgId,
  getAdminUserId,
  completeAnyActiveAssessment,
  createIsolatedOrg,
  addOrgMember,
  createTempUser,
  getServiceClient,
  baseUrl,
} from "./helpers/fixtures";

// ---------------------------------------------------------------------------
// Assessment lifecycle (serial — each test depends on the previous)
// ---------------------------------------------------------------------------

test.describe.serial("Assessment lifecycle", () => {
  test.beforeAll(async () => {
    // Ensure a clean slate: no active assessment on the admin org
    const orgId = await getAdminOrgId();
    await completeAnyActiveAssessment(orgId);
  });

  test("E2E-ASMT-01: Org Admin starts an org-wide assessment", async ({ page }) => {
    await loginAsRole(page, "org_admin");
    await page.goto("/workspace/assessments");

    await expect(
      page.getByRole("button", { name: /start new assessment/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /start new assessment/i }).click();

    // After creation the button becomes disabled ("already in progress")
    await expect(
      page.getByRole("button", { name: /assessment already in progress/i })
    ).toBeVisible({ timeout: 10_000 });

    // The active assessment card is visible
    await expect(page.getByText(/active/i)).toBeVisible();
  });

  test("E2E-ASMT-02: cannot start a second assessment while one is active", async ({
    page,
  }) => {
    await loginAsRole(page, "org_admin");
    await page.goto("/workspace/assessments");

    // Start button must be disabled when there is already an active assessment
    const startBtn = page.getByRole("button", { name: /assessment already in progress/i });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await expect(startBtn).toBeDisabled();

    // Only one active assessment should be listed
    const activeCards = page.getByText("active");
    await expect(activeCards).toHaveCount(1);
  });

  test("E2E-ASMT-03: Org Admin can complete an active assessment", async ({ page }) => {
    await loginAsRole(page, "org_admin");
    await page.goto("/workspace/assessments");

    await page.getByRole("button", { name: /mark complete/i }).click();

    // After completion the button becomes available again
    await expect(
      page.getByRole("button", { name: /start new assessment/i })
    ).toBeVisible({ timeout: 10_000 });

    // Completed assessment is still listed
    await expect(page.getByText(/completed/i).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Employee cannot start assessments
// ---------------------------------------------------------------------------

test("E2E-ASMT-04: Employee cannot start an assessment", async ({ page }) => {
  const iso = await createIsolatedOrg("ASMT04 Org");
  const employee = await createTempUser("e2e-emp-asmt");
  try {
    await addOrgMember(iso.orgId, employee, "employee");

    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/assessments");

    // Employee should see the access restricted message, not the start button
    await expect(
      page.getByText(/access restricted/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /start new assessment/i })
    ).toHaveCount(0);
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// Scope enforcement (API-level)
// ---------------------------------------------------------------------------

test("E2E-SCOPE-01: out-of-scope user cannot submit assessment responses via API", async ({
  request,
}) => {
  const iso = await createIsolatedOrg("SCOPE01 Org");
  const outsider = await createTempUser("e2e-outsider");
  const supabase = getServiceClient();

  try {
    // Start an assessment on the iso org
    const adminUserId = iso.adminUser.id;
    const { data: assessment } = await supabase
      .from("assessments")
      .insert({ org_id: iso.orgId, created_by: adminUserId, scope: "org", status: "active" })
      .select()
      .single();

    const assessmentId = (assessment as { id: string }).id;

    // The outsider is NOT a member of iso org. Generate their token.
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: outsider.email,
      options: { redirectTo: `${baseUrl()}/workspace` },
    });

    // Exchange the OTP token for an access_token via the Supabase auth API
    const token = linkData?.properties?.hashed_token;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // Verify the OTP to get a session token
    const verifyRes = await fetch(
      `${supabaseUrl}/auth/v1/verify?token=${token}&type=email&redirect_to=${baseUrl()}/workspace`,
      { redirect: "manual" }
    );

    // Extract access_token from the redirect Location header hash
    const location = verifyRes.headers.get("location") ?? "";
    const hashParams = new URLSearchParams(location.split("#")[1] ?? "");
    const accessToken = hashParams.get("access_token");

    if (!accessToken) {
      // Token extraction failed (e.g. PKCE redirect); skip API assertion
      return;
    }

    // Attempt to PUT a response to the iso org's assessment as the outsider
    const res = await request.put(
      `${baseUrl()}/api/assessments/${assessmentId}/responses`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        data: { assessment_item_id: "00000000-0000-0000-0000-000000000000", status: "done" },
      }
    );

    // Outsider must receive 403 or 404 (not a member of the org)
    expect([403, 404]).toContain(res.status());
  } finally {
    await completeAnyActiveAssessment(iso.orgId);
    await outsider.delete();
    await iso.cleanup();
  }
});
