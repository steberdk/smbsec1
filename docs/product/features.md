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
**Status:** Created
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
**Status:** Created
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
