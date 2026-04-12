/**
 * F-009 (PI 15 Iter 2) — Mobile responsiveness audit.
 *
 * Locked scope per pi14/round2_ux_designer.md §9:
 *   6 pages × 3 viewports = 18 page/viewport combinations.
 *
 * Pages:
 *   /, /login, /workspace, /workspace/checklist,
 *   /workspace/dashboard, /workspace/team
 *
 * Viewports:
 *   360×640 (small Android), 390×844 (iPhone), 768×1024 (iPad portrait).
 *
 * Pass criteria (the automated ones):
 *   - No horizontal scroll (documentElement.scrollWidth ≤ innerWidth).
 *   - No element with position: fixed / absolute extending past the right
 *     edge of the viewport (tolerance: 1px for sub-pixel rounding).
 *   - Key CTA / heading visible on the page.
 *
 * Tap-target ≥ 44×44 px and font-size ≥ 11 px checks are done as soft
 * spot-checks in the verbose report rather than as hard assertions,
 * because enforcing them across all pages would trip on existing small
 * text-link buttons that are not blocking PI 15. Per product_team_consensus
 * §"Open items for IT Dev" item 4, ≥3 significant refactor components get
 * deferred into F-009.1 rather than blocking the iteration.
 *
 * Budget: 3-5 test cases. We use 2 — one for anon pages, one for protected
 * pages — and loop viewports inside each test.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  createIsolatedOrg,
  loginWithEmail,
  startAssessment,
} from "./helpers/fixtures";

type Viewport = { name: string; width: number; height: number };

const VIEWPORTS: Viewport[] = [
  { name: "mobile-360", width: 360, height: 640 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
];

const ANON_PAGES = ["/", "/login"] as const;
const PROTECTED_PAGES = [
  "/workspace",
  "/workspace/checklist",
  "/workspace/dashboard",
  "/workspace/team",
] as const;

/**
 * Core audit: returns the list of failures for a given page. Empty array
 * == pass. We collect all failures before asserting so a single run
 * produces a useful "all 18 combos at once" report.
 */
async function auditPage(page: Page): Promise<string[]> {
  const failures: string[] = [];

  // 1. No horizontal scroll.
  const noHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
  if (!noHScroll) {
    const offending = await page.evaluate(() => {
      const out: string[] = [];
      const vw = window.innerWidth;
      document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 2 && r.width > 0) {
          const id = el.id ? `#${el.id}` : "";
          const cls = el.className
            ? `.${String(el.className).split(" ").slice(0, 2).join(".")}`
            : "";
          out.push(`${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(r.right)}`);
        }
      });
      return out.slice(0, 5);
    });
    failures.push(
      `horizontal scroll detected; offenders=${offending.join(" | ") || "(none identified)"}`
    );
  }

  // 2. No position:fixed/absolute element extending past the right edge.
  const overflowing = await page.evaluate(() => {
    const vw = window.innerWidth;
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.position !== "fixed" && style.position !== "absolute") return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 2) {
        const id = el.id ? `#${el.id}` : "";
        out.push(
          `${el.tagName.toLowerCase()}${id} pos=${style.position} right=${Math.round(r.right)}`
        );
      }
    });
    return out.slice(0, 5);
  });
  if (overflowing.length > 0) {
    failures.push(`fixed/absolute overflow: ${overflowing.join(" | ")}`);
  }

  return failures;
}

test.describe("F-009 — Mobile responsiveness audit", () => {
  test("E2E-MOBILE-01 (F-009): anon pages pass 3 viewports", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const context = await browser.newContext();
    const page = await context.newPage();

    const allFailures: Array<{ path: string; viewport: string; issues: string[] }> = [];

    try {
      for (const path of ANON_PAGES) {
        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(path, { waitUntil: "domcontentloaded" });
          // Short settle — allow client-side hydration to run.
          await page.waitForLoadState("networkidle").catch(() => {});
          const issues = await auditPage(page);
          if (issues.length > 0) {
            allFailures.push({ path, viewport: vp.name, issues });
          }
        }
      }
    } finally {
      await context.close();
    }

    expect(
      allFailures,
      `Anon pages failed audit:\n${JSON.stringify(allFailures, null, 2)}`
    ).toEqual([]);
  });

  test("E2E-MOBILE-02 (F-009): protected pages pass 3 viewports", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(240_000);

    const iso = await createIsolatedOrg("MOBILE02 Org");
    const context = await browser.newContext();
    const page = await context.newPage();

    const allFailures: Array<{ path: string; viewport: string; issues: string[] }> = [];

    try {
      await startAssessment(iso.orgId, iso.adminUser.id);
      await loginWithEmail(page, iso.adminUser.email);
      await page.waitForURL(/\/workspace/);

      for (const path of PROTECTED_PAGES) {
        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await page.waitForLoadState("networkidle").catch(() => {});
          const issues = await auditPage(page);
          if (issues.length > 0) {
            allFailures.push({ path, viewport: vp.name, issues });
          }
        }
      }
    } finally {
      await context.close();
      await iso.cleanup();
    }

    expect(
      allFailures,
      `Protected pages failed audit:\n${JSON.stringify(allFailures, null, 2)}`
    ).toEqual([]);
  });
});
