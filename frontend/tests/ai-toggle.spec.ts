/**
 * F-012 PI 14 Iter 1 — org-level AI guidance kill switch.
 *
 * Verifies that:
 *   1. When an org has `ai_guidance_enabled = false`, a member calling
 *      POST /api/guidance receives 503 { error: "ai_guidance_disabled" }.
 *   2. When the admin re-enables it, the endpoint stops returning 503
 *      (may return 400 because no body was sent, or 429/500, but
 *      crucially NOT 503 with the disabled error).
 *
 * Uses an isolated org + temp admin user — no shared state.
 */

import { test, expect } from "@playwright/test";
import { createIsolatedOrg, getServiceClient, baseUrl } from "./helpers/fixtures";

/**
 * Pre-flight: skip both tests if migration 023 hasn't been applied yet (the
 * `orgs.ai_guidance_enabled` column doesn't exist). Once Stefan applies it
 * in Supabase SQL editor, the tests auto-run.
 */
async function migration023Applied(): Promise<boolean> {
  const svc = getServiceClient();
  const probe = await svc.from("orgs").select("ai_guidance_enabled").limit(1);
  return !probe.error;
}

async function adminAccessToken(userId: string, email: string): Promise<string> {
  // Mint a session for a temp user via the service-role admin API.
  // generate_link returns an action_link that embeds access_token in its
  // redirect target when followed.
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
  const actionLink: string = data.action_link;

  // Follow the action_link manually to catch the redirect URL with tokens.
  const redirect = await fetch(actionLink, { redirect: "manual" });
  const loc = redirect.headers.get("location") ?? "";
  const tokMatch = loc.match(/access_token=([^&]+)/);
  if (!tokMatch) {
    throw new Error(`no access_token in redirect for ${email} (${userId}): ${loc.slice(0, 200)}`);
  }
  return decodeURIComponent(tokMatch[1]);
}

test("E2E-AI-01 (F-012): owner can disable AI guidance and /api/guidance returns 503", async ({
  request,
}) => {
  test.skip(!(await migration023Applied()), "migration 023 (orgs.ai_guidance_enabled) not applied yet");
  const org = await createIsolatedOrg("E2E AI Toggle");
  try {
    const svc = getServiceClient();

    // Flip the toggle off directly via service-role.
    await svc.from("orgs").update({ ai_guidance_enabled: false }).eq("id", org.orgId);

    // Mint an access token for the admin user.
    const token = await adminAccessToken(org.adminUser.id, org.adminUser.email);

    const res = await request.post(`${baseUrl()}/api/guidance`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { item_title: "Enable MFA for all admins" },
    });

    // Exact check: 503 with the disabled payload.
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("ai_guidance_disabled");
  } finally {
    await org.cleanup();
  }
});

test("E2E-AI-02 (F-012): re-enabling the toggle stops the 503 disabled response", async ({
  request,
}) => {
  test.skip(!(await migration023Applied()), "migration 023 (orgs.ai_guidance_enabled) not applied yet");
  const org = await createIsolatedOrg("E2E AI Toggle Re-enable");
  try {
    const svc = getServiceClient();

    // Disable then re-enable.
    await svc.from("orgs").update({ ai_guidance_enabled: false }).eq("id", org.orgId);
    await svc.from("orgs").update({ ai_guidance_enabled: true }).eq("id", org.orgId);

    const token = await adminAccessToken(org.adminUser.id, org.adminUser.email);

    const res = await request.post(`${baseUrl()}/api/guidance`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { item_title: "Enable MFA for all admins" },
    });

    // It may return 200 (happy path), 429 (rate limit), 500 (Anthropic key
    // not configured in test), or 400 — but MUST NOT be 503 with the
    // disabled-kill-switch payload.
    if (res.status() === 503) {
      const body = await res.json().catch(() => ({}));
      expect(body.error).not.toBe("ai_guidance_disabled");
    }
  } finally {
    await org.cleanup();
  }
});
