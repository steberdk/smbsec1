# Product Backlog

## Done — MVP (Iteration 1, 2026-03-06)

- Free signup / magic-link login (Supabase)
- Create organisation (onboarding)
- Role hierarchy: org_admin > manager > employee
- Invite team members (record created, link copyable)
- Accept invite via token URL
- One active assessment per org (start / complete)
- Subtree assessment scope for managers
- Per-user checklist with Done / Unsure / Skipped responses
- Team dashboard with progress stats
- GDPR: data export (JSON), remove member, delete org
- 40 Playwright E2E tests passing

## Done — Iteration 2: Team & Content (2026-03-07)

- Invite email delivery via Resend (non-fatal fallback to copy-link)
- Copy invite link button on team page (manual fallback)
- Friendlier first-login message when no active assessment
- Checklist seed data ready (SQL in docs/sql/006_checklist_master.sql — apply in Supabase)

## Done — Iteration 3: Outcomes & Visibility (2026-03-07)

- Per-role track filtering: non-IT-executors see Awareness track only
- Completion banner on checklist when all items answered (Done/Unsure/Skipped breakdown)
- Overdue reassessment indicator on dashboard (green/amber/red/never cadence) — was already present
- Fix: removed misleading "start one now" link for employees on no-assessment screen

## Done — Iteration 4: GDPR Self-Service (2026-03-07)

- Data residency disclosure on Settings & data page (West EU / Ireland / AWS eu-west-1)
- Self-deletion for any user ("Delete my account" in Settings & data)
  - Blocked if org_admin with other members, or manager with direct reports
  - Hard deletes org_member + responses + auth user
- Settings & data page now accessible to all users (not just org_admin)
- E2E: TRACK-01, TRACK-02, ITEM-05, DEL-06 added

## Iteration 5 — QA sweep (2026-03-10)

_Findings from live browser QA of https://smbsec1.vercel.app (anonymous + protected-route flows)._

### Bugs

- **BUG-01 — Stale copy referencing removed localStorage feature**
  The landing page still reads "Progress is stored in your browser. Sign in to sync across devices."
  and the checklist page still shows "Sign in to track your progress and sync across devices."
  Anonymous localStorage tracking was intentionally removed; these references were not cleaned up.
  The copy should be removed or replaced with a straightforward sign-in prompt.

- **BUG-02 — Bare Next.js 404 page**
  Any unknown URL (e.g. /nonexistent-page) returns the default Next.js 404 — no branding, no nav,
  no "go home" link. Users are completely stranded.

- **BUG-03 — "Loading…" flash before auth redirect**
  Protected routes (/workspace, /onboarding) briefly render "Loading…" before redirecting to /login.
  Looks glitchy; should be instant or show a skeleton.

### UX / polish

- **UX-01 — Mobile hero CTA wraps to two rows**
  At 390 px (iPhone 14) the three hero buttons ("Start the checklist", "View summary", "Log in")
  don't fit on one line. "Log in" drops to a second row, looking unintentional.

- **UX-02 — Summary page is a dead end for anonymous users**
  /summary shows only "Sign in to see your progress summary." with no teaser content. The "View
  summary" CTA on the landing page goes nowhere useful for an anonymous visitor.

- **UX-03 — All pages share the same <title>**
  Every route returns "SMB Security Quick-Check" as the browser tab title. Per-page titles improve
  orientation and SEO (e.g. "Security Checklist | SMB Security Quick-Check").

---

### Recommended — build next (priority order)

1. **Remove stale localStorage copy (BUG-01)**
   Strip "Progress is stored in your browser. Sign in to sync across devices." from the landing page
   and replace the checklist sign-in banner with a plain prompt. Also reconsider whether the
   "View summary" landing-page CTA makes sense for anonymous visitors (UX-02).

2. **Custom 404 page**
   Add app/not-found.tsx with site header/branding, a short message, and a "Go home" link.
   30-minute task, high polish impact.

3. **Per-page `<title>` tags**
   Each route should set a descriptive title (e.g. "Security Checklist | SMB Security Quick-Check").
   Improves browser tab orientation and is a prerequisite for any future SEO work.

## Deferred — v1.1 candidates

- E2E: self-deletion blocker test (user with direct reports — API enforces, no UI test yet)
- E2E: data residency notice visible to non-admin users (no test yet)
- Platform-specific checklist step content (Google Workspace / M365)
- Branch delete UI (manager + all direct reports in one action)
- Reset checklist item to unanswered state
- Phishing simulations
- Evidence uploads
- Reassessment reminders / calendar integration
- SEO / Open Graph: og:title, og:description, og:image — low priority, awaiting later version when SEO strategy is defined
