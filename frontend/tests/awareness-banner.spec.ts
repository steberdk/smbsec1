/**
 * F-036 PI 14 Iter 3 — IT Executor awareness section banner.
 *
 * The banner is rendered on /workspace/checklist above the Awareness section
 * heading, ONLY for IT Executors, and is dismissible — dismissal persists to
 * localStorage (key: smbsec1.banner.awarenessIntro.dismissed) and the banner
 * must never re-render after dismissal.
 *
 * Locked copy (UX Round 2 §8 / product_team_consensus.md F-036 AC-2):
 *   "Now your personal security habits. Every person in your organisation —
 *   including you — answers the same awareness questions."
 *
 * No migration required — this is a pure frontend feature.
 */

import { test, expect } from "@playwright/test";
import {
  loginWithEmail,
  startAssessment,
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
  getServiceClient,
} from "./helpers/fixtures";

const LOCKED_COPY =
  "Now your personal security habits. Every person in your organisation — including you — answers the same awareness questions.";

test("E2E-BANNER-01 (F-036): IT Executor sees awareness banner with locked copy", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("BANNER01 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    // Banner visible via its data-testid — covers the locked copy.
    const banner = page.getByTestId("awareness-intro-banner");
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(LOCKED_COPY);
  } finally {
    await iso.cleanup();
  }
});

test("E2E-BANNER-02 (F-036): regular employee does NOT see awareness banner", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("BANNER02 Org");
  const employee = await createTempUser("e2e-emp-banner");
  try {
    await addOrgMember(iso.orgId, employee, "employee", {
      isItExecutor: false,
    });
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, employee.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");
    await expect(
      page.getByRole("heading", { name: /security awareness/i })
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("awareness-intro-banner")).toHaveCount(0);
    // Sanity: the locked copy itself must not be visible anywhere on the page.
    await expect(page.getByText(LOCKED_COPY)).toHaveCount(0);
  } finally {
    await employee.delete();
    await iso.cleanup();
  }
});

test("E2E-BANNER-03 (F-036): owner who is NOT IT Executor does NOT see awareness banner", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("BANNER03 Org");
  const itExec = await createTempUser("e2e-itx-banner");
  try {
    // Demote the owner from IT Exec and assign the flag to a separate employee.
    const svc = getServiceClient();
    await svc
      .from("org_members")
      .update({ is_it_executor: false })
      .eq("org_id", iso.orgId)
      .eq("user_id", iso.adminUser.id);
    await addOrgMember(iso.orgId, itExec, "employee", { isItExecutor: true });

    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");
    await expect(
      page.getByRole("heading", { name: /security awareness/i })
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("awareness-intro-banner")).toHaveCount(0);
    await expect(page.getByText(LOCKED_COPY)).toHaveCount(0);
  } finally {
    await itExec.delete();
    await iso.cleanup();
  }
});

test("E2E-BANNER-04 (F-036): dismissal persists across reload", async ({
  page,
}) => {
  const iso = await createIsolatedOrg("BANNER04 Org");
  try {
    await startAssessment(iso.orgId, iso.adminUser.id);
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace/checklist");

    const banner = page.getByTestId("awareness-intro-banner");
    await expect(banner).toBeVisible({ timeout: 10_000 });

    // Click the dismiss X.
    await page.getByTestId("awareness-intro-banner-dismiss").click();
    await expect(banner).toHaveCount(0);

    // Verify localStorage key was set to the locked key.
    const dismissed = await page.evaluate(() =>
      localStorage.getItem("smbsec1.banner.awarenessIntro.dismissed")
    );
    expect(dismissed).not.toBeNull();

    // Reload and assert the banner does NOT re-render.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /security awareness/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("awareness-intro-banner")).toHaveCount(0);
  } finally {
    await iso.cleanup();
  }
});
