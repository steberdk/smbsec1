# Product Backlog

## Done — PI 1 (Iterations 1-4, 2026-03-06 to 2026-03-07)

### Iteration 1: MVP
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

### Iteration 2: Team & Content
- Invite email delivery via Resend (non-fatal fallback to copy-link)
- Copy invite link button on team page (manual fallback)
- Friendlier first-login message when no active assessment
- Checklist seed data ready (SQL migration 006)

### Iteration 3: Outcomes & Visibility
- Per-role track filtering: non-IT-executors see Awareness track only
- Completion banner on checklist when all items answered
- Overdue reassessment indicator on dashboard (green/amber/red/never cadence)
- Fix: removed misleading "start one now" link for employees

### Iteration 4: GDPR Self-Service
- Data residency disclosure (West EU / Ireland / AWS eu-west-1)
- Self-deletion for any user (blocked if admin with members or manager with reports)
- Settings & data page accessible to all users
- E2E: TRACK-01, TRACK-02, ITEM-05, DEL-06

---

## Done — PI 2 (Iterations 5-6b, 2026-03-10 to 2026-03-17)

### Iteration 5: Activation & Retention
- Migration 007: steps (jsonb) + why_it_matters on assessment_items; email on org_members
- Assessment snapshot copies steps + why_it_matters
- Platform-specific step resolution (resolveSteps helper)
- Checklist UI: expanded items show "Why it matters" + numbered steps
- Per-track dashboard (IT Baseline + Awareness progress bars)
- Named members: email stored at invite acceptance, shown on dashboard
- Post-completion screen: stats, .ics download, dashboard link
- First-assessment CTA on workspace
- 53 E2E tests passing

### Iteration 6: Platform Content + QA Fixes
- Platform-specific step content for Google Workspace + Microsoft 365
- 4 new IT Baseline items: endpoint protection, SPF/DKIM/DMARC, RDP exposure, OAuth audit
- Org Settings page: email_platform + IT executor reassignment
- IT executor contextual message on first checklist load
- Landing page CTA improvements
- Magic link UX cross-browser warning
- BUG-01: removed stale localStorage copy
- BUG-02: custom 404 page
- BUG-03: loading flash before auth redirect
- UX-01: mobile hero CTA layout
- UX-02: summary page dead end
- UX-03: per-page title tags

### Iteration 6b: Org Settings, UX Polish
- Org settings page with email platform + IT executor
- Landing page CTA and value proposition improvements
- Login UX polish

---

## Done — PI 3-6 (2026-03-17 to 2026-03-18)

### PI 2 Iteration 1 (Foundation & Polish)
- CI/CD pipeline (GitHub Actions: lint + build + E2E)
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Rate limiting (in-memory sliding window, 60 req/min/user)
- DB performance index (assessment_responses)
- Force light mode
- Workspace navigation shell (persistent header, role-aware nav)
- Guided first-run ("Get started in 3 steps")
- Display name capture at invite acceptance
- Analytics SQL views (v_org_completion, v_cadence, v_onboarding_funnel)

### PI 2 Iteration 2 (Content & Output)
- New content items and platform-specific steps
- Print summary functionality
- Tooltips and contextual help
- Risk priority indicators

### PI 2 Iteration 3 (Retention)
- Reassessment reminder email (POST /api/reminders via Resend, CRON_SECRET protected)
- "Next review due" date on dashboard
- Cadence banner on workspace home (amber/red when due/overdue)
- Progress context on workspace cards (mini progress bar)
- "Resume where you left off" on checklist page
- Trust signals on landing page (EU data, no tracking, free, open checklist, delete anytime, magic link)

---

## PI 7 — Email/Phone Fraud Campaigns (planned)

**Theme:** Simulated phishing and fraud campaigns to verify employee security awareness. Move from self-reported "I've done this" to email-verified pass/fail results.

**Product Team consensus:** `docs/pi7/product_team_consensus.md`

### Iteration 1: Campaign Foundation
- Migration: campaigns, campaign_recipients, campaign_templates tables + RLS
- Seed 2 campaign templates (phishing email + fake invoice)
- API: campaign CRUD (POST, GET list, GET detail)
- UI: "Campaigns" nav item (org_admin only)
- UI: campaign list page (/workspace/campaigns)
- UI: create campaign page (/workspace/campaigns/new) — template + recipients + timing
- Permission enforcement (org_admin only, RLS + API)
- Campaign credits field on orgs table (default 1 = first campaign free)

### Iteration 2: Email Sending & Tracking
- API: send campaign (POST /api/campaigns/[id]/send) — Resend with unique tokens, random jitter
- HTML email templates (responsive, realistic-looking)
- Public click landing page (/campaign/[token]) — records click, shows educational content
- Public report landing page (/campaign/[token]/report) — records report, shows success
- Campaign status transitions (draft -> sending -> active -> completed)
- Campaign auto-complete (Vercel cron, 72 hours after last send, mark unacted = ignored)
- UI: campaign detail page with per-recipient results + aggregate stats
- Anti-abuse: max 1 active campaign, 3 per month per org

### Iteration 3: Dashboard Integration & Free Campaign Gate
- Verification badge on awareness checklist items (verified/failed by campaign)
- Dashboard campaign summary card (pass rate)
- Campaign results in team progress section
- Free campaign gate (after 1st campaign, show upgrade prompt)
- Employee campaign opt-out (stored in org_members)
- Privacy disclosure for campaign tracking in org settings
- assessment_responses.verification_status column
- Updated docs (domain model, decisions, acceptance criteria)

---

## PI 8 — Campaign Polish & Payment (future)

- 2 more campaign templates: fake login page (credential harvest), CEO/authority fraud
- Stripe payment integration (Checkout session, webhook, org subscription status)
- Campaign scheduling (future date range)
- Repeat campaigns ("re-run this campaign" with fresh tokens)
- Template customisation (admin edits subject/body before sending)
- Dashboard deep integration (campaign trend chart, cross-assessment comparison)
- Email template preview for admin

---

## PI 9 — Advanced Campaigns (future)

- Inbound email report detection (Resend/Mailgun inbound webhook for forwarded emails)
- Phone/vishing campaigns — AI voice call simulations (research: Twilio, GDPR, feasibility)
- Campaign analytics over time (trend charts, improvement tracking)
- Multi-language templates (Danish, German, French, Dutch)
- Custom campaign builder (admin creates own scenario)
- Email client report button integration (Google Workspace / Microsoft 365 API)

---

## PI 10+ — Platform Expansion (vision)

- AI-generated campaign content (LLM-based contextual phishing emails)
- SMS phishing (smishing) campaigns
- Compliance reporting (cyber insurance, ISO 27001, SOC 2 evidence)
- API access for MSPs (managed service providers)
- Anonymous benchmarking ("Your team vs similar-size companies")

---

## Deferred — Carried Forward

- Evidence uploads (file storage cost, GDPR surface area, low SMB value)
- Branch delete UI (backend done; UI medium effort, low urgency for 1-20 person orgs)
- Audit logs / event history (no security value at SMB scale)
- assessment_responses RLS tightening (SECURITY DEFINER function approach)
- Mobile responsiveness audit (needs dedicated test pass)
- Account recovery UI (magic link works but no visible "help" path)
- E2E: self-deletion blocker test (user with direct reports)
- E2E: data residency notice visible to non-admin users
- SEO / Open Graph (og:title, og:description, og:image)
