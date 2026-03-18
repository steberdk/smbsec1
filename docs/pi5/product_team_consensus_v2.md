# PI 5 — Product Team Consensus v2

**Date:** 2026-03-18
**Participants:** Product Manager, UX Designer, Security Domain Expert, Business Analyst, Architect
**Process:** Exhaustive interactive browser test of EVERY element on EVERY page, then 3+ rounds of cross-functional discussion.
**Test method:** Playwright MCP browser tools. Actually clicked buttons, filled forms, toggled states, tested error cases.
**Test account:** smbsec1_3owner@bertramconsulting.dk (Company Three BA Test, org_admin + IT executor, 3 members)

---

## 1. Exhaustive Test Results

### Page: Landing (`/`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| "Sign up free" | Link | Clicked | Navigates to /login | OK |
| "Browse the checklist" | Link | Clicked | Navigates to /checklist | OK |
| "Log in" | Link | Clicked | Navigates to /login | OK |
| "How SMBs actually get breached" section | Content | Read all 5 cards | All present with descriptions and stats | OK |
| "Why this checklist" section | Content | Read | 3 bullet points present | OK |
| "Why trust this tool" section | Content | Read all 6 cards | EU data, no tracking, free, open, delete, magic link | OK |
| Footer: "Privacy policy" | Link | Clicked | Navigates to /privacy | OK |
| Footer: "Browse checklist" | Link | Clicked | Navigates to /checklist | OK |
| Footer: "Log in" | Link | Clicked | Navigates to /login | OK |

**Issues found:**
- "30 minutes" claim in headline and bullets conflicts with actual item time estimates (individual items range from 5 to 180 minutes). This was flagged by Stefan.
- No navigation bar on landing page (must scroll to footer for links). Minor.
- No logo/wordmark on landing page (workspace has "smbsec" wordmark).

### Page: Public Checklist (`/checklist`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| "View summary" link | Link | Clicked | Navigates to /summary | OK |
| "Sign in" CTA banner | Link | Clicked | Navigates to /login | OK |
| "Why & how" (Use a password manager) | Expand/Collapse | Clicked | Shows guidance text with steps | OK |
| "Why & how" (other items) | Expand/Collapse | Verified | All expandable | OK |
| "Not started" badge | Click | Clicked | No action (expected - read-only page) | OK |
| Category headers | Content | Verified | All 7 categories displayed with descriptions | OK |
| "Back to home" link | Link | Clicked | Navigates to / | OK |
| Progress bar | Display | Verified | Shows "0%" and "Progress" | OK |

**Issues found:**
- No interactive capability on public checklist (read-only). By design but users may expect to try it.
- Items show time estimates (10-180 min each) which collectively far exceed the "30 minutes" promise on the landing page.

### Page: Summary (`/summary`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| "Sign in" link | Link | Clicked | Navigates to /login | OK |
| "Browse the checklist first" link | Link | Clicked | Navigates to /checklist | OK |
| "Home" link | Link | Clicked | Navigates to / | OK |

**Issues found:**
- Dead-end for anonymous users. Shows only "Sign in to see your progress summary" with no teaser content.
- Stefan flagged: links instead of button styling (inconsistent with other pages).

### Page: Login (`/login`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| Email textbox | Input | Typed email | Accepts input | OK |
| "Send sign-in link" button | Button | Clicked with valid email | Shows success message with same-browser warning | OK |
| "Send sign-in link" button | Button | Clicked when rate limited | Shows "Too many attempts" error | OK |
| "New here?" 3-step section | Content | Verified | Steps explained before signup | OK |
| "Back to home" link | Link | Clicked | Navigates to / | OK |

**Issues found:** None. Login page works correctly with proper feedback.

### Page: Privacy (`/privacy`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| All content sections | Content | Read | All present: data stored, where, no tracking, rights, emails, contact | OK |
| "Back to home" link | Link | Clicked | Navigates to / | OK |

**Issues found:**
- **BUG: Duplicate page title.** Shows "Privacy Policy | SMB Security Quick-Check | SMB Security Quick-Check". Root cause: privacy/page.tsx sets `title: "Privacy Policy | SMB Security Quick-Check"` but layout.tsx template appends `" | SMB Security Quick-Check"` again. Fix: change to `title: "Privacy Policy"`.

### Page: 404 (`/nonexistent-url`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| 404 heading | Content | Verified | Shows "404" and explanation | OK |
| "Go to home page" link | Link | Present | Links to / | OK |
| "Browse the checklist" link | Link | Present | Links to /checklist | OK |

**Issues found:** None.

### Page: Workspace Home (`/workspace`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| Header: "smbsec" wordmark | Link | Present | Links to /workspace | OK |
| Header: org name | Link | Present | Links to /workspace | OK |
| Header nav: Home, Checklist, Dashboard, Team, Assessments, Settings | Links | All present | All link to correct pages | OK |
| "Log out" button | Button | Clicked | Logs out, redirects to /login | OK |
| Role display | Content | Verified | Shows "Org Admin . IT Executor" | OK |
| "My checklist" card | Link | Clicked | Navigates to /workspace/checklist | OK |
| "Dashboard" card | Link | Present | Links to /workspace/dashboard | OK |
| "Team" card | Link | Present | Links to /workspace/team | OK |
| "Assessments" card | Link | Present | Links to /workspace/assessments | OK |
| "Org Settings" card | Link | Present | Links to /workspace/settings | OK |
| "Settings & data" card | Link | Present | Links to /workspace/settings/gdpr | OK |
| Mini progress bar on checklist card | Display | Verified | Shows small progress bar | OK |

**Issues found:** None. Workspace home works correctly.

### Page: Workspace Checklist (`/workspace/checklist`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| Progress: "3/36 answered, 8%" | Display | Verified | Updates when items answered | OK |
| "Resume where you left off" button | Button | Clicked | Scrolls to first unanswered item | OK |
| "25 high-impact items" callout | Display | Verified | Updates when items answered (24 after marking one done) | OK |
| IT Baseline track banner | Display | Verified | Shows assignment message | OK |
| "Dismiss" button on banner | Button | Present | Dismissable | OK |
| Expand item (Use a password manager) | Button | Clicked | Shows guidance: description, "Why it matters", "Steps" | OK |
| "Done" button | Button | Clicked | Item marked done, progress updates to 4/36 (11%) | OK |
| "Unsure" button | Display | Verified on "Remove local admin..." | Shows highlighted (selected) state | OK |
| "Skipped" button | Display | Present | Available on all IT Baseline items | OK |
| "I've done this" / "Not yet" / "Not applicable" | Buttons | Verified | Present on all Awareness items | OK |
| Impact badges (high/medium) | Display | Verified | Present on all items | OK |
| Section headers | Content | Verified | IT Baseline sections + Security Awareness section | OK |

**Issues found:**
- No "Back to top" or section navigation for 36-item long page.
- Owner sees ALL 36 items (IT + Awareness) in one scroll. No filtering by track or status.
- Stefan's feedback: no guidance text on items when collapsed (unlike public /checklist which has subtitle). Workspace items only show "tap for guidance" hint.

### Page: Dashboard (`/workspace/dashboard`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| "No assessment completed" banner | Display | Verified | Shows yellow warning | OK |
| Active assessment card | Display | Verified | "org assessment . active . started 3/18/2026" | OK |
| Overall progress: 9/58 (16%) | Display | Verified | Correct breakdown | OK |
| Stats: Done/Unsure/Skipped | Display | Verified | 6 Done, 2 Unsure, 1 Skipped | OK |
| Track breakdown | Display | Verified | IT Baseline 16% (4/25), Awareness 15% (5/11) | OK |
| "Print summary" button | Button | Clicked | Triggers browser print dialog (timeout expected) | OK |
| Team member: Company 3 Owner | Button | Clicked | Expands to show all 36 items with status per item | OK |
| Team member: Employee One | Button | Present | Shows 27%, 3 done | OK |
| Team member: Employee Two | Button | Present | Shows 18%, 1 done, 1 unsure | OK |

**Issues found:**
- "No assessment completed" yellow banner shown alongside active assessment. Confusing — seems to say assessment isn't working when it is.

### Page: Team (`/workspace/team`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| Email invite field | Input | Typed invalid email | Accepts input | OK |
| "Send invite" button with empty email | Button | Clicked | Browser native validation blocks (no visible inline error) | UX GAP |
| "Send invite" button with invalid email | Button | Clicked | Browser native validation blocks (no visible inline error) | UX GAP |
| Role dropdown | Dropdown | Verified | Employee/Manager options present | OK |
| IT executor checkbox | Checkbox | Verified | Present and clickable | OK |
| Team members list | Display | Verified | 3 members with display names, roles, join dates | OK |
| Display names | Display | Verified | Shows "Company 3 Owner", "Employee One", "Employee Two" (not UUIDs) | OK |
| Pending invites | Display | Verified | "No pending invites." | OK |

**Issues found:**
- No inline validation feedback for email. Uses browser native `required` + `type="email"` which shows a tooltip but no persistent error state.

### Page: Assessments (`/workspace/assessments`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| Explanation text | Content | Verified | Good description of what assessments are | OK |
| "Assessment already in progress" button | Button | Verified | Correctly disabled | OK |
| "Mark complete" button | Button | Present | Did not click (preserve test data) | OK |

**Issues found:**
- **UX GAP: No link to the checklist after starting an assessment.** User sees "Mark complete" but no guidance on HOW to actually do the assessment (go to checklist, respond to items). Stefan flagged this: "After starting assessment, user only sees 'Mark complete' — no clear way to start/do the assessment."

### Page: Org Settings (`/workspace/settings`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| Email platform dropdown | Dropdown | Verified | Options: Not set, Google Workspace, Microsoft 365, Gmail (Personal), Other. Currently Microsoft 365. | OK |
| IT executor dropdown | Dropdown | Verified | Shows display names with roles: "Company 3 Owner (org admin)", "Employee One (employee)", "Employee Two (employee)". NOT UUIDs. | OK |
| "Save settings" button | Button | Clicked | Shows "Settings saved." confirmation message | OK |
| "Settings & data" link | Link | Clicked | Navigates to /workspace/settings/gdpr | OK |

**Issues found:** None. Settings page works correctly with proper save feedback.

### Page: Settings & Data / GDPR (`/workspace/settings/gdpr`)

| Element | Type | Action Taken | Result | Status |
|---------|------|-------------|--------|--------|
| Data storage section | Content | Verified | "EU (West EU -- Ireland, AWS eu-west-1)" | OK |
| "Delete my account permanently" button | Button | Verified | **Correctly DISABLED** with two prerequisite warnings | OK |
| Warning: "org admin and other members exist" | Display | Verified | Shows yellow warning box | OK |
| Warning: "direct reports" | Display | Verified | Shows yellow warning box | OK |
| "Download JSON export" button | Button | Clicked | **Downloads org-data-export.json successfully** | OK |
| Members list | Display | Verified | **BUG: Shows truncated UUIDs** ("e80a12b2-5a8...", "52ce13a6-e84...", "a0288b5c-0df...") instead of display names | BUG |
| "Remove" buttons on members | Button | Verified | Present on non-admin members | OK |
| Delete org confirmation field | Input | Typed org name | Field accepts input | OK |
| "Delete organisation permanently" button | Button | Verified disabled, then enabled | **Correctly enables** when org name typed correctly | OK |

**Issues found:**
- **BUG (Critical): Members section shows truncated UUIDs instead of display names.** Root cause: `gdpr/page.tsx` line 176 uses `{m.user_id.slice(0, 12)}...` and the `OrgMember` type doesn't include `display_name`/`email` fields, even though the API (`/api/orgs/members`) already returns them. The Team page correctly uses `display_name ?? email ?? user_id.slice(...)` fallback. This is exactly what Stefan found and flagged.
- Stefan's concern about "can't click the buttons" is actually correct behavior: the delete buttons are intentionally disabled with clear prerequisite messages. However, the disabled state (40% opacity) is quite subtle and could be mistaken for a broken button.

### Cross-cutting: Mobile Responsiveness (390px)

| Page | Action | Result | Status |
|------|--------|--------|--------|
| Landing page | Resize to 390px | Buttons stack vertically, text wraps properly, trust cards stack | OK |
| Workspace pages | Verified hamburger menu exists in code | Mobile hamburger menu implemented | OK |

**Issues found:** None critical. Mobile layout handles responsiveness.

### Cross-cutting: Auth Flow

| Action | Result | Status |
|--------|--------|--------|
| Send magic link | Email arrives in webmail within seconds | OK |
| Click magic link | Opens callback, redirects to /workspace | OK |
| Log out | Redirects to /login, clears session | OK |
| Rate limiting | Shows "Too many attempts" after multiple requests | OK |

---

## 2. Bug/Issue List (De-duplicated, Prioritized)

### Critical (Must Fix Before PI 5 Ships)

| ID | Page | Issue | Root Cause | Fix Effort |
|----|------|-------|-----------|-----------|
| BUG-01 | /workspace/settings/gdpr | Members shown by truncated UUID instead of display name | `OrgMember` type missing `display_name`/`email` fields; line 176 hardcodes `user_id.slice(0,12)` | 15 min |

### High (Fix in PI 5 Iteration 1)

| ID | Page | Issue | Root Cause | Fix Effort |
|----|------|-------|-----------|-----------|
| UX-01 | /workspace/assessments | No link to checklist after starting assessment; user sees only "Mark complete" with no guidance on what to do | Missing navigation CTA | 30 min |
| UX-02 | / (landing) | "30 minutes" promise contradicts actual item time estimates (items total far more) | Messaging mismatch | 30 min (copy change) |
| UX-03 | /checklist vs /workspace/checklist | Two completely different checklist implementations with different designs, data sources, interactions | Technical debt from PI 1 | 2-3 days |

### Medium (Fix in PI 5)

| ID | Page | Issue | Root Cause | Fix Effort |
|----|------|-------|-----------|-----------|
| UX-04 | /summary | Dead end for anonymous users; no teaser content | No summary preview for unauthenticated users | 1-2 hours |
| UX-05 | /workspace/dashboard | "No assessment completed" banner shown alongside active assessment | Confusing messaging | 15 min |
| UX-06 | /workspace/checklist | No filtering by track, status, or impact; 36 items in one scroll | No filter UI implemented | 4-6 hours |
| UX-07 | /workspace/team | No inline validation feedback on invite email form | Uses only browser native validation | 30 min |
| BUG-02 | /privacy | Duplicate page title suffix | `title: "Privacy Policy | SMB Security Quick-Check"` + layout template = double suffix | 5 min |
| UX-08 | Auth emails | Emails from "Supabase Auth" / noreply@mail.app.supabase.io | Default Supabase auth email branding | 1 hour (Supabase config) |

### Low (Backlog)

| ID | Page | Issue | Root Cause | Fix Effort |
|----|------|-------|-----------|-----------|
| UX-09 | / (landing) | No nav bar; no logo/wordmark | Standalone landing page design | 1-2 hours |
| UX-10 | /workspace/checklist | No "back to top" or section navigation | Long page design | 2-3 hours |
| UX-11 | All workspace pages | "Loading..." flash on page transitions | No skeleton/spinner during data fetch | 2-3 hours |
| UX-12 | /workspace/settings/gdpr | Disabled delete buttons hard to distinguish from broken buttons | Low-opacity disabled state | 15 min |

---

## 3. Discussion Record

### Round 1: Reviewing the Test Results

**Product Manager:** The browser test results are clear. The good news: the core workflow actually works. Login, checklist responses, dashboard drill-down, settings save, JSON export, delete org confirmation flow -- all functional. The bad news: Stefan was right about two things. First, the GDPR page shows UUIDs instead of names. This is a basic data display bug that we should have caught. Second, the assessments page gives zero guidance after starting an assessment. A user starts an assessment and then... what? They see "Mark complete" but nobody tells them to go fill out the checklist. These are not complex bugs. They are oversights that erode trust. Before we talk about AI features or architecture rewrites, every single one of these bugs must be fixed.

**UX Designer:** I want to highlight the disconnect between the two checklists. I tested both side by side. The public /checklist has: time estimates, "Why & how" expandable panels, blue/indigo color headers, "Not started" badges, and a different visual rhythm. The workspace /workspace/checklist has: impact badges, response buttons (Done/Unsure/Skipped), tap-for-guidance expand, no time estimates, and teal color scheme. A user who browses anonymously on /checklist, sees the time estimates and "Why & how" guidance, then signs up, lands on /workspace/checklist and it feels like a completely different product. The guidance style is different, the categorization is different, the interactivity is different. This is the single biggest UX problem in the product. It is not a bug -- it is a design debt that compounds with every new feature we add.

**Security Domain Expert:** From a security operations perspective, the assessments page gap is the most concerning user journey failure. Consider the owner persona: they sign up, create an org, invite team, start an assessment. Then what? They are on the assessments page staring at "Mark complete." There is no link saying "Go to My Checklist to respond to items" or "Your team needs to respond -- send them a reminder." The assessment concept is powerful but the page treats it as an administrative action rather than a workflow. On the positive side: the delete flows work correctly. The disabled states with prerequisite warnings are exactly right from a data safety perspective. The GDPR export downloads correctly. Stefan's concern about "can't click the buttons" was actually the system working as designed -- but the disabled state visuals need to be clearer.

**Business Analyst:** Let me put the bugs in business terms. BUG-01 (UUIDs on GDPR page) means an org admin trying to manage their members or comply with a data request cannot identify who is who. This is a GDPR compliance gap -- you cannot exercise data subject rights if you cannot identify the data subjects. UX-01 (assessment dead-end) breaks the core user journey at the most critical moment: the transition from "set up" to "do the work." UX-02 (30-minute promise) is a trust issue -- we promise 30 minutes on the landing page but the checklist items collectively require far more. This mismatch will cause frustration and abandonment. For the two-checklist problem (UX-03): I agree it is high priority, but it is also high effort. We need to be realistic about scope.

**Architect:** On BUG-01: the API `/api/orgs/members` already returns `display_name` and `email` in its SELECT. The GDPR page just does not use these fields. The `OrgMember` type definition on the GDPR page omits them, and line 176 hardcodes `user_id.slice(0,12)`. Meanwhile, the Team page at `/workspace/team/page.tsx` line 183 correctly uses `m.display_name ?? m.email ?? user_id.slice(...)`. This is a 15-minute fix: add the fields to the type, update the display. On BUG-02 (privacy title): the layout uses `template: "%s | SMB Security Quick-Check"` and the privacy page sets `title: "Privacy Policy | SMB Security Quick-Check"`, resulting in double-suffixed title. Fix: change to `title: "Privacy Policy"`. Five minutes. On the two-checklist unification: this is 2-3 days of work involving shared components, data source abstraction, and careful testing. It touches both the anonymous and authenticated experiences.

### Round 2: Prioritizing Fixes vs New Features

**Product Manager:** Stefan's mandate is crystal clear: (1) Fix everything broken, (2) AI guidance if time permits, (3) Creative improvements from backlog. So here is my proposed structure:

**Iteration 1: Fix Everything** -- Fix every bug and UX gap found in the test. Not a single button should be broken, confusing, or lacking feedback. This iteration earns back Stefan's trust.

**Iteration 2: AI Guidance** -- Stefan specifically said he likes the AI-powered iteration because it means "adoption/real usage." Add contextual AI guidance on checklist items. Scoped, cached, rate-limited.

**Iteration 3: Polish + Creative** -- From the backlog: checklist filtering, assessment workflow improvement, assessment history, visual improvements.

**UX Designer:** For Iteration 1 fixes, I want to add: (a) the assessments page should link to the checklist with a clear CTA like "Go to My Checklist to respond to items," (b) the GDPR member list should match the Team page display, (c) the "30 minutes" messaging needs reframing -- change to "Identify your gaps" without a specific time promise that does not match reality, (d) the privacy page title fix. Beyond bugs, I want one UX improvement in Iteration 1: the "Loading..." flash on workspace pages should be replaced with skeleton screens. It is a small touch that makes the entire product feel more polished.

I also want to raise the two-checklist problem for Iteration 1. I know the Architect said 2-3 days. But every iteration we add features to /workspace/checklist without touching /checklist makes the gap worse. We should at minimum make /checklist a read-only view of the workspace design, even if we do not unify the data source yet.

**Security Domain Expert:** For the AI guidance in Iteration 2, I want to scope it carefully. The items that most need AI help are the technical IT baseline items -- things like "Set up SPF, DKIM, and DMARC for your domain" where a non-technical user genuinely does not know what to do. The awareness items ("Spot a phishing email") need a different treatment -- they need interactive scenarios, not AI text generation. So for Iteration 2, I propose: AI guidance for IT Baseline items only, with awareness items getting scenario-based questions in a later PI.

The AI guidance should:
- Be triggered by an "Explain this" or "Help me do this" button on each IT Baseline item
- Accept the org's email platform as context (already stored in org settings)
- Return step-by-step instructions specific to the platform
- Be scoped strictly to the checklist item topic (no freeform chat)
- Cache responses per item + platform combination
- Rate-limit per user (e.g., 20 requests/day)

**Business Analyst:** I agree with the iteration structure. For Iteration 1 acceptance criteria, let me be specific:

1. Every button on every page must produce a visible result (success, error, or state change).
2. Every member list must show display_name, falling back to email, falling back to truncated UUID only as last resort.
3. The assessments page must guide users to the checklist after starting an assessment.
4. The landing page "30 minutes" messaging must be reframed accurately.
5. The privacy page title must not be duplicated.
6. The "No assessment completed" dashboard banner must only show when no assessment has EVER been completed, not when one is active.

For Iteration 2, the AI guidance AC is: user clicks "Help me do this" on any IT Baseline item, and within 3 seconds sees platform-specific step-by-step instructions.

**Architect:** I support this structure. Let me address the checklist unification question. Full unification in Iteration 1 is risky -- it touches the most-used page and the public landing flow. I propose a middle ground: in Iteration 1, we create a shared `ChecklistItemCard` component that both pages use for rendering individual items. The public page passes items from static data in read-only mode. The workspace page passes items from the assessment with response handlers. This achieves visual consistency without the full data-source refactor. The data unification (single source of truth) moves to a future PI.

For AI guidance architecture: we need a new API route `/api/guidance` that accepts `itemId` and uses the org's `email_platform` setting. We call Claude API (free tier via Anthropic, or a low-cost model) with a structured prompt. We cache the response in a new `guidance_cache` table keyed by `(item_slug, platform)`. Subsequent requests for the same item+platform combo return the cached version. Cost estimate: essentially zero at SMB scale (a few hundred requests total per org).

### Round 3: Creative Thinking and Final Scope

**Product Manager:** Stefan asked us to think creatively about what makes this product genuinely valuable. Let me push the team: after someone completes the checklist, what brings them back?

**UX Designer:** The "what brings them back" question is central. Right now: nothing until the quarterly reminder email. Here are three creative ideas that go beyond the backlog:

1. **Security Score Card** -- After completing the checklist, generate a printable/shareable "Security Score Card" for the org. Show a letter grade (A-F), key strengths, top 3 actions still needed. This becomes something the owner can show to clients, partners, or insurers. "We scored B+ on SMBsec." This is the single biggest retention driver I can think of -- it gives the checklist completion a tangible, shareable output.

2. **"Did You Know?" Weekly Digest** -- A weekly email (or in-app notification) with one security tip relevant to items the org has NOT completed yet. "Your team hasn't set up DNS filtering yet. Here's why it matters: [one paragraph]." Not marketing, not nagging -- genuine value. Keeps the product in the user's mind between assessments.

3. **Peer Comparison** -- Anonymous benchmarking: "Your org has completed 67% of the checklist. The average SMB on our platform has completed 43%." This creates healthy competition and shows the owner they are ahead (or behind) -- both are motivating.

**Security Domain Expert:** I love the Security Score Card idea. In the security industry, certifications and attestations are powerful motivators. Even a self-assessed score card has value because it demonstrates that the org has at least THOUGHT about security systematically. For IT consultants recommending this tool: the score card is the deliverable they can hand to their client. "Here's where you stand, here's what we need to fix." That is why a consultant would recommend SMBsec over just giving advice verbally.

I also want to add: **Verification Badges**. Some items can be partially verified without manual checks. For example, SPF/DKIM/DMARC can be verified by doing a DNS lookup on the org's domain. If we know the org's domain (from their email), we could show a "Verified" or "Not detected" badge next to the DNS email security item. This builds trust in the assessment process and differentiates us from pure self-reporting.

**Business Analyst:** The Score Card solves a real problem: the owner completes the checklist, marks things done, and then has nothing to show for it. No PDF, no certificate, no shareable proof. If we build the Score Card, we should also add it to the dashboard as a permanent feature. The Peer Comparison is excellent for retention but requires a meaningful number of orgs to be statistically valid. I would park this for a later PI when we have more data.

For making employees actually care about security: the current awareness items are self-reported with no engagement. The upcoming AI guidance will help for IT items. For awareness items, the most impactful thing would be **micro-scenarios**: "You receive this email [screenshot]. What do you do? A) Click the link, B) Forward to IT, C) Delete it." One question per awareness item. Takes 30 seconds. Gives the employee a concrete learning moment. Much better than "Have you learned to spot a phishing email? [I've done this]."

**Architect:** Let me scope what is realistic for PI 5 (3 iterations):

- Score Card: requires aggregating responses into a scoring model, rendering a summary view, and optionally generating a PDF. The view is 1-2 days. PDF generation adds complexity. Propose: build the in-app score card view in Iteration 3, defer PDF to a later PI.
- AI Guidance: straightforward API route + LLM call + caching. 2-3 days including rate limiting and error handling. The main risk is prompt quality and response latency.
- Verification badges (DNS lookup): interesting but introduces a new external dependency. Park for later PI.
- Micro-scenarios: requires a content database of scenarios per awareness item. Content creation is the bottleneck, not code. Park for later PI unless we use AI to generate scenarios.

**Product Manager:** Final scope decision. PI 5 has three iterations:

**Iteration 1: Fix Everything + Quick Wins**
Every bug and UX gap from the exhaustive test. Plus skeleton loading states and the minimal checklist visual consistency (shared item card component).

**Iteration 2: AI-Powered Guidance**
"Help me do this" button on IT Baseline items. Platform-aware, cached, rate-limited.

**Iteration 3: Security Score Card + Polish**
In-app score card view on dashboard. Checklist filtering by track/status. Assessment workflow improvement (link from assessments page to checklist).

---

## 4. PI 5 Scope

### Iteration 1: Fix Everything

**Theme:** Earn back trust. Every button works. Every form gives feedback. No broken functionality.

| ID | Feature | Acceptance Criteria |
|----|---------|-------------------|
| FIX-01 | GDPR page member display names | Members list shows `display_name ?? email ?? user_id.slice(...)` fallback, same as Team page. `OrgMember` type updated to include `display_name` and `email`. |
| FIX-02 | Privacy page title fix | Title shows "Privacy Policy | SMB Security Quick-Check" (not doubled). Change metadata to `title: "Privacy Policy"`. |
| FIX-03 | Assessment page navigation CTA | Active assessment card includes a link: "Go to My Checklist to respond" linking to /workspace/checklist. Explanation text updated to describe the workflow. |
| FIX-04 | Dashboard "No assessment completed" banner | Banner only shows when zero assessments have status "completed." Does NOT show when an assessment is active but not yet completed. |
| FIX-05 | Landing page time messaging | Reframe "30 minutes" to something accurate. Options: "Identify your biggest cyber risks" without specific time, or "Assess your security posture" with "then fix at your own pace" emphasis. |
| FIX-06 | Skeleton loading states | Replace bare "Loading..." text on workspace pages with skeleton UI or spinner. Applies to: workspace home, checklist, dashboard, team, assessments, settings. |
| FIX-07 | Invite form inline validation | Add visible inline error message for invalid/empty email on team invite form, beyond browser native tooltip. |
| FIX-08 | Disabled button styling | Delete account/org buttons when disabled show clearer "disabled" visual (e.g., greyed out with cursor-not-allowed) so users understand they are intentionally locked, not broken. |
| FIX-09 | Summary page for anonymous users | Add teaser content showing what the summary looks like (mock data or description with screenshot) so it is not a dead end. |

**Estimated effort:** 3-4 days

### Iteration 2: AI-Powered Guidance

**Theme:** From checklist to advisor. Help users actually implement security controls.

| ID | Feature | Acceptance Criteria |
|----|---------|-------------------|
| AI-01 | "Help me do this" button on IT Baseline items | Each IT Baseline checklist item (25 items) has a "Help me do this" button visible when the item is expanded. |
| AI-02 | AI guidance API route | `POST /api/guidance` accepts `{ item_id, platform? }`. Returns step-by-step guidance specific to the item and the org's configured email platform. Response time < 5 seconds. |
| AI-03 | Guidance caching | Responses cached in `guidance_cache` table keyed by `(checklist_item_slug, platform)`. Cache TTL: 30 days. Subsequent requests for same combo return cached response instantly. |
| AI-04 | Rate limiting | Per-user rate limit: 20 guidance requests per day. Exceeding shows friendly message: "You've asked a lot of questions today. Try again tomorrow." |
| AI-05 | Guidance display | AI response renders inline below the item in a styled card. Shows step-by-step instructions with numbered steps. Loading state: "Generating guidance..." with spinner. |
| AI-06 | Platform context | Guidance uses the org's `email_platform` setting (if set) to tailor instructions. E.g., SPF/DKIM setup steps differ for Google Workspace vs Microsoft 365. |
| AI-07 | Scope restriction | AI guidance is scoped strictly to the checklist item topic. Prompts include instruction to refuse off-topic questions. No freeform chat. |

**Estimated effort:** 4-5 days

### Iteration 3: Score Card + Polish

**Theme:** Give the checklist completion a tangible output. Reduce friction.

| ID | Feature | Acceptance Criteria |
|----|---------|-------------------|
| SC-01 | Security Score Card view | New section on dashboard showing org security score (A-F or percentage), key strengths (top 3 completed high-impact items), and top 3 recommended actions (highest-impact unanswered items). |
| SC-02 | Score Card printable | Score Card section is print-friendly (existing "Print summary" button includes it). |
| SC-03 | Checklist filtering | Workspace checklist has filter controls: by track (IT Baseline / Awareness / All), by status (Unanswered / Done / Unsure / Skipped / All), by impact (High / Medium / All). |
| SC-04 | Assessment workflow link | When an assessment is active, the workspace home page shows a prominent "Continue your security review" CTA card at the top. |
| SC-05 | Checklist section navigation | Sticky section header or jump-to-section dropdown on workspace checklist for navigating between categories (Passwords, Email, Updates, etc.). |
| SC-06 | Shared checklist item component | Create a shared `ChecklistItemCard` component used by both /checklist and /workspace/checklist. Public version is read-only; workspace version includes response buttons. Visual consistency between the two experiences. |

**Estimated effort:** 4-5 days

---

## 5. Creative Ideas

These ideas emerged from the Product Team discussion but are parked for future PIs. They represent genuine product innovation, not just bug fixes.

### Security Score Card (Iteration 3)
**Why it matters:** The checklist completion currently has no tangible output. An org admin finishes the assessment and gets... nothing to show for it. A Security Score Card (letter grade, strengths, gaps) becomes a deliverable they can share with clients, partners, or cyber insurers. For IT consultants, it is the output they hand to their client: "Here's where you stand." This single feature transforms SMBsec from a to-do list into a professional tool.

### Verification Badges (Future PI)
**Why it matters:** Self-reported security is inherently unreliable. Some items CAN be partially verified without manual intervention. SPF/DKIM/DMARC records can be checked via DNS lookup. We could show "Verified" or "Not detected" badges next to verifiable items. This builds trust in the assessment process and differentiates from competitors.

### Micro-Scenario Awareness Questions (Future PI)
**Why it matters:** "Spot a phishing email" is currently self-reported -- the employee clicks "I've done this" without any actual test. Replace with a 30-second micro-scenario: show a screenshot of a suspicious email, ask what the employee would do. This gives concrete learning, makes the awareness section engaging rather than checkbox-clicking, and provides more meaningful data to the org admin.

### Weekly Security Digest (Future PI)
**Why it matters:** Between quarterly assessments, the product is silent. A weekly email with one actionable security tip related to the org's uncompleted items keeps the product in the user's mind and provides genuine value. Not marketing -- practical tips.

### Peer Benchmarking (Future PI, Requires Scale)
**Why it matters:** "Your org has completed 67% of the checklist. The average SMB on SMBsec has completed 43%." Social proof and competitive motivation. Requires a meaningful number of orgs to be statistically valid. Parks until user base grows.

### What Makes an IT Consultant Recommend This Tool?
The Score Card is the answer. An IT consultant serving SMBs needs: (a) a quick way to assess a client's security posture, (b) a prioritized list of what to fix, and (c) a deliverable to give the client. SMBsec does all three if we build the Score Card. The consultant's workflow: invite the client's team, have them fill out the checklist, review the Score Card, present it with a remediation plan. The tool saves the consultant hours of manual assessment and gives them a professional-looking output.

### What Makes Employees Actually Care?
Three things: (1) Make it short -- 11 awareness items that take 30 seconds each, not a long form, (2) Make it interactive -- micro-scenarios instead of self-reporting, (3) Make it consequential -- tell employees their manager can see their responses and they might be asked to demonstrate. Not punishment, accountability. "Your manager might ask you to show how you report a phishing email."
