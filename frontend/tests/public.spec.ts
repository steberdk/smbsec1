/**
 * Public pages — no login required.
 * Covers: AC-PUB-1, AC-PUB-2, AC-PUB-3
 * E2E scenarios: E2E-PUB-01, E2E-PUB-02, E2E-PUB-03
 */

import { test, expect } from "@playwright/test";
import { loginAsRole } from "./helpers/fixtures";

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

test("E2E-PUB-01: landing page shows 'what breaches SMBs' section and CTA", async ({
  page,
}) => {
  await page.goto("/");

  // Section heading or content referencing how SMBs get breached
  await expect(
    page.getByText(/breaches|how smbs get hacked|how businesses get hacked/i).first()
  ).toBeVisible();

  // At least one of the five named attack types must appear
  const attackTerms = [/phishing/i, /ransomware/i, /password/i, /invoice/i, /email compromise/i];
  let visibleCount = 0;
  for (const term of attackTerms) {
    const count = await page.getByText(term).count();
    if (count > 0) visibleCount++;
  }
  expect(visibleCount).toBeGreaterThanOrEqual(3); // require at least 3 of 5

  // CTA to checklist or sign up
  await expect(
    page.getByRole("link", { name: /start the checklist|get started|sign up/i }).first()
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// Checklist (anonymous)
// ---------------------------------------------------------------------------

test("E2E-PUB-02: anonymous checklist is read-only", async ({ page }) => {
  await page.goto("/checklist");

  // Checklist renders
  await expect(page.getByRole("heading", { name: /checklist/i })).toBeVisible();

  // At least one item title visible
  await expect(page.locator("h3, h2").first()).toBeVisible();

  // No action buttons
  await expect(page.getByRole("button", { name: /^done$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /not sure/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^skip$/i })).toHaveCount(0);

  // Sign-in prompt visible
  await expect(page.getByText(/sign in|log in/i).first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Summary (anonymous)
// ---------------------------------------------------------------------------

test("E2E-PUB-04: public checklist does not show errors when logged in", async ({
  page,
}) => {
  // Log in first, then visit the public checklist
  await loginAsRole(page, "org_admin");
  await page.waitForURL(/\/workspace/);

  // Navigate to public checklist
  await page.goto("/checklist");

  // Should render without error messages
  await expect(page.getByRole("heading", { name: /checklist/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/error|invalid schema|failed/i)).toHaveCount(0);
});

test("E2E-PUB-03: summary page prompts sign-in for anonymous user", async ({
  page,
}) => {
  await page.goto("/summary");

  await expect(page.getByText(/sign in to see your progress/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
});

// F-025 — landing tab title aligned with brand (SMB Security Quick-Check).
test("E2E-PUB-05 (F-025): landing page tab title contains brand name", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SMB Security Quick-Check/);
});

// F-025 — landing page "Sign up free" CTA links to /login?intent=signup.
test("E2E-PUB-06 (F-025/F-024): 'Sign up free' CTA links to /login?intent=signup", async ({
  page,
}) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: /sign up free/i });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/login?intent=signup");
});

// F-042 — the misleading "contact us via the application" copy must not appear
// on the privacy page.
test("E2E-PUB-07 (F-042): /privacy does not contain 'contact us via the application'", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  // Assert against the rendered body text.
  const bodyText = await page.locator("main").innerText();
  expect(bodyText.toLowerCase()).not.toContain("contact us via the application");
});

// F-012 PI 14 Iter 1 — CSP header on /workspace/checklist.
// The page is protected (unauth users get redirected), but either the
// protected response OR the redirect response carries the CSP header
// from next.config.ts. Either is acceptable — the invariant is that
// frame-ancestors 'none' is active for this path.
test("E2E-PUB-10 (F-012): /workspace/checklist sends a CSP with frame-ancestors 'none'", async ({
  request,
}) => {
  const res = await request.get("/workspace/checklist", { maxRedirects: 0 });
  const csp = res.headers()["content-security-policy"];
  expect(csp).toBeTruthy();
  expect(csp).toContain("frame-ancestors 'none'");
  // The tighter checklist policy drops 'unsafe-eval' but we don't assert
  // its absence here because a middleware redirect may return the
  // baseline global CSP. The invariant to guarantee is clickjacking
  // protection.
});

// F-012 PI 14 Iter 1 — privacy page must list Anthropic as a sub-processor.
test("E2E-PUB-09 (F-012): privacy page lists Anthropic as sub-processor", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();

  // Anthropic appears on the page.
  await expect(page.getByText(/Anthropic/).first()).toBeVisible();

  // "AI guidance" or "Claude" appears somewhere on the page too, so the
  // row is really about the AI sub-processor and not a stray mention.
  const body = (await page.locator("main").innerText()).toLowerCase();
  expect(body).toContain("anthropic");
  expect(
    body.includes("claude") || body.includes("ai guidance") || body.includes("ai-assisted")
  ).toBe(true);
});

// F-037 — 1-page security rules template has the locked wording about
// printing physical copies in case of IT attacks.
test("E2E-PUB-08 (F-037): /templates/security-rules.md mentions physical copies for IT attacks", async ({
  request,
}) => {
  const res = await request.get("/templates/security-rules.md");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain(
    "Print for onboarding and physical copies to use in case of IT attacks"
  );
});
