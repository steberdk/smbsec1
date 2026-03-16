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
Estimated: 3.5 days for one developer.

### Sprint Committed (Days 1–4)

**Day 1 — Architecture & DB first:**
- Document platform-specific step storage decision in `docs/DECISIONS.md` (Option A: `checklist_items.steps` becomes keyed jsonb object `{ default, google_workspace, microsoft_365, ... }`)
- Run migration 007: add `why_it_matters` (text) and `steps` (jsonb `[]`) columns to `assessment_items`
- Run migration 007b: transform existing `checklist_items.steps` flat arrays to `{ "default": [...] }` keyed object
- Update `AssessmentItemRow` TypeScript type to include `steps: string[]` and `why_it_matters: string | null`
- Update snapshot INSERT in `POST /api/assessments` to copy `steps` (resolved for org platform) and `why_it_matters` into `assessment_items`
- Update `GET /api/assessments/:id` select to return `steps` and `why_it_matters`
  - AC: AC-STEPS-01

**Day 1 PM / Day 2 — Steps & platform rendering:**
- Update workspace checklist UI to render expanded item with `why_it_matters` block + numbered steps list — resolves AC-STEPS-02/03/04
- Add `resolveSteps(stepsMap, emailPlatform)` helper: picks platform-specific steps variant from keyed object, falls back to `default`
- Platform label shown in steps container (e.g. "Google Workspace") when platform is set
- Unset platform: show static prompt "Set your email platform in Settings to see the right instructions" (not a dead link — Org Settings page deferred)
- Un-skip E2E-TRACK-04 and E2E-TRACK-05; write E2E-STEPS-01
  - AC: AC-STEPS-02, AC-PLAT-02, AC-PLAT-03, AC-PLAT-06
- Patch onboarding copy: remove "you can reassign IT tasks later in Team Settings" (broken promise — settings page deferred to iteration 6)

**Day 2 PM — Per-track dashboard aggregation + denominator bug fix:**
- Update `GET /api/dashboard` to add `stats.by_track: { it_baseline: TrackStats, awareness: TrackStats }`
- Fix denominator bug: non-IT-executor members' `percent` calculated against awareness items only, not all items
- Update dashboard UI to show IT Baseline and Awareness as separate labelled progress indicators
- Write E2E-TRACK-AGG-01 (non-IT-executor shows 100% when all awareness answered)
  - AC: AC-TRACK-AGG-01, AC-TRACK-AGG-02, AC-TRACK-AGG-03; resolves AC-AWARE-3

**Day 3 — Named members + retention:**
- Store `email` in `org_members` at invite acceptance (one extra write in `POST /api/invites/accept` — `invites.email` already has it). Do NOT use `supabase.auth.admin.listUsers()` — it fetches all project users on every dashboard load and will rate-limit at scale.
- Add `email` column to `org_members` via migration (nullable, populated going forward; existing rows remain null with UUID fallback)
- Update `GET /api/dashboard` to include `email` per member from `org_members.email` (simple JOIN, no Admin API call)
- Update dashboard UI to show email address instead of truncated UUID; graceful fallback to truncated UUID when `email` is null
- Write E2E-NAMES-01
  - AC: AC-NAMES-01, AC-NAMES-02, AC-NAMES-03, AC-NAMES-04
- Post-completion screen: replace completion banner with full-page layout — stat grid (done/unsure/skipped) → .ics download button → "View dashboard →" link → "Show checklist ▾" read-only disclosure
- .ics generated client-side (no server); VEVENT SUMMARY "smbsec: Security Review Due", DTSTART today+90 days; filename `smbsec-review.ics`
- Write E2E-DASH-03 (click .ics button triggers file download)
  - AC: AC-ITER5-05 to AC-ITER5-08; resolves AC-DASH-3

**Day 4 — First-assessment CTA + docs + QA:**
- On workspace load: if org_admin + no active assessment → show prominent "Start your first security review" CTA inline on the workspace home (NOT auto-started during onboarding — that has 4 failure modes with no recovery path if assessment creation fails after org creation succeeds)
- The CTA routes to `/workspace/assessments` with a pre-filled start flow or triggers creation inline
- Update `docs/DECISIONS.md` with steps storage and platform injection decisions
- Update `docs/40_acceptance-criteria.md`: add AC-STEPS-*, AC-NAMES-*, AC-TRACK-AGG-* sections; mark AC-AWARE-3 as resolved by AC-TRACK-AGG-*
- `npm run lint` (0 warnings), `npm run build` (TypeScript clean), `npm run test:e2e` (all new tests green, skipped tests un-skipped)

### Definition of Done — Iteration 5

- [ ] `GET /api/assessments/:id` returns `steps` (array) and `why_it_matters` per item
- [ ] Expanded checklist item shows numbered steps list and "Why it matters" text
- [ ] Platform-specific steps resolve for Google Workspace (`admin.google.com`) and M365 (`security.microsoft.com`)
- [ ] Dashboard shows email address per member, not truncated UUID
- [ ] Dashboard shows IT Baseline and Awareness as separate labelled percentages
- [ ] Non-IT-executor member shows 100% when all Awareness items answered (not ~42%)
- [ ] Post-completion screen shows stat breakdown + .ics download button
- [ ] First assessment auto-started at end of onboarding
- [ ] E2E: E2E-STEPS-01, E2E-PLAT-01 (TRACK-04 un-skipped), E2E-TRACK-05 un-skipped, E2E-TRACK-06 un-skipped, E2E-NAMES-01, E2E-TRACK-AGG-01, E2E-DASH-03 all passing
- [ ] `npm run lint` zero warnings, `npm run build` clean, `npm run test:e2e` green
- [ ] `docs/DECISIONS.md` updated with steps storage + platform injection decisions

### Critical implementation notes (from Architect iteration 3 review)
- **Migration deployment order:** run migration 007 first, deploy new app code second — never simultaneously. `steps` column must be `NOT NULL DEFAULT '[]'`
- **Migration 007b is destructive** — backup `checklist_items.steps` values before running. `resolveSteps()` helper must be deployed before 007b executes or production reads will fail silently (renders `"default"` as the only step text)
- **`listUsers()` banned from production dashboard** — store `email` in `org_members` at invite acceptance instead
- **Test fixtures need updating** — `startAssessment` in fixtures.ts must pass `steps` through to `assessment_items` or new E2E tests will see empty steps
- **E2E stability:** use `next build && next start` in CI; add `test.setTimeout(60_000)` to isolated-org tests; move cleanup to `afterEach` hooks

### Known bugs fixed in iteration 5
- Dashboard `percent` wrong denominator for non-IT-executors → fixed via per-track aggregation
- Onboarding "reassign IT tasks later in Team Settings" copy → removed (settings page deferred)
- `assessment_responses` RLS SELECT exposes peer responses → document in `docs/31_permissions-model.md` as known gap; fix post-v1

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
