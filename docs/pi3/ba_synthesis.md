# BA Synthesis: Walkthrough Findings and PI 3 Recommendations

**Author**: Business Analyst
**Date**: 2026-03-18
**Sources**: Stefan's PROD walkthrough (PDF), BA walkthrough report (overview), BA Company 1 report, BA Company 2 report (detailed), BA Company 3 report
**Scope**: Consolidated findings from all 3 company walkthroughs + product owner feedback

---

## 1. Consolidated Issue List

### Legend
- **Severity**: Critical / High / Medium / Low
- **Source**: Stefan = product owner PDF, BA = BA walkthrough reports, Both = identified in both
- **Category**: Bug = code defect, UX = user experience change, Content = text/copy change, Feature = new capability

| ID | Description | Severity | Affected Roles | Source | Category |
|----|-------------|----------|----------------|--------|----------|
| ISS-01 | **Workspace checklist has no guidance text.** Anonymous /checklist has full "Why & how" sections with steps and explanations. Workspace checklist shows only item title + Done/Unsure/Skipped buttons. Users who need to act get less information than anonymous browsers. | Critical | All authenticated | Both | UX |
| ISS-02 | **Landing page "30 minutes" time claim is misleading.** H1 says "Fix the biggest cyber risks in 30 minutes." Actual total is 300-750 minutes (5-12.5 hours). Even high-impact-only items total 3.5-9 hours. The word "Fix" implies implementation, not assessment. | Critical | Anonymous | Both | Content |
| ISS-03 | **Dashboard response total is wrong.** Shows "0/108 responses" (36 items x 3 members) but employees only see 11 items each. Correct total for a 3-person org with 1 IT executor should be 11+36+11=58. Percentage never reaches 100%. | High | Owner/Admin | BA | Bug |
| ISS-04 | **Display names not shown on dashboard.** Members entered display names during invite acceptance but dashboard shows raw email addresses or truncated UUIDs instead. | High | Owner/Admin | Both | Bug |
| ISS-05 | **Awareness items cannot meaningfully be marked "Done."** Items like "Spot a phishing email" and "Recognise a fake login page" are knowledge/skill items. "Done" is ambiguous -- does it mean "I read this" or "I have this skill"? No verification mechanism exists. Stefan specifically noted he could not honestly answer Done on most awareness items. | High | Owner, Employee | Both | UX |
| ISS-06 | **No onboarding context for employees.** Employee lands on bare workspace with no welcome message, no explanation of purpose, no time estimate, no guidance on what "Done" means. | High | Employee | BA | UX |
| ISS-07 | **Sign-up page does not explain the 3-step process.** After entering email, the user has no idea they will need to create/join an org, set up settings, and start an assessment. Stefan noted the 3-step setup is easy but not communicated before sign-up. | Medium | Owner | Both | Content |
| ISS-08 | **Assessment page UX is confusing.** After starting an assessment, user sees "Assessment already in progress" (disabled dark button) and "Mark complete" but no clear indication of what to do next. Stefan was confused about what to press. | Medium | Owner/Admin | Both | UX |
| ISS-09 | **IT executor shown as UUID in settings.** IT executor dropdown shows "b5f08457... (org admin)" instead of display name or email. | Medium | Owner/Admin | BA | Bug |
| ISS-10 | **No current team members list on Team page.** Only pending invites are shown. The admin and accepted members do not appear. | Medium | Owner/Admin | BA | UX |
| ISS-11 | **"Invite your IT lead" shown when owner IS IT executor.** Step 1 of "Get started in 3 steps" says "Invite your IT lead" even when the owner selected "I do" during onboarding. Should be auto-completed or show contextual text. | Medium | Owner (IT executor) | BA | Bug |
| ISS-12 | **No reminder/notification settings exist.** Stefan expected settings for reminders. No way for admin to configure reminder cadence or be notified when team members complete checklists. | Medium | Owner/Admin | Both | Feature |
| ISS-13 | **Stale auth token causes /checklist redirect.** When an expired Supabase auth token exists in localStorage, navigating to /checklist (a public page) redirects to /login instead of showing the read-only view. | High | Returning visitor | BA | Bug |
| ISS-14 | **Browser autofill contaminates onboarding form.** Form inputs lack autocomplete="off". Browser autofill pre-populates fields from previous sessions, potentially creating orgs with wrong name/settings. | Medium | New user | BA | Bug |
| ISS-15 | **No explanation of what an assessment is.** Assessments page has no context for first-time users about what assessments are, what completing one means, or why they would start another. | Medium | All authenticated | Both | Content |
| ISS-16 | **IT Baseline items shown in flat list without categories.** The anonymous checklist groups items by topic (Passwords, Email, Backups, etc.) but workspace shows 25 IT items in a flat list. Overwhelming for IT executor. | Medium | IT Executor | BA | UX |
| ISS-17 | **No templates or materials for content-creation items.** Items like "Run a 30-minute security awareness session," "Write a 1-page security rules doc," and "Write a simple incident response plan" have no downloadable templates, slide decks, or starter materials. Stefan specifically asked: how can someone answer if they did "Run a 30-minute security awareness session" if we don't show them what it is? | High | IT Executor, Owner | Both | Content |
| ISS-18 | **Missing back buttons / breadcrumbs.** Workspace pages rely solely on the top nav bar. No contextual back buttons at bottom of pages. Stefan explicitly asked "where is the usual back to.. buttons?" | Low | All authenticated | Both | UX |
| ISS-19 | **Org name truncated in nav bar.** "SMBsec1 Test Compa..." is cut off at 160px. No tooltip on hover. | Low | All authenticated | BA | UX |
| ISS-20 | **No footer with privacy/legal links on public pages.** No links to privacy policy, terms of service, or contact info. Important for an EU-targeted security product. Stefan noted footer is good but should include GDPR data visibility/deletion link. | Medium | Anonymous | Both | UX |
| ISS-21 | **Magic link emails are unbranded.** Emails come from "Supabase Auth <noreply@mail.app.supabase.io>" with no SMBsec branding, no mention of who invited the user, or what the tool is. IT person or employee receiving this may think it is spam. | Medium | Invited users | BA | UX |
| ISS-22 | **No way for IT executor to communicate blockers to admin.** No comment/note field on checklist items. IT person cannot say "I marked SPF/DKIM as Unsure because I need DNS access." | Medium | IT Executor | BA | Feature |
| ISS-23 | **Admin cannot see individual item-level responses.** Dashboard shows only aggregate numbers per member (X done, Y unsure, Z skipped). Owner cannot see WHICH items a person answered or how. Stefan wants accountability: "there should be some sort of action point for manager/owner to ask employees." | High | Owner/Admin | Both | Feature |
| ISS-24 | **No display name field during onboarding.** Admin who creates the org never gets prompted for a display name. Shows as UUID on dashboard. | Medium | Owner/Admin | BA | UX |
| ISS-25 | **"No assessment completed" banner is confusing.** Appears at top of dashboard even though an active assessment IS shown below. Reads as "there is no assessment" rather than "no assessment has been completed yet." | Medium | Owner/Admin | BA | Content |
| ISS-26 | **Anonymous /summary page is nearly empty.** Just a sign-in prompt. No preview of what the summary shows. Not useful for anonymous users coming from "View summary" link on checklist. | Low | Anonymous | Both | UX |
| ISS-27 | **Auth session sometimes not persisting.** Auth callback relies on onAuthStateChange with 5-second timeout. If session is not established in time, user is redirected to /login. Multiple magic link attempts may be needed. | Medium | All | BA | Bug |
| ISS-28 | **Employee dashboard shows wrong denominator.** Employee sees "3/36 responses (8%)" but they only have 11 items. Their percentage should be calculated against 11 awareness items, not all 36. | High | Employee | BA | Bug |
| ISS-29 | **No mobile-optimized navigation.** No hamburger menu; nav items overflow horizontally with overflow-x-auto but no visual scroll indicator. | Low | All (mobile) | BA | UX |
| ISS-30 | **Time estimates missing from workspace checklist.** Anonymous checklist shows "10-20 minutes" per item. Workspace checklist omits time estimates entirely. | Medium | All authenticated | BA | UX |
| ISS-31 | **"No fear." text on landing page.** Stefan finds this phrase sounds wrong/odd in the subheading. Requested removal. | Low | Anonymous | Stefan | Content |

---

## 2. User Journey Gaps

### Journey 0 -- Public (Learn + Decide)

**What works:**
- Landing page has clear CTAs ("Sign up free", "Browse the checklist", "Log in")
- "How SMBs actually get breached" section with 5 attack types is compelling
- Trust signals section is reassuring for SMB audience
- Anonymous checklist is well-organized with "Why & how" expandable guidance

**What is broken or confusing:**
- Time claim ("30 minutes") is misleading by 10-25x (ISS-02)
- "No fear." text feels odd to product owner (ISS-31)
- /summary page is nearly empty for anonymous users (ISS-26)
- Navigation inconsistency: /summary has text links while other pages have buttons (Stefan #3)
- Stale auth tokens break the public /checklist page for returning visitors (ISS-13)

**What is missing:**
- Footer with privacy/legal links on all public pages (ISS-20)
- Public privacy policy page (referenced from footer)
- Preview of the sign-up journey (what happens after you enter your email) (ISS-07)
- Two-list framing: the anonymous checklist mixes IT and employee items without indicating which role handles what

---

### Journey 1 -- Org Admin Creates Org

**What works:**
- Onboarding form is well-structured ("Takes about 2 minutes")
- IT handling question is well-framed with clear options
- Platform selection persists and drives platform-specific guidance
- 3-step "Get started" guide after org creation is excellent

**What is broken or confusing:**
- "Get started" Step 1 says "Invite your IT lead" even when owner chose "I do" (ISS-11)
- No display name capture for the admin during onboarding (ISS-24)
- Browser autofill can contaminate the onboarding form (ISS-14)
- Role label "org admin" is unclear for business owners (BA Company 2: "a real business owner might not know what 'org admin' means")
- No explanation that reminder emails will come (Stefan)

**What is missing:**
- Confirmation step before org creation (to catch autofill errors)
- Display name prompt for the admin
- Brief explanation of what happens next on the sign-up/login page before email entry (ISS-07)

---

### Journey 2 -- Manager Joins (partially implemented)

**What works:**
- Manager role exists in the data model
- Manager can invite direct reports

**What is broken or confusing:**
- Manager journey is not differentiated from employee journey in the current UI
- No "My team" landing for managers

**What is missing:**
- Manager-specific dashboard showing subtree progress
- Manager ability to see individual item responses for their reports (ISS-23)

---

### Journey 3 -- Employee Completes Assessment

**What works:**
- Employee sees only awareness items (correct role separation)
- Done/Unsure/Skipped buttons work
- Progress saves correctly
- Restricted navigation prevents confusion (no Team, Assessments, Settings links)
- "Resume where you left off" works

**What is broken or confusing:**
- No welcome/onboarding message (ISS-06)
- No guidance text on checklist items (ISS-01)
- "Done" is ambiguous for awareness items (ISS-05)
- Dashboard shows wrong denominator (36 instead of 11) for employee's own progress (ISS-28)
- Several items require team coordination that one person cannot complete alone (e.g., "agree on a verbal code word")

**What is missing:**
- Introductory screen explaining purpose, time commitment, what responses mean
- Clearer response options for awareness items (e.g., "I already do this / I will start doing this / I need help")
- Auto-populated IT executor contact info in "who to call" items
- Estimated time commitment upfront

---

### Journey 4 -- Start Org-Wide Assessment

**What works:**
- "Start new assessment" creates assessment immediately
- "Assessment already in progress" prevents duplicates
- Assessment items are correctly snapshotted

**What is broken or confusing:**
- After starting assessment, user sees disabled button + "Mark complete" with no guidance (ISS-08)
- No explanation of what an assessment is or what completing one means (ISS-15)
- No indication of how to proceed after starting (Stefan had to press back to find the checklist)

**What is missing:**
- Post-start redirect or clear CTA to "Go to your checklist" or "Invite your team"
- Explanation text on the assessments page

---

### Journey 6 -- View Progress (Dashboard)

**What works:**
- Assessment status, progress bar, done/unsure/skipped breakdown
- Category breakdown (IT Baseline / Awareness percentages)
- Team progress section showing each member
- Print summary button
- Cadence indicator and next review due date

**What is broken or confusing:**
- Response total is calculated incorrectly (ISS-03)
- Display names not shown (ISS-04)
- "No assessment completed" banner is misleading (ISS-25)
- Employee dashboard shows wrong denominator (ISS-28)

**What is missing:**
- Item-level drill-down (click a member to see their individual responses) (ISS-23)
- Owner notification when team members complete their checklists
- Way to distinguish "your items" vs "shared items" from the dashboard

---

### NEW Journey: IT Executor Completes IT Baseline

This journey is not documented in `20_user-journeys.md` but is a core flow.

**What works:**
- IT executor sees all 36 items (25 IT Baseline + 11 Awareness)
- Blue banner explains "Your admin has assigned you the IT Baseline track"
- Platform-specific steps are excellent (Google Workspace and M365 paths)
- Steps are concrete and actionable for most items

**What is broken or confusing:**
- 25 IT items in a flat list with no category grouping (ISS-16)
- IT person role shows as "employee" which feels dismissive (BA Company 2)
- No priority ordering beyond impact labels
- Banner is dismissible and never comes back

**What is missing:**
- Category grouping (Passwords, Email, Backups, etc.) in workspace view
- Templates/materials for content-creation items (ISS-17)
- Way to flag blockers or ask questions to admin (ISS-22)
- "Quick wins" filtered view showing fastest/highest-impact items first

---

### NEW Journey: Owner-as-IT-Executor

This variant is not documented but was tested in Company 3.

**What works:**
- Correctly shows both role badges ("Org Admin - IT Executor")
- Sees all 36 items
- Platform-specific steps work

**What is broken or confusing:**
- "Invite your IT lead" step is misleading (ISS-11)
- 36 items is overwhelming for one person with no prioritization guidance

**What is missing:**
- Acknowledgment of dual responsibility
- Suggested starting order for someone doing both IT and awareness

---

### NEW Journey: Invite Acceptance

This flow exists but is not documented as a separate journey.

**What works:**
- "Join your team" page with email display and optional display name
- Accept invite + redirect to workspace works

**What is broken or confusing:**
- No context about what org they are joining, what role, or what is expected
- Invite email is unbranded Supabase boilerplate (ISS-21)

**What is missing:**
- Org name and inviter name on the accept-invite page
- Brief explanation of what the tool is and what is expected
- Branded invite email with context

---

## 3. Updated Acceptance Criteria for PI 3

### Workspace Checklist Guidance

**AC-PI3-01**: Given an authenticated user viewing /workspace/checklist, when they see a checklist item, then each item must display an expandable section containing: (a) a "Why it matters" explanation, (b) numbered action steps, and (c) time estimate. This content must match the guidance shown on the anonymous /checklist page for equivalent items.
- Linked to: ISS-01, ISS-30

**AC-PI3-02**: Given an authenticated user viewing /workspace/checklist, when they expand an item's guidance section, then platform-specific steps must be shown based on the org's email platform setting (Google Workspace, Microsoft 365, etc.).
- Linked to: ISS-01

### Landing Page Time Claim

**AC-PI3-03**: Given an anonymous user on the landing page, when they read the headline, then the text must NOT claim users can "fix" their security in 30 minutes. The framing must use assessment/discovery language (e.g., "Find your biggest cyber risks" or "Identify your top security gaps") rather than implementation language.
- Linked to: ISS-02

**AC-PI3-04**: Given an anonymous user on the landing page, when they read the body text about time commitment, then any time estimate must be realistic for the scope described. If referencing the full checklist, the estimate should reflect the actual range (hours, not minutes).
- Linked to: ISS-02

### Dashboard Response Count Fix

**AC-PI3-05**: Given an org with members who have different item visibility (IT executor sees 36, non-IT sees 11), when the admin views the dashboard, then the total response count denominator must equal the sum of each member's visible items (not items x members).
- Linked to: ISS-03, ISS-28

**AC-PI3-06**: Given an employee viewing their own dashboard, when they see their progress, then the denominator must reflect only their assigned items (11 awareness items, not 36 total items).
- Linked to: ISS-28

### Display Names

**AC-PI3-07**: Given that members have entered display names during invite acceptance, when the admin views the dashboard Team Progress section, then each member must be shown by display_name (falling back to email, then truncated UUID).
- Linked to: ISS-04

**AC-PI3-08**: Given an admin viewing org settings, when the IT executor dropdown is displayed, then each option must show display_name or email (not UUID).
- Linked to: ISS-09

**AC-PI3-09**: Given a new user going through the onboarding flow (org creation), when the form is displayed, then it must include an optional display name field so the admin's name is captured.
- Linked to: ISS-24

### Employee Onboarding

**AC-PI3-10**: Given an employee who has just accepted an invite, when they land on /workspace for the first time, then a welcome message must be shown explaining: (a) why they are here, (b) what they need to do, (c) estimated time commitment, and (d) what "Done/Unsure/Skipped" mean for their items.
- Linked to: ISS-06

### Assessment UX

**AC-PI3-11**: Given an admin who has just started a new assessment, when the assessment is created, then the user must be shown a clear next-step CTA (e.g., "Go to your checklist" or "Invite your team") rather than remaining on the assessments page with only "Mark complete" visible.
- Linked to: ISS-08

**AC-PI3-12**: Given any authenticated user visiting /workspace/assessments, when the page loads, then explanatory text must describe what an assessment is, what completing one means, and when to start a new one.
- Linked to: ISS-15

### Getting Started Contextual Adaptation

**AC-PI3-13**: Given an admin who selected "I do" for IT during onboarding, when they view the workspace home "Get started" panel, then Step 1 must either be marked as complete or show text adapted to the owner-as-IT scenario (e.g., "You are handling IT yourself").
- Linked to: ISS-11

### Team Page Members List

**AC-PI3-14**: Given an admin viewing /workspace/team, when the page loads, then a list of current team members (accepted invites) must be shown alongside the pending invites section. Each member must show display name (or email), role, and IT executor status.
- Linked to: ISS-10

### Stale Auth Token Handling

**AC-PI3-15**: Given a returning visitor with an expired Supabase auth token in localStorage, when they navigate to /checklist (a public page), then the page must clear the stale token and show the read-only checklist view. It must NOT redirect to /login.
- Linked to: ISS-13

### Admin Item-Level Visibility

**AC-PI3-16**: Given an admin viewing the dashboard Team Progress section, when they click on a team member, then they must see that member's individual item-level responses (which items are Done, Unsure, Skipped, or unanswered).
- Linked to: ISS-23

### Sign-Up Journey Explanation

**AC-PI3-17**: Given an anonymous user on the /login page, when they see the sign-up form, then brief text must explain the process ahead: (a) you will receive a sign-in link by email, (b) you will set up your organisation, (c) you will invite your team and start a security review.
- Linked to: ISS-07

### "No Assessment Completed" Banner

**AC-PI3-18**: Given an admin whose org has an active assessment that has not yet been completed, when they view the dashboard, then the cadence indicator must say "Assessment in progress" (not "No assessment completed").
- Linked to: ISS-25

### Landing Page Copy

**AC-PI3-19**: Given the landing page subheading text, when displayed, then the phrase "No fear." must be removed. The text should read "No enterprise complexity. Just the highest-impact steps." or similar.
- Linked to: ISS-31

### Browser Autofill Prevention

**AC-PI3-20**: Given a user on the onboarding page, when the form renders, then all form inputs must have appropriate autocomplete attributes set to prevent browser autofill from contaminating the form with stale data.
- Linked to: ISS-14

---

## 4. Test Scenarios for PI 3

### TS-01: Workspace checklist shows guidance text
- **Precondition**: Authenticated user with active assessment
- **Steps**: Navigate to /workspace/checklist. Click on any checklist item title.
- **Expected**: Item expands to show "Why it matters" block, numbered steps, and time estimate. For platform-configured orgs, steps must be platform-specific.
- **Covers**: ISS-01, ISS-30

### TS-02: Landing page time claim is accurate
- **Precondition**: None
- **Steps**: Navigate to /. Read the headline and body text.
- **Expected**: Headline does NOT say "Fix" + "30 minutes." Body text time estimates are realistic.
- **Covers**: ISS-02

### TS-03: Dashboard response total is correct per role
- **Precondition**: Org with 1 admin (non-IT), 1 IT executor, 1 employee. Active assessment.
- **Steps**: IT executor answers 3 items. Employee answers 2 items. Admin views dashboard.
- **Expected**: Total shows "5 / 58 responses" (not /108). Employee's own dashboard shows "2 / 11" (not /36).
- **Covers**: ISS-03, ISS-28

### TS-04: Display names appear on dashboard
- **Precondition**: Org with members who entered display names during invite acceptance.
- **Steps**: Admin views /workspace/dashboard.
- **Expected**: Team Progress section shows display names. No UUIDs or raw email addresses unless display_name is null (in which case email is shown).
- **Covers**: ISS-04, ISS-09

### TS-05: Employee sees welcome message on first visit
- **Precondition**: Employee accepts invite and lands on /workspace for the first time.
- **Steps**: Observe the workspace home page.
- **Expected**: Welcome message is visible explaining purpose, what to do, estimated time, and what responses mean.
- **Covers**: ISS-06

### TS-06: Assessment start redirects to next step
- **Precondition**: Admin with no active assessment.
- **Steps**: Navigate to /workspace/assessments. Click "Start new assessment."
- **Expected**: After creation, a clear CTA directs user to "Go to checklist" or similar. User is NOT left staring at "Mark complete" with no context.
- **Covers**: ISS-08

### TS-07: "Get started" adapts to owner-as-IT
- **Precondition**: Admin who selected "I do" during onboarding.
- **Steps**: View workspace home.
- **Expected**: Step 1 is marked complete or shows adapted text. Does NOT say "Invite your IT lead."
- **Covers**: ISS-11

### TS-08: Team page shows current members
- **Precondition**: Org with admin + 2 accepted members + 1 pending invite.
- **Steps**: Admin navigates to /workspace/team.
- **Expected**: Current members section shows 3 members with names, roles, and IT executor status. Pending invites section shows 1 pending invite.
- **Covers**: ISS-10

### TS-09: Stale auth token does not break public checklist
- **Precondition**: User who previously logged in (auth token in localStorage) but token is now expired.
- **Steps**: Navigate to /checklist.
- **Expected**: Page loads with read-only checklist view. No redirect to /login.
- **Covers**: ISS-13

### TS-10: Admin can drill down to member item responses
- **Precondition**: Org with members who have answered some items.
- **Steps**: Admin views /workspace/dashboard. Clicks on a team member in the progress section.
- **Expected**: Individual item responses are shown (which items marked Done, Unsure, Skipped, unanswered).
- **Covers**: ISS-23

### TS-11: Sign-up page explains the journey
- **Precondition**: None
- **Steps**: Navigate to /login.
- **Expected**: Text explains the 3-step process (receive email, set up org, invite team).
- **Covers**: ISS-07

### TS-12: Onboarding form resists browser autofill
- **Precondition**: Browser with saved form data from a previous onboarding.
- **Steps**: Navigate to /onboarding.
- **Expected**: Form fields are empty (not pre-populated with stale data). Org name field has placeholder but no autofilled value.
- **Covers**: ISS-14

### TS-13: Dashboard cadence banner during active assessment
- **Precondition**: Org with active assessment, no previously completed assessment.
- **Steps**: Admin views /workspace/dashboard.
- **Expected**: Banner says "Assessment in progress" or similar. Does NOT say "No assessment completed."
- **Covers**: ISS-25

### TS-14: "No fear." removed from landing page
- **Precondition**: None
- **Steps**: Navigate to /.
- **Expected**: Subheading does not contain "No fear."
- **Covers**: ISS-31

### TS-15: Admin display name captured during onboarding
- **Precondition**: New user going through onboarding.
- **Steps**: Complete onboarding form.
- **Expected**: Display name field is available. If entered, name appears on dashboard and team page.
- **Covers**: ISS-24

---

## 5. Stefan's Key Concerns Mapped to Action Items

### Concern 1: "How can I answer if they did 'Run a 30-minute security awareness session' if we don't show them what it is?"

**Problem**: Content-creation items (awareness session, security doc, incident response plan) ask users to confirm completion but provide no materials, templates, or examples to actually do the work.

**Action items (PI 3 scope)**:
1. **Add downloadable templates** for the 3 content-creation items:
   - Security awareness session: A 5-slide template with 3 real phishing examples, talking points, and a 30-minute agenda.
   - 1-page security rules doc: A fill-in-the-blanks template document.
   - Incident response plan: A structured template with pre-filled sections.
2. **Add guidance text to workspace checklist** (ISS-01) so users can see the steps and understand what "Done" means before answering.
3. **Show the "Why & how" content inline** in the workspace checklist, matching the anonymous checklist experience.

**Action items (future / PI 4+)**:
4. Integrate AI/LLM guidance that can walk users through item completion interactively (see Concern 4 below).

---

### Concern 2: "Why not toss the whole idea of Done/Unsure/Skipped for items to actually being checked by emails sent?"

**Problem**: Self-assessment is unreliable. Users can click "Done" without actually having the capability. Stefan's vision is that awareness items should be verified through phishing simulation emails -- the correct response (clicking "Report Phishing") would automatically mark the item as Done.

**Action items (PI 3 scope)**:
1. **Redesign awareness item response model.** For the current PI (without email campaigns), change the response options for awareness items from "Done/Unsure/Skipped" to:
   - "I already do this" -- self-assessed current behavior
   - "I understand this now" -- learned from reading the guidance
   - "I need help with this" -- flags the item for manager follow-up
   - "Not applicable" -- replaces Skipped
2. **Add visual indicator for "verification pending" items.** Show awareness items with a badge indicating "Will be verified by email campaign" (greyed out, not self-assessable). Keep these visible on the checklist but indicate they will be scored automatically once campaigns are active.
3. **Surface manager follow-up.** When employees mark items as "I need help," surface these on the admin dashboard as action items requiring follow-up.

**Action items (future / paid tier)**:
4. Implement phishing simulation email campaigns (1st campaign free, subsequent campaigns paid).
5. Auto-mark awareness items based on email campaign results (clicked report = Done, clicked link = Failed, no action = Unsure).
6. Add AI-generated "scam phone calls" as a verification mechanism.

---

### Concern 3: "Should we have two different lists -- one for IT, one for employees?"

**Problem**: The anonymous checklist mixes IT and employee items. The workspace already separates them (IT Baseline vs Awareness tracks), but this separation is not communicated on the landing page or anonymous checklist.

**Action items (PI 3 scope)**:
1. **Restructure the anonymous checklist** to show two clearly labeled sections:
   - "For your IT person" (IT Baseline items) -- with a note: "Your IT lead or consultant will handle these"
   - "For everyone" (Awareness items) -- with a note: "Every team member completes these"
2. **Update the landing page** to mention the two-track approach: "One checklist for your IT team, one for everyone else."
3. **Add category grouping to workspace IT Baseline** (ISS-16): group the 25 IT items back into topic categories (Passwords & Accounts, Email Security, Updates & Patching, etc.) to match the anonymous checklist structure.

**Action items (future)**:
4. Consider role-specific landing page content (an IT person visiting the site sees IT-focused messaging).

---

### Concern 4: "A short click-to-open guide would be good, especially an AI guiding option"

**Problem**: The workspace checklist shows items without guidance. Stefan wants simple expandable guidance AND an AI assistant that can answer user questions about how to implement each item.

**Action items (PI 3 scope)**:
1. **Add expandable guidance to every workspace checklist item** (ISS-01). Keep the simple item layout but add a discreet expand icon (e.g., "?" or chevron) on the right side of each item box. Expanding shows the "Why & how" content.
2. **Keep the simple box layout.** Stefan explicitly said "we still have the very simple boxes and not make it look far more complicated." The guidance must be opt-in, not always visible.

**Action items (PI 4 -- AI integration)**:
3. Add a "Help me with this" button on each expanded item that opens a contextual AI chat.
4. AI must be scoped to the checklist context -- must not guide users toward more complex topics or away from the checklist.
5. AI should proactively advise users on how to respond (e.g., "You haven't done this yet, so mark as Skipped until your next assessment when you will have had time to implement it").
6. AI should help with implementation guidance (e.g., "How do I install Bitwarden on my computer?" with step-by-step instructions).
7. Cost consideration: use a bounded context window per item to keep API costs low.

---

### Concern 5: "There should be some sort of action point for manager/owner to ask employees"

**Problem**: Without proof or verification, the checklist becomes a "stupid no-good checklist where people just press Done and make it look good." Stefan wants accountability -- the knowledge that employees might be asked about their responses should create honest answering.

**Action items (PI 3 scope)**:
1. **Add item-level drill-down on the admin dashboard** (ISS-23, AC-PI3-16). Admin can click any team member to see their individual item responses. This creates visibility and implicit accountability.
2. **Add a "Request verification" action for admins.** On the item-level detail view, the admin can click "Ask about this" on any item, which generates a notification (in-app or email) to the employee: "Your admin has requested you verify your response on [item name]."
3. **Show a notice to employees** when responding: "Your responses are visible to your manager" -- creating social accountability without requiring proof uploads.
4. **Surface "all Done in under 2 minutes" alerts** on the admin dashboard. If an employee completes all 11 items suspiciously fast (e.g., under 3 minutes), flag this for the admin as "completed very quickly -- consider following up."

**Action items (future / paid tier)**:
5. Email campaign verification replaces manual accountability (Concern 2).
6. Consider optional photo/screenshot upload for IT items (Stefan noted this would be "an unnecessary burden no one will use" -- deprioritize).

---

### Additional Stefan Concerns (mapped)

| Stefan's concern | Action item | PI scope |
|---|---|---|
| Calendar reminder (.ics) should match separate reminder emails | Align .ics reminder date with the reminder email cadence (currently 76-95 days). Add text during org setup explaining that reminder emails will come. | PI 3 |
| "Remove No fear." from landing page | AC-PI3-19: Remove the phrase from subheading text. | PI 3 |
| GDPR footer should link to data visibility/deletion page | Add footer link to a public-facing privacy/data page explaining what data is stored and how to delete it, per role. | PI 3 |
| Beautification (looks dull, black/white) | Future: visual design refresh. Not PI 3 scope. | Future |
| SEO | Future: meta tags, structured data, sitemap. Not PI 3 scope. | Future |
| Language picker (EN/DK) | Future: i18n support. Not PI 3 scope. | Future |
| Payment functionality | Future future. Not PI 3 scope. | Future |
| Anonymous stats / benchmarking | Future future. Requires user base. Not PI 3 scope. | Future |
| Real DEV/PREPROD/PROD environments | Future. Not needed without real users. | Future |

---

## 6. Recommended PI 3 Iteration Structure

Based on severity, dependencies, and Stefan's priorities, the BA recommends organizing PI 3 into 3 iterations:

### Iteration 1: Fix the Foundation (bugs + critical UX)
Priority: Fix things that are broken or misleading before adding new features.

1. Add guidance text to workspace checklist items (ISS-01) -- **Critical**
2. Fix landing page time claim (ISS-02) -- **Critical**
3. Remove "No fear." from landing page (ISS-31)
4. Fix dashboard response total calculation (ISS-03) -- **High**
5. Fix employee dashboard denominator (ISS-28) -- **High**
6. Fix display names on dashboard and settings (ISS-04, ISS-09) -- **High**
7. Add display name field to onboarding (ISS-24)
8. Fix stale auth token on /checklist (ISS-13) -- **High**
9. Fix "Get started" Step 1 for owner-as-IT (ISS-11)
10. Fix "No assessment completed" banner text (ISS-25)
11. Add autocomplete="off" to onboarding form (ISS-14)

### Iteration 2: Improve Onboarding + Accountability
Priority: Make the experience understandable for all roles and give admins visibility.

1. Add employee welcome/onboarding message (ISS-06) -- **High**
2. Add sign-up journey explanation on /login (ISS-07)
3. Improve assessment start UX with next-step CTA (ISS-08)
4. Add assessment explanation text (ISS-15)
5. Show current team members on Team page (ISS-10)
6. Add item-level drill-down on admin dashboard (ISS-23) -- **High**
7. Add "your responses are visible to your manager" notice for employees

### Iteration 3: Content + Structure Improvements
Priority: Make the checklist more usable and prepare for future email campaigns.

1. Restructure anonymous checklist into IT / Everyone sections (Stefan concern 3)
2. Add category grouping to workspace IT Baseline items (ISS-16)
3. Provide downloadable templates for content-creation items (ISS-17) -- **High**
4. Redesign awareness item response model (Stefan concern 2 -- PI 3 portion)
5. Add GDPR/privacy footer link to public pages (ISS-20)
6. Add time estimates to workspace checklist items (ISS-30)
7. Add reminder email mention during org setup (Stefan)

---

## 7. Items Explicitly Deferred to Future PIs

These items were raised by Stefan or discovered during testing but are NOT recommended for PI 3:

| Item | Rationale for deferral |
|---|---|
| AI/LLM integration for item guidance | Significant feature; requires API costs, scoping, UX design. PI 4 candidate. |
| Phishing email campaigns | Paid tier feature. Requires email infrastructure, campaign scheduling, result tracking. PI 4+. |
| AI phone "scam calls" | Depends on email campaigns being in place first. Far future. |
| Language picker (EN/DK) | i18n requires significant refactoring. Future. |
| Branded magic link emails | Requires Supabase custom SMTP setup. Nice-to-have. |
| Visual design refresh / beautification | Important but not blocking functionality. Future. |
| SEO | No users yet. Future. |
| Payment functionality | Future future. |
| Anonymous benchmarking stats | Requires user base. Future future. |
| DEV/PREPROD/PROD environments | Not needed without real users. Future. |
| Cross-tab sync | Edge case. Low priority. |
| Mobile hamburger menu | Low user impact currently. Future. |
| Item-level notes/comments from IT executor | Useful but can be deferred. PI 4 candidate. |

---

## 8. Summary for Product Team Consensus

**The core finding across all walkthroughs**: The app works mechanically -- flows are smooth, data is correct, and the technical implementation is solid. The checklist content is genuinely high quality. But there is a gap between what the app IS (a self-assessment tool) and what it NEEDS to be (a guided security improvement program).

**The three most impactful changes for PI 3**:

1. **Add guidance text to workspace checklist** (ISS-01). This is the single highest-impact fix. It closes the gap between "here is what to do" and "have you done it?" by showing users the same "Why & how" content that makes the anonymous checklist excellent.

2. **Fix the dashboard math and display names** (ISS-03, ISS-04, ISS-28). The dashboard is the admin's primary tool for tracking progress. If the numbers are wrong and people show as UUIDs, the admin loses trust in the tool.

3. **Add item-level visibility for admins** (ISS-23). Stefan's concern about accountability is fundamental. If admins can see individual responses, employees know they might be asked about them. This creates honest answering without requiring proof uploads or complex verification.

**Stefan's strategic direction** is clear: the free checklist is the entry point. The value is in simplicity and actionability. Future monetization comes from email campaigns (phishing simulation) that automate the verification step. PI 3 should strengthen the free checklist experience while laying the groundwork for campaign-based verification in PI 4+.
