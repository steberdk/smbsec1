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
**Status:** Partially Developed (rate limit + privacy + CSP shipped PI 14 Iter 1 commit b5ab8be; chat-specific hardening reserved for PI 15 Iter 1)
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
**Status:** Developed (PI 14 Iter 1, commit b5ab8be — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 1, commit b5ab8be — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 1, commit b5ab8be — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 3 — pending Vercel deploy + Stefan applies docs/sql/024)
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
**Status:** Developed (PI 14 Iter 1, commit b5ab8be — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 2 — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 3 — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 1, commit b5ab8be — pending Vercel deploy + Stefan applies docs/sql/022)
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
**Status:** Developed (PI 14 Iter 2 — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 2 — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 2 — pending Vercel deploy)
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
**Status:** Developed (PI 14 Iter 3 — pending Vercel deploy + Stefan applies docs/sql/025)
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
**Status:** Developed (PI 14 Iter 1, commit b5ab8be — already removed in earlier work; regression test added)
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
**Status:** Developed (PI 14 Iter 1, commit b5ab8be — pending Vercel deploy)
**Feature name:** Reusable multi-user E2E test harness for owner+employee scenarios
**Business Value Hypothesis:** As the development team, we keep finding regressions in cross-user dashboard math, "My checklist" isolation, and IT Executor reassignment. These bugs only appear when multiple users with different roles answer items concurrently — exactly the scenarios our current single-user E2E suite barely covers. A reusable harness that spins up an isolated org with N employees of configurable role/IT-executor flags lets us test findings 31, 32, 35a-d, 36, 37 (and any future cross-user scenario) repeatably without flakiness.
**Importance:** High — prevents regression of a class of bugs that Stefan has flagged twice already.
**Urgency:** Medium — the affected fixes (F-034, F-035, F-038, F-039) all need this harness.
**Acceptance Criteria:**
- AC-1: A test helper `createOrgWithMembers({ owner, employees: [{ email, displayName, isItExecutor }] })` spins up a fresh org and member set in one call, returning Playwright contexts (one per user).
- AC-2: Each context is signed-in as its respective user (uses the existing PKCE test helper).
- AC-3: A reusable assertion `expectDashboardCounts(ctx, { resolved, done, unsureNotYet, notApplicable })` matches Stefan's labels in F-038.
- AC-4: At least one new spec uses this helper to cover: owner answers, employee answers, dashboard shows correct aggregated counts on owner's view, employee's "My checklist" remains independent.
- AC-5: New specs pass 10 consecutive runs without flakiness.
- AC-6: The harness runs in DEV (local) AND in CI (GitHub Actions) — same Supabase instance, isolated by org-name prefix per test run.
- AC-7: The harness does NOT run against PROD/Vercel — orgs are created in the dev/CI Supabase project. Stefan asked the question; answer is documented in `docs/test-strategy.md`.
**Scope:** `frontend/tests/_helpers/multiUser.ts` (new). Update `docs/test-strategy.md` with multi-user harness section. New spec(s) covering F-034, F-035, F-038, F-039.
**Not in Scope:** Running E2E against PROD. Performance testing.
**Dependencies:** Existing PKCE test helper (PI 11).
**Risk and amount of Test:** Chance: 2, Impact: 2. Test reliability is the whole point — if this is flaky it makes things worse not better.
**Complexity estimate:** Medium.
