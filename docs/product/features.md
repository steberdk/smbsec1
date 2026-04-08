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
**Status:** Created
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
**Status:** Created
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
**Status:** Created
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
**Status:** Created
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
**Status:** Created
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
**Status:** Created
**Feature name:** AI checklist guidance as interactive chat
**Business Value Hypothesis:** One-shot AI doesn't help with specific setups. Users need back-and-forth conversation scoped to checklist item.
**Importance:** Medium. **Urgency:** Low — deferred.
**Acceptance Criteria:** TBD.
**Scope:** Multi-turn chat UI per checklist item.
**Not in Scope:** General-purpose AI assistant.
**Dependencies:** Anthropic API, F-012.
**Risk and amount of Test:** TBD.
**Complexity estimate:** Medium-Large.

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
**Status:** Created
**Feature name:** Owner can remove team member (GDPR member deletion)
**Business Value Hypothesis:** Owner must remove people from team and delete all their data for GDPR compliance.
**Importance:** Medium. **Urgency:** Low — deferred.
**Acceptance Criteria:** TBD.
**Scope:** Team page "Remove", API, cascade delete.
**Dependencies:** None.
**Risk and amount of Test:** TBD.
**Complexity estimate:** Small-Medium.
