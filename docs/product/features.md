# Features

Active and planned features. Done features are tracked in `backlog.md` only.
See `feature_rules.md` for how to maintain this file.

---

## F-001
**Status:** Created
**Feature name:** Full UI internationalisation (i18n)
**Business Value Hypothesis:** As a non-English-speaking SMB owner, I want to use SMBsec in my native language (all pages, not just workspace labels), so I can fully understand the security guidance without language barriers.
**Acceptance Criteria:** All public pages (landing, checklist, summary, privacy), all workspace pages, and all email templates are rendered in the user's selected locale. Currently only workspace labels and report are translated (PI 10).
**Scope:** Translate all remaining UI text. Add locale switcher on public pages.
**Not in Scope:** Content translation of checklist item descriptions (separate feature).
**Dependencies:** i18n foundation from PI 10 (`lib/i18n/`, `en.json`, `da.json`).
**Risk and amount of Test:** Chance: 1, Impact: 1. Regression test all pages in both locales.
**Complexity estimate:** Medium.

---

## F-002
**Status:** Created
**Feature name:** More language templates (German, French, Dutch)
**Business Value Hypothesis:** As a European SMB owner, I want campaign templates in my local language, so phishing awareness tests feel realistic to my employees.
**Acceptance Criteria:** At least 4 campaign templates per new language. Template locale filter works in create wizard.
**Scope:** Template content creation + seed SQL. No UI translation (covered by F-001).
**Not in Scope:** Full UI i18n.
**Dependencies:** F-001 (locale infrastructure).
**Risk and amount of Test:** Chance: 1, Impact: 1. Test template rendering per locale.
**Complexity estimate:** Small.

---

## F-003
**Status:** Created
**Feature name:** AI-generated campaign content
**Business Value Hypothesis:** As an org admin, I want AI to generate realistic phishing simulation emails tailored to my organisation, so campaigns are more effective and varied without manual effort.
**Acceptance Criteria:** "Generate with AI" option in custom template builder. Uses org context (platform, industry) to create realistic content.
**Scope:** LLM-based template generation with guardrails.
**Not in Scope:** Auto-sending generated campaigns without review.
**Dependencies:** Anthropic API key (already configured), custom template builder (PI 9).
**Risk and amount of Test:** Chance: 2, Impact: 2. Test prompt injection guardrails, output filtering.
**Complexity estimate:** Medium.

---

## F-004
**Status:** Created
**Feature name:** Inbound email report detection
**Business Value Hypothesis:** As an employee, I want to report suspicious emails by forwarding them to a smbsec address, so the system automatically records that I reported the phishing simulation.
**Acceptance Criteria:** Dedicated inbound email address. Forwarded campaign emails are matched to campaign_recipients and marked as reported.
**Scope:** Resend/Mailgun inbound webhook. Email parsing + token matching.
**Not in Scope:** Real email threat detection.
**Dependencies:** Resend inbound webhook capability.
**Risk and amount of Test:** Chance: 2, Impact: 2. Test email parsing, token extraction, false positives.
**Complexity estimate:** Large.

---

## F-005
**Status:** Created
**Feature name:** SMS phishing (smishing) campaigns
**Business Value Hypothesis:** As an org admin, I want to test my team's resilience to SMS-based phishing, so we cover the growing smishing attack vector.
**Acceptance Criteria:** SMS campaign type. Send via Twilio. Click tracking via short URL.
**Scope:** Research feasibility, GDPR impact (phone number = PII), cost model.
**Not in Scope:** Voice/vishing.
**Dependencies:** Phone number collection (new PII, GDPR update needed).
**Risk and amount of Test:** Chance: 2, Impact: 3. GDPR assessment, cost analysis, Twilio integration.
**Complexity estimate:** Large.

---

## F-006
**Status:** Created
**Feature name:** API access for MSPs
**Business Value Hypothesis:** As a managed service provider, I want API access to manage multiple client orgs, so I can scale security assessments across my customer base.
**Acceptance Criteria:** API key auth for MSP accounts. Multi-org management. Aggregated reporting.
**Scope:** API design, auth scheme, rate limiting, documentation.
**Not in Scope:** MSP billing model.
**Risk and amount of Test:** Chance: 2, Impact: 3. API security, rate limiting, multi-tenancy.
**Complexity estimate:** Large.

---

## F-007
**Status:** Created
**Feature name:** Campaign template marketplace
**Business Value Hypothesis:** As an org admin, I want to browse and use community-contributed campaign templates, so I have more variety without creating templates from scratch.
**Acceptance Criteria:** Public template gallery. Submit/approve workflow. Import to org.
**Scope:** Template sharing infrastructure, moderation.
**Not in Scope:** Revenue sharing.
**Risk and amount of Test:** Chance: 2, Impact: 2. Content moderation, XSS in templates.
**Complexity estimate:** Large.

---

## F-008
**Status:** Created
**Feature name:** Evidence uploads for checklist items
**Business Value Hypothesis:** As an IT executor, I want to upload screenshots or documents as evidence that a checklist item is done, so the security report includes proof.
**Acceptance Criteria:** File upload per assessment item. Stored securely. Shown in report.
**Scope:** Supabase Storage or S3. File type validation. GDPR deletion.
**Not in Scope:** Automated evidence verification.
**Dependencies:** File storage cost (currently free-tier only).
**Risk and amount of Test:** Chance: 1, Impact: 2. File upload security, storage cost.
**Complexity estimate:** Medium.

---

## F-009
**Status:** Developed (PI 15 Iter 2 — per-viewport audit passes 18/18 page×viewport combinations; `tests/mobile-audit.spec.ts` green; fix: workspace layout nav breakpoint raised from `md` → `lg` so tablet-portrait (768px) shows hamburger instead of overflowing 9-item desktop nav)
**Feature name:** Mobile responsiveness audit
**Business Value Hypothesis:** As an SMB owner using a phone, I want all pages to work well on mobile, so I can check security status on the go.
**Acceptance Criteria:** All pages pass mobile viewport testing. No horizontal scroll. Touch-friendly controls.
**Scope:** CSS/layout fixes across all pages. Mobile-specific test suite.
**Not in Scope:** Native mobile app.
**Risk and amount of Test:** Chance: 1, Impact: 1. Visual regression on 3+ viewport sizes.
**Complexity estimate:** Medium.

---

## F-010
**Status:** Created
**Feature name:** Account recovery UX
**Business Value Hypothesis:** As a user who can't find my sign-in email, I want a clear help path, so I don't abandon the product.
**Acceptance Criteria:** "Need help?" link on login page. FAQ or guided flow for common issues (spam folder, wrong email, expired link).
**Scope:** Help content + UI. No new auth method.
**Not in Scope:** Password-based auth.
**Risk and amount of Test:** Chance: 1, Impact: 1. Test all help links work.
**Complexity estimate:** Small.

---

## F-011
**Status:** Created
**Feature name:** Anonymous benchmarking
**Business Value Hypothesis:** As an SMB owner, I want to see how my security posture compares to similar companies, so I'm motivated to improve.
**Acceptance Criteria:** Anonymised aggregate stats shown on dashboard. Opt-in only. No PII shared.
**Scope:** Aggregation queries, anonymisation, opt-in consent.
**Not in Scope:** Industry-specific benchmarks (not enough data initially).
**Risk and amount of Test:** Chance: 2, Impact: 2. Privacy/anonymisation verification.
**Complexity estimate:** Medium.

---

## F-012
**Status:** Deployed (PI 14 Iter 1 + PI 15 Iter 1 — all code shipped. Pending Stefan applying docs/sql/023 + 026 to enable persistent rate limits + flag logging on PROD)
**Feature name:** Tighten AI guidance guardrails
**Business Value Hypothesis:** As a product owner, I want the AI help feature to strictly only help with the specific checklist item at hand, so users cannot abuse it for unrelated purposes.
**Acceptance Criteria:** Input length capped (500 chars). System prompt hardened against indirect reasoning chains. Rate limiting moved from in-memory to persistent storage (Supabase table). Lightweight output filter.
**Scope:** `/api/guidance` route hardening. Rate limit persistence.
**Not in Scope:** Model upgrade (separate from guardrails).
**Dependencies:** Current AI guidance implementation (PI 5).
**Risk and amount of Test:** Chance: 2, Impact: 1. Test prompt injection attempts, rate limit persistence across cold starts.
**Complexity estimate:** Small.

---

## F-013
**Status:** Created
**Feature name:** SEO and Open Graph metadata
**Business Value Hypothesis:** As a potential user finding SMBsec via search, I want the pages to have proper titles, descriptions, and social preview images, so the product looks professional and trustworthy.
**Acceptance Criteria:** og:title, og:description, og:image on all public pages. Sitemap.xml. Structured data.
**Scope:** Meta tags, social cards, sitemap.
**Not in Scope:** Paid advertising.
**Risk and amount of Test:** Chance: 1, Impact: 1. Validate with social card previewer.
**Complexity estimate:** Small.

---

## F-014
**Status:** Done
**Feature name:** Fix inconsistencies found during PI 11 BA review
**Business Value Hypothesis:** As a user, I want the app to behave consistently across pages — correct naming, working data flows, proper access checks — so I can trust it as a security tool.
**Acceptance Criteria:**
- `/summary` page reads from assessment responses (not legacy `user_checklists` table), or is removed/redirected for workspace users.
- Campaign detail page (`/workspace/campaigns/[id]`) enforces `isAdmin` server-side, not just via nav visibility.
- Billing waitlist email is persisted (API call or at minimum localStorage), not lost on page refresh.
- "Settings & Data" naming is consistent: both `/workspace/settings` heading and `/workspace/settings/gdpr` heading use the same casing and wording.
**Scope:** 4 targeted fixes across summary, campaigns, billing, and settings pages.
**Not in Scope:** Redesigning any of these pages.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 2. Regression test each fixed page. Campaign access check needs E2E test.
**Complexity estimate:** Small.

---

## F-015
**Status:** Done
**Feature name:** Fix flaky E2E tests (race conditions in response waits)
**Business Value Hypothesis:** As a development team, we need reliable CI so that test failures signal real bugs, not random timing issues — otherwise we lose trust in CI and stop catching regressions.
**Acceptance Criteria:**
- All `waitForResponse` calls in E2E tests are replaced with or supplemented by UI-state assertions (e.g. `expect(element).toBeVisible()` or `expect(counter).toHaveText()`), so tests wait for the DOM to update rather than racing against API responses.
- Specifically fix: `checklist.spec.ts:274` (clear response DELETE timeout), and audit all other `waitForResponse` patterns across the test suite for the same race condition.
- CI passes 10 consecutive runs without flaky failures.
**Scope:** E2E test files only (`frontend/tests/*.spec.ts`). No production code changes.
**Not in Scope:** Adding new E2E tests. Changing test infrastructure.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 3, Impact: 2. High chance of recurrence if not fixed — already caused 2 CI failures in PI 11 (AWARE-01, checklist clear-response). Each failure wastes 45 min CI time and triggers false-alarm emails.
**Complexity estimate:** Small-Medium.

---

## F-016
**Status:** Created
**Feature name:** As Product and IT Dev teams, we want to take in user suggestions and complaints, to improve our product.
**Business Value Hypothesis:** As Product and IT Dev teams, we want to take in user suggestions and complaints, i.e. take in their experience and perception, to make solution better and more usable, to better achieve product vision.
**Acceptance Criteria:** To be defined.
**Scope:** To be defined.
**Not in Scope:** To be defined.
**Dependencies:** To be defined.
**Risk and amount of Test:** To be defined.
**Complexity estimate:** To be defined.

---

## F-017
**Status:** Created
**Feature name:** Figure out if users (possibly paid users) should be able to paste in screen shots to better explain to AI agent when going through checklist items.
**Business Value Hypothesis:** Figure out if users (possibly paid users) should be able to paste in screen shots to better explain to AI agent when going through checklist items.
**Acceptance Criteria:** To be defined.
**Scope:** To be defined.
**Not in Scope:** To be defined.
**Dependencies:** To be defined.
**Risk and amount of Test:** To be defined.
**Complexity estimate:** To be defined.

---

## F-018
**Status:** Done
**Feature name:** Enforce role-based page access for employees on workspace pages
**Business Value Hypothesis:** As a security product, we must enforce that employees cannot access admin/manager pages even via direct URL navigation, so the access model is trustworthy and consistent with what the nav shows.
**Acceptance Criteria:**
- `/workspace/team`: employees see "access restricted" message, not the invite form
- `/workspace/campaigns`: employees see "access restricted" message, not "No campaigns yet"
- `/workspace/assessments`: employees see "access restricted" message, not assessment details
- All three pages return proper restricted view for employee role, consistent with how `/workspace/report`, `/workspace/billing`, and `/workspace/settings` already handle it
**Scope:** UI-level role checks on 3 workspace pages. API already blocks actions — this is about the UI matching.
**Not in Scope:** API changes (already correctly restricted).
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 2. E2E test: employee navigates to each restricted page, verify access-denied shown.
**Complexity estimate:** Small.

---

## F-019
**Status:** Done
**Feature name:** Fix privacy page title duplication and login form email retention
**Business Value Hypothesis:** As a user, I expect consistent page titles and a clean login form, so the product feels polished and trustworthy.
**Acceptance Criteria:**
- Privacy page title reads "Privacy Policy | SMB Security Quick-Check" (no duplicate suffix)
- Login form email field is cleared when user clicks "Use a different email" and when navigating to /login fresh
**Scope:** 2 small fixes: privacy page metadata, login form state reset.
**Not in Scope:** N/A.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1. Verify title in browser tab. Test login flow with multiple accounts.
**Complexity estimate:** Small.

---

## F-020
**Status:** Done
**Feature name:** Reduce login friction for invited employees and show context-aware onboarding hints
**Business Value Hypothesis:** As an invited employee clicking the invite link for the first time, I should not have to re-type the email address that was already used to invite me — this is unnecessary friction that risks abandonment. Additionally, the "New here?" information box on the login page currently shows owner-oriented text ("Set up your organisation, Invite your team") to all users including invited employees, which is confusing. The box should remain visible for all users but display context-appropriate guidance depending on whether the user is a new owner or an invited employee.
**Importance:** High — this is every invited employee's first impression of the product. Friction or confusing messaging at this stage risks losing the user before they even join.
**Urgency:** Medium — affects every new employee invite, but existing users can work around it by typing their email.
**Acceptance Criteria:**
- Login page pre-fills the email field when user arrives from an invite link (email extracted from invite token via query parameter or lightweight API lookup)
- Login page auto-submits the OTP request when email is pre-filled from an invite, so the user lands directly on the "check your email for a code" screen with zero typing
- "New here?" information box on login page shows different text depending on context:
  - For new/owner users: current owner-oriented steps (set up org, invite team, etc.)
  - For invited employees: employee-appropriate guidance (e.g. "You've been invited to join a team" with relevant next steps)
- Product Team to define exact text for both variants during refinement
**Scope:** Login page (`app/login/page.tsx`), accept-invite redirect logic (`app/accept-invite/page.tsx`), possibly a lightweight API endpoint to resolve invite token to email address.
**Not in Scope:** Changing the auth flow itself (OTP/magic link). Changing the invite email template content.
**Stakeholders and their involvement:** Product Team — define exact UX text for both "New here?" variants. UX designer — review the pre-fill + auto-submit interaction.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 2. Must test invite flow end-to-end with pre-filled email. Existing invite E2E tests (`frontend/tests/invite.spec.ts`) will need updating. New E2E test cases needed for context-aware "New here?" box. Verify that direct /login access (no invite) still works unchanged.
**Complexity estimate:** Small.
**Description/Details:**
Current flow: Invite email → `/accept-invite?token=...` → redirect to `/login?next=/accept-invite?token=...` → user must type email → OTP sent → verify → back to accept-invite.
Desired flow: Invite email → `/accept-invite?token=...` → redirect to `/login?next=...&email=invited@example.com` → email pre-filled + auto-submitted → user just enters OTP code → back to accept-invite.
Documents impacted by this feature:
- `docs/user-flows.md` — login flow for invited users will change
- `frontend/tests/invite.spec.ts` — E2E test updates for pre-filled email behaviour
- Possibly new E2E test cases for the context-aware "New here?" box variants

---

## F-021
**Status:** Done
**Feature name:** Fix broken invite/onboarding flow — invited employees must join existing org, not create new one
**Business Value Hypothesis:** As an SMB owner who invited employees, I need those employees to join MY organisation when they log in — not be routed to onboarding where they create a separate org. Without this, the entire team model is broken: dashboard shows no team progress, assessments are siloed, and the product's core value (team security oversight) is destroyed. This is a P0 blocker for any real usage.
**Importance:** Critical — the product cannot be used by any org with more than 1 person until this is fixed.
**Urgency:** Critical — every new invite creates a broken state.
**Acceptance Criteria:**
- AC-1: Invited user clicking email invite link → login → lands on `/accept-invite`, NOT `/onboarding`
- AC-2: User with pending invite who navigates to `/workspace` is intercepted and shown accept-invite flow before reaching dashboard
- AC-3: Accepting invite creates `org_members` row with correct org_id, role, and IT executor flag — no new org created
- AC-4: Only users with NO pending invite and NO org membership can reach `/onboarding`
- AC-5: Role enforcement post-join: employee cannot access team/campaigns/settings pages (consistent with F-018)
- AC-6: Expired token → clear error page with "request new invite" guidance; user NOT routed to onboarding
- AC-7: Already-accepted token → graceful handling, no duplicate org_members row
- AC-8: Token for different email than logged-in user → 403 error, not silent acceptance
- AC-9: Self-role-assignment prevention: API rejects any user changing their own role; only org_admin can assign roles
**Scope:**
- WorkspaceProvider (`useWorkspace.tsx`): check `GET /api/invites/pending` before redirecting to onboarding (Option A)
- Onboarding page: also check for pending invite on mount as safety net (Option B)
- New `GET /api/invites/pending` endpoint: authenticated, returns redirect info (org name, role, accept path) for unaccepted/unexpired invite matching user's email
- sessionStorage hint: store invite token before login redirect, clear after consumption
- Accept-invite page redesign: confirmation card showing org name + role, Accept button (no Decline button — owner revokes from Team page if needed), conditional name field (shown only if no display name in user metadata)
- Login page context-awareness: 3 states (new owner, invite context, return user)
- Token expiry UX: dedicated error card for expired/used tokens
- Server-side self-role-assignment guard in membership API
**Not in Scope:** Changing PKCE auth flow. Email template changes. Manager role removal (separate F-022).
**Stakeholders and their involvement:** Product Team — UX text for login states and accept-invite card.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 3, Impact: 3. This is the most critical flow in the product. Must test all 10 scenarios defined in PI 12 consensus. E2E tests for invite.spec.ts, onboarding.spec.ts, roles.spec.ts all need updating.
**Complexity estimate:** Medium.
**Description/Details:**
Root cause: In `useWorkspace.tsx` lines 58-71, when `GET /api/orgs/me` returns 404, the hook redirects to `/onboarding` without checking if the user has a pending invite. The fix uses a belt-and-suspenders approach: primary check in WorkspaceProvider (Option A) and safety net in onboarding page (Option B), both calling the same new `GET /api/invites/pending` endpoint.
Onboarding cleanup (part of F-020): remove email system and computers fields, but KEEP IT handler question ("Who handles IT?") on onboarding — it serves as an awareness prompt. Owner can choose "Not sure" to postpone. IT handler also remains editable in `/workspace/settings`.
Documents impacted:
- `docs/user-flows.md` — onboarding and invite flows will be rewritten
- `frontend/lib/hooks/useWorkspace.tsx` — pending invite check before onboarding redirect
- `frontend/app/api/invites/pending/route.ts` — new endpoint
- `frontend/app/onboarding/page.tsx` — safety net check + simplified form
- `frontend/app/accept-invite/page.tsx` — redesigned confirmation card
- `frontend/app/login/page.tsx` — context-aware states
- `frontend/tests/invite.spec.ts`, `onboarding.spec.ts`, `roles.spec.ts` — updated E2E tests

---

## F-022
**Status:** Done
**Feature name:** Remove Manager role from UI and add server-side guard
**Business Value Hypothesis:** As a product simplification, the Manager role adds org hierarchy complexity (subtree assessments, manager invites, manager_user_id tree) that SMB owners with 2-10 employees don't need. Removing it from the invite form prevents confusion and reduces the attack surface. The simplified model is: Owner (org_admin) invites Employees, optionally flagging one as IT executor.
**Importance:** High — directly prevents invite form confusion and aligns with simplified user model.
**Urgency:** Medium — should ship with the invite flow fix to present a clean interface.
**Acceptance Criteria:**
- Invite form on team page shows only "Employee" role option (Manager removed)
- Server-side guard in invite API and membership API rejects `manager` role assignment
- Existing Manager-role members in DB continue to function without errors
- No user can self-assign any role (covered by F-021 AC-9)
**Scope:**
- Remove "Manager" from invite form dropdown (only "Employee" remains)
- Server-side API guard: reject `manager` role assignment in invite and membership APIs
- DB migration (SQL script `021_remove_manager_role.sql`): reassign existing `manager` rows to `employee`, update CHECK constraints on `org_members.role` and `invites.role`, drop `manager_user_id` column from `org_members`
- Update all code referencing manager role (~10 files): `lib/db/types.ts`, `useWorkspace.tsx`, team page, invite API, assessment API, dashboard API, members API
- Remove subtree assessment logic (manager-scoped assessments)
**Not in Scope:** N/A — full removal.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 2, Impact: 2. Medium risk — DB migration + ~10 files. Regression test: invite flow, team page, assessments, dashboard. Verify existing data migrated correctly.
**Complexity estimate:** Medium (Stefan override: full migration instead of UI-only).

---

## F-023
**Status:** Done (PI 14 Iter 1, BA verified on PROD 2026-04-11)
**Feature name:** Add navigation to expired/error invite pages
**Business Value Hypothesis:** As an invited user whose invite link has expired, I need a way to navigate back to the homepage or login page — currently the expired invite page has no header, logo, or links, leaving the user completely stranded.
**Importance:** Medium — affects every user who clicks an expired or already-used invite link.
**Urgency:** Medium — poor first impression for invited users.
**Acceptance Criteria:**
- Expired invite page shows a "Back to home" link to /
- Expired invite page shows the app header/logo
- Wrong-email error on accept-invite also has navigation back
**Scope:** `app/accept-invite/page.tsx` — add header and navigation links to error states.
**Not in Scope:** N/A.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1. Visual check only.
**Complexity estimate:** Small.

---

## F-024
**Status:** Done (PI 14 Iter 1, BA verified on PROD 2026-04-11)
**Feature name:** Fix login page heading mismatch with "Sign up free" CTA
**Business Value Hypothesis:** As a new user who clicked "Sign up free" on the landing page, I expect the login page to welcome me with signup-appropriate text — not "Log in", which makes me think I clicked the wrong thing.
**Importance:** Medium — affects first impression for every new user.
**Urgency:** Low — users figure it out, but it creates a moment of doubt.
**Acceptance Criteria:**
- Login page heading reflects the user's context: "Get started" or "Sign in / Sign up" when arriving from "Sign up free" CTA
- Or a single neutral heading that works for both contexts (e.g., "Welcome")
**Scope:** `app/login/page.tsx` heading text.
**Not in Scope:** Auth flow changes.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-025
**Status:** Done (PI 14 Iter 1, BA verified on PROD 2026-04-11)
**Feature name:** Minor UX copy inconsistencies from PI 12 BA review
**Business Value Hypothesis:** As a user, I expect consistent naming and copy across all pages — small inconsistencies erode trust in a security product.
**Importance:** Low.
**Urgency:** Low.
**Acceptance Criteria:**
- Landing page tab title aligned with brand name (or explicitly documented as SEO override)
- Privacy page reference to "Settings & Data" includes context for anonymous readers
- Footer CTA "Browse checklist" matches hero CTA "Browse the checklist"
**Scope:** Metadata, copy text across 2-3 pages.
**Not in Scope:** Design changes.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-026
**Status:** Done
**Feature name:** Fix role labels and naming consistency across UI
**Business Value Hypothesis:** As a user, I expect consistent terminology. "Org Admin" should say "Owner", "IT Lead" should say "IT Executor", and "Skipped" should say "Not applicable" everywhere.
**Importance:** High
**Urgency:** High
**Acceptance Criteria:**
- AC-1: "Org Admin"/"org admin" replaced with "Owner" on workspace home, team page, dashboard, accept-invite page, settings dropdown
- AC-2: "IT Lead" replaced with "IT Executor" on workspace home guided step
- AC-3: "Skipped" replaced with "Not applicable" for IT Baseline track in workspace checklist, dashboard stats, and drill-down
**Scope:** UI text changes across ~6 files. No DB changes.
**Not in Scope:** DB column renaming.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-027
**Status:** Done
**Feature name:** Fix IT Executor flow — empty dropdown, invite step, onboarding guard
**Business Value Hypothesis:** As an owner who invited an IT person, the workspace must reflect that the IT executor has joined. Current bugs: empty dropdown, invite step not detecting joined executor, invited users can accidentally create new orgs.
**Importance:** High
**Urgency:** High
**Acceptance Criteria:**
- AC-1: Settings page IT Executor dropdown populated from /api/orgs/members (not /api/dashboard)
- AC-2: Workspace home "Invite your IT executor" step marked done when a member with is_it_executor=true exists
- AC-3: POST /api/orgs rejects org creation if user has a pending invite
**Scope:** Settings page data source, workspace home step logic, org creation API guard.
**Not in Scope:** Changing invite flow itself.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 2, Impact: 2.
**Complexity estimate:** Small-Medium.

---

## F-028
**Status:** Done
**Feature name:** Fix dashboard status logic and display filtering
**Business Value Hypothesis:** "On track" with many Unsure items is misleading. Employees seeing IT Baseline stats is confusing. Owner needs "resolved" count.
**Importance:** Medium
**Urgency:** Medium
**Acceptance Criteria:**
- AC-1: Cadence status factors in unsure ratio — amber if >30% unsure even if time is green
- AC-2: Employee dashboard hides IT Baseline track bar
- AC-3: Dashboard shows "Resolved" count (done + not-applicable) alongside existing stats
**Scope:** Dashboard API + dashboard page.
**Not in Scope:** Changing assessment model.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 2.
**Complexity estimate:** Small.

---

## F-029
**Status:** Done
**Feature name:** Fix privacy page claims, login text, team page UUID display
**Business Value Hypothesis:** Privacy page claims non-existent features (opt-out, simulation reveal, in-app contact) — misleading and potential GDPR issue.
**Importance:** High
**Urgency:** High
**Acceptance Criteria:**
- AC-1: Privacy "Right to object" — employees contact org owner to opt out (no self-service UI)
- AC-2: Privacy campaign section — remove "clearly identified as simulations after interaction"
- AC-3: Privacy contact — remove in-app contact reference
- AC-4: Login page "Sending to:" → "Sent to:"
- AC-5: Team page: better fallback than UUID
**Scope:** Privacy page, login page, team page.
**Not in Scope:** Implementing claimed features.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-030
**Status:** Done
**Feature name:** Improve email platform list in settings
**Business Value Hypothesis:** Owner can't find Exchange/Outlook or Apple Mail in the dropdown.
**Importance:** Low
**Urgency:** Low
**Acceptance Criteria:**
- AC-1: "Microsoft 365" label → "Microsoft 365 (Exchange / Outlook)"
- AC-2: "Apple iCloud Mail" added as option
**Scope:** Settings page platform options.
**Not in Scope:** AI-assisted platform selection.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-031
**Status:** Developed (PI 15 Iter 1 backend + PI 15 Iter 2 frontend — `AiGuidancePanel` rewritten as chat UI in `app/workspace/checklist/page.tsx` with locked UX: no auto-first-message, Start chat card gates first AI call, sticky-within-card input, rate-limit footer when ≤5 left, Clear chat, strict `{ item_id, history, message }` body (no title/description client-side per Security R2 §10). 7/7 tests in `tests/ai-chat-ui.spec.ts` passing with mocked backend; chat backend tests in `tests/ai-chat.spec.ts` remain green.)
**Feature name:** Replace one-shot AI guidance with interactive AI chat per checklist item
**Business Value Hypothesis:** As an SMB owner working through a checklist item, I need a back-and-forth conversation with AI scoped to that specific item, because one-shot static guidance can't address the user's specific environment, setup, or follow-up questions. The current "Help me do this" produces a single block of text — Stefan confirmed users need a chat for some items.
**Importance:** Medium-High — directly affects whether the AI guidance feature is actually useful or just decorative.
**Urgency:** Medium — Stefan explicitly requested in 2026-04-11.
**Acceptance Criteria:**
- AC-1: Each checklist item's "Help me do this" panel becomes a chat interface (message history + input box + send button), not a single static text block.
- AC-2: Initial AI message provides the same level of guidance as today's one-shot output (so users who don't want to chat still get value immediately).
- AC-3: User can ask follow-up questions about the same item; chat history persists for the duration of the page session (does NOT need to persist across reloads in v1).
- AC-4: AI is strictly scoped to the current checklist item — system prompt enforces "you may only help with [item title]; refuse off-topic requests politely". Builds on F-012 guardrails.
- AC-5: Per-item per-user chat is rate-limited (Supabase-backed counter, e.g. 20 messages/item/day) to prevent abuse and runaway cost.
- AC-6: Visible "Clear chat" button to reset the conversation if it goes off track.
- AC-7: AI output filter rejects/flags any response that ignores the item scope (basic keyword + length filter).
- AC-8: Disclaimer "AI-generated guidance — verify with your IT provider" remains visible.
- AC-9: Mobile-friendly chat layout (covered by F-009).
**Scope:** Replace `AiGuidancePanel` in `app/workspace/checklist/page.tsx` with chat component. New `/api/guidance/chat` route accepting message history. Anthropic Messages API multi-turn. Chat history kept in component state only (v1).
**Not in Scope:** Persistent chat history across sessions/devices. General-purpose AI assistant. Image upload (covered separately by F-017).
**Dependencies:** F-012 (hardened guardrails — must ship before or with F-031). Anthropic API key (already configured).
**Risk and amount of Test:** Chance: 2, Impact: 2. Test prompt injection (try to make AI talk about unrelated items), token cost per message, rate limit, mobile layout, history truncation when context grows.
**Complexity estimate:** Medium.

---

## F-032
**Status:** Created
**Feature name:** Owner sets reassessment period
**Business Value Hypothesis:** Owner wants to set reassessment cadence (3mo / 6mo / 1yr) with automatic reminders.
**Importance:** Medium. **Urgency:** Low — deferred.
**Acceptance Criteria:** TBD.
**Scope:** Org setting, reminder scheduling.
**Dependencies:** None.
**Risk and amount of Test:** TBD.
**Complexity estimate:** Small-Medium.

---

## F-033
**Status:** Deployed (PI 14 Iter 3 — UI verified on PROD 2026-04-11; backend RPC pending Stefan applying docs/sql/024 — full BA Done after migration)
**Feature name:** Owner can remove team member (GDPR member deletion)
**Business Value Hypothesis:** As an SMB owner I must be able to remove a person (by email) from my team — regardless of whether they accepted the invite, regardless of whether they have responses on assessments — and that action must delete ALL their personal data so the org has no remaining GDPR concern about that person. Without this, the owner has no way to honour a person's right-to-erasure or to clean up after a leaver.
**Importance:** High — GDPR-mandated. The current product cannot honour right-to-erasure for an employee unless that employee logs in and self-deletes.
**Urgency:** Medium — Stefan flagged as future-feature 2026-04-11; should ship in same window as PDF findings.
**Acceptance Criteria:**
- AC-1: Team page (`/workspace/team`) shows a "Remove" action on each accepted member row (own row excluded; another owner cannot remove the only owner).
- AC-2: Team page shows a "Revoke + delete data" action on each pending invite row that also nukes any partial data tied to that invite email.
- AC-3: Removing an accepted member: deletes the `org_members` row, deletes all `assessment_responses` belonging to that user under this org, deletes any `campaign_recipients` rows (or anonymises them), deletes audit-log PII rows about this user (or pseudonymises).
- AC-4: Removing a pending invite: deletes the `invites` row.
- AC-5: A confirmation dialog warns "This permanently deletes all of {email}'s data in {org name}. This cannot be undone." with explicit "Delete" button.
- AC-6: After removal: dashboard team list updates immediately, dashboard counts (resolved/done/unsure) recompute correctly, security report no longer shows the removed user.
- AC-7: Audit log records `member_removed` event with actor + removed email + timestamp (org-level, no PII about target beyond email needed for compliance).
- AC-8: Server-side guard: only `org_admin` can remove members. User cannot remove themselves via this API (they self-delete via Settings & data instead).
- AC-9: Removing the IT executor flips `is_it_executor` so the `hasItExecutor` step on workspace home goes back to "Invite your IT Executor".
**Scope:** Team page UI buttons + confirmation dialog. New `DELETE /api/orgs/members/[user_id]` endpoint. New `DELETE /api/invites/[invite_id]` (or extend revoke). Cascade logic in API. Audit log entry.
**Not in Scope:** Soft-delete or recovery. Bulk member removal. Keeping anonymised aggregate stats from removed users (Stefan's intent is full erasure).
**Dependencies:** None.
**Risk and amount of Test:** Chance: 2, Impact: 3. Data deletion is irreversible. Must test: cascade completeness (no orphaned rows), dashboard recomputation, security report update, RLS enforcement, only-owner protection, removal during active assessment.
**Complexity estimate:** Medium.

---

## F-034
**Status:** Done (PI 14 Iter 1, BA verified on PROD 2026-04-11)
**Feature name:** Remove "Start an assessment" CTA from the empty-state employee dashboard
**Business Value Hypothesis:** As an employee viewing the dashboard before any assessment exists, I should not see "No assessments yet · Start an assessment" — employees cannot start assessments (access is already restricted in the API), and the link is misleading. Originally raised as PI 13 finding 014 and flagged again in Stefan's 2026-04-11 test as still present.
**Importance:** Low — cosmetic but it confuses employees and makes the role model look broken.
**Urgency:** Low.
**Acceptance Criteria:**
- AC-1: Employee viewing `/workspace/dashboard` with no active assessment sees "No assessments yet — your owner will start one" (or similar), with NO link to `/workspace/assessments`.
- AC-2: Owner viewing the same page with no active assessment continues to see the "Start an assessment" link.
- AC-3: Same wording fix on workspace home Dashboard card empty state if applicable.
**Scope:** `app/workspace/dashboard/page.tsx` empty-state branch. Conditional based on `isAdmin`.
**Not in Scope:** Backend changes.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1. E2E test with employee role.
**Complexity estimate:** Small.

---

## F-035
**Status:** Done (PI 14 Iter 2, BA verified on PROD 2026-04-11)
**Feature name:** Dashboard team list must include invited-but-not-yet-joined employees
**Business Value Hypothesis:** As an owner I need the Dashboard's "Team progress" list to show every employee I have invited — including those who haven't logged in yet — so I can see at a glance who hasn't responded without cross-checking the Team page. Currently the Dashboard only lists members who have accepted the invite, which makes the team look smaller than it is and forces double-checking.
**Importance:** Medium — directly affects whether the owner trusts the dashboard as a single source of truth for team status.
**Urgency:** Medium.
**Acceptance Criteria:**
- AC-1: Dashboard "Team progress" lists pending-invite recipients with a clear "Invite pending — not yet joined" sub-label and 0% progress bar (greyed out, no drill-down).
- AC-2: Dashboard top-line response count denominator includes pending invitees in a way that's consistent with finding 35 fix (see F-038).
- AC-3: Pending rows show the invited email; clicking the row does NOT open a drill-down (no responses to show).
- AC-4: After the invitee accepts, the row replaces seamlessly with their joined-member row (no duplication).
- AC-5: A revoked invite disappears from the dashboard list immediately.
- AC-6: Order: joined members first, then pending invitees, alphabetical within each group.
**Scope:** `GET /api/dashboard` to also return pending invites (joined to org). Dashboard page UI to render pending rows distinctly. Avoid double-counting when invitee joins.
**Not in Scope:** Reminder emails for non-joined invitees (separate feature idea).
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 2. E2E with mixed accepted+pending team. Verify counts don't double after invite is accepted.
**Complexity estimate:** Small-Medium.

---

## F-036
**Status:** Done (PI 14 Iter 3, BA verified on PROD 2026-04-11)
**Feature name:** Add "Now your awareness items" banner before the awareness section in the IT Executor checklist
**Business Value Hypothesis:** As an IT Executor opening "My checklist", the IT Baseline section is well-introduced by the existing blue banner ("Your admin has assigned you the IT Baseline track…"), but the Security Awareness section that follows has no equivalent intro — the IT Executor doesn't realise that the second half of the list is the same questions every Employee gets. A second banner just before the awareness section makes it clear that these are the personal awareness questions, not technical IT controls.
**Importance:** Low-Medium — affects clarity for the most engaged user (the person handling IT).
**Urgency:** Low.
**Acceptance Criteria:**
- AC-1: A blue/teal info banner is shown immediately before the "Security Awareness" section heading in `/workspace/checklist`, ONLY when `is_it_executor === true`.
- AC-2: The banner text explains: this section is the personal security awareness items everyone in the org gets, including you.
- AC-3: Regular employees (not IT Executor) do NOT see this extra banner — their awareness section is the only section so no second banner is needed.
- AC-4: A non-IT-executor owner (i.e. an owner who delegated IT to someone else) ALSO does NOT see this extra banner — they only see awareness items.
- AC-5: The existing IT Baseline banner remains as-is and is still dismissible.
- AC-6: The new awareness banner is also dismissible (separate localStorage key).
**Scope:** `app/workspace/checklist/page.tsx` — render second banner conditionally.
**Not in Scope:** Restructuring the existing banner.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1. E2E test as IT Executor: see both banners. As employee: see neither / only awareness welcome. As non-IT-executor owner: see neither IT-track banner.
**Complexity estimate:** Small.

---

## F-037
**Status:** Done (PI 14 Iter 1, BA verified on PROD 2026-04-11 — markdown template; DB row pending Stefan applying docs/sql/022)
**Feature name:** Reword "1-page security rules" template, section 7 — keep digital + printed copies
**Business Value Hypothesis:** As a security-conscious owner, I'm told to write a 1-page rules doc and "save a digital copy in the shared drive" — but a digital-only copy is impacted by ransomware/IT attacks. The template should explicitly tell owners to print the doc for use during an attack, not only store it digitally.
**Importance:** Low — content fix.
**Urgency:** Low.
**Acceptance Criteria:**
- AC-1: Section 7 of the "1-page security rules" template (the in-checklist Steps list shown in `frontend/public/templates/security-rules.md` and the rendered Steps array in the corresponding `assessment_items.steps`) reads: "Keep it to one page. Print for onboarding and physical copies to use in case of IT attacks. Save a digital copy in the shared drive." (or equivalent improved wording).
- AC-2: Both the markdown template file and the seeded `checklist_items.steps` JSON are updated.
- AC-3: A note is added to ensure subsequent assessments (snapshot at start) get the new wording.
**Scope:** `frontend/public/templates/security-rules.md`, seed migration / SQL update for the relevant `checklist_items` row.
**Not in Scope:** Rewriting the rest of the template.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1. Visual check + verify a freshly-snapshotted assessment carries the new wording.
**Complexity estimate:** Small.

---

## F-038
**Status:** Done (PI 14 Iter 2, BA verified on PROD 2026-04-11)
**Feature name:** Fix dashboard math — track progress, denominators, "Resolved" semantics, denominator stability
**Business Value Hypothesis:** As an owner reading the Dashboard, I expect the numbers to be coherent and to match how I think about progress. Today the numbers are mathematically inconsistent: the IT Baseline and Awareness progress bars treat "Unsure / Not yet" as "answered = done", which inflates the displayed percent; the top-line denominator changes mid-session (18 / 36 → 18 / 47 was observed); and the "Resolved" pill visually sits next to "Done", "Unsure", "Not applicable" without the relationship Resolved = Done + Not applicable being obvious. The fix is to align all numbers on a consistent definition of "Resolved" and a stable denominator semantics.
**Importance:** High — data correctness in a security tool. Owners are making decisions based on these numbers.
**Urgency:** High — Stefan's 2026-04-11 finding 35 has 4 sub-items.
**Acceptance Criteria:**
- AC-1 (35-a): The "Unsure" stat pill is renamed "Unsure / Not yet" on the dashboard top stats (the workspace IT Baseline track uses "Unsure" and the Awareness track uses "Not yet" — in the unified dashboard view, both are aggregated under one label). Detail/drill-down views keep the two distinct names.
- AC-2 (35-b layout): Pills render in this visual order: Resolved | Done | Not applicable | Unsure / Not yet — so that Done and Not applicable sit next to each other and the relationship Resolved = Done + Not applicable is visually obvious.
- AC-3 (35-b track math): The IT Baseline and Awareness progress bars compute percent as (done + skipped) / total — i.e. ONLY done + not-applicable count as progress. Unsure/Not-yet does NOT count as progress.
- AC-4 (35-b track math, IT Executor case): With Stefan's example data (Done=7, Unsure=3, N/A=3 IT Baseline) the IT Baseline bar shows 10/25, NOT 12/25.
- AC-5 (35-b track math, awareness case): With Stefan's example (Done=4, Not yet=1, N/A=1 awareness) the Awareness bar shows 5/11, NOT 6/11. Same calculation regardless of whether responses come from owner-IT-executor only, employee only, or aggregated.
- AC-6 (35-d denominator stability): The top-line "X / Y responses" shows the SAME denominator on every render of the dashboard regardless of load order. The 18/36 ↔ 18/47 flicker is fixed.
- AC-7 (35-d denominator semantics): The denominator definition is documented in the dashboard API (in code comment) AND shown consistently across: top-line bar, "My checklist" workspace home progress, and the Security Report (covered by F-040). Product Team to choose one definition during refinement: either (a) sum of per-member item totals (IT executors contribute IT+awareness, others contribute awareness only) — this is the larger number, OR (b) unique checklist items where ANY scoped member has answered. The choice must be documented.
- AC-8 (35-c): The workspace home "My checklist" green progress bar uses the SAME math as the dashboard track bars (done+skipped only counted as progress) — not the org-aggregate percent. See F-039 for the related "must show only my own progress" fix.
- AC-9: A unit test (or integration test on the dashboard API) covers the four edge cases: (i) only owner answered, (ii) only employee answered, (iii) both answered, (iv) IT executor reassigned mid-assessment.
**Scope:** `app/api/dashboard/route.ts` — `trackStats()` percent formula, top-level percent formula, return shape; `app/workspace/dashboard/page.tsx` — pill order, track bar denominator/labels, top-line `X / Y responses` denominator source.
**Not in Scope:** Adding new metrics. Changing database schema.
**Dependencies:** F-039 (workspace home progress bar) shares the recalculation formula; coordinate.
**Risk and amount of Test:** Chance: 2, Impact: 3. Math correctness in the security tool's main display. Must add automated tests covering the 4 scenarios above. Manual cross-check on PROD with Stefan's exact example.
**Complexity estimate:** Small-Medium.

---

## F-039
**Status:** Done (PI 14 Iter 2, BA verified on PROD 2026-04-11)
**Feature name:** Workspace home "My checklist" progress bar must show OWN progress, not org aggregate
**Business Value Hypothesis:** As an owner, the "My checklist" card on the workspace home page must show MY personal checklist progress — when an employee answers items their progress should not move my "My checklist" bar, because that bar represents the owner's own work to do. Today (2026-04-11) Stefan observed his "My checklist" progress bar move when an employee answered checklist items, because the bar is bound to `stats.percent` from `/api/dashboard` (org aggregate), not the caller's own responses. The Dashboard top-line correctly reflects org aggregate; that's a separate display.
**Importance:** High — data-correctness bug in the user's primary dashboard widget.
**Urgency:** High.
**Acceptance Criteria:**
- AC-1: The green progress bar on the "My checklist" card on `/workspace` reflects ONLY the logged-in user's own response progress (using the same math as F-038: own-done + own-not-applicable / own-applicable-items).
- AC-2: When an employee answers items, the owner's "My checklist" bar on the owner's workspace home does NOT move.
- AC-3: When the owner answers items, the owner's "My checklist" bar moves; the employee's "My checklist" bar (if also opened) does NOT move.
- AC-4: The Dashboard top-line "X / Y responses" continues to reflect the org-wide aggregate (this is the correct place for that number).
- AC-5: An E2E test with two users (owner + employee) verifies the isolation: open both browsers, employee answers, owner's "My checklist" bar unchanged.
**Scope:** `app/workspace/page.tsx` — fetch caller-only progress from a new or extended endpoint (e.g. `/api/checklist/me/progress` or `/api/dashboard?scope=me`). Math identical to F-038.
**Not in Scope:** Changing the Dashboard top-line semantics (that's F-038's job).
**Dependencies:** F-038 — must agree on the "Resolved" formula.
**Risk and amount of Test:** Chance: 2, Impact: 2. Cross-user E2E test required. Cache/stale-state risk on workspace home.
**Complexity estimate:** Small.

---

## F-040
**Status:** Done (PI 14 Iter 2, BA verified on PROD 2026-04-11)
**Feature name:** Security Report must use the same corrected dashboard math
**Business Value Hypothesis:** As an owner sharing the security report with stakeholders, the report's per-track stats and overall posture numbers must match what the Dashboard shows after F-038 is fixed — otherwise the report and dashboard contradict each other and trust is lost.
**Importance:** Medium-High — the report is a stakeholder-facing artefact.
**Urgency:** Medium.
**Acceptance Criteria:**
- AC-1: Security Report (`/workspace/report`) per-track completion stats use the same (done + skipped) / total formula chosen in F-038.
- AC-2: The "Recommendations" section that flags "high unsure ratio" remains correct after the formula change.
- AC-3: For Stefan's example data, the report shows the same 10/25 IT Baseline and 5/11 Awareness numbers as the Dashboard.
- AC-4: Print-PDF view also reflects the corrected numbers.
- AC-5: A test asserts dashboard API and report API return the same totals/percent for the same input.
**Scope:** `app/workspace/report/page.tsx` and any underlying API/helper. Likely shares helpers with `app/api/dashboard/route.ts`; refactor to a single helper.
**Not in Scope:** Redesigning the report layout.
**Dependencies:** F-038 (must ship together or report ships immediately after).
**Risk and amount of Test:** Chance: 1, Impact: 2. Cross-check report ↔ dashboard for same org, same period.
**Complexity estimate:** Small.

---

## F-041
**Status:** Deployed (PI 14 Iter 3 — UI verified on PROD 2026-04-11; backend RPC pending Stefan applying docs/sql/025 — full BA Done after migration)
**Feature name:** Define and implement IT Executor reassignment behaviour (data handover)
**Business Value Hypothesis:** As an owner who handles IT today but later wants to delegate to someone else, I need the IT Executor reassignment to behave in a clearly-defined, non-data-losing way. Today (2026-04-11) it is unclear what happens to the previous IT Executor's IT Baseline responses, and whether the new IT Executor inherits an empty checklist, the existing responses, or accidentally a duplicated state.
**Importance:** Medium — directly affects whether reassignment is safe to use.
**Urgency:** Medium.
**Acceptance Criteria:**
- AC-1: Product Team chooses ONE behaviour during refinement and documents it in `docs/user-flows.md`. Recommended default: existing IT Baseline responses are PRESERVED on the org's assessment (keyed to the assessment, not the user); the new IT Executor sees the existing responses as-is and can edit them. The previous IT Executor loses access to IT Baseline questions on their personal checklist (only awareness remains).
- AC-2: The reassignment must be atomic: either the flip succeeds and IT track ownership transfers cleanly, or it fails and nothing changes. No half-state.
- AC-3: A confirmation dialog warns: "This will transfer the IT Baseline checklist from {old name} to {new name}. Existing answers will be kept and become editable by {new name}."
- AC-4: An audit log entry records the reassignment.
- AC-5: After reassignment: the new IT Executor sees all existing IT Baseline answers; the old IT Executor's "My checklist" no longer shows IT Baseline items; dashboard still shows the same per-track totals (no double-counting).
- AC-6: Edge case: if the org has no active assessment, reassignment is allowed and is purely a flag flip with no data implications.
- AC-7: An E2E test covers: owner-as-IT-exec answers 5 IT Baseline items, reassigns to invited employee, employee logs in, sees those 5 items as already answered.
**Scope:** Settings page reassignment flow, `org_members.is_it_executor` flip, possibly response ownership rebinding (if responses are user-keyed). Audit log entry.
**Not in Scope:** Multiple IT executors per org.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 2, Impact: 3. Data consistency risk. Must test with active assessment + existing responses. Check that dashboard math (F-038) still adds up after reassignment.
**Complexity estimate:** Medium.

---

## F-042
**Status:** Done (PI 14 Iter 1, BA verified on PROD 2026-04-11 — regression test guards against re-introduction)
**Feature name:** Fix or remove the "contact us via the application" copy
**Business Value Hypothesis:** As a user reading the privacy/help text that says "contact us via the application or at the email address provided in your organisation's settings", I look for an in-app contact mechanism — and there isn't one. This is a misleading/false claim. Either implement an in-app contact mechanism or remove the claim. (Linked to F-029 which fixed similar misleading claims on the privacy page.)
**Importance:** Medium — accuracy in a privacy-sensitive product.
**Urgency:** Medium.
**Acceptance Criteria:**
- AC-1: Audit the codebase for the "contact us via the application" or similar phrases (`grep` across `app/**/*.tsx` and `lib/i18n/*.json`).
- AC-2: If no in-app contact mechanism exists, remove or rephrase to "contact your organisation owner" / "contact us at [support email]".
- AC-3: If a simple in-app contact form is in scope (Product Team decides), a minimal "Send feedback" form on Settings & data is acceptable (subject + body, posts to Resend → Stefan inbox).
- AC-4: All occurrences are consistent.
**Scope:** Copy fix across files. Optionally a lightweight feedback form (Product Team decision).
**Not in Scope:** Full ticketing system.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-043
**Status:** Done (PI 14 Iter 1, BA verified on PROD 2026-04-11)

---

## F-044
**Status:** Developed (fix shipped post-PI 15, pending Vercel deploy + BA verify)
**Feature name:** Security report per-track item count display label parity with dashboard
**Business Value Hypothesis:** As an owner reading the security report, the per-track item count label should match what the dashboard shows, so the two views never look like they disagree even though they're computing the same thing. PI 14 BA test found: dashboard shows "7 / 22 items" for the Awareness track (per-member-sum semantics, the F-038 denominator); the security report shows "11 items" (raw unique-item count). Both numbers are technically correct but use different semantics for "items" and look like a contradiction. Top-level totals (resolved/denominator/percent) match correctly — this is a per-track display label issue only.
**Importance:** Low — cosmetic; numeric correctness is intact.
**Urgency:** Low — does not affect the math, just the label.
**Acceptance Criteria:**
- AC-1: The security report's per-track "X items" label uses the SAME denominator as the dashboard (`stats.by_track[track].denominator`).
- AC-2: For Stefan's canonical fixture: dashboard Awareness track says `5 / 22 items`; report Awareness section also says `5 / 22 items` (or both consistently say `5 / 11 unique items`).
- AC-3: A new test in `tests/dashboard-math.spec.ts` asserts dashboard ↔ report per-track item count parity (currently only top-level parity is tested).
**Scope:** `frontend/app/workspace/report/page.tsx` track item count rendering. Reuse the same `stats.by_track[track].denominator` field already in the dashboard API.
**Not in Scope:** Changing the math itself.
**Dependencies:** F-040 (already shipped — uses the same shared helper).
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-045
**Status:** Developed (all artefacts authored — personas, invariants, 13 page matrices, state-matrix-template; awaiting BA verification in Phase C)
**Feature name:** Quality baseline — personas, invariants, per-page state matrices
**Business Value Hypothesis:** As the product owner, I need a canonical set of user personas, cross-page invariants, and one state matrix per user-facing page, so that cross-feature inconsistencies (like PDF #42–47: Home/Settings/Team showing contradictory IT-Executor state) are forced to the surface at spec time instead of being found by Stefan weeks later. Without this, every new feature silently risks breaking neighbours.
**Importance:** High — root cause of Stefan's recurring manual-test burden.
**Urgency:** High — blocks quality-efficient shipping.
**Acceptance Criteria:**
- AC-1: `docs/quality/personas.md` lists canonical personas (ANON, O1 owner-IT-self, O2 owner-delegates-IT, O3 owner-with-pending-IT-invite, E1 employee-invited-not-accepted, E2 employee-accepted, IT1 IT-executor-not-owner) each with setup data (email, org state, role, reachable pages).
- AC-2: `docs/quality/invariants.md` lists cross-page invariants with IDs (starting from findings PDF #42–47: header↔Settings IT-executor parity; Home "Get started" deterministic from org state; no "Not set" when value is derivable).
- AC-3: `docs/quality/state-matrix-template.md` defines the matrix template (rows = personas, columns = page regions, cells = expected content/behavior, N/A conventions, invariant-ID linking).
- AC-4: `docs/quality/matrices/` contains one matrix per user-facing page. Initial set (finalised during authoring): home, checklist, checklist-public, dashboard, team, settings, report, campaigns, billing, privacy, login, onboarding, summary.
- AC-5: Each matrix records *intended* behaviour. Where current reality diverges (e.g. PDF #44 Home-step-1 strikethrough flicker), the matrix flags the cell as defect → feeds F-048/F-049 fix scope.
**Scope:** Docs only — no code changes. Walk the running app via Playwright MCP for accuracy.
**Not in Scope:** Fixing defects found during authoring (handled by F-048/F-049). Not per-feature matrices.
**Dependencies:** None — starts PI-16.
**Risk and amount of Test:** Chance: 1, Impact: 1. Correctness verified by F-046 test suites referencing these artefacts.
**Complexity estimate:** Medium (13 pages × 7 personas = ~91 cells to author, but parallelisable).

---

## F-046
**Status:** Developed (partial — `invariants.spec.ts` + `smoke/personas.spec.ts` + `personaHelpers.ts` shipped with F-048/F-049 coverage; remaining invariants stubbed with `test.skip` + explicit follow-up features named)
**Feature name:** Quality baseline — automated invariant + persona-smoke test suites
**Business Value Hypothesis:** As the IT Dev team, we need Playwright suites that encode `invariants.md` as assertions and walk each persona across every page, so regressions (like PDF #46 `digest()` missing because migration 024 was never applied) are caught by CI/post-deploy instead of by a user clicking the broken button. Compounds with F-045 by turning the documentation into executable tests.
**Importance:** High.
**Urgency:** High.
**Acceptance Criteria:**
- AC-1: `frontend/tests/invariants.spec.ts` encodes every invariant ID from `docs/quality/invariants.md` as a Playwright assertion. Runs in CI on every PR; fails hard if an invariant is violated.
- AC-2: `frontend/tests/smoke/personas.spec.ts` walks each persona from `personas.md` across every reachable page. Asserts: no error banner visible, no unhandled server error in console, no "Not set" where a stored value exists, page renders its defined regions.
- AC-3: Persona smoke runs against local dev AND can be re-run against production with env flag (`SMOKE_BASE_URL`). One successful production run after Phase B deploy.
- AC-4: At least two invariants explicitly cover PDF #42–47 (e.g. "Home subtitle IT-executor status == Settings.IT_executor", "Home 'Get started' step state is deterministic across navigation").
- AC-5: Test failures point back to `invariants.md` IDs so a failing run is self-documenting.
**Scope:** New test files under `frontend/tests/` and `frontend/tests/smoke/`. Reuse `createOrgWithMembers()` + fixture seeding from F-043 harness.
**Not in Scope:** Retrofitting existing spec files. Performance benchmarking.
**Dependencies:** F-045 (personas + invariants must exist first). F-043 multi-user harness (already shipped).
**Risk and amount of Test:** Chance: 2, Impact: 2. Flaky-test risk mitigated by deterministic fixtures.
**Complexity estimate:** Medium.

---

## F-047
**Status:** Developed (roles.md, feature_rules.md, test-strategy.md, CLAUDE.md, 3 team rules files updated in same commit as F-045/F-046/F-048/F-049)
**Feature name:** Quality baseline — process doc updates (roles, rules, CLAUDE.md, test strategy)
**Business Value Hypothesis:** As the coordinating process, every team rule and role description must point at the new quality artefacts (F-045) and test suites (F-046), so the four-layer model persists across PIs without Stefan re-explaining it. A process change that lives only in a plan file erodes; one encoded in CLAUDE.md + team rules + roles.md persists.
**Importance:** High.
**Urgency:** High — must ship with F-045/F-046 or drift begins immediately.
**Acceptance Criteria:**
- AC-1: `docs/agents/roles.md` — UX Designer explicitly owns cross-page visual+flow consistency (reviews matrices). BA owns state-matrix artefact + invariants list. Architect signs off state-transition implementability. No new roles added.
- AC-2: `docs/product/feature_rules.md` — new required fields: **Pages touched** (list of `docs/quality/matrices/*.md` files; feature's PR must update each), **Invariants touched** (list of `docs/quality/invariants.md` IDs), or **N/A — backend/infra only** with justification.
- AC-3: `docs/test-strategy.md` — new sections *Persona smoke suite* (layer 3) and *Invariant suite* (layer 2) with file pointers + matrix-maintenance rule.
- AC-4: `docs/team_rules_product_team.md` — new rule: any PI touching a user-facing page must review/update that page's matrix at step 2b. With Why + How-to-apply.
- AC-5: `docs/team_rules_it_dev_team.md` — new rule: post-deploy persona smoke + invariants suites must be green before Business Test begins. With Why (PDF #46 case).
- AC-6: `docs/team_rules_test_team.md` — new rule: BA testing is persona-journey driven, not feature-list driven. With Why + How-to-apply.
- AC-7: `CLAUDE.md` — small additions to §2b (matrix as refinement artefact) and §3 (persona-journey framing).
**Scope:** Doc updates only. No code.
**Not in Scope:** Rewriting history of prior PIs or team rules content unrelated to quality.
**Dependencies:** F-045 (must reference real paths). F-046 (must reference real spec files).
**Risk and amount of Test:** Chance: 1, Impact: 2. Verified by the fact that subsequent PI Product Team consumes these docs without asking for clarification.
**Complexity estimate:** Small.

---

## F-048
**Status:** Developed (local)
**Feature name:** Home "Get started" state coherence (PDF #42, #43, #44, #47)
**Business Value Hypothesis:** As an owner, the Home page's "Get started in 3 steps" block, the `O1 Owner · IT Executor` subtitle, Settings, and Team must agree on a single source of truth for "who is IT Executor" and "what has been done". Today (PDF 2026-04-14): (#42) the 3 steps never prompt an owner to invite the team; (#43) Home subtitle says "IT Executor" while Settings > Email platform says "Not set"; (#44) first-visit step-1 strikethrough disappears after navigation — two different Home renderings of the same state; (#47) after owner reassigns IT Executor to an employee, Home still says "Invite your IT Executor" in step 1. The four findings share one root cause: the "Get started" block derives its state from ad-hoc sources rather than a canonical org-state selector. Fix that once; all four symptoms go away.
**Importance:** High — first-impression trust damage on every owner's first visit.
**Urgency:** High — visible in production now.
**Acceptance Criteria:**
- AC-1: Introduce a canonical `getOwnerHomeState(org, membership)` selector returning a deterministic object: `{ steps: [...], itExecutor: { id, name, isSelf }, pendingItInvite: bool }`. Every Home render consumes this selector; no other component re-derives these values.
- AC-2: (#42) The "Get started" step list includes an Invite-team step positioned before "Start your first assessment". Product Team confirms placement during 2b refinement and the page matrix reflects it.
- AC-3: (#43) Home subtitle ("Owner · IT Executor") derives from the same selector — if `itExecutor.id === membership.user_id` then subtitle is "Owner · IT Executor"; else "Owner". Settings page reads from the same source. Subtitle and Settings can never disagree.
- AC-4: (#44) Step-1 strikethrough state is pure-function of `getOwnerHomeState()` output and does not depend on client-side session cache or first-visit flag. Navigating to Checklist and back leaves the strikethrough identical.
- AC-5: (#47) If `itExecutor.id !== current_user` and `pendingItInvite === false`, step 1 renders as "IT Executor: {name}" with a green tick; it never says "Invite your IT Executor" when an executor is assigned.
- AC-6: Invariants added to `docs/quality/invariants.md`: (INV-home-exec-parity) Home subtitle == Settings IT-executor resolution; (INV-home-steps-deterministic) "Get started" step states unchanged by navigation.
- AC-7: Home page matrix `docs/quality/matrices/home.md` has cells for every persona × every region reflecting the fix.
- AC-8: Playwright tests in `invariants.spec.ts` assert AC-3 and AC-4 across O1/O2/O3.
**Scope:** `frontend/app/workspace/page.tsx` (Home) refactor to canonical selector; Settings page read alignment; update `home.md` matrix; extend invariants.
**Not in Scope:** Redesigning the Home layout beyond the `Get started` block. Adding onboarding for non-owner roles.
**Dependencies:** F-045 (matrices), F-046 (test suite).
**Risk and amount of Test:** Chance: 2, Impact: 2. Cross-user and cross-navigation E2E required.
**Complexity estimate:** Medium.

---

## F-049
**Status:** Developed (AC-2 / AC-3 / AC-5 / AC-6 green locally — AC-1 awaits Stefan applying migration 024 in Supabase; AC-4 partial, tracked in F-046 stubs)
**Feature name:** Team invite "Revoke + delete data" — fix `digest()` error + clarify copy (PDF #45, #46)
**Business Value Hypothesis:** As an owner revoking a pending invite with full PII deletion, the red "Revoke + delete data" button must work. Today it errors with `function digest(text, unknown) does not exist` because migration 024 (`024_pi14_member_deletion_rpc.sql`) ships referenced by code but was never applied in Supabase (PDF #46). Also the confirmation wording "permanently delete the pending invite and any audit log PII" is opaque to users (PDF #45). Fix both.
**Importance:** High — advertised GDPR feature is broken in PROD.
**Urgency:** High.
**Acceptance Criteria:**
- AC-1: Migration 024 is applied in Supabase (Stefan action; verified by RPC call returning success instead of `digest()` error).
- AC-2: If the RPC is missing, the client surfaces a clear error ("Data deletion is temporarily unavailable — contact support") instead of leaking the Postgres error string. (Defence in depth.)
- AC-3: Confirmation dialog text is rewritten: "This will permanently delete the pending invite AND every record the invitee's email appears in (audit log entries, any partial assessment responses). The invitee cannot join using the existing link." No jargon "audit log PII".
- AC-4: Persona smoke suite (F-046) covers O1 → Team → Pending Invites → Revoke+Delete path for every persona that reaches Team.
- AC-5: Playwright invariant asserts that pressing Revoke+Delete either succeeds or shows a non-leaky error (never raw DB error text).
- AC-6: Team page matrix `docs/quality/matrices/team.md` cell for "Pending invites row > Revoke + delete data" documents expected behavior per persona.
**Scope:** `frontend/app/workspace/team/page.tsx` (confirmation copy), RPC wrapper (error handling). Apply migration 024 via Stefan.
**Not in Scope:** Redesigning the invite lifecycle. Changing gray "Revoke" behaviour (works today).
**Dependencies:** Migration 024 must be applied in Supabase before AC-1 passes.
**Risk and amount of Test:** Chance: 2, Impact: 2. GDPR path — must verify data really is gone, not just that UI says so.
**Complexity estimate:** Small.

---

## F-050
**Status:** Created
**Feature name:** Auth-boundary coherence — login + onboarding redirect and copy context (PI-16 matrix finding)
**Business Value Hypothesis:** Signed-in users who revisit `/login` today see a "Welcome back" magic-link form with no redirect (defect L-AUTH-SIGNED-IN); first-time visitors see the same "Welcome back" copy (L-WELCOMEBACK-FIRSTVISIT); `/onboarding` briefly renders the form for users who already have an org before the guard fires (O-GUARD-FLICKER); the pending-invite client guard on `/onboarding` is bypassable cross-browser (O-INVITE-FALLTHROUGH). All four are auth-state coherence issues on the same boundary as F-048 Home state. Fix once, as a pair.
**Importance:** High — first-contact trust + a minor security/data-integrity concern.
**Urgency:** Medium — none are visible in the PDF Stefan provided, but all are one-step-off-path discoveries any owner could hit.
**Acceptance Criteria (to be refined by Product Team at PI-17 2b):**
- Login: signed-in persona reaching `/login` redirects to `/workspace` (or `/onboarding` if no org) server-side.
- Login: H1 and side info-card share a context class (fresh / signup / invite).
- Onboarding: server-side guard precedes any render for already-onboarded users.
- Onboarding: pending-invite check runs server-side, not client-only.
- New invariant `INV-login-page-no-authed-users`.
**Scope:** `frontend/app/login/page.tsx`, `frontend/app/onboarding/page.tsx`, associated middleware/server-component guards.
**Not in Scope:** OAuth flows, password-based auth.
**Dependencies:** F-048 (selector pattern may be reusable), F-046 (smoke suite validates redirects).
**Risk and amount of Test:** Chance: 2, Impact: 2.
**Complexity estimate:** Small.

---

## F-051
**Status:** Created
**Feature name:** Public `/checklist` — redirect signed-in users + retire legacy dual-progress state (PI-16 matrix finding)
**Business Value Hypothesis:** Signed-in users who land on the public `/checklist` currently fall into an interactive view that writes to the legacy `user_checklists` table (per `checklist-public.md` R9 defect). This creates a parallel progress state that never reaches Dashboard/Report — a silent data-integrity issue that undermines every invariant tied to dashboard parity. Redirect signed-in users to `/workspace/checklist` and retire the legacy write path.
**Importance:** High — causes silent data divergence that BA testing would not easily catch.
**Urgency:** Medium.
**Acceptance Criteria (refine at PI-17 2b):**
- Signed-in persona on `/checklist` redirects to `/workspace/checklist`.
- ANON on `/checklist` continues to see read-only view (`INV-public-checklist-readonly`).
- Legacy `user_checklists` table writes removed from the signed-in code path; table itself may remain for backfill/read-only. Note CLAUDE.md: "Legacy localStorage sync — do not extend" already applies.
- Data-migration plan for existing `user_checklists` rows (if any) written before code changes land.
- New invariant `INV-single-progress-source-per-user`.
**Scope:** `frontend/app/checklist/page.tsx`, any API touched by the legacy write path.
**Not in Scope:** Schema drop of `user_checklists` table (that's a later cleanup).
**Dependencies:** None.
**Risk and amount of Test:** Chance: 2, Impact: 3 (silent data risk).
**Complexity estimate:** Small-Medium.

---

## F-052
**Status:** Created
**Feature name:** Graceful missing-integration UX — Stripe, AI, SMTP (PI-16 matrix finding)
**Business Value Hypothesis:** When third-party integrations are absent or misconfigured the UI currently fails opaquely: Billing's "Upgrade to Campaign Pro" button silently swallows a 501 when `STRIPE_SECRET_KEY` is missing (billing.md R5); checklist error copy references a Settings AI-disable toggle that does not exist (checklist.md R13); other similar paths likely exist. Users see spinners-to-nothing or copy that points at non-existent controls. Codify a pattern: detect missing config → disable the affordance + show a non-jargon message, never surface raw 501s.
**Importance:** Medium.
**Urgency:** Medium — Stripe is currently intentionally absent (MEMORY.md action item).
**Acceptance Criteria (refine at PI-17 2b):**
- Missing `STRIPE_SECRET_KEY` → upgrade button disabled + clear "Payments not yet enabled — join the waitlist" copy that matches the R6 waitlist card.
- Missing `ANTROPIC_API_KEY` → AI chat hidden entirely, not "disabled mid-chat".
- New invariant `INV-missing-integration-graceful`.
- Existing invariant `INV-no-raw-db-errors` extended to "no raw integration errors" (or its sibling added).
**Scope:** `frontend/app/workspace/billing/page.tsx`, `frontend/app/workspace/checklist/**`, integration-detection helper.
**Not in Scope:** Actually enabling Stripe/Anthropic.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 2.
**Complexity estimate:** Small.

---

## F-053
**Status:** Created
**Feature name:** Privacy page claim realignment — §4/§8 copy vs code (PI-16 matrix finding)
**Business Value Hypothesis:** The privacy page contains copy that does not match shipped code: §8 "Right of access" implies full data access for every user (privacy.md D1) but employees only get self-delete + "contact owner"; §8 "Right to object" (phishing awareness) promises opt-out with no in-app control (D2); §4 "Vercel EU edge network" is narrowly incorrect (D4). Privacy-page overstatements in a GDPR-positioned product are a reputational and compliance risk.
**Importance:** Medium.
**Urgency:** Medium.
**Acceptance Criteria (refine at PI-17 2b):**
- Each overstated claim is either backed by new code or softened to accurate copy ("contact your organisation owner" / "awaiting implementation — contact us to request").
- An audit (manual for now; mechanical when `INV-privacy-claim-backed-by-code` exists) maps each privacy claim to a code anchor or a delegated human process.
- Covers Security agent's Phase A finding on §8 AI-guidance opt-out.
**Scope:** `frontend/app/privacy/page.tsx` + any supporting translations in `lib/i18n/`.
**Not in Scope:** Full GDPR legal review (Stefan scope).
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 2.
**Complexity estimate:** Small.

---

## F-054
**Status:** Created
**Feature name:** Cross-page label + terminology consistency (PI-16 matrix finding)
**Business Value Hypothesis:** Matrix retrofit surfaced several same-concept-different-word drifts: Role column shows `"Org admin"` on Report vs `"Owner"` on Team (report.md R10); the response value "Skipped" is shown alongside "Not applicable" in the same page (checklist.md R14, dashboard.md R7); en-dash glyph is a third spelling for the same concept. A single `formatRoleLabel()` + `formatResponseLabel()` helper removes the drift and earns a cheap invariant.
**Importance:** Low-Medium — cosmetic but accumulates distrust.
**Urgency:** Low.
**Acceptance Criteria (refine at PI-17 2b):**
- Shared helpers `formatRoleLabel(role, locale)` and `formatResponseLabel(value, locale)` introduced in `frontend/lib/i18n/` or `frontend/lib/labels/`.
- All call sites migrated; grep-based test asserts no raw `role.replace` / `"Org admin"` / bare `"Skipped"` in JSX.
- New invariant `INV-terminology-single-source`.
**Scope:** All pages rendering role or response labels.
**Not in Scope:** Changing the canonical values in DB.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 1, Impact: 1.
**Complexity estimate:** Small.

---

## F-055
**Status:** Created
**Feature name:** Onboarding completeness — locale, platform-at-setup, drop company_size, invite-team decision (PI-16 matrix finding)
**Business Value Hypothesis:** Onboarding today (`frontend/app/onboarding/page.tsx`) has several gaps: no locale selector despite PI-10 i18n (O-NO-LOCALE); no email-platform collection at setup, which leaves Settings showing "Not set" and cross-feeds PDF #43 confusion (O-NO-PLATFORM); a `company_size` input is collected but never used (O-COMPANY-SIZE-ORPHAN); the "I'm not sure who handles IT" branch silently assigns the owner as IT executor (O-NOTSURE-SILENT-ASSIGN). Product Team deliberately chose NOT to add an invite-team step to onboarding (F-048 owns that on Home); the decision is documented, but onboarding's finish-state should reinforce it ("Your team is still on your to-do list → Home").
**Importance:** Medium.
**Urgency:** Medium.
**Acceptance Criteria (refine at PI-17 2b):**
- Locale selector added.
- Email-platform field added at setup (same values as Settings `email_platform`).
- `company_size` collection removed (unless a use case is found by PI-17 refinement).
- "I'm not sure" branch explicit: never silently assigns; either asks again or stores null with Settings CTA.
- Onboarding success state deep-links to Home's first step.
- Addresses/closes onboarding-related new invariants `INV-no-orphan-form-fields`, `INV-onboarding-no-post-setup-render`, `INV-invite-prompt-exists-somewhere`.
**Scope:** `frontend/app/onboarding/page.tsx` + schema migration if any new column needed for platform-at-setup (it already exists — `orgs.email_platform`).
**Not in Scope:** Reworking the form into a multi-step wizard.
**Dependencies:** F-048 (Home's invite-team step must land first).
**Risk and amount of Test:** Chance: 2, Impact: 2.
**Complexity estimate:** Small-Medium.

---

## F-056
**Status:** Created
**Feature name:** Summary page (`/summary`) — teaser/signed-in parity + cadence + empty state (PI-16 matrix finding)
**Business Value Hypothesis:** Matrix retrofit on `/summary` surfaced that the ANON teaser promises features not rendered on the signed-in view (S-TEASER-PROMISE-MISMATCH, S-TEASER-PRINTABLE-PROMISE, S-NEXT-STEPS-GENERIC); the empty state for users with no assessment incorrectly renders 0% progress and misroutes owners to "Set up your workspace" on a silent API error (S-ZERO-ASSESSMENT-EMPTY, S-NO-ORG-FALLBACK-WRONG); cadence and export affordances promised on the page are not implemented (S-NO-CADENCE, S-NO-EXPORT). The page is a public trust artefact: broken teaser promises hurt conversion.
**Importance:** Medium.
**Urgency:** Medium.
**Acceptance Criteria (refine at PI-17 2b):**
- Every teaser bullet has a matching signed-in region or is softened.
- Empty state distinguishes "no assessment yet" vs "API error" (no silent misroute).
- Cadence + export affordances delivered or removed from copy.
- New invariant `INV-teaser-promises-kept`. Extend `INV-dashboard-report-parity` or add `INV-summary-dashboard-parity`.
**Scope:** `frontend/app/summary/page.tsx`, i18n copy, possibly an export endpoint.
**Not in Scope:** Full report redesign.
**Dependencies:** None.
**Risk and amount of Test:** Chance: 2, Impact: 2.
**Complexity estimate:** Small-Medium.

---

## F-057
**Status:** Developed (PI 17 Iter 1 — `member-deletion.spec.ts` + `it-executor-reassign.spec.ts` migrated to `createOrgWithMembers` + `extractTokenFromPage()`; no `tokenFor()` references remain; specs now execute end-to-end rather than hanging in auth. AC-1, AC-2, AC-5 complete. AC-3 partial: specs that only depend on auth wiring pass (DELMEM-02, REASSIGN-04); specs that depend on migrations 024/025 real behavior fail due to PRODUCT DEFECTS surfaced for the first time by this migration — tracked in F-060. AC-4 pending CI run.)
**Feature name:** Migrate member-deletion + it-executor-reassign specs off PKCE-incompatible tokenFor helper
**Business Value Hypothesis:** CI has been Red since the PI-11 PKCE migration because `frontend/tests/helpers/fixtures.ts` `tokenFor()` extracts `access_token=` from a redirect URL that PKCE no longer populates. 9 tests across `member-deletion.spec.ts` + `it-executor-reassign.spec.ts` consume `tokenFor()`. Not caused by any product defect — a pure test-infrastructure artefact that obscures real CI signal and hides any new regressions in the noise. Migrating these specs to the F-043 `createOrgWithMembers` multi-user harness (which does not use access-token URLs) makes CI actually green and earns back CI as a trustworthy gate.
**Importance:** High — obscures CI signal and makes PI 16 quality-gates harder to reason about.
**Urgency:** High — cheap fix, immediate dividend.
**Acceptance Criteria:**
- AC-1: `member-deletion.spec.ts` (5 tests) refactored to use `createOrgWithMembers` + cleanup pattern from F-043. No references to `tokenFor()` remain.
- AC-2: `it-executor-reassign.spec.ts` (4 tests) same.
- AC-3: Both specs pass against local DB with migrations 022–026 applied.
- AC-4: Full CI run on main goes green (except any explicitly skipped tests which each name their follow-up feature).
- AC-5: `tokenFor()` helper is either removed (if no remaining consumers) or marked `@deprecated` with a JSDoc pointing at `createOrgWithMembers`.
**Scope:** `frontend/tests/member-deletion.spec.ts`, `frontend/tests/it-executor-reassign.spec.ts`, `frontend/tests/helpers/fixtures.ts`.
**Not in Scope:** Rewriting the F-043 harness. New coverage.
**Dependencies:** F-043 multi-user harness (already shipped).
**Risk and amount of Test:** Chance: 1, Impact: 2.
**Complexity estimate:** Small.

---

## F-058
**Status:** Created
**Feature name:** Close F-046 invariant-suite gaps — unskip stubs + add cheap CI probes
**Business Value Hypothesis:** F-046 shipped in PI 16 with 9 invariant tests running and 10 either stubbed (`test.skip` with TODO) or absent. With migrations 022–026 now applied, the stubbed tests can execute, and the cheap CI probes (auth-boundary, RLS, service-role-in-bundle, public-checklist-readonly, audit-log-pii-hashed) close most of the remaining gap. The coverage delta moves F-046 from Developed (partial) to Done.
**Importance:** Medium.
**Urgency:** Medium.
**Acceptance Criteria:**
- AC-1: Unskip `INV-email-case-normalised-on-delete` in `invariants.spec.ts` — seed `Mixed@Case.com`, delete with `mixed@case.com`, assert row gone. Relies on migration 024.
- AC-2: Unskip `INV-gdpr-delete-coherent` — delete a member via Team, assert absent from Dashboard + Report + any `audit_logs` email redacted to `[deleted]`.
- AC-3: Add `INV-workspace-auth-boundary` — loop every `/workspace/*` route, fetch with no cookie, assert redirect or empty body of seeded data.
- AC-4: Add `INV-no-service-role-in-client-bundle` — CI build-step grep `frontend/.next/static/**` for `SUPABASE_SERVICE_ROLE_KEY` string + the JWT prefix of the current service-role key. Non-zero match fails CI.
- AC-5: Add `INV-rls-on-every-smbsec1-table` — test probes `pg_tables` via service-role, asserts every `schemaname=smbsec1` row has `rowsecurity=true` and ≥ 1 policy.
- AC-6: Add `INV-public-checklist-readonly` — as ANON, render `/checklist`, assert zero response-button selectors; then sign in, assert > 0.
- AC-7: Explicitly note invariants NOT covered this PI (dashboard-report-parity already tested via F-040; checklist-track-visibility deferred; role-page-access already covered by F-018 access tests) in `docs/quality/invariants.md` with a "coverage map" block.
**Scope:** `frontend/tests/invariants.spec.ts`, `frontend/tests/smoke/personas.spec.ts`, `docs/quality/invariants.md`, `.github/workflows/*` for AC-4.
**Not in Scope:** The heavier invariants (privacy-copy-claim-backed-by-code, terminology-single-source) that belong with F-053 / F-054.
**Dependencies:** Migrations 022–026 applied (they are, per Stefan 2026-04-14). F-057 (tokenFor fix) so CI is green before adding more.
**Risk and amount of Test:** Chance: 1, Impact: 2.
**Complexity estimate:** Small.

---

## F-059
**Status:** Developed (PI 17 Iter 1 — AC-4 green: `rate-limit.spec.ts` passes against live `smbsec1.check_and_increment_rate_limit`. AC-1, AC-2, AC-3 BLOCKED by two product defects discovered when the real RPC paths were finally exercised — see F-060. AC-5 (AI flagging) deferred as out-of-scope — needs a live Anthropic call + a curated prompt-injection corpus; noted as a backlog gap. AC-6 partially applied: F-057 / F-059 updated; F-033/F-041/F-049 held at Deployed pending F-060.)
**Feature name:** Post-migration verification — F-033, F-041, F-049 happy paths + F-012 persistent rate-limit + AI flagging
**Business Value Hypothesis:** Migrations 022–026 were applied by Stefan 2026-04-14. Each of them enables a happy path that has so far run only in the "graceful fallback" mode. Running the real paths end-to-end and updating feature statuses to Done closes the books on PI 14 + PI 15 + PI 16 AC-1 items that depended on the migrations.
**Importance:** Medium.
**Urgency:** Medium.
**Acceptance Criteria:**
- AC-1: F-049 AC-1 green — Revoke + delete data on a pending invite returns success (no migration_pending fallback), row disappears, `audit_logs` email redacted.
- AC-2: F-033 member-deletion specs green (after F-057 fix unblocks them).
- AC-3: F-041 it-executor-reassign specs green.
- AC-4: F-012 rate-limit spec (if present) green against `smbsec1.rate_limits` table.
- AC-5: F-012 AI flagging — one canonical corpus item that should trigger the guardrail actually appears in `smbsec1.ai_flags` (or whatever 026 named it) as a hashed row.
- AC-6: Feature statuses updated to Done / Deployed per CLAUDE.md feature lifecycle.
**Scope:** Existing specs in `frontend/tests/`. May require small tweaks if assumptions changed.
**Not in Scope:** New feature work.
**Dependencies:** F-057 (unblocks F-033 + F-041 specs). Migrations 022–026 applied.
**Risk and amount of Test:** Chance: 2, Impact: 2.
**Complexity estimate:** Small.

---

## F-060
**Status:** Created
**Feature name:** Fix post-migration RPC defects surfaced by F-057 spec migration (pgcrypto + reassign_it_executor)
**Business Value Hypothesis:** F-057 migrated the 9 member-deletion + reassign specs onto the F-043 harness and the tests finally reached the real RPC paths (migrations 024 + 025). Running them revealed two product/migration defects that were previously hidden behind the PKCE auth failure:
  1. **`smbsec1.delete_member_with_data` (migration 024) fails with `function digest(text, unknown) does not exist`.** The migration declares `CREATE EXTENSION IF NOT EXISTS pgcrypto` at the top, but Supabase hosts `pgcrypto` in the `extensions` schema, not on the search_path of `smbsec1` functions, so `digest(...)` inside the SECURITY DEFINER function cannot resolve it. Effect: EVERY real member-deletion + pending-invite revoke+delete returns 500. The UI's `migration_pending` 503 branch does NOT fire because the RPC catches the error internally and returns `{"success": false, "error": "function digest(text, unknown) does not exist"}`. Confirmed by direct REST probe to `/rest/v1/rpc/delete_member_with_data` against PROD DB on 2026-04-14.
  2. **`smbsec1.reassign_it_executor` (migration 025) misbehaves in two ways.** (a) It accepts a `p_new_user_id` that is NOT a member of the org — the RPC returns `{"success": true, "response_count_transferred": 0}` for a random stranger UUID; E2E-REASSIGN-02 expects `{"error": "new_assignee_not_in_org"}` + 400. (b) For REASSIGN-01 + 03 + 05 it reports `response_count_transferred: 5` but the owner's 5 IT Baseline responses are GONE afterwards — either the RPC is deleting them or transferring them off the owner's `user_id`. Spec expects them preserved on the original `user_id` per migration 025 contract.
**Importance:** High — #1 blocks GDPR member-delete on PROD (F-033 AC-1, F-049 AC-1); #2 blocks IT Executor reassignment (F-041 AC-1) and can lose assessment data.
**Urgency:** High — both are live PROD-affecting bugs.
**Acceptance Criteria:**
- AC-1: `smbsec1.delete_member_with_data` succeeds end-to-end. Fix approaches: qualify as `extensions.digest(...)`, or `CREATE EXTENSION pgcrypto WITH SCHEMA smbsec1`, or switch to `encode(sha256(...)::bytea, 'hex')` (PG 14+ native). E2E-DELMEM-01/03/04/05 + F-049 AC-1 post-migration test green.
- AC-2: `/api/orgs/members` DELETE 500 path maps the `{"success": false, "error": "function ... does not exist"}` payload to the 503 `migration_pending` branch too (defense-in-depth so we never 500 on a known-missing-extension).
- AC-3: `smbsec1.reassign_it_executor` rejects non-members with `{"success": false, "error": "new_assignee_not_in_org"}`. E2E-REASSIGN-02 green.
- AC-4: `smbsec1.reassign_it_executor` preserves existing IT Baseline responses on the original user_id. E2E-REASSIGN-01/03/05 green.
- AC-5: After fixes, F-033, F-041, F-049 flip to Done (BA-verified).
**Scope:** `docs/sql/024_pi14_member_deletion_rpc.sql` (or a new `027_*` migration that patches it), `docs/sql/025_pi14_reassign_it_executor.sql` (or patch migration), `frontend/app/api/orgs/members/route.ts`.
**Not in Scope:** Rewriting the F-043 harness.
**Dependencies:** F-057 (delivered) — without it these defects remained hidden.
**Risk and amount of Test:** Chance: 2, Impact: 3.
**Complexity estimate:** Small-Medium (mostly SQL + one route.ts tweak).

