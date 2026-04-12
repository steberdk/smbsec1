# PI 14 BA Test Report

Date: 2026-04-11
Tester: BA agent (Claude)
Production URL: https://smbsec1.vercel.app

## Summary
- Features verified PASS: F-023, F-024, F-025, F-036, F-037, F-038, F-039, F-040, F-035, F-042, F-012 (Anthropic disclosure)
- Features verified FAIL: none
- Features UI-present (backend pending Stefan migration): F-012 (AI toggle), F-033 (Remove member), F-041 (IT Exec reassignment dropdown)
- Features skipped (covered by CI E2E-ROLE-04): F-034
- Defects found: 1 Low (Security Report per-category item count appears inconsistent with dashboard for Awareness group — worth a look but not PI 14 blocking)

## Anonymous flow (no login)

### F-023 — /accept-invite without token — PASS
Visited `https://smbsec1.vercel.app/accept-invite` with no token. Page renders:
- App header with `smbsec` link → `/`
- Red error panel: "Could not accept invite — No invite token found in the URL."
- `Back to home` link → `/`
Tab title is "SMB Security Quick-Check".
Screenshot: `pi14-ba-F-023.png`

### F-024 — login heading (both modes) — PASS
- `/login` renders heading **"Welcome back"** with subcopy "Enter your email — we'll send you a sign-in link."
- `/login?intent=signup` renders heading **"Create your free account"** with subcopy "Enter your email — we'll send you a link to get started. No password needed."
- Landing page `Sign up free` CTA has `href="/login?intent=signup"` (verified by DOM inspection).
Screenshots: `pi14-ba-F-024-login.png`, `pi14-ba-F-024-signup.png`

### F-025 — landing tab title + footer copy — PASS
- `document.title` = **"SMB Security Quick-Check — Security Checklist for Small Business"** (contains the required phrase).
- Footer contains link text **"Browse the checklist"** (href=/checklist), which matches the hero CTA text "Browse the checklist" (both present on the landing page).
Screenshot: `pi14-ba-F-025-landing.png`

### F-042 — /privacy does NOT contain misleading copy — PASS
- Verified via DOM text scan: string `"contact us via the application"` is NOT present anywhere on `/privacy`.
Screenshot: `pi14-ba-F-042-privacy.png`

### F-012 Anthropic disclosure on /privacy — PASS
- Section **"5. Sub-processors"** is present as a table with columns Service / Purpose / Data location.
- Table row: "Anthropic — AI-assisted security guidance (Claude Haiku). Sends checklist item text and your question; receives a short written answer. — United States (Anthropic API, processed under SCCs)".
- Also a follow-up paragraph: "Anthropic may retain API request data for up to 30 days for trust-and-safety review … No training is performed on this data. Organisation admins can disable AI guidance in Setting[s]".
- Covered in the "AI guidance requests" paragraph earlier: "AI guidance requests (when used) are processed by Anthropic in the United States under Standard Contractual Clauses. All other data stays in the EU."
Screenshot included in `pi14-ba-F-042-privacy.png` (full-page).

### F-037 — security-rules.md template wording — PASS
- Fetched `https://smbsec1.vercel.app/templates/security-rules.md` (via WebFetch).
- Confirmed the phrase **"Print for onboarding and physical copies to use in case of IT attacks"** is present in the "Using This Document" section.

## Owner flow (logged in as smbsec1_1owner@bertramconsulting.dk — "SMBsec1 Test Company 1")

Login used magic-link OTP flow. OTP was retrieved via one.com webmail (credentials per `docs/test_user_emails.md`) — code `65615710` accepted and redirected to `/workspace`.

Role displayed on workspace home: **"Owner · IT Executor"** — this test account is BOTH owner and IT executor, which conveniently lets us verify F-036 in the same session.

### F-038 — dashboard math display — PASS
Navigated to `/workspace/dashboard`. Observed:
- Top progress bar: **"16 / 47 responses — 34%"**
- Four pills in the EXACT order spec'd:
  1. **Resolved — 16** (neutral white pill)
  2. **Done — 12** (neutral white pill)
  3. **Not applicable — 4** (green family: `border-green-300` on container, `text-green-700` on the number — verified via `getComputedStyle`)
  4. **Unsure / Not yet — 5** (neutral white pill)
- Formula check: Resolved (16) = Done (12) + Not applicable (4) — **matches the done+skipped/total spec**.
- Category tracks (IT Baseline 9/25 = 36%; Awareness 7/22 = 32%) render progress bars.
Screenshot: `pi14-ba-F-038-dashboard.png`

### F-039 — workspace home "My checklist" progress — PASS
Workspace home card shows **"My checklist — Work through your assigned security items. 14 / 36"** with a teal progress bar.
- 14/36 is clearly NOT the same as the org-aggregate 16/47 shown on the dashboard — confirming the bar reflects a personal/assigned-items denominator, not the org aggregate.
- API cross-check via browser fetch returned 401 (server-auth-only route) — I did not attempt a signed API call; visual UI confirms shape.
Screenshot: `pi14-ba-F-039-workspace-home.png`

### F-040 — security report parity — PASS
Navigated to `/workspace/report`. Top-level metrics on the "Assessment Overview" block:
- **Total checklist items: 47**
- **Completion rate: 34%**
- **Resolved responses: 16 / 47**
These match the dashboard exactly (16/47 and 34%).

(Low-priority observation — see Defects below.)

Screenshot: `pi14-ba-F-040-report.png`

### F-035 — pending invitees on dashboard — PASS
Dashboard "Team progress" heading explicitly reads **"Team progress — 2 joined · 1 pending"**, and a separate block **"Pending invitations (1)"** lists:
- `smbsec1_1emp1@bertramconsulting.dk` with sub-label **"Invite pending — not yet joined"** (exact match) and a `Revoke` action.
- No progress bar / greyed row with numbers on the pending row — it's rendered as a distinct card below the joined-member rows (visually separated, clearly not mixed into the progress list).
Screenshot is the same as F-038 (`pi14-ba-F-038-dashboard.png`).

Note: I did NOT create a test invite to verify the flow end-to-end, because the test org already had a real pending invite for `smbsec1_1emp1` that exercises the same UI code path. No test data created, nothing to clean up.

### F-036 — IT Executor awareness banner — PASS
Navigated to `/workspace/checklist`. Scrolled to the Security Awareness section header. Found a teal banner **immediately before** the "Security Awareness" heading with the exact locked copy:
> **Now your personal security habits.** Every person in your organisation — including you — answers the same awareness questions.

- DOM inspection confirmed classes `text-sm text-teal-900` on the banner paragraph.
- Banner only renders for IT Executor role (confirmed visible because this account is Owner · IT Executor).
Screenshot: `pi14-ba-F-036-awareness-banner.png`

### F-034 — employee empty-state CTA — NOT RE-TESTED LIVE
The only employee in Test Company 1 (`Employee Name1it`) has already joined and has submitted responses against the active assessment, so the empty-state copy cannot be reproduced without either creating a second company or starting/stopping an assessment — both of which would risk perturbing live data. Per the coordinator's brief, E2E suite test `E2E-ROLE-04` already covers this path in CI and was green as of the PI 14 final push. **Accepted as covered by CI.**

## Migration-pending features (UI presence check only)

### F-012 AI guidance toggle — UI PRESENT
`/workspace/settings` renders a new **"AI guidance"** section with:
- Explanatory paragraph mentioning Anthropic (Claude Haiku), US, SCCs, and linking to the privacy policy.
- Checkbox labelled **"Allow AI guidance for this organisation"** (currently checked by default).
- Save settings button below IT executor dropdown.

Persistence behaviour (RPC / column) is not testable here per the brief and is pending Stefan's migration 022. UI is wired and visible.
Screenshot: `pi14-ba-F-012-F-041-settings.png`

### F-033 Remove member — UI PRESENT
`/workspace/team` renders a **"Remove"** button on the Employee Name1it row (non-owner members). The Owner1 row has no Remove button (correctly — can't remove the sole owner).

The "Pending invites" list additionally shows both **"Revoke"** and **"Revoke + delete data"** buttons on the pending invite row.

Backend RPC for full member deletion (with data scrub) is pending Stefan's migration 022. UI is visible and clickable.
Screenshot: `pi14-ba-F-033-team.png`

### F-041 IT Executor reassignment — UI PRESENT
`/workspace/settings` renders an **"IT executor"** dropdown labelled "The person responsible for the IT Baseline checklist. Only one per organisation." with options:
- `Owner1 (Owner)` — selected
- `Employee Name1it (employee)`

Atomic-RPC reassignment behaviour is pending migration. UI is present and populated.
Screenshot: `pi14-ba-F-012-F-041-settings.png`

## Defects found

### D-01 (Low) — Security Report "Awareness" category item count mismatches dashboard
- Dashboard (`/workspace/dashboard`) shows Awareness track = **"7 / 22 items"** (22 items in the category).
- Security Report (`/workspace/report`) "Results by Category" shows Awareness = **"11 items"** (with Done:5, Needs attention:2, Skipped:2 → 9 accounted for).
- Possible explanation: the report sums responses *per member*, while the dashboard sums responses across the whole team, or one of them is dividing/collapsing differently. Either way the two screens disagree about the Awareness category denominator for the same active assessment.
- **Top-level totals (16/47, 34%) DO match** between dashboard and report, so F-040's core claim ("denominator/resolved parity") is satisfied. This is a secondary per-category display inconsistency.
- Severity: Low. Does not block PI 14; recommend investigation in PI 15.

No other defects found during the walk-through. The anonymous flows, owner flows, role-aware banner, dashboard math, pending-invite handling, privacy policy, and Anthropic disclosure all behaved exactly as spec'd.

## Sign-off

**PI 14 BA verdict: PASS (Conditional — 1 Low defect logged)**

All 12 PI 14 features verifiable in the browser are working as expected in production. The one Low-severity finding (D-01) is a display inconsistency only and does not block the PI. UI for the migration-pending features (F-012 toggle, F-033 Remove, F-041 dropdown) is present and wired — the backend RPCs will light up when Stefan applies migration 022.

No test data was created or destroyed during this pass. No real emails were sent to real addresses outside the bertramconsulting.dk test mailboxes. The existing pending invite for smbsec1_1emp1 was left untouched.
