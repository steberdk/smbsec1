# Test Strategy
How, where, and when we test. For agents and humans.

---

## Test levels
| Level | What | When | Where | Who |
|---|---|---|---|---|
| **Lint** | Code style, unused vars, React rules | Before every commit | Local + CI | IT Dev |
| **Build** | TypeScript errors, missing imports | Before every commit | Local + CI | IT Dev |
| **E2E (local)** | Feature flows via Playwright | Before every push | Local (`npm run test:e2e`) | IT Dev |
| **E2E (CI)** | Same tests, clean environment | After every push | GitHub Actions | Automated |
| **Deployment check** | Live app works after deploy | After CI green | Vercel prod (Playwright MCP) | IT Dev |
| **Business testing** | Full user walkthrough, all roles | End of each PI | Vercel prod (Playwright MCP) | Business Test Team (agents) |

---

## Test files
All in `frontend/tests/`. Each .ts file maintained with a number of tests according to new features (new tests added and existing modified if needed).
| File | Area |
|---|---|
| `smoke.spec.ts` | Public pages load |
| `auth.spec.ts` | Login, redirect, form validation |
| `onboarding.spec.ts` | Org creation, IT setup |
| `roles.spec.ts` | Role-based access control |
| `invite.spec.ts` | Team invitations |
| `assessment.spec.ts` | Assessment lifecycle |
| `checklist.spec.ts` | Checklist interactions, AI guidance |
| `awareness.spec.ts` | Awareness track items |
| `dashboard.spec.ts` | Dashboard, team progress |
| `campaigns.spec.ts` | Campaign access, templates |
| `delete.spec.ts` | Member/org deletion |
| `gdpr.spec.ts` | Data export, residency |
| `public.spec.ts` | Public page content |
Test helpers: `frontend/tests/helpers/fixtures.ts` — auth, temp users, org setup, assessment creation, cleanup.

---

## Where to run what

### Before committing (local)
```bash
cd frontend
npm run lint          # 0 warnings required
npm run build         # must pass
```

### Before pushing (local)
```bash
npm run test:e2e      # all tests, sequential, ~10-25 min as of 2026-APR-06
```

If only a specific area changed, run targeted:
```bash
npx playwright test tests/auth.spec.ts        # just auth
npx playwright test tests/checklist.spec.ts   # just checklist
```

### After pushing (CI — automatic)
GitHub Actions runs: lint → build → E2E (with 2 retries).
Monitor: `gh run list --limit 1` — wait for green before pushing again.

CI report artifact: downloadable from GitHub Actions → run → Artifacts → `playwright-report`.

### After CI green (deployment verification)
Spot-check key pages on live Vercel deployment using Playwright MCP or browser:
- Landing page loads
- Login page shows email form + OTP field
- Workspace loads for logged-in user

### End of PI (business testing)
Business Test Team (multiple independent agents with Playwright MCP) tests the full live app:
- All user types (anon, owner, manager, employee)
- All pages and navigation paths
- All forms and actions
- Naming/description consistency
- Mobile viewport check

Results go into a PI-named issue log file (e.g. `docs/pi12/business_test_issues.md`).

---

## Test configuration

**Config file:** `frontend/playwright.config.ts`

| Setting | Local | CI |
|---|---|---|
| Browser | Chromium | Chromium |
| Retries | 0 | 2 |
| Workers | 1 (sequential — shared DB) | 1 |
| Timeout | 30s per test | 30s per test |
| Screenshots | On failure | On failure |
| Video | On failure | On failure |
| Report | HTML (auto-open) | HTML (uploaded as artifact) |

---

## Test environment

Tests use the **real Supabase instance** (not mocked). Required env vars in `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=        # same as prod
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # same as prod
SUPABASE_SERVICE_ROLE_KEY=       # admin API access
PLAYWRIGHT_ADMIN_EMAIL=          # must have completed onboarding
```

Same vars are in GitHub Secrets for CI.

**Auth strategy:** Tests use the Supabase Admin API to generate magic links server-side and inject sessions into the browser. No actual email sending or reading needed.

---

## Where test results go
| Result type | Location |
|---|---|
| Local E2E report | `frontend/playwright-report/` (HTML, open with `npm run test:e2e:report`) |
| CI E2E report | GitHub Actions artifact (download from run page) |
| CI pass/fail | GitHub Actions status on commit |
| Business test issues | `docs/pi{N}/business_test_issues.md` (one file per PI) |
| Flaky test tracking | Feature in `docs/product/features.md` (currently F-015) |

---

## Adding new tests
When a new feature is built:
1. Add E2E test(s) to the appropriate spec file, or create a new `{feature}.spec.ts`
2. Use `fixtures.ts` helpers for auth, org setup, and cleanup
3. Follow the pattern: setup → action → assert → cleanup
4. Avoid `waitForResponse` alone — always pair with a UI assertion (see F-015)
5. Run locally before pushing
6. Verify CI passes after push

**Naming convention:** `E2E-{AREA}-{NN}: description` (e.g. `E2E-AUTH-02: successful magic-link login lands on /workspace`)

---

## Known issues to be solved in future feature and PI
- **Flaky `waitForResponse`**: Some tests race between API response and UI update. Fix tracked as F-015.
- **3 skipped tests**: E2E-ONBOARD-05, E2E-DASH-04, E2E-ITEM-04 — missing DB fixtures.
- **Single browser**: Only Chromium tested. Safari/Firefox not covered.

---

## Multi-user E2E harness (F-043)

Landed PI 14 Iter 1 as the anti-phantom-Done insurance for every dashboard-math feature that follows (F-034, F-038, F-039, F-040, F-041, F-033). Before F-043 the only way to test a cross-user scenario was to reuse the shared admin user, which made parallel runs conflict and hid real bugs; the harness fixes that by spinning up a fresh isolated org with one owner + N employees, each signed in through their own `BrowserContext`, in a single call.

### What the harness provides
- **`createOrgWithMembers(browser, spec)`** — creates a fresh isolated org via service-role, creates the owner + every employee described in `spec`, opens one `BrowserContext`/`Page` per user, signs each one in, optionally starts an assessment, and returns a bundle with a single `cleanup()` entry point.
- **`expectDashboardCounts(page, expected)`** — canonical dashboard assertion. Lenient today against the pre-F-038 DOM; will be tightened to the exact canonical pill labels in the same PR that lands F-038.
- **`seedResponses(orgId, assessmentId, userId, seeds[])`** — deterministic response seeding via service-role. Items are matched by case-insensitive title substring; ambiguous or missing matches throw at test time.
- **`setupCanonicalStefanFixture(browser)`** — the 2-user canonical F-038 fixture from `docs/product/pi14/product_team_consensus.md`: 1 owner-IT-exec + 1 employee, an active assessment, and exactly `done=11 / unsure=4 / skipped=4` owner responses.
- **Self-tests:** `frontend/tests/_harness.spec.ts` exercises every helper, proves teardown leaves zero rows, and runs a 10-iteration stability loop (F-043 AC-5).

### Prefix isolation convention
All harness-created data uses two non-negotiable conventions so the nightly sweeper can find orphans with a single LIKE clause and so test emails can never escape to a real mailbox:

1. **Org names** are prefixed `e2e-pi14-` (lowercase, literal). Stefan's real orgs never use that prefix.
2. **Test user emails** use the `@example.invalid` TLD (reserved by RFC 2606 — guaranteed zero delivery). The harness constructs addresses of the shape `e2e-pi14-<token>-<role>@example.invalid`. Do not use `@example.com` — that domain is real-routable and can cause bounces.

### Teardown architecture
Two layers of cleanup:

- **Per-test teardown (primary).** Every `createOrgWithMembers` call returns a `cleanup()` async function that callers must invoke from a `finally` block. Cleanup closes every `BrowserContext` and runs a 10-step FK-respecting delete sequence (assessment_responses → assessment_items → assessments → campaign_recipients → campaigns → invites → audit_logs → ai_guidance_usage/flags → org_members → orgs → auth.users). Errors are swallowed + logged so one broken test never blocks another.
- **Nightly sweeper (safety net).** `frontend/scripts/cleanup-e2e-orgs.ts`, invoked by `.github/workflows/cleanup-e2e-orgs.yml` on a `0 3 * * *` cron, sweeps any `e2e-pi14-*` orgs older than 1 hour that a crashed test left behind. Uses GitHub secrets for `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — never hardcoded.

### Where the harness runs
**DEV / CI Supabase only — never PROD.** Same Supabase instance as the rest of the E2E suite (per-consensus decision, see `docs/product/pi14/product_team_consensus.md` §"Shared Supabase DEV project"). Because the harness creates live rows in Supabase it MUST NOT be pointed at a production project; the `PLAYWRIGHT_BASE_URL` override is for hitting Vercel previews, but the service-role writes always go to whichever Supabase URL is in `.env.local` / CI secrets. Stefan's PROD Supabase project must NEVER have that service-role key present in any harness env.
