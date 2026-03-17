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

## Done — Iteration 5: Activation & Retention (2026-03-16)

Scoped and finalised by cross-functional product team after 2 iterations (PM + UX + Security + BA + Architect).
Theme: **make the product non-embarrassing on day one** — dashboard shows real names and accurate data; checklist shows actual guidance; users complete with a reason to return.

### Delivered

- Migration 007: `steps` (jsonb) + `why_it_matters` (text) on `assessment_items`; `email` (text) on `org_members`; `checklist_items.steps` transformed to keyed format `{ "default": [...] }`
- Assessment snapshot copies `steps` (resolved for org platform) + `why_it_matters` into `assessment_items`
- `resolveSteps(stepsMap, platform)` helper for platform-specific step resolution
- Checklist UI: expanded items show "Why it matters" block + numbered steps list
- Per-track dashboard: IT Baseline and Awareness shown as separate progress indicators
- Denominator fix: non-IT-executor percent calculated against awareness items only
- Named members: `email` stored at invite acceptance, shown on dashboard (fallback to UUID)
- Post-completion screen: stat grid → .ics calendar download → dashboard link → read-only checklist disclosure
- First-assessment CTA on workspace for org_admin with no active assessment
- Onboarding copy fix: removed broken "reassign later in Team Settings" promise
- E2E: TRACK-04/05/06 un-skipped, DASH-03/TRACK-AGG-01/NAMES-01 added (53 passing, 4 intentionally skipped)
- Docs: DECISIONS.md updated (platform steps storage, email in org_members), acceptance-criteria sections 17-21

## Iteration 5 — QA sweep findings (2026-03-10)

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

- **UX-03 — All pages share the same `<title>`**
  Every route returns "SMB Security Quick-Check" as the browser tab title. Per-page titles improve
  orientation and SEO (e.g. "Security Checklist | SMB Security Quick-Check").

---

## Iteration 6: Platform Content + Early Adopter Readiness (planned)

Theme: close the content gap and fix the experiences that would cause early adopters to churn in week 1.

### Content (all DB-ready content written by Security Expert in product team iteration 2)
- Platform-specific step content for `acct-enable-mfa-email`, `email-phishing-filters`, `email-disable-macros`, `backup-3-2-1`
  - Google Workspace: admin.google.com paths
  - Microsoft 365: security.microsoft.com / M365 admin center paths
- 4 new IT Baseline items (content ready in product team iteration 2 output):
  - `endpoint-defender-active` — Windows Defender / AV (high impact, low effort)
  - `email-auth-spf-dkim-dmarc` — SPF, DKIM, DMARC (high impact, medium effort; blocks BEC/invoice fraud)
  - `network-rdp-exposure` — RDP not exposed to internet (high impact, low effort)
  - `gws-oauth-app-audit` — Audit third-party app access in Google Admin Console (closes the dangerous OAuth token gap: 100%-complete SMBs still have 30-80 unreviewed OAuth grants; one of the most likely persistent-access attack paths)

### Settings & admin
- Org Settings page: `email_platform` + IT executor reassignment (resolves AC-ONBOARD-4)
- `GET /api/orgs/me` returns `org.email_platform` and `org.primary_os`

### UX fixes identified in product team iteration 3
- IT executor contextual message on first checklist load: "Your admin has assigned you the IT Baseline track — these are the technical controls for [Org Name]"
- Admin confirmation view: dashboard shows whether IT executor has started work (not just a completion %)
- Landing page: fix "Start the checklist" CTA to not mislead users into a read-only dead-end; clarify the team workspace value proposition before signup
- Magic link UX: add cross-browser/mobile warning ("open this link in the same browser where you signed up")
- Invite email: configure `RESEND_FROM_EMAIL` to the product domain (not `onboarding@resend.dev`) and add context copy so employees don't mistake it for phishing

### Bug fixes from QA sweep
- BUG-01: Remove stale localStorage copy
- BUG-02: Custom 404 page
- BUG-03: Loading flash before auth redirect
- UX-01: Mobile hero CTA layout
- UX-02: Summary page dead end
- UX-03: Per-page `<title>` tags

### Instrumentation (BA iteration 3)
- Add `assessment_responses.updated_at` (trivial migration — high diagnostic value)
- Record `orgs.email_platform` at onboarding for analytics segmentation

### Pre-launch quality gate (PM iteration 3)
- **Manual IT Baseline walkthrough:** dev completes the full IT Baseline as a non-technical owner using only what the product shows. Every item requiring a Google search to follow is flagged for content improvement before first users see it.

### Success metrics to track from day 1 (BA iteration 3)
- Checklist Completion Rate: ≥60% within 30 days = healthy; <20% at day 14 = red flag
- Multi-member Engagement Rate: ≥50% of orgs have >1 responding user within 14 days
- Time-to-First-Response: ≤24h for ≥70% of orgs
- "Worked" test: 8 orgs × 30 days → 5/8 at ≥60% completion, 4/8 multi-user, 6/8 respond within 24h

---

## Done — PI 2 Iteration 1: Foundation & Polish (2026-03-17)

Theme: infrastructure hardening, navigation UX, and new-user onboarding flow.

### Delivered
- **CI/CD pipeline** — GitHub Actions workflow: lint + build + E2E + Playwright report artifact (pre-existing, verified)
- **Security headers** — CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy in next.config.ts
- **Rate limiting** — In-memory sliding-window rate limiter (60 req/min/user) applied to dashboard and invite accept routes
- **DB performance index** — `assessment_responses(assessment_id, user_id)` index (migration 011)
- **Force light mode** — Removed dark mode CSS variables override that conflicted with hardcoded light Tailwind classes
- **Workspace navigation shell** — Persistent header with org name, role-aware nav links, and logout. All workspace pages share layout via `workspace/layout.tsx` + `useWorkspace` context provider
- **Guided first-run** — "Get started in 3 steps" guide on workspace home for org_admin with no active assessment (invite → assess → review)
- **Display name capture** — Name prompt at invite acceptance, stored in `org_members.display_name`, shown on dashboard (migration 011 required)
- **Analytics SQL views** — `v_org_completion`, `v_cadence`, `v_onboarding_funnel` views (migration 011)
- Docs: DECISIONS.md, acceptance-criteria sections 22-29, backlog updated

### Migration required
Apply `docs/sql/011_pi2_iteration1.sql` in Supabase SQL editor. Adds `display_name` column, performance index, and analytics views.

---

## Done — PI 2 Iteration 3: Retention (2026-03-17)

Theme: bring users back for quarterly reviews and build trust with new visitors.

### Delivered
- **Reassessment reminder email** — POST /api/reminders endpoint sends reminder via Resend to org_admins at day 76-95. Protected by CRON_SECRET bearer token. Deep links to /workspace/assessments.
- **"Next review due" date on dashboard** — Cadence indicator shows due date (last_completed + 90 days)
- **Cadence banner on workspace home** — Amber/red warning banner when review is due/overdue, links to reassessment
- **Progress context on workspace cards** — Mini progress bar on "My checklist" card
- **"Resume where you left off"** — Link on checklist page scrolls to first unanswered item
- **Trust signals on landing page** — "Why trust this tool" section: EU data, no tracking, free, open checklist, delete anytime, magic link login
- Docs: acceptance-criteria sections 36-41, backlog updated

---

## Iteration 7: Retention & Paid Tier Foundation (planned)

Theme: convert one-time users into quarterly returning users; establish the minimum for a paid tier.

- **Monthly pulse check-in** — 3-question prompt at login: "New staff joined or left? New SaaS apps added? Any security incidents?" Yes triggers relevant checklist items. Two .ics downloads: quarterly (full review) + monthly (pulse). No backend required — client-side prompt + localStorage state.
- **Reassessment reminder email** — Resend trigger at 80 days post-completion: "Your quarterly security review is due in 10 days." One-click deep link to start reassessment.
- **Scenario-based completion gates for Awareness track** — 2–3 scenario questions before "Done" unlocks on awareness items. Dramatically improves effectiveness over self-reported completion. Requires `verificationQuestions[]` field on items + `ScenarioGate` UI component. No backend change.
- **Shareable summary output** — Print-CSS-formatted summary page (not PDF generation — just `@media print` styles on the dashboard). Useful for insurance renewal conversations.
- **Display name capture** — Prompt for name at invite acceptance; store in `org_members.display_name`. Replaces email in dashboard member list with a real name.
- **Paid tier gate** — Free = personal checklist (single user). Paid = team dashboard + reminders + shareable summary (£10/month per org). Gate the dashboard and team pages behind a subscription flag.

---

## Deferred — v1.1 candidates

- Phishing simulations (separate product surface, email infra, GDPR complexity)
- Evidence uploads (file storage cost, GDPR surface area, low SMB value)
- Branch delete UI (backend done; UI medium effort, low urgency for 1-20 person orgs)
- Audit logs / event history (no security value at SMB scale)
- `assessment_responses` RLS tightening (move dashboard aggregation to SECURITY DEFINER function; restrict SELECT policy to `user_id = auth.uid()`)
- Mobile responsiveness audit (Tailwind v4 should be responsive; needs a dedicated test pass)
- Account recovery UI (magic link works but there is no visible "help, I can't get in" path)
- E2E: self-deletion blocker test (user with direct reports — API enforces, no UI test yet)
- E2E: data residency notice visible to non-admin users (no test yet)
- SEO / Open Graph: og:title, og:description, og:image — low priority, awaiting later version when SEO strategy is defined
