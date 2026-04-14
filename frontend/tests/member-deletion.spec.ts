/**
 * F-033 PI 14 Iter 3 — GDPR member deletion via smbsec1.delete_member_with_data.
 *
 * The RPC hard-deletes the target's assessment_responses, campaign_recipients,
 * pending invites, org_members row (and legacy user_checklists), anonymises
 * residual audit_logs entries authored by the target, and appends ONE new
 * `member_removed` audit row with SHA-256 hashed identifiers (no plain PII).
 *
 * Migrated to the F-043 multi-user harness in F-057 (PI 17 Iter 1) — replaces
 * the PKCE-incompatible `tokenFor()` helper with `createOrgWithMembers` +
 * `extractTokenFromPage()`, matching the pattern already in ai-chat.spec.ts
 * and dashboard-math.spec.ts.
 *
 * Tests skip cleanly until Stefan applies migration 024.
 */

import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  getServiceClient,
  baseUrl,
  startAssessment,
} from "./helpers/fixtures";
import { createOrgWithMembers } from "./helpers/multiUser";

// ---------------------------------------------------------------------------
// Pre-flight — skip all tests if migration 024 (the RPC) is not yet applied.
// ---------------------------------------------------------------------------

async function migration024Applied(): Promise<boolean> {
  const svc = getServiceClient();
  const probe = await svc.rpc("delete_member_with_data", {
    p_org_id: "00000000-0000-0000-0000-000000000000",
    p_target_email: "does-not-exist@example.invalid",
    p_actor_user_id: "00000000-0000-0000-0000-000000000000",
  });
  // If the function doesn't exist we get an error with "does not exist" or
  // "could not find the function". Any other result (including the RPC's own
  // `{ success: false, error: ... }` payload) means the function IS present.
  if (probe.error) {
    const msg = probe.error.message ?? "";
    if (
      /does not exist/i.test(msg) ||
      /could not find the function/i.test(msg)
    ) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pull the Supabase access token out of a signed-in page's localStorage.
 * Matches the pattern in ai-chat.spec.ts and dashboard-math.spec.ts — PKCE-
 * safe replacement for the old `tokenFor()` helper that relied on URL-borne
 * `access_token=` query params.
 */
async function extractTokenFromPage(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        try {
          const val = JSON.parse(localStorage.getItem(k) ?? "{}");
          return (val?.access_token as string | undefined) ?? null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  if (!token) {
    throw new Error("extractTokenFromPage: no Supabase access_token in localStorage");
  }
  return token;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

async function deleteMember(
  token: string,
  email: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(
    `${baseUrl()}/api/orgs/members?email=${encodeURIComponent(email)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body: body as Record<string, unknown> };
}

/**
 * Ensure the `email` column on org_members mirrors the user's auth email so
 * the RPC can match by email. The F-043 harness creates the row without
 * populating `email`.
 */
async function setMemberEmail(
  orgId: string,
  userId: string,
  email: string,
): Promise<void> {
  const svc = getServiceClient();
  await svc
    .from("org_members")
    .update({ email })
    .eq("org_id", orgId)
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// E2E-DELMEM-01 — Owner removes joined employee; full cascade verified.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-01 (F-033): owner removes a joined employee — full cascade verified", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );
  testInfo.setTimeout(120_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "DelMem01 Owner",
    ownerIsItExecutor: true,
    employees: [{ displayName: "Employee", isItExecutor: false }],
  });

  try {
    const svc = getServiceClient();
    const ownerUser = org.owner.user;
    const employee = org.employees[0].user;

    // The harness does not populate the email column on org_members; the
    // delete_member_with_data RPC looks up by email, so set it explicitly.
    await setMemberEmail(org.orgId, ownerUser.id, ownerUser.email);
    await setMemberEmail(org.orgId, employee.id, employee.email);

    // Start an assessment, then write a couple of responses for the employee
    // directly via service-role so we can assert they cascade-delete.
    const assessmentId = await startAssessment(org.orgId, ownerUser.id);
    const { data: items } = await svc
      .from("assessment_items")
      .select("id, track")
      .eq("assessment_id", assessmentId);
    const awItems = (items ?? []).filter(
      (i: { track: string }) => i.track === "awareness",
    ) as Array<{ id: string; track: string }>;
    expect(awItems.length).toBeGreaterThan(1);

    const empResponses = [
      {
        assessment_id: assessmentId,
        assessment_item_id: awItems[0].id,
        user_id: employee.id,
        status: "done" as const,
      },
      {
        assessment_id: assessmentId,
        assessment_item_id: awItems[1].id,
        user_id: employee.id,
        status: "skipped" as const,
      },
    ];
    const insRes = await svc.from("assessment_responses").insert(empResponses);
    expect(insRes.error).toBeNull();

    // Call DELETE /api/orgs/members as owner using the PKCE-safe token.
    const token = await extractTokenFromPage(org.owner.page);
    const del = await deleteMember(token, employee.email);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.responses_deleted).toBe(2);

    // Assert org_members row gone.
    const { data: after } = await svc
      .from("org_members")
      .select("user_id")
      .eq("org_id", org.orgId)
      .eq("user_id", employee.id);
    expect(after ?? []).toHaveLength(0);

    // Assert assessment_responses for that user gone.
    const { data: respAfter } = await svc
      .from("assessment_responses")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("user_id", employee.id);
    expect(respAfter ?? []).toHaveLength(0);

    // Assert audit_logs has exactly one new `member_removed` row whose payload
    // contains SHA-256 hash of the email (NOT the plain email).
    const { data: audits } = await svc
      .from("audit_logs")
      .select("event_type, details, actor_user_id")
      .eq("org_id", org.orgId)
      .eq("event_type", "member_removed");
    expect(audits ?? []).toHaveLength(1);
    const details = (audits![0] as { details: Record<string, unknown> })
      .details;
    const expectedEmailHash = sha256Hex(employee.email.toLowerCase().trim());
    const expectedUidHash = sha256Hex(employee.id);
    expect(details.removed_email_sha256).toBe(expectedEmailHash);
    expect(details.removed_user_id_sha256).toBe(expectedUidHash);
    expect(details.responses_deleted).toBe(2);
    // PII must NOT be in the payload.
    const dump = JSON.stringify(details).toLowerCase();
    expect(dump).not.toContain(employee.email.toLowerCase());
    expect(dump).not.toContain(employee.id.toLowerCase());
  } finally {
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-02 — Owner cannot remove themselves via this RPC.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-02 (F-033): owner cannot remove themselves via this RPC", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );
  testInfo.setTimeout(120_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "DelMem02 Owner",
    ownerIsItExecutor: true,
  });

  try {
    const svc = getServiceClient();
    const ownerUser = org.owner.user;

    // Ensure the admin row has a matching email for RPC lookup.
    await setMemberEmail(org.orgId, ownerUser.id, ownerUser.email);

    const token = await extractTokenFromPage(org.owner.page);
    const del = await deleteMember(token, ownerUser.email);
    expect(del.status).toBe(400);
    expect(del.body.error).toBe("cannot_remove_self");

    // Admin still present.
    const { data: stillThere } = await svc
      .from("org_members")
      .select("user_id")
      .eq("org_id", org.orgId)
      .eq("user_id", ownerUser.id);
    expect(stillThere ?? []).toHaveLength(1);
  } finally {
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-03 — Owner revokes a pending invite.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-03 (F-033): owner removes a pending invite (no joined user)", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );
  testInfo.setTimeout(120_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "DelMem03 Owner",
    ownerIsItExecutor: true,
  });
  const inviteEmail = `alice-${Date.now()}@example.invalid`;

  try {
    const svc = getServiceClient();

    // Seed a pending invite row directly — no joined user behind it.
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const { error: inviteErr } = await svc.from("invites").insert({
      org_id: org.orgId,
      email: inviteEmail,
      role: "employee",
      is_it_executor: false,
      token: `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      invited_by: org.owner.user.id,
      expires_at: expiresAt,
    });
    expect(inviteErr).toBeNull();

    const token = await extractTokenFromPage(org.owner.page);
    const del = await deleteMember(token, inviteEmail);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.invites_deleted).toBeGreaterThanOrEqual(1);

    // Invite row gone.
    const { data: remaining } = await svc
      .from("invites")
      .select("id")
      .eq("org_id", org.orgId)
      .eq("email", inviteEmail);
    expect(remaining ?? []).toHaveLength(0);

    // Audit row uses hashed email, and removed_user_id_sha256 is null.
    const { data: audits } = await svc
      .from("audit_logs")
      .select("event_type, details")
      .eq("org_id", org.orgId)
      .eq("event_type", "member_removed");
    expect(audits ?? []).toHaveLength(1);
    const details = (audits![0] as { details: Record<string, unknown> })
      .details;
    expect(details.removed_email_sha256).toBe(
      sha256Hex(inviteEmail.toLowerCase().trim()),
    );
    expect(details.removed_user_id_sha256 ?? null).toBeNull();
    const dump = JSON.stringify(details).toLowerCase();
    expect(dump).not.toContain(inviteEmail.toLowerCase());
  } finally {
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-04 — Cascade scan: no residual rows anywhere in smbsec1.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-04 (F-033): cascade scan — no residual rows", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );
  testInfo.setTimeout(120_000);

  const org = await createOrgWithMembers(browser, {
    ownerName: "DelMem04 Owner",
    ownerIsItExecutor: true,
    employees: [{ displayName: "Employee", isItExecutor: false }],
  });

  try {
    const svc = getServiceClient();
    const ownerUser = org.owner.user;
    const employee = org.employees[0].user;

    await setMemberEmail(org.orgId, ownerUser.id, ownerUser.email);
    await setMemberEmail(org.orgId, employee.id, employee.email);

    const assessmentId = await startAssessment(org.orgId, ownerUser.id);
    const { data: items } = await svc
      .from("assessment_items")
      .select("id")
      .eq("assessment_id", assessmentId)
      .limit(1);
    const itemId = (items ?? [])[0] as { id: string } | undefined;
    if (itemId) {
      await svc.from("assessment_responses").insert({
        assessment_id: assessmentId,
        assessment_item_id: itemId.id,
        user_id: employee.id,
        status: "done",
      });
    }

    const token = await extractTokenFromPage(org.owner.page);
    const del = await deleteMember(token, employee.email);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    // Scan a set of known smbsec1 tables that could reference the removed
    // user by user_id or by email. No row must match.
    const tablesWithUserId = [
      "org_members",
      "assessment_responses",
      "campaign_recipients",
      "user_checklists",
    ];
    for (const table of tablesWithUserId) {
      const res = await svc.from(table).select("*").eq("user_id", employee.id);
      if (res.error) {
        // Table may not exist yet (legacy user_checklists). That's fine.
        continue;
      }
      expect(
        (res.data ?? []).length,
        `residual rows found in ${table}`,
      ).toBe(0);
    }

    const tablesWithEmail = ["invites", "campaign_recipients", "org_members"];
    for (const table of tablesWithEmail) {
      const res = await svc
        .from(table)
        .select("*")
        .ilike("email", employee.email);
      if (res.error) continue;
      expect(
        (res.data ?? []).length,
        `residual ${table} row with email`,
      ).toBe(0);
    }
  } finally {
    await org.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-05 — Removing the IT Executor flips the guided setup step back.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-05 (F-033): removing IT Executor flips dashboard 'Invite IT Executor' step back to active", async ({
  browser,
}, testInfo) => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );
  testInfo.setTimeout(120_000);

  // Owner is NOT IT Executor; the one employee IS. Removing the employee
  // leaves the org with no IT Executor, which re-opens the guided setup step.
  const org = await createOrgWithMembers(browser, {
    ownerName: "DelMem05 Owner",
    ownerIsItExecutor: false,
    employees: [{ displayName: "ItExec", isItExecutor: true }],
  });

  try {
    const ownerUser = org.owner.user;
    const itExec = org.employees[0].user;

    await setMemberEmail(org.orgId, ownerUser.id, ownerUser.email);
    await setMemberEmail(org.orgId, itExec.id, itExec.email);

    // Do NOT start an assessment — the guided first-run block is only shown
    // when hasActiveAssessment === false, which is where the "Invite your IT
    // Executor" step lives.

    // Call DELETE via API as owner.
    const apiToken = await extractTokenFromPage(org.owner.page);
    const del = await deleteMember(apiToken, itExec.email);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.was_it_executor).toBe(true);

    // Reuse the owner's already-signed-in page — navigate to workspace and
    // confirm the guided "Invite your IT Executor" step has re-appeared.
    await org.owner.page.goto(`${baseUrl()}/workspace`);
    await expect(
      org.owner.page.getByText(/invite your it executor/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    await org.cleanup();
  }
});
