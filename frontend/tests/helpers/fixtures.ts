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
 * Log in as any email by navigating to the admin-generated action_link.
 * The action_link goes through Supabase's verify endpoint which redirects
 * to /auth/callback?code=... (PKCE). Our callback page exchanges the code,
 * but since there is no code_verifier in this browser, the exchange may
 * fail and the fallback onAuthStateChange listener picks up the session
 * from the implicit grant that Supabase also provides via the action_link.
 *
 * As a robust fallback, we also verify the token via the REST API and
 * inject the session into localStorage if the browser flow times out.
 */
export async function loginWithEmail(page: Page, email: string): Promise<void> {
  const supabase = getServiceClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Use the admin API to generate a link and get the action_link + user info
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${baseUrl()}/auth/callback` },
  });
  if (error || !data?.properties?.action_link) {
    throw new Error(`Failed to generate magic link for ${email}: ${error?.message}`);
  }

  // Navigate to the app first so localStorage is on the right origin
  await page.goto(`${baseUrl()}/login`);
  await page.waitForLoadState("domcontentloaded");

  // Generate a session directly using the service-role admin API.
  // This is the most reliable approach for E2E tests.
  const userId = data.user?.id;
  if (!userId) throw new Error(`No user id returned for ${email}`);

  // Use the admin API to get a session for this user
  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      type: "magiclink",
      email,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`generate_link failed: ${await tokenRes.text()}`);
  }

  const linkData = await tokenRes.json();

  // Follow the action link server-side to get the redirect with tokens
  // The action_link verifies the token and redirects with session data
  const actionLink = linkData.action_link ?? data.properties.action_link;

  // Instead of browser navigation, do a fetch to the action_link to get the redirect URL
  const redirectRes = await fetch(actionLink, { redirect: "manual" });
  const redirectUrl = redirectRes.headers.get("location") ?? "";

  // Parse tokens from the redirect URL (may be in hash fragment or query params)
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  // Try hash fragment (implicit flow fallback in action_link)
  const hashMatch = redirectUrl.match(/access_token=([^&]+)/);
  const refreshMatch = redirectUrl.match(/refresh_token=([^&]+)/);
  if (hashMatch) {
    accessToken = decodeURIComponent(hashMatch[1]);
    refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;
  }

  if (!accessToken) {
    throw new Error(`Could not extract access_token from redirect: ${redirectUrl.substring(0, 200)}`);
  }

  // Inject the session into localStorage
  const supabaseHost = new URL(supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${supabaseHost}-auth-token`;
  const sessionData = JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: data.user,
  });

  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: storageKey, value: sessionData }
  );

  // Navigate to workspace — the app should pick up the session
  await page.goto(`${baseUrl()}/workspace`);
  await page.waitForURL(/\/(workspace|onboarding)/, { timeout: 15_000 });
}

/** Log in as a pre-configured role (email from env vars). */
export async function loginAsRole(
  page: Page,
  role: "org_admin" | "employee" | "it_executor"
): Promise<void> {
  const emails: Record<string, string | undefined> = {
    org_admin: process.env.PLAYWRIGHT_ADMIN_EMAIL,
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
  role: "org_admin" | "employee",
  opts: { isItExecutor?: boolean } = {}
): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("org_members").insert({
    org_id: orgId,
    user_id: user.id,
    role,
    is_it_executor: opts.isItExecutor ?? false,
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
