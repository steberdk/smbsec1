/**
 * F-046 — persona-smoke test helpers.
 *
 * Builds the 7 personas from `docs/quality/personas.md` (ANON, O1, O2, O3,
 * IT1, E1, E2) on top of the F-043 `createOrgWithMembers` harness so we do
 * NOT duplicate org-provisioning / sign-in plumbing. Real `bertramconsulting.dk`
 * mailboxes are never touched — all personas use `@example.invalid` tokens
 * and the harness's service-role tear-down runs at the end of each test.
 *
 * The 7-persona mapping onto harness primitives:
 *   - ANON  — no setup; caller uses a fresh browser context with no session.
 *   - O1    — `ownerIsItExecutor=true`, no employees, no assessment.
 *   - O2    — `ownerIsItExecutor=false`, 1 IT1 employee + 1 E2 employee,
 *             assessment started, 1 pending invite (E1) created separately.
 *   - O3    — `ownerIsItExecutor=false`, no employees, pending IT-exec invite.
 *   - IT1   — same org as O2; accessed via that org's employee[0] page.
 *   - E1    — pending-invite row in O2's org (no `org_members` row).
 *   - E2    — same org as O2; accessed via that org's employee[1] page.
 *
 * Personas O2 and IT1/E2 share one underlying org by design (per
 * personas.md §O2). Spinning up O2 returns the full multi-user bundle so
 * a single test can walk IT1 / E2 from the same cleanup root.
 */

import type { Browser, BrowserContext, Page } from "@playwright/test";
import {
  createOrgWithMembers,
  type MultiUserOrg,
} from "../helpers/multiUser";
import { getServiceClient } from "../helpers/fixtures";

export type PersonaId = "ANON" | "O1" | "O2" | "O3" | "IT1" | "E1" | "E2";

export type PersonaSession = {
  persona: PersonaId;
  /** Browser context the persona is operating in. Always set; for ANON it
   *  is a fresh context with no auth cookie. */
  context: BrowserContext;
  page: Page;
  /** Non-null for every authenticated persona. */
  userId?: string;
  email?: string;
  orgId?: string;
  /** Pending-invite row id, only for E1. */
  pendingInviteId?: string;
};

export type PersonaBundle = {
  sessions: PersonaSession[];
  cleanup: () => Promise<void>;
};

/**
 * Minimal reachable-page list per persona, taken from
 * `docs/quality/personas.md` Coverage summary. Paths are relative. The
 * smoke spec loops these assuming the dev server is running at
 * `playwright.config.ts:use.baseURL`.
 */
export const PERSONA_PAGES: Record<PersonaId, string[]> = {
  ANON: ["/", "/login", "/checklist", "/summary", "/privacy"],
  O1: [
    "/",
    "/workspace",
    "/workspace/checklist",
    "/workspace/dashboard",
    "/workspace/team",
    "/workspace/assessments",
    "/workspace/report",
    "/workspace/billing",
    "/workspace/settings",
    "/workspace/settings/gdpr",
  ],
  O2: [
    "/workspace",
    "/workspace/checklist",
    "/workspace/dashboard",
    "/workspace/team",
    "/workspace/assessments",
    "/workspace/report",
    "/workspace/settings",
    "/workspace/settings/gdpr",
  ],
  O3: [
    "/workspace",
    "/workspace/checklist",
    "/workspace/dashboard",
    "/workspace/team",
    "/workspace/assessments",
    "/workspace/settings",
    "/workspace/settings/gdpr",
  ],
  IT1: [
    "/workspace",
    "/workspace/checklist",
    "/workspace/dashboard",
    "/workspace/settings/gdpr",
  ],
  // E1 is essentially anon-with-a-token — the only page specific to this
  // persona is `/accept-invite`, which other specs already cover. For smoke
  // purposes treat it as anon reachable set.
  E1: ["/", "/login", "/checklist", "/summary", "/privacy"],
  E2: [
    "/workspace",
    "/workspace/checklist",
    "/workspace/dashboard",
    "/workspace/settings/gdpr",
  ],
};

/**
 * Create a fully-populated O2 org (owner, IT1, E2, one pending invite for E1,
 * active assessment). Other personas (O1, O3) stand alone — provision each
 * separately. Returns a bundle of sessions + one cleanup entry point.
 */
export async function setupO2Org(browser: Browser): Promise<MultiUserOrg> {
  return createOrgWithMembers(browser, {
    ownerName: "O2Owner",
    ownerIsItExecutor: false,
    employees: [
      { displayName: "IT1ITExec", isItExecutor: true },
      { displayName: "E2Employee", isItExecutor: false },
    ],
    startAssessment: true,
  });
}

/**
 * Seed a pending invite (E1) into the O2 org. Invite token is returned so
 * callers can build an `/accept-invite?token=...` URL if they need it.
 */
export async function seedPendingInvite(
  orgId: string,
  inviterUserId: string,
  email: string,
  opts: { isItExecutor?: boolean } = {},
): Promise<{ inviteId: string; token: string }> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      org_id: orgId,
      invited_by: inviterUserId,
      email: email.toLowerCase().trim(),
      role: "employee",
      is_it_executor: opts.isItExecutor ?? false,
    })
    .select("id, token")
    .single();
  if (error || !data) {
    throw new Error(`seedPendingInvite failed: ${error?.message}`);
  }
  const row = data as { id: string; token: string };
  return { inviteId: row.id, token: row.token };
}

/**
 * Create an O1 persona (solo owner, handles IT themselves, no assessment).
 */
export async function setupO1(browser: Browser): Promise<MultiUserOrg> {
  return createOrgWithMembers(browser, {
    ownerName: "O1Owner",
    ownerIsItExecutor: true,
    employees: [],
    startAssessment: false,
  });
}

/**
 * Create an O3 persona (owner, no employees yet, one pending IT-exec invite).
 * The pending invite is seeded directly so no second signed-in context is
 * needed.
 */
export async function setupO3(
  browser: Browser,
): Promise<{ org: MultiUserOrg; pendingInviteId: string }> {
  const org = await createOrgWithMembers(browser, {
    ownerName: "O3Owner",
    ownerIsItExecutor: false,
    employees: [],
    startAssessment: false,
  });
  const { inviteId } = await seedPendingInvite(
    org.orgId,
    org.owner.user.id,
    `e2e-pi16-o3-it-${Date.now()}@example.invalid`,
    { isItExecutor: true },
  );
  return { org, pendingInviteId: inviteId };
}

/**
 * Patterns that MUST NOT appear in user-facing copy on any page, per the
 * invariant set (INV-no-raw-db-errors + INV-audit-log-pii-hashed).
 * Kept as a single source used by both invariants.spec.ts and
 * personas.spec.ts so the check never drifts between them.
 */
export const RAW_ERROR_PATTERNS: RegExp[] = [
  /function\s+\w+\(.*\)\s+does\s+not\s+exist/i,
  /SQLSTATE\s+\w+/i,
  /relation\s+"[^"]+"\s+does\s+not\s+exist/i,
  /column\s+"[^"]+"\s+(?:does\s+not\s+exist|of\s+relation)/i,
];

export function findRawErrorLeak(text: string): RegExp | null {
  for (const pat of RAW_ERROR_PATTERNS) {
    if (pat.test(text)) return pat;
  }
  return null;
}
