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

## Deferred — v1.1 candidates

- E2E: self-deletion blocker test (user with direct reports — API enforces, no UI test yet)
- E2E: data residency notice visible to non-admin users (no test yet)
- Platform-specific checklist step content (Google Workspace / M365)
- Branch delete UI (manager + all direct reports in one action)
- Reset checklist item to unanswered state
- Phishing simulations
- Evidence uploads
- Reassessment reminders / calendar integration
