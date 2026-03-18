# PI 5 — Product Team Consensus

**Date:** 2026-03-18
**Participants:** Product Manager, UX Designer, Security Domain Expert, Business Analyst, Architect
**Process:** Live walkthrough of production app + 3 rounds of cross-functional discussion

---

## 1. Walkthrough Findings

Full walkthrough performed against https://smbsec1.vercel.app/ on 2026-03-18 using Playwright MCP browser, logged in as smbsec1_3owner@bertramconsulting.dk (Company Three BA Test, org_admin + IT executor).

### Landing Page (/)
- Clean, professional layout with teal brand color on primary CTA
- Strong messaging: "Find your biggest cyber risks in 30 minutes"
- "How SMBs actually get breached" section with 5 attack types — good educational content
- "Why this checklist" and "Why trust this tool" sections present with 6 trust signals
- Footer with privacy policy link, browse checklist, log in
- No visual branding beyond the teal button color; no logo/illustration on the hero
- No navigation bar — standalone landing page

### Public Checklist (/checklist)
- Shows ALL items (21 IT Baseline + awareness items combined) in a flat list organized by category
- Each item shows: time estimate badge, title, description, "Not started" status badge
- Collapsible "Why & how" guidance for each item
- "Sign in to save your progress and work through the checklist with your team" prompt at top with Sign in button
- "View summary" link at top right, "Back to home" link at bottom
- Items are NOT interactive — no Done/Unsure/Skipped buttons visible (read-only for anonymous)
- Design uses blue/indigo color scheme for category headers, distinct from workspace teal

### Summary Page (/summary)
- Shows "Sign in to see your progress summary" with brief explanation
- Has Sign in button, and two navigation links: "Browse the checklist first" and "Home"
- Dead end for anonymous users — no teaser content showing what they would see

### Login Page (/login)
- Clean: email field, "Send sign-in link" button
- "New here?" section explains the 3-step process (enter email, set up org, invite team)
- "Back to home" link at bottom
- After sending: confirmation message with same-browser warning

### Privacy Page (/privacy)
- Comprehensive GDPR-compliant privacy policy
- Sections: What data we store, Where stored (EU), No tracking/ads, Your rights, Emails, Contact
- Page title has duplicate suffix: "Privacy Policy | SMB Security Quick-Check | SMB Security Quick-Check"
- "Back to home" link at bottom

### Auth Callback
- Shows "Signing you in..." spinner, then redirects to /workspace
- Worked correctly within ~2 seconds

### Workspace Home (/workspace)
- Header bar: "smbsec | Company Three BA Test" with hamburger menu
- Shows "Org Admin - IT Executor" role labels
- 6 navigation cards: My checklist (with mini progress bar), Dashboard, Team, Assessments, Org Settings, Settings & data
- Clean card layout, adequate descriptions

### Workspace Checklist (/workspace/checklist)
- Header: "My checklist" with progress bar (3/36 answered, 8%)
- "Resume where you left off" button
- "25 high-impact items still need attention" callout
- IT Baseline welcome message: "Your admin has assigned you the IT Baseline track..." (dismissible)
- Two sections: "IT Baseline" (25 items) and "Security Awareness" (11 items)
- Each item has: expand arrow, title, impact badge (high/medium), "tap for guidance" hint
- Response buttons: Done/Unsure/Skipped for IT Baseline; "I've done this"/"Not yet"/"Not applicable" for Awareness
- Expanded guidance shows "Why it matters" + numbered steps + template download links where applicable
- **KEY DIFFERENCE FROM /checklist**: workspace version has response buttons, impact badges, track grouping, no time estimates; public version has time estimates, category descriptions, different color scheme, read-only

### Dashboard (/workspace/dashboard)
- "No assessment completed" banner (yellow)
- Active assessment card: "org assessment - active - started 3/18/2026"
- Progress: 8/58 responses (14%) with breakdown (5 Done, 2 Unsure, 1 Skipped)
- Per-track progress: IT Baseline 12% (3/25), Awareness 15% (5/11)
- "Print summary" button
- Team progress section with 3 members, each showing: role, name, percentage, response counts, clickable for drill-down

### Team Page (/workspace/team)
- Invite form: email field, role dropdown (Employee/Manager), IT executor checkbox
- Team members list: 3 members with names, roles, join dates
- Pending invites section (empty)
- Clean, functional layout

### Assessments Page (/workspace/assessments)
- Explanation text about what assessments are
- "Assessment already in progress" disabled button
- Active assessment card with "Mark complete" button
- No history of past assessments visible (this is the first/only)

### Org Settings (/workspace/settings)
- Email platform dropdown (set to Microsoft 365)
- IT executor dropdown (set to Company 3 Owner)
- "Save settings" button
- Link to "Settings & data (export, deletion)"
- Simple, functional

### Settings & Data / GDPR (/workspace/settings/gdpr)
- Data storage disclosure (EU/Ireland)
- "Delete my account" section — DISABLED with two warnings:
  - "You are the org admin and other members exist. Delete the organisation first."
  - "You have direct reports. Remove them before deleting your account."
- Export data: "Download JSON export" button
- Members list showing 3 members by truncated UUID (not display names!) with "Remove" buttons for non-admins
- Delete organisation section with confirmation input (type org name)
- Delete button correctly disabled until name matches

---

## 2. Issues Discovered

| # | Page | Issue | Severity | Notes |
|---|------|-------|----------|-------|
| ISS-01 | /workspace/settings/gdpr | Members shown by truncated UUID, not display name | Medium | Team page and Dashboard show names; GDPR page shows "e80a12b2-5a8..." — inconsistent and unhelpful |
| ISS-02 | /privacy | Duplicate page title suffix | Low | "Privacy Policy \| SMB Security Quick-Check \| SMB Security Quick-Check" |
| ISS-03 | /checklist vs /workspace/checklist | Two completely different checklist implementations | High | Public checklist uses localStorage sync + static items.ts; workspace uses assessment_items from DB. Different designs, different item sets, different interactions. Confusing for users who browse anonymously then sign up. |
| ISS-04 | /summary | Dead end for anonymous users | Medium | No teaser content, just "Sign in to see your progress summary" |
| ISS-05 | / (landing) | No logo or wordmark on landing page | Low | Workspace nav has "smbsec" wordmark but landing page has none — feels disconnected |
| ISS-06 | /workspace/checklist | No "back to top" or section nav | Low | 36 items is a long scroll; no way to jump between sections |
| ISS-07 | All workspace pages | "Loading..." flash on every page transition | Low | Every workspace page shows bare "Loading..." text before rendering; no skeleton or spinner |
| ISS-08 | /workspace/assessments | No assessment history or comparison | Medium | After completing and starting new assessments, no way to see historical progress |
| ISS-09 | /workspace/checklist | Owner sees ALL 36 items (IT + Awareness) | Medium | Owner who is IT executor must scroll through all items; no collapse/filter by track or status |
| ISS-10 | / (landing) | Landing page lacks nav bar | Low | No persistent header nav; user must scroll to bottom for links |
| ISS-11 | /workspace/dashboard | "No assessment completed" shown alongside active assessment | Low | Yellow banner seems redundant/confusing when there IS an active assessment below it |
| ISS-12 | Auth emails | Emails come from "Supabase Auth" / noreply@mail.app.supabase.io | Medium | A security tool sending emails from a generic Supabase domain undermines trust and looks like phishing |
| ISS-13 | /workspace/checklist | No way to log out from checklist page | Low | Must use hamburger menu which is not immediately obvious |
| ISS-14 | /checklist | Public checklist shows items users cannot act on | Low | Anonymous users see items but cannot respond; no clear CTA to sign up at item level |

---

## 3. Discussion Record

### Round 1: Strategic Direction — What should PI 5 focus on?

**Product Manager:** We have shipped 4 PIs. The core workflow works: sign up, create org, invite team, assess, view dashboard. PI 4 added drill-down, templates, brand color, mobile nav, SEO basics. The app is functional but flat. The big strategic question for PI 5 is: what makes this product **sticky**? Right now a business owner completes the checklist once and has no compelling reason to return until the quarterly reminder. We need to solve three things: (1) the two-checklist problem — two completely different codebases serving the same purpose, (2) post-completion value — what happens after 100%?, and (3) the guidance depth problem — static steps are good but insufficient for non-technical users who need real help implementing controls. I want PI 5 to be themed **"From Checklist to Platform"** — we move from a one-time checklist tool to an ongoing security management companion.

**UX Designer:** The two-checklist problem is genuinely confusing. I walked through both: /checklist has time estimates, colorful category headers, expandable "Why & how" panels, and a read-only browsing experience. /workspace/checklist has impact badges, response buttons, guidance with steps, template downloads, and track grouping. They share almost no code, different visual styles, and different data sources. A user who browses /checklist anonymously, signs up, and lands on /workspace/checklist sees what feels like a completely different product. My proposal: **unify them.** The public checklist should be a read-only preview of the workspace checklist, using the same component library. When signed in, the same view gains response buttons. This eliminates a maintenance burden and gives users visual continuity. Beyond that, I want to focus on **reducing overwhelm** — 36 items in a long scroll is daunting. We need filtering (by track, by status, by impact level), a progress sidebar, and better section navigation.

**Security Domain Expert:** From a security value perspective, the biggest gap is **actionability**. The checklist tells you WHAT to do but not HOW in sufficient detail for a non-technical person. "Set up SPF, DKIM, and DMARC for your domain" has 3-line steps. A real SMB owner needs to know: what is SPF? Where do I find my DNS settings? What exact records do I add? This is where **AI-powered contextual guidance** becomes compelling — not as a chatbot, but as an "Explain this" button on each item that generates a step-by-step walkthrough tailored to the user's email platform and technical level. Keep it scoped to security checklist topics only. Second priority: **assessment history and trend tracking**. The value of quarterly reassessments is seeing improvement over time. Right now there is no comparison between assessments. Third: the awareness items remain problematic — "Spot a phishing email" is self-reported with no verification. We should add lightweight **scenario questions** (show a screenshot of a suspicious email, ask "Is this phishing?") before allowing "I've done this."

**Business Analyst:** Looking at the data: Company 3 has 3 members, 8/58 responses after setup (14%). That is typical — initial engagement is high but completion will stall without nudging. Key metrics gaps: we have no analytics on where users drop off in the checklist, which items get "Unsure" most often (suggesting unclear guidance), or how many orgs actually complete an assessment cycle. For PI 5, I recommend: (1) unify the checklists (ISS-03, High) — this is technical debt that compounds over time, (2) add checklist filtering and progress tracking (ISS-09) to reduce drop-off, (3) implement assessment comparison to prove value of quarterly reviews. The AI guidance is exciting but risky — it introduces API costs, latency, prompt engineering, and a new failure mode. I would scope it as a single iteration with clear boundaries.

**Architect:** The two-checklist problem is the highest-priority technical debt. The public checklist (`/app/checklist/page.tsx`) uses `lib/checklist/items.ts` (static data), localStorage sync, and the legacy `user_checklists` table. The workspace checklist (`/app/workspace/checklist/page.tsx`) uses `assessment_items` from Supabase, the workspace context provider, and the assessment responses table. They share zero components. Unifying them means: (1) create a shared `ChecklistView` component that renders items identically, (2) the public page passes static items in read-only mode, (3) the workspace page passes assessment items with response handlers. This is a significant refactor (2-3 days) but eliminates a major maintenance liability. For AI guidance: we would need an API route (`/api/guidance/[itemId]`) that calls an LLM API (Claude or GPT), scoped to the item context + org platform. Rate-limit to prevent abuse. Cache responses per item+platform combo. Cost would be minimal at SMB scale (pennies per request). The bigger concern is latency and UX — streaming responses would require SSE or similar.

### Round 2: Convergence on scope and priorities

**Product Manager:** Clear alignment on three priorities: (1) unify checklists, (2) AI guidance, (3) assessment comparison/history. Let me propose the iteration structure:

- **Iteration 1: Unify & Simplify** — Merge the two checklists into one component system; add filtering by track/status/impact; fix the GDPR page member display (ISS-01); fix the privacy page title (ISS-02). This is the foundation work that makes everything else better.
- **Iteration 2: AI Guidance** — Add "Explain this" button on checklist items that generates contextual, platform-aware guidance using an LLM. Scoped to security topics only. Cached per item+platform. Rate-limited.
- **Iteration 3: Assessment Intelligence** — Assessment history with comparison between cycles; trend visualization showing improvement over time; scenario-based verification for awareness items.

**UX Designer:** I agree with the structure. For Iteration 1, I want to add: (a) a sticky section sidebar for the checklist (shows categories with completion indicators, click to jump), (b) a filter toolbar (All / Unanswered / Done / Unsure, and track filter for IT Baseline / Awareness), (c) the public checklist gets a redesign to match the workspace aesthetic. For the AI guidance UX: I envision a slide-out panel or expandable section below the existing guidance. The user clicks "Need more help?" and gets a tailored explanation. Show a typing indicator while streaming. Include a "Was this helpful?" feedback mechanism. Important: the AI guidance should complement, not replace, the static guidance — static guidance loads instantly, AI is there for deeper questions.

**Security Domain Expert:** For the AI guidance scope, I want strict boundaries: (1) the LLM can ONLY discuss security topics related to the checklist items — no general conversation, (2) the system prompt includes the item's title, description, why_it_matters, steps, and the org's email platform, (3) responses are cached per item+platform combination to minimize cost, (4) rate limit: 10 AI requests per user per hour. For scenario-based verification on awareness items: I would create 2-3 scenario questions per awareness item. Example for "Spot a phishing email": show a screenshot of a real-looking phishing email and ask the user to identify what makes it suspicious. The user must answer correctly before "I've done this" unlocks. This is a massive upgrade to the integrity of the awareness track. However, it requires content creation (scenarios + correct answers) and a new UI component. It fits naturally in Iteration 3.

**Business Analyst:** I want to add concrete success metrics for PI 5:
- **Checklist completion rate**: target 40% of items answered within first session (currently unknown — no analytics)
- **AI guidance usage**: >20% of users click "Need more help?" at least once
- **Assessment completion**: >50% of orgs complete their first full assessment within 30 days
- **Return rate**: >30% of org_admins return within 90 days for reassessment

For assessment history, the minimum viable version is: on the dashboard, show a table of past assessments with date, total responses, % done. A "compare" view that highlights items that changed status between assessments (e.g., "Unsure" in Q1 became "Done" in Q2). This proves the tool's value proposition — "you are getting more secure over time."

**Architect:** Technical feasibility assessment:

- **Iteration 1 (Unify)**: Refactor both checklist pages to use a shared component library (`ChecklistSection`, `ChecklistItem`, `GuidancePanel`, `ResponseButtons`). Public page becomes a thin wrapper that passes static items in read-only mode. Workspace page passes assessment items with response callbacks. Estimated 3-4 days of refactoring. No new APIs needed. No migrations.

- **Iteration 2 (AI Guidance)**: New API route `/api/guidance` (POST, takes `item_id`, `platform`, `question`). Uses Claude API (Anthropic SDK). System prompt scopes the response to the specific item. Response cached in a new `guidance_cache` table (item_id + platform + question_hash -> response). Rate limit via existing rate-limit middleware. Frontend: new `AiGuidance` component that calls the API and renders a streaming response. Requires: `ANTHROPIC_API_KEY` env var, new migration for cache table, ~3 days of work. Cost: ~$0.01 per request at current Claude pricing, negligible at SMB scale.

- **Iteration 3 (Assessment Intelligence)**: Assessment history requires modifying the dashboard API to return completed assessments. New API: `GET /api/assessments/history` returns list of completed assessments with summary stats. New API: `GET /api/assessments/compare?a=<id>&b=<id>` returns item-level diff. Scenario questions: new `scenario_questions` table (item_id, question_text, options[], correct_index). New component `ScenarioGate` that shows questions before unlocking the "I've done this" button. Migration required. 4-5 days of work.

### Round 3: Final consensus

**Product Manager:** We have strong alignment. Let me sharpen the scope and confirm what we are NOT doing.

**NOT doing in PI 5:**
- Email phishing campaigns (paid tier, multi-PI effort, not until monetization walkthrough with Stefan)
- i18n / localization (Stefan said "not now")
- Payment/billing functionality (no paid tier yet)
- Branded auth emails (Supabase free tier custom SMTP investigation stalled in PI 4)
- Mobile app (web-first)
- Real DEV/PREPROD/PROD environments
- Anonymous benchmarking (no user base yet)

**UX Designer:** Confirmed. One addition: in Iteration 1, we should add a **landing page navigation bar** with the smbsec wordmark, linking to /checklist, /login, and /privacy. This creates visual continuity between the landing page and the workspace. Currently the landing page feels disconnected.

**Security Domain Expert:** Agreed on all scope. For AI guidance, I want to emphasize: the LLM must never give advice that contradicts or goes beyond the checklist scope. The system prompt must include explicit boundaries. Also, we should add a disclaimer: "AI-generated guidance — verify recommendations with your IT provider." This protects us legally and sets appropriate expectations.

**Business Analyst:** Final acceptance criteria confirmed. All items tagged with clear ACs below. I also recommend we track the unification refactor carefully — it touches every page that renders checklist items, and regressions could break the core workflow.

**Architect:** Confirmed feasibility. The only external dependency is the Anthropic API key for Iteration 2. If we cannot get that approved, we can substitute with a different LLM provider or defer AI to PI 6. The unification refactor in Iteration 1 is the riskiest item from a regression perspective — I recommend running full E2E after the refactor before adding new features.

**All:** Consensus reached.

---

## 4. PI 5 Scope

### Theme: "From Checklist to Platform"

Transform SMBsec from a one-time checklist into an ongoing security management companion with unified UX, intelligent guidance, and progress tracking over time.

---

### Iteration 1: Unify & Simplify

**Goal:** Eliminate the two-checklist problem, reduce checklist overwhelm, and fix known issues.

| # | Deliverable | Description |
|---|------------|-------------|
| 1.1 | Unified checklist component library | Shared `ChecklistSection`, `ChecklistItem`, `GuidancePanel`, `ResponseButtons` components used by both /checklist (read-only) and /workspace/checklist (interactive) |
| 1.2 | Public checklist redesign | /checklist uses the same visual style as workspace checklist — impact badges, consistent cards, same expand/collapse behavior. Anonymous visitors see items in read-only mode with "Sign in to respond" CTAs |
| 1.3 | Checklist filtering toolbar | Filter by: track (IT Baseline / Awareness / All), status (All / Unanswered / Done / Unsure / Skipped), impact (High / Medium / All). Persisted in URL params |
| 1.4 | Section navigation sidebar | Sticky sidebar (desktop) or dropdown (mobile) showing category names with completion indicators. Click to jump to section |
| 1.5 | Landing page nav bar | Persistent header with smbsec wordmark + links to /checklist, /login, /privacy |
| 1.6 | GDPR page: show display names | ISS-01 fix: show member display names instead of truncated UUIDs |
| 1.7 | Privacy page title fix | ISS-02 fix: remove duplicate suffix |
| 1.8 | Loading skeleton | Replace bare "Loading..." text with a shimmer skeleton on workspace pages |

**Acceptance Criteria:**
- AC-PI5-01: /checklist and /workspace/checklist render items using the same shared component
- AC-PI5-02: /checklist shows all items in read-only mode with "Sign in to respond" on each item
- AC-PI5-03: Filter toolbar on /workspace/checklist allows filtering by track, status, and impact
- AC-PI5-04: Section nav sidebar shows all categories with completion counts
- AC-PI5-05: Landing page has a persistent nav header with wordmark
- AC-PI5-06: GDPR members section shows display names (fallback to email, then truncated UUID)
- AC-PI5-07: Privacy page title is "Privacy Policy | SMB Security Quick-Check" (no duplicate)
- AC-PI5-08: Workspace pages show skeleton/shimmer instead of "Loading..." text
- AC-PI5-09: All 53+ existing E2E tests pass after refactor

---

### Iteration 2: AI-Powered Guidance

**Goal:** Help non-technical users actually implement security controls with context-aware, platform-specific AI guidance.

| # | Deliverable | Description |
|---|------------|-------------|
| 2.1 | AI guidance API | POST /api/guidance — accepts item_id, optional follow-up question. Returns LLM-generated guidance scoped to the item and org's email platform. Rate-limited (10 req/user/hour). |
| 2.2 | Guidance cache | Cache AI responses per item+platform+question hash in a `guidance_cache` table. Subsequent identical requests return cached response instantly. |
| 2.3 | "Need more help?" UI | Button below static guidance that expands an AI guidance panel. Shows streaming response with typing indicator. Includes "Was this helpful?" feedback. |
| 2.4 | Scoped system prompt | LLM system prompt restricts responses to the specific checklist item's security topic. Includes item title, description, why_it_matters, steps, and org platform. |
| 2.5 | AI disclaimer | "AI-generated guidance — verify with your IT provider" disclaimer on all AI responses |
| 2.6 | Anthropic API integration | Server-side Anthropic SDK integration with ANTHROPIC_API_KEY env var |

**Acceptance Criteria:**
- AC-PI5-10: "Need more help?" button appears below static guidance on each checklist item
- AC-PI5-11: Clicking the button shows a loading indicator, then a streamed AI response
- AC-PI5-12: AI response is specific to the item and references the org's email platform (e.g., Microsoft 365 steps)
- AC-PI5-13: Identical requests return cached response without calling the LLM
- AC-PI5-14: Rate limit: user receives a friendly message after 10 requests per hour
- AC-PI5-15: AI never discusses topics outside the checklist item's security scope
- AC-PI5-16: Disclaimer text visible on every AI response

---

### Iteration 3: Assessment Intelligence

**Goal:** Make quarterly reassessments valuable by showing progress over time and improving awareness item integrity.

| # | Deliverable | Description |
|---|------------|-------------|
| 3.1 | Assessment history | Dashboard shows a table of past assessments: date, scope, total responses, % done, % unsure |
| 3.2 | Assessment comparison | "Compare" view highlighting items that changed status between two assessments (unsure->done, skipped->done, done->unsure) |
| 3.3 | Trend indicator | Visual indicator on dashboard showing the org's security posture trend (improving / stable / declining) based on done-count across assessments |
| 3.4 | Scenario questions for awareness | 2-3 scenario questions per awareness item (e.g., "Is this email phishing?" with a screenshot). User must answer correctly before "I've done this" unlocks. |
| 3.5 | Scenario content | Create scenario question content for all 11 awareness items (33 questions total) |
| 3.6 | Dashboard "No assessment completed" fix | ISS-11: hide or rephrase the yellow banner when an active assessment exists |

**Acceptance Criteria:**
- AC-PI5-17: Dashboard displays a list of completed assessments with date, response count, and completion percentage
- AC-PI5-18: User can select two assessments and see a side-by-side comparison of changed items
- AC-PI5-19: Trend indicator shows improving/stable/declining based on done-percentage across last 3 assessments
- AC-PI5-20: Awareness items show scenario questions before allowing "I've done this" response
- AC-PI5-21: User must answer scenario question correctly to mark awareness item as done
- AC-PI5-22: At least 2 scenario questions exist per awareness item
- AC-PI5-23: Dashboard banner correctly reflects assessment state (no "No assessment completed" when one is active)

---

## 5. Creative Feature Ideas (Beyond Stefan's List)

These are ideas that emerged from the walkthrough and discussion that go beyond what Stefan explicitly requested. They are candidates for PI 6+ consideration.

### 5.1 Security Score & Shareable Badge
Generate a numeric "security readiness score" (0-100) based on checklist responses weighted by impact. Organizations that score above thresholds (e.g., 70+) get a shareable badge/certificate they can embed on their website or include in insurance renewal conversations. This creates an incentive to complete the checklist AND a viral distribution mechanism.

### 5.2 IT Consultant Portal
Create a separate view for IT consultants/MSPs who manage multiple SMB clients. A consultant logs in and sees a dashboard of all their client organizations with security scores, overdue reviews, and items marked "Unsure" (indicating the client needs help). This makes SMBsec a tool that IT consultants actively recommend because it generates leads for their services.

### 5.3 Industry Benchmarking (Anonymous)
Once there is a meaningful user base (100+ orgs), show anonymous benchmarks: "67% of companies your size have enabled MFA" or "You are ahead of 80% of small businesses on backup practices." This creates social proof and motivation. Requires no data sharing — just aggregate statistics.

### 5.4 Guided Onboarding Wizard
Replace the current "create org, invite team, start assessment" flow with a 5-minute guided wizard that: (1) asks 3 diagnostic questions ("Do you use Microsoft 365 or Google Workspace?", "How many employees?", "Does someone handle IT?"), (2) auto-configures the org settings, (3) generates a personalized priority list ("Based on your setup, these 5 items will reduce your risk the most"), (4) sends the first invite. This dramatically reduces time-to-value and makes the first experience feel personalized.

### 5.5 "Quick Win" Mode
Instead of showing all 36 items, offer a "Quick Win" mode that surfaces the 5 highest-impact, lowest-effort items first. After completing those, the user gets a celebration screen showing their risk reduction, then is offered the full checklist. This addresses the overwhelm problem and gives users an early sense of accomplishment.

### 5.6 Incident Response Drill
A guided simulation where the owner clicks "Run a drill" and the system walks them through a scenario: "One of your employees just clicked a suspicious link. What do you do?" The system presents options at each step, and at the end shows which steps of their incident response plan they would have used. This transforms the incident response checklist item from a document exercise into a practical drill.

### 5.7 Vendor Security Quick-Check
A stripped-down version of the checklist that an SMB owner can send to their vendors/suppliers: "Before we work with you, please complete this 10-item security check." Results come back to the org's dashboard. This extends the product's reach and creates a network effect — every vendor who receives the check becomes a potential SMBsec user.

### 5.8 Weekly Security Tip
A lightweight engagement mechanism: each week, surface one relevant security tip on the workspace home page based on the user's incomplete items. "This week's focus: MFA. Did you know that 99.9% of account takeover attacks are stopped by MFA?" Links to the relevant checklist item. Can be pushed via email for orgs that opt in.

### 5.9 Role-Specific Dashboards
Instead of one dashboard for all roles, create tailored views:
- **Owner view**: high-level score, risk exposure, team completion rates, trend
- **IT executor view**: technical items grouped by urgency, implementation status, configuration guide links
- **Employee view**: personal completion status, next action, learning resources

### 5.10 Integration Health Checks
For orgs on Microsoft 365 or Google Workspace: offer automated checks that verify certain controls are actually enabled (e.g., check if MFA is enforced org-wide via the admin API). This moves from self-reported to verified status. Requires OAuth integration with M365/Google admin APIs. High value, high complexity — PI 7+ candidate.

---

## 6. Updated Backlog

### Done — PI 1 through PI 4
(See previous backlog entries — all delivered)

### PI 5 — Planned

#### Iteration 1: Unify & Simplify
- Unified checklist component library (shared between /checklist and /workspace/checklist)
- Public checklist redesign (same visual style as workspace)
- Checklist filtering toolbar (track, status, impact)
- Section navigation sidebar
- Landing page navigation bar with wordmark
- GDPR page: display names instead of UUIDs (ISS-01)
- Privacy page title fix (ISS-02)
- Loading skeleton for workspace pages

#### Iteration 2: AI-Powered Guidance
- AI guidance API (POST /api/guidance, Anthropic SDK)
- Guidance cache table (item+platform+question -> response)
- "Need more help?" UI with streaming response
- Scoped system prompt (security topics only)
- AI disclaimer on responses
- Rate limiting (10 req/user/hour)

#### Iteration 3: Assessment Intelligence
- Assessment history on dashboard
- Assessment comparison view (diff between cycles)
- Trend indicator (improving/stable/declining)
- Scenario-based verification for awareness items
- Scenario question content (2-3 per awareness item)
- Dashboard "No assessment completed" banner fix

### Deferred — PI 6+ Candidates
- Email phishing campaigns (paid tier)
- i18n / localization (Danish + English)
- Payment/billing functionality
- Branded auth emails (Supabase custom SMTP)
- Security score & shareable badge
- IT consultant portal / multi-org view
- Industry benchmarking (anonymous aggregates)
- Guided onboarding wizard
- "Quick Win" mode (top 5 items first)
- Incident response drill
- Vendor security quick-check
- Weekly security tip (workspace + email)
- Role-specific dashboards
- Integration health checks (M365/Google admin API)
- Real DEV/PREPROD/PROD environments
- Anonymous benchmarking stats
- Mobile app

---

*Generated by the Product Team (PM, UX, Security, BA, Architect) on 2026-03-18 after live walkthrough of production app.*
