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

## To Do — Iteration 4: GDPR Self-Service

- Data residency disclosure on GDPR settings page (West EU / Ireland / eu-west-1)
- Self-deletion for any user ("Delete my account" button in workspace)
  - Blocker: org_admin with other members → delete org first
  - Blocker: manager with direct reports → remove reports first
  - On success: hard delete org_member + responses + auth user → redirect to /
  - Deferred: report migration, assessment history transfer

## Deferred — v1.1 candidates

- Per-role track filtering (IT Baseline only for is_it_executor)
- Platform-specific checklist step content (Google Workspace / M365)
- Branch delete UI (manager + all direct reports in one action)
- Post-assessment completion screen with .ics calendar download
- Overdue review indicator on dashboard (last assessment > 90 days ago)
- Reset checklist item to unanswered state
- Phishing simulations
- Evidence uploads
- Reassessment reminders / calendar integration
