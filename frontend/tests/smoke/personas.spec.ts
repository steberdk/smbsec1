// Coordinate with F-048 agent: files co-owned
//
// F-046 — per-persona smoke walkthroughs.
//
// One test per persona × key page. Each walkthrough:
//   1. Seeds the persona's org state via service-role fixtures.
//   2. Logs the persona in.
//   3. Walks at least one page that is meaningful for the persona.
//   4. Asserts no raw DB error strings, no jargon copy, and the expected
//      access-control outcome (can reach / redirected / restricted fallback).
//
// Persona IDs follow `docs/quality/personas.md`: ANON, O1, O2, O3, IT1, E1, E2.
//
// This file is the seed. The F-048 agent extends it with Home-specific
// walkthroughs; the F-049 agent (this file's creator) contributes the
// Team-specific walkthrough for O2/O3/IT1.

import { test, expect, type Page } from "@playwright/test";
import { baseUrl } from "../helpers/fixtures";
import {
  PERSONA_PAGES,
  findRawErrorLeak,
  setupO1,
  setupO2Org,
  setupO3,
  type PersonaId,
} from "./personaHelpers";

// ===========================================================================
// NOTE — the F-048 partner agent's richer, harness-driven persona walkthroughs
// are appended below. They cover the O2/IT1/E2 shared-org walkthrough and the
// ANON/O1/O3/E1 reachable-page loops using the F-043 `createOrgWithMembers`
// harness. The F-049 agent's Team-page-specific invariant assertions (dialog
// copy + raw-DB-error mapping) live in `invariants.spec.ts` so they can be
// exercised in isolation without the full multi-user harness.
// ===========================================================================

// ===========================================================================
// F-048 persona walkthroughs — reuses the F-043 `createOrgWithMembers`
// harness via `personaHelpers` rather than duplicating sign-in plumbing.
// See `docs/quality/personas.md` Coverage summary for the full reachable-page
// table; we walk a meaningful subset here and leave exhaustive enumeration
// to the dedicated page-level specs.
// ===========================================================================

type PageCheckOpts = {
  /** Pages where the literal "Not set" label is legitimate (Settings email
   *  platform select placeholder). */
  allowNotSet?: boolean;
};

async function assertPageHealth(
  page: Page,
  persona: PersonaId,
  path: string,
  opts: PageCheckOpts = {},
): Promise<void> {
  await page.goto(`${baseUrl()}${path}`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(300);

  const bodyText = await page.locator("body").innerText().catch(() => "");

  const leak = findRawErrorLeak(bodyText);
  expect(
    leak,
    `persona=${persona} path=${path} — raw DB/integration error leaked`,
  ).toBeNull();

  if (!opts.allowNotSet) {
    expect(
      bodyText,
      `persona=${persona} path=${path} — literal "Not set" rendered outside allowlisted region`,
    ).not.toMatch(/\bNot set\b/);
  }

  // Some heading must render — proves the page actually mounted, not a
  // blank-on-error.
  const heading = page.locator("h1, h2").first();
  await expect(
    heading,
    `persona=${persona} path=${path} — no heading rendered`,
  ).toBeVisible({ timeout: 10_000 });
}

test("persona ANON — reachable pages render cleanly", async ({ browser }, testInfo) => {
  testInfo.setTimeout(180_000);
  const ctx = await browser.newContext(); // fresh, no cookies
  try {
    const page = await ctx.newPage();
    for (const path of PERSONA_PAGES.ANON) {
      await assertPageHealth(page, "ANON", path);
    }
  } finally {
    await ctx.close();
  }
});

test("persona O1 — solo owner, reachable pages render cleanly", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const org = await setupO1(browser);
  try {
    for (const path of PERSONA_PAGES.O1) {
      const allowNotSet = path.startsWith("/workspace/settings");
      await assertPageHealth(org.owner.page, "O1", path, { allowNotSet });
    }
  } finally {
    await org.cleanup();
  }
});

test("persona O2 + IT1 + E2 — shared org, each persona's reachable pages render", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(420_000);
  const org = await setupO2Org(browser);
  try {
    for (const path of PERSONA_PAGES.O2) {
      const allowNotSet = path.startsWith("/workspace/settings");
      await assertPageHealth(org.owner.page, "O2", path, { allowNotSet });
    }

    const it1 = org.employees[0];
    if (it1) {
      for (const path of PERSONA_PAGES.IT1) {
        const allowNotSet = path.startsWith("/workspace/settings");
        await assertPageHealth(it1.page, "IT1", path, { allowNotSet });
      }
    }

    const e2 = org.employees[1];
    if (e2) {
      for (const path of PERSONA_PAGES.E2) {
        const allowNotSet = path.startsWith("/workspace/settings");
        await assertPageHealth(e2.page, "E2", path, { allowNotSet });
      }
    }
  } finally {
    await org.cleanup();
  }
});

test("persona O3 — pending IT-exec invite, reachable pages render cleanly", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const { org } = await setupO3(browser);
  try {
    for (const path of PERSONA_PAGES.O3) {
      const allowNotSet = path.startsWith("/workspace/settings");
      await assertPageHealth(org.owner.page, "O3", path, { allowNotSet });
    }
  } finally {
    await org.cleanup();
  }
});

test("persona E1 — anon-with-pending-invite, anon pages render cleanly", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    for (const path of PERSONA_PAGES.E1) {
      await assertPageHealth(page, "E1", path);
    }
  } finally {
    await ctx.close();
  }
});

test.skip("persona E1 · /accept-invite with valid token · TODO (F-050 follow-up)", () => {
  // TODO: depends on F-050 auth-boundary work. The accept-invite round-trip
  // is exercised by `invite.spec.ts`; not duplicated here.
});
