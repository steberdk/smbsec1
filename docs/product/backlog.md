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

## Done — PI 7 (2026-03-19)

### Iteration 1: Campaign Foundation
- Migration 013: campaigns, campaign_recipients, campaign_templates tables + RLS
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

---

## Done — PI 8 (2026-03-19)

**Theme:** Campaign polish, payment gate, scheduling, template customisation, audit log

**Product Team consensus:** `docs/pi8/product_team_consensus.md`

### Iteration 1: Templates & Audit
- Migration 014: audit_logs table + 2 new campaign templates (credential harvest, CEO fraud)
- Org deletion audit log (email + timestamp logged before CASCADE delete)
- Fix PI 7 Issue #1: credit messaging when no campaigns exist
- Fix PI 7 Issue #2: client-side credit check + paid org bypass
- Email template preview step in create campaign wizard (4-step flow)
- SENDER_NAME placeholder support for CEO fraud template personalisation

### Iteration 2: Payment Gate & Customisation
- Migration 015: subscription_status, stripe_customer_id, stripe_subscription_id on orgs + campaigns.customisation
- Billing page (/workspace/billing) with pricing, plan comparison, waitlist form
- Stripe Checkout API (POST /api/billing/checkout) — 501 fallback when no key
- Stripe webhook (POST /api/billing/webhook) — checkout.session.completed, subscription events
- "Billing" nav link for org_admin
- Paid orgs bypass campaign credit check (unlimited campaigns)
- Editable subject line in campaign creation wizard
- Campaign send uses custom subject if provided

### Iteration 3: Scheduling, Repeat & Polish
- Migration 016: campaigns.scheduled_for column + 'scheduled' status
- Campaign scheduling: date picker in create wizard, scheduled status, cron pickup
- Repeat campaign: "Re-run" button on completed campaigns (POST /api/campaigns/[id]/rerun)
- Campaign results timeline on detail page (chronological event list)
- Dashboard campaign trend chart (pass rate over time, colour-coded bars)
- Updated docs (DECISIONS.md, backlog.md)

---

## Done — PI 9 (2026-03-19)

**Theme:** Email knowledge testing, campaign analytics, multi-language, custom builder

**Product Team consensus:** `docs/pi9/product_team_consensus.md`

### Iteration 1: Knowledge Test Templates & Enhanced Landing Pages
- Migration 017: extend `campaign_templates.type` CHECK to include `knowledge_test`
- 3 new knowledge test templates: password sharing, MFA reset, macro document
- Template-aware educational landing page (`/campaign/[token]`) with topic-specific content
- Knowledge tests map to specific checklist items (acct-password-manager, acct-enable-mfa-email, email-disable-macros)
- Report page adapted for knowledge test context

### Iteration 2: Campaign Analytics & Multi-Language
- Migration 018: `locale` column on `campaign_templates` and `orgs`
- 7 Danish template translations (4 phishing + 3 knowledge tests)
- Per-user campaign history API (`GET /api/campaigns/user-history`) with performance scores
- Team performance table on campaigns page (reported/clicked/ignored per user)
- Response time metrics on campaign detail page (avg/min/max time-to-click and time-to-report)
- Org language setting on settings page
- Template filter by locale in create campaign wizard

### Iteration 3: Custom Campaign Builder
- Migration 019: `org_id` and `custom` columns on `campaign_templates` + RLS
- Custom template CRUD API (`POST/GET /api/campaigns/templates/custom`, `DELETE /api/campaigns/templates/custom/[id]`)
- Custom template creation UI (`/workspace/campaigns/templates/new`) with HTML editor, placeholder docs, live preview
- Template management page (`/workspace/campaigns/templates`) with delete support
- Templates API updated to return system + org-custom templates
- Soft-delete for custom templates in use by existing campaigns

---

## Done — PI 10 (2026-03-19)

**Theme:** Platform Expansion (final PI in current roadmap)

**Product Team consensus:** `docs/pi10/product_team_consensus.md`

### Iteration 1: Security Posture Report
- Security report page (`/workspace/report`) — org_admin only
- Assessment overview with per-track completion stats (IT Baseline + Awareness)
- Per-member team progress table in report
- Campaign results summary (pass rate, click rate, emails sent)
- Recommendations section based on unsure/skipped items and campaign performance
- Print-optimised CSS with `window.print()` ("Download as PDF" button)
- Report header with org name, date, confidential marking
- Disclaimer footer (point-in-time self-assessment snapshot)
- "Security Report" nav item for org_admin

### Iteration 2: i18n Foundation + Danish Workspace
- `lib/i18n/` module with `translate(key, locale)` function and `useTranslation()` hook
- English (`en.json`) and Danish (`da.json`) translation files
- Workspace navigation labels translated (Home, Checklist, Dashboard, Team, etc.)
- Security report fully translated to Danish (all sections, labels, headings)
- Dashboard key labels translated
- Locale-aware rendering based on `orgs.locale` setting (already stored in DB)

### Iteration 3: Privacy Policy + Polish
- Comprehensive privacy policy page with 11 sections
- GDPR compliance: legal basis, data retention, sub-processors table, security measures
- Rights section: access, rectification, erasure, portability, objection
- Campaign tracking disclosure in privacy policy
- Sub-processor table (Supabase, Vercel, Resend) with data locations

---

## Done — PI 11 (2026-04-05)

**Theme:** Auth UX overhaul, landing page fixes, copy/naming polish

**Based on:** Stefan's PROD testing report (20260405a_Stefan_test.pdf, 11 findings)

### Iteration 1: PKCE Auth + OTP Fallback + UX Fixes
- Migrate auth from implicit flow to PKCE (`flowType: "pkce"`) — tokens no longer in URLs
- Add OTP code entry on login page (8-digit code, cross-browser/device fallback)
- Open redirect protection (`sanitizeNext()` on auth callback + login)
- Auth-aware landing page: logged-in users see "Go to workspace" (client island pattern)
- Rename settings heading "Org Settings" → "Settings & Data" (match privacy page)
- Add HH:MM timestamp to security report dates
- Add paid-features footnote below landing page trust signals
- Add "Example" badge to summary page teaser mockup
- Add "AI security guidance: Basic / Advanced" row to billing comparison
- E2E test helper rewritten for PKCE (server-side action_link + session injection)
- Fix flaky E2E-AWARE-01 test (wait for UI counter update)
- CLAUDE.md rewritten (lean, accurate, documentation map)
- Supabase SMTP configured via Resend (branded sender)

---

## Not yet prioritized

Features below are defined in `features.md` with full detail. Listed here by feature number for roadmap visibility.

### Platform Expansion
- F-001: Full UI internationalisation (i18n)
- F-002: More language templates (German, French, Dutch)
- F-003: AI-generated campaign content
- F-004: Inbound email report detection
- F-005: SMS phishing (smishing) campaigns
- F-006: API access for MSPs
- F-007: Campaign template marketplace

### Product Polish
- F-015: Fix flaky E2E tests — race conditions in response waits (caused 2 CI failures in PI 11)
- F-014: Fix inconsistencies from PI 11 BA review (summary page, campaign access, billing waitlist, settings naming)
- F-008: Evidence uploads for checklist items
- F-009: Mobile responsiveness audit
- F-010: Account recovery UX
- F-011: Anonymous benchmarking
- F-012: Tighten AI guidance guardrails
- F-013: SEO and Open Graph metadata
