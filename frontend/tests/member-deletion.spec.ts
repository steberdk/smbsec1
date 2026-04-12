/**
 * F-033 PI 14 Iter 3 — GDPR member deletion via smbsec1.delete_member_with_data.
 *
 * The RPC hard-deletes the target's assessment_responses, campaign_recipients,
 * pending invites, org_members row (and legacy user_checklists), anonymises
 * residual audit_logs entries authored by the target, and appends ONE new
 * `member_removed` audit row with SHA-256 hashed identifiers (no plain PII).
 *
 * Tests skip cleanly until Stefan applies migration 024.
 */

import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  loginWithEmail,
  startAssessment,
  createIsolatedOrg,
  createTempUser,
  addOrgMember,
  getServiceClient,
  baseUrl,
} from "./helpers/fixtures";

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

/** Mint an access token for a temp user via the admin API. */
async function tokenFor(email: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  if (!res.ok) throw new Error(`generate_link failed: ${await res.text()}`);
  const data = await res.json();
  const redirect = await fetch(data.action_link, { redirect: "manual" });
  const loc = redirect.headers.get("location") ?? "";
  const m = loc.match(/access_token=([^&]+)/);
  if (!m) throw new Error(`no access_token in redirect: ${loc.slice(0, 200)}`);
  return decodeURIComponent(m[1]);
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

// ---------------------------------------------------------------------------
// E2E-DELMEM-01 — Owner removes joined employee; full cascade verified.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-01 (F-033): owner removes a joined employee — full cascade verified", async () => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );

  const iso = await createIsolatedOrg("DELMEM01 Org");
  const employee = await createTempUser("e2e-emp-del");

  try {
    const svc = getServiceClient();

    // Add employee with an email on the org_members row (RPC matches by email).
    await addOrgMember(iso.orgId, employee, "employee", {
      isItExecutor: false,
    });
    await svc
      .from("org_members")
      .update({ email: employee.email })
      .eq("org_id", iso.orgId)
      .eq("user_id", employee.id);

    // Start an assessment, then write a couple of responses for the employee
    // directly via service-role so we can assert they cascade-delete.
    const assessmentId = await startAssessment(iso.orgId, iso.adminUser.id);
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

    // Call DELETE /api/orgs/members as owner.
    const token = await tokenFor(iso.adminUser.email);
    const del = await deleteMember(token, employee.email);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.responses_deleted).toBe(2);

    // Assert org_members row gone.
    const { data: after } = await svc
      .from("org_members")
      .select("user_id")
      .eq("org_id", iso.orgId)
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
      .eq("org_id", iso.orgId)
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
    // Employee row + assessment_responses already deleted by RPC; cleanup will
    // handle the rest of the org. Delete the auth user manually since the
    // org teardown path skips users whose org_members row was already removed.
    try {
      await employee.delete();
    } catch {
      /* ignore */
    }
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-02 — Owner cannot remove themselves via this RPC.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-02 (F-033): owner cannot remove themselves via this RPC", async () => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );

  const iso = await createIsolatedOrg("DELMEM02 Org");
  try {
    const svc = getServiceClient();
    // Ensure the admin row has a matching email for RPC lookup.
    await svc
      .from("org_members")
      .update({ email: iso.adminUser.email })
      .eq("org_id", iso.orgId)
      .eq("user_id", iso.adminUser.id);

    const token = await tokenFor(iso.adminUser.email);
    const del = await deleteMember(token, iso.adminUser.email);
    expect(del.status).toBe(400);
    expect(del.body.error).toBe("cannot_remove_self");

    // Admin still present.
    const { data: stillThere } = await svc
      .from("org_members")
      .select("user_id")
      .eq("org_id", iso.orgId)
      .eq("user_id", iso.adminUser.id);
    expect(stillThere ?? []).toHaveLength(1);
  } finally {
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-03 — Owner revokes a pending invite.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-03 (F-033): owner removes a pending invite (no joined user)", async () => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );

  const iso = await createIsolatedOrg("DELMEM03 Org");
  const inviteEmail = `alice-${Date.now()}@example.invalid`;

  try {
    const svc = getServiceClient();

    // Seed a pending invite row directly — no joined user behind it.
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const { error: inviteErr } = await svc.from("invites").insert({
      org_id: iso.orgId,
      email: inviteEmail,
      role: "employee",
      is_it_executor: false,
      token: `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      invited_by: iso.adminUser.id,
      expires_at: expiresAt,
    });
    expect(inviteErr).toBeNull();

    const token = await tokenFor(iso.adminUser.email);
    const del = await deleteMember(token, inviteEmail);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.invites_deleted).toBeGreaterThanOrEqual(1);

    // Invite row gone.
    const { data: remaining } = await svc
      .from("invites")
      .select("id")
      .eq("org_id", iso.orgId)
      .eq("email", inviteEmail);
    expect(remaining ?? []).toHaveLength(0);

    // Audit row uses hashed email, and removed_user_id_sha256 is null.
    const { data: audits } = await svc
      .from("audit_logs")
      .select("event_type, details")
      .eq("org_id", iso.orgId)
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
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-04 — Cascade scan: no residual rows anywhere in smbsec1.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-04 (F-033): cascade scan — no residual rows", async () => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );

  const iso = await createIsolatedOrg("DELMEM04 Org");
  const employee = await createTempUser("e2e-emp-del04");

  try {
    const svc = getServiceClient();
    await addOrgMember(iso.orgId, employee, "employee", {
      isItExecutor: false,
    });
    await svc
      .from("org_members")
      .update({ email: employee.email })
      .eq("org_id", iso.orgId)
      .eq("user_id", employee.id);

    const assessmentId = await startAssessment(iso.orgId, iso.adminUser.id);
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

    const token = await tokenFor(iso.adminUser.email);
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
    try {
      await employee.delete();
    } catch {
      /* ignore */
    }
    await iso.cleanup();
  }
});

// ---------------------------------------------------------------------------
// E2E-DELMEM-05 — Removing the IT Executor flips the guided setup step back.
// ---------------------------------------------------------------------------

test("E2E-DELMEM-05 (F-033): removing IT Executor flips dashboard 'Invite IT Executor' step back to active", async ({
  page,
}) => {
  test.skip(
    !(await migration024Applied()),
    "migration 024 (delete_member_with_data) not applied yet",
  );

  const iso = await createIsolatedOrg("DELMEM05 Org");
  const itExec = await createTempUser("e2e-itexec-del");

  try {
    const svc = getServiceClient();

    // Owner becomes non-IT-executor; a separate employee is the IT executor.
    await svc
      .from("org_members")
      .update({ is_it_executor: false })
      .eq("org_id", iso.orgId)
      .eq("user_id", iso.adminUser.id);
    await addOrgMember(iso.orgId, itExec, "employee", { isItExecutor: true });
    await svc
      .from("org_members")
      .update({ email: itExec.email })
      .eq("org_id", iso.orgId)
      .eq("user_id", itExec.id);

    // Do NOT start an assessment — the guided first-run block is only shown
    // when hasActiveAssessment === false, which is where the "Invite your IT
    // Executor" step lives.

    // Call DELETE via API as owner.
    const apiToken = await tokenFor(iso.adminUser.email);
    const del = await deleteMember(apiToken, itExec.email);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.was_it_executor).toBe(true);

    // Now log in as owner via the browser and confirm the guided "Invite your
    // IT Executor" step has re-appeared (not marked done).
    await loginWithEmail(page, iso.adminUser.email);
    await page.waitForURL(/\/workspace/);
    await page.goto("/workspace");
    await expect(
      page.getByText(/invite your it executor/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    try {
      await itExec.delete();
    } catch {
      /* ignore */
    }
    await iso.cleanup();
  }
});
