/**
 * Shared test fixtures and helpers for E2E tests.
 *
 * Auth strategy: uses the Supabase Admin API (service-role key) to generate
 * magic links for test users — no email interaction needed.
 *
 * Required env vars (add to .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PLAYWRIGHT_ADMIN_EMAIL   — pre-existing account with an org set up
 *
 * Optional (tests create temp users when these are absent):
 *   PLAYWRIGHT_MANAGER_EMAIL
 *   PLAYWRIGHT_EMPLOYEE_EMAIL
 *   PLAYWRIGHT_IT_EMAIL
 */

import { Page } from "@playwright/test";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase service-role client (Node.js only — never exposed to browser)
// ---------------------------------------------------------------------------

export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "smbsec1" },
  }) as unknown as SupabaseClient;
}

export function baseUrl(): string {
  return process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Log in as any email via Supabase Admin magic link.
 * The admin API generates a one-time action_link; navigating to it causes
 * Supabase to redirect back to the app with ?code=... (PKCE flow).
 * The callback page exchanges the code for a session.
 */
export async function loginWithEmail(page: Page, email: string): Promise<void> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${baseUrl()}/auth/callback` },
  });
  if (error || !data?.properties?.action_link) {
    throw new Error(`Failed to generate magic link for ${email}: ${error?.message}`);
  }
  await page.goto(data.properties.action_link);
  // PKCE flow: Supabase redirects to /auth/callback?code=... which exchanges
  // the code for a session, then redirects to /workspace or /onboarding.
  await page.waitForURL(/\/(workspace|onboarding)/, { timeout: 30_000 });
  // Wait for Supabase to finish writing the session to localStorage.
  await page.waitForFunction(
    () => Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token")),
    { timeout: 15_000 }
  );
}

/** Log in as a pre-configured role (email from env vars). */
export async function loginAsRole(
  page: Page,
  role: "org_admin" | "manager" | "employee" | "it_executor"
): Promise<void> {
  const emails: Record<string, string | undefined> = {
    org_admin: process.env.PLAYWRIGHT_ADMIN_EMAIL,
    manager: process.env.PLAYWRIGHT_MANAGER_EMAIL,
    employee: process.env.PLAYWRIGHT_EMPLOYEE_EMAIL,
    it_executor: process.env.PLAYWRIGHT_IT_EMAIL,
  };
  const email = emails[role];
  if (!email) throw new Error(`No email configured for role: ${role}`);
  await loginWithEmail(page, email);
}

// ---------------------------------------------------------------------------
// Temp user helpers
// ---------------------------------------------------------------------------

export type TempUser = {
  id: string;
  email: string;
  delete: () => Promise<void>;
};

/** Create a disposable Supabase user (email confirmed, no password needed). */
export async function createTempUser(emailPrefix = "e2e"): Promise<TempUser> {
  const supabase = getServiceClient();
  const email = `${emailPrefix}-${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !data?.user) throw new Error(`createTempUser failed: ${error?.message}`);
  const id = data.user.id;
  return {
    id,
    email,
    delete: async () => {
      await supabase.auth.admin.deleteUser(id);
    },
  };
}

// ---------------------------------------------------------------------------
// Org setup helpers (direct DB writes via service-role, no UI needed)
// ---------------------------------------------------------------------------

export type IsolatedOrg = {
  orgId: string;
  orgName: string;
  adminUser: TempUser;
  cleanup: () => Promise<void>;
};

/**
 * Create a fully isolated test org with a fresh admin user.
 * Used by multi-user tests to avoid touching the real test org.
 */
export async function createIsolatedOrg(name?: string): Promise<IsolatedOrg> {
  const supabase = getServiceClient();
  const orgName = name ?? `E2E Org ${Date.now()}`;
  const admin = await createTempUser("e2e-admin");

  const { data: org, error: orgErr } = await supabase
    .from("orgs")
    .insert({ name: orgName, created_by: admin.id })
    .select()
    .single();
  if (orgErr || !org) throw new Error(`createIsolatedOrg failed: ${orgErr?.message}`);

  await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: admin.id,
    role: "org_admin",
    is_it_executor: true,
    manager_user_id: null,
  });

  return {
    orgId: org.id,
    orgName,
    adminUser: admin,
    cleanup: async () => {
      await deleteOrgData(supabase, org.id);
      await admin.delete();
    },
  };
}

/** Add a member to an existing org directly in the DB. */
export async function addOrgMember(
  orgId: string,
  user: TempUser,
  role: "org_admin" | "manager" | "employee",
  opts: { isItExecutor?: boolean; managerUserId?: string | null } = {}
): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("org_members").insert({
    org_id: orgId,
    user_id: user.id,
    role,
    is_it_executor: opts.isItExecutor ?? false,
    manager_user_id: opts.managerUserId ?? null,
  });
}

/** Delete all rows associated with an org (in dependency order). */
async function deleteOrgData(supabase: SupabaseClient, orgId: string): Promise<void> {
  const { data: assmts } = await supabase
    .from("assessments")
    .select("id")
    .eq("org_id", orgId);

  if (assmts?.length) {
    const aIds = (assmts as { id: string }[]).map((a) => a.id);
    const { data: items } = await supabase
      .from("assessment_items")
      .select("id")
      .in("assessment_id", aIds);
    if (items?.length) {
      await supabase
        .from("assessment_responses")
        .delete()
        .in("assessment_item_id", (items as { id: string }[]).map((i) => i.id));
      await supabase.from("assessment_items").delete().in("assessment_id", aIds);
    }
    await supabase.from("assessments").delete().eq("org_id", orgId);
  }

  // Clean up campaigns
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("org_id", orgId);
  if (campaigns?.length) {
    const cIds = (campaigns as { id: string }[]).map((c) => c.id);
    await supabase.from("campaign_recipients").delete().in("campaign_id", cIds);
    await supabase.from("campaigns").delete().eq("org_id", orgId);
  }

  await supabase.from("invites").delete().eq("org_id", orgId);
  await supabase.from("org_members").delete().eq("org_id", orgId);
  await supabase.from("orgs").delete().eq("id", orgId);
}

// ---------------------------------------------------------------------------
// Assessment helpers
// ---------------------------------------------------------------------------

/** Complete any active assessment for an org (used for test pre-condition cleanup). */
export async function completeAnyActiveAssessment(orgId: string): Promise<void> {
  const supabase = getServiceClient();
  const { data: active } = await supabase
    .from("assessments")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .maybeSingle();
  if (active) {
    await supabase
      .from("assessments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", (active as { id: string }).id);
  }
}

/** Start an org-wide assessment (snapshotting checklist_items). Returns assessment id. */
export async function startAssessment(orgId: string, adminUserId: string): Promise<string> {
  const supabase = getServiceClient();
  await completeAnyActiveAssessment(orgId);

  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .insert({ org_id: orgId, created_by: adminUserId, scope: "org", status: "active" })
    .select()
    .single();
  if (aErr || !assessment) throw new Error(`startAssessment failed: ${aErr?.message}`);

  const { data: items } = await supabase
    .from("checklist_items")
    .select("id, group_id, track, title, outcome, why_it_matters, steps, order_index, impact, effort")
    .eq("active", true)
    .order("order_index", { ascending: true });

  if (items?.length) {
    await supabase.from("assessment_items").insert(
      (items as Record<string, unknown>[]).map((item) => {
        // Resolve steps: keyed object → pick "default" variant for tests
        const stepsMap = item.steps as Record<string, string[]> | string[] | null;
        const resolvedSteps = Array.isArray(stepsMap)
          ? stepsMap
          : (stepsMap?.["default"] ?? []);

        return {
          assessment_id: (assessment as { id: string }).id,
          checklist_item_id: item.id,
          group_id: item.group_id,
          title: item.title,
          description: item.outcome,
          why_it_matters: item.why_it_matters,
          steps: resolvedSteps,
          order_index: item.order_index,
          track: item.track,
          impact: item.impact,
          effort: item.effort,
        };
      })
    );
  }

  return (assessment as { id: string }).id;
}

/** Get the org_id for PLAYWRIGHT_ADMIN_EMAIL's org. */
export async function getAdminOrgId(): Promise<string> {
  const supabase = getServiceClient();
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  if (!email) throw new Error("PLAYWRIGHT_ADMIN_EMAIL not set");

  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const adminUser = (users?.users ?? []).find((u) => u.email === email);
  if (!adminUser) throw new Error(`Admin user not found: ${email}`);

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", adminUser.id)
    .single();
  if (!membership) throw new Error("Admin user has no org — complete onboarding first");
  return (membership as { org_id: string }).org_id;
}

/** Get the Supabase user id for PLAYWRIGHT_ADMIN_EMAIL. */
export async function getAdminUserId(): Promise<string> {
  const supabase = getServiceClient();
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  if (!email) throw new Error("PLAYWRIGHT_ADMIN_EMAIL not set");
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const adminUser = (users?.users ?? []).find((u) => u.email === email);
  if (!adminUser) throw new Error(`Admin user not found: ${email}`);
  return adminUser.id;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function apiBase(): string {
  return baseUrl();
}
