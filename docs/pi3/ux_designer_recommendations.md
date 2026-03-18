# UX Designer Recommendations for PI 3

**Role:** UX Designer, SMBsec Product Team
**Date:** 2026-03-18
**Inputs:** Stefan's production walkthrough (PDF), BA walkthrough report, Company 1/2/3 detailed walkthroughs

---

## 1. UX Audit Summary

### Anonymous Visitor

**Current experience rating: 4/5**

The anonymous flow is the strongest part of the app. The landing page is clear, the checklist content is excellent, and the trust signals are well-placed. Two issues drag it down:

- **Key friction point:** The "Fix the biggest cyber risks in 30 minutes" headline creates a promise the product cannot keep. Actual time is 5-12.5 hours across all items, or 3.5-9 hours for high-impact only. This sets up disappointment before the user even starts.
- **Key friction point:** The `/summary` page is nearly empty for anonymous users -- clicking "View summary" from the checklist leads to a dead-end sign-in prompt.
- **"Aha moment":** Expanding the first "Why & how" accordion on the checklist. The user sees concrete, actionable steps and thinks "this is practical, not just another list." This happens within 30 seconds of reaching the checklist -- good timing.

### Owner (Org Admin)

**Current experience rating: 2.5/5**

The owner's experience falls apart after onboarding. The 3-step setup guide is excellent, but once they reach their checklist, they encounter bare item titles with no guidance, confusing response options for awareness items, and a dashboard that shows UUIDs instead of names.

- **Key friction point:** The workspace checklist strips away all the guidance text that made the anonymous checklist valuable. The owner goes from a rich, educational experience (anonymous) to a bare list of titles with Done/Unsure/Skipped buttons (workspace). This is the single biggest UX failure in the app.
- **Key friction point:** "Done" does not make sense for awareness items like "Spot a phishing email" -- the owner has not yet received a phishing test, so what does "Done" mean?
- **Key friction point:** The assessment concept is unexplained. After starting an assessment, the owner sees "Assessment already in progress" with a "Mark complete" button but no understanding of what completing it means or when to do it.
- **"Aha moment":** The 3-step getting-started panel on first workspace visit. The owner thinks "OK, I know exactly what to do." But this moment fades fast because subsequent pages do not sustain the same level of clarity. The aha moment needs to extend into the checklist itself.

### IT Person (Employee + IT Executor)

**Current experience rating: 2/5**

The IT person has the most work to do (36 items) and the least context about why they are doing it. They receive a generic Supabase email (not branded), land on a workspace with "employee" as their role label (dismissive for someone doing critical IT work), and face a flat list of 25 IT Baseline items with no category grouping.

- **Key friction point:** The invite email comes from "Supabase Auth" with no mention of who invited them, what SMBsec is, or what is expected. A security-minded IT person might flag this as spam.
- **Key friction point:** 25 IT Baseline items in a flat list with no grouping. The anonymous checklist groups items into logical categories (Passwords & Accounts, Email Security, etc.) but the workspace loses this structure entirely.
- **Key friction point:** Role label says "employee" -- the IT person was invited as the technical lead but the app calls them an employee. This undermines their sense of responsibility.
- **"Aha moment":** Expanding a checklist item and seeing platform-specific steps (e.g., exact Google Workspace admin paths or M365 security center URLs). This is genuinely excellent content. But the user has to discover it by clicking -- there is no prompt to expand items, and the flat list makes it hard to know where to start. The aha moment comes too late (if at all).

### Employee

**Current experience rating: 1.5/5**

The employee experience is the weakest. They arrive at a bare list of 11 awareness items with zero context: no welcome message, no explanation of purpose, no time estimate, no definition of what "Done" means. The experience feels like a compliance checkbox exercise rather than a security improvement tool.

- **Key friction point:** No onboarding whatsoever. The employee lands on workspace home with three cards (My checklist, Dashboard, Settings & data) and no guidance. They must figure out on their own that they should click "My checklist."
- **Key friction point:** "Done/Unsure/Skipped" for awareness items is fundamentally broken. "Spot a phishing email" with a "Done" button makes no sense -- the employee has not been tested. Stefan himself could only mark 3 of 11 items as "Done" and found 4 items where "Unsure" was the only honest answer.
- **Key friction point:** No guidance text on items. The anonymous checklist explains WHY each item matters and gives step-by-step instructions. The workspace checklist shows only the title. An employee looking at "Use a strong, unique password for your work accounts" has no idea what standard they are being measured against.
- **"Aha moment":** There is no aha moment for employees. They arrive, see a list, click some buttons, and leave. The app does not teach them anything (the educational content exists but is hidden in the workspace view). This must be fixed -- the employee's aha moment should be: "Oh, I just learned something useful about security that I can apply right now."

---

## 2. Information Architecture Issues

### Navigation Gaps

1. **No back buttons or breadcrumbs.** Every workspace page relies solely on the top nav bar. Stefan specifically called this out: "Where is the usual back-to button at the bottom of the page?" Add a contextual "Back to [parent]" link at the bottom of every workspace page.

2. **Inconsistent navigation between public and workspace.** The anonymous `/summary` page has text links ("Browse the checklist first", "Home") while other pages have styled buttons. The `/summary` page style should match the rest of the public pages.

3. **No mobile navigation solution.** Workspace nav items overflow horizontally on mobile with `overflow-x-auto` but no visual scroll indicator. There is no hamburger menu. With 7 nav items (Home, Checklist, Dashboard, Team, Assessments, Settings, Log out), this will break on any phone screen.

4. **Org name truncation.** Fixed at `max-w-[160px]`, cutting off names like "SMBsec1 Test Compa..." on desktop. Should use a tooltip on hover with the full name, or increase the max width.

### Missing Pages or States

1. **No public privacy/GDPR policy page.** The GDPR settings page exists for logged-in admins, but there is no public-facing privacy policy. For an EU-targeted security product, this is a trust gap. The landing page trust signals say "EU data residency" but there is nowhere to verify this claim.

2. **No "What to expect after sign-up" content.** The login page and post-submit message give no preview of the onboarding journey. Add a brief "Here is what happens next" section below the email form.

3. **No team members list.** The Team page shows only pending invites, not current members. The owner cannot see who has joined their org without going to the dashboard.

4. **No item-level drill-down on dashboard.** The owner sees aggregate numbers per team member (X done, Y unsure, Z skipped) but cannot see WHICH items each person answered or how. This limits follow-up ability.

### Content Hierarchy Problems

1. **Workspace checklist items are flat when they should be grouped.** The anonymous checklist uses 7 topic-based groups (Passwords & Accounts, Email Security, etc.). The workspace uses only 2 track headings (IT Baseline, Security Awareness). The IT person sees 25 items in a single flat list under "IT Baseline" with no sub-grouping. Restore the topic grouping within each track.

2. **Impact labels are present but not actionable.** Items show "high impact" or "medium impact" but there is no sorting, filtering, or "start with these" guidance. The "8 high-impact items still need attention" counter is helpful but does not tell the user WHICH 8 items to prioritize.

3. **Time estimates missing from workspace.** The anonymous checklist shows time estimates per item (e.g., "10-20 min"). The workspace checklist shows none. This matters -- a user deciding what to tackle first needs to know if an item takes 5 minutes or 3 hours.

### Anonymous Checklist vs Workspace Checklist Disconnect

This is the most significant IA problem. The two checklists are structurally different experiences:

| Aspect | Anonymous | Workspace |
|--------|-----------|-----------|
| Items | 17 | 36 |
| Grouping | 7 topic groups | 2 flat tracks |
| Guidance | Full "Why & how" with steps | Title only (expandable but not obvious) |
| Time estimates | Shown | Not shown |
| Response model | Done/Not sure/Skip/Reset | Done/Unsure/Skipped (toggle) |

A user who browses the anonymous checklist, gets excited about the content quality, signs up, and then sees the workspace checklist will feel bait-and-switched. The workspace should feel like a richer version of what they previewed, not a stripped-down version.

**Proposed fix:** The workspace checklist should inherit the anonymous checklist's content presentation (guidance text, time estimates, topic grouping) and ADD workspace-specific features (team tracking, assessment responses, role-based filtering). The workspace should feel like the anonymous checklist "unlocked," not replaced.

---

## 3. Interaction Model Problems

### The "Done/Unsure/Skipped" Problem

The current three-option model works for concrete, verifiable IT actions:

- "Turn on MFA for email accounts" -- either you did it or you did not. "Done" is meaningful.
- "Set up 3-2-1 backups" -- either the backup exists or it does not. "Done" is meaningful.

It breaks completely for awareness and behavioural items:

- "Spot a phishing email" -- Done how? The user has not been tested. There is no phishing simulation in the product. Stefan correctly identified this: "How can I answer anything else than Unsure or Skipped, because I did not yet receive one?"
- "Think before opening files from USB drives" -- Done is a future behaviour commitment, not a completed action.
- "Know the one rule: report, don't hide" -- Done means... you read the title?

The BA Company 2 report captured this precisely: the app asks "have you done this?" when it should ask "let us help you do this."

### Proposed Alternative: Two Response Models

**Model A -- For actionable items (IT Baseline + some awareness):**

Keep Done/Unsure/Skipped but add clarity about what "Done" means.

Each item card shows:
```
+--------------------------------------------------+
| Turn on MFA for email accounts    high impact     |
|                                                   |
| [expand] Why this matters + Steps                 |
|                                                   |
| "Done" means: MFA is enabled for all email        |
| accounts in your organisation.                    |
|                                                   |
| [ Already done ]  [ Not yet ]  [ Not applicable ] |
+--------------------------------------------------+
```

Changes from current:
- "Done" becomes "Already done" -- clearer that this is about current state, not just reading the item.
- "Unsure" becomes "Not yet" -- honest acknowledgment that the work is pending, not confusion about the question.
- "Skipped" becomes "Not applicable" -- for items that genuinely do not apply (e.g., "Disable Office macros" for a company that does not use Office).
- A one-line "Done means" definition appears below the item title, making the standard explicit.

**Model B -- For awareness/knowledge items (future-state with phishing simulation):**

Stefan's vision is clear: awareness items should ultimately be verified by phishing simulations, not self-reported. Until that feature exists, these items need a different interaction:

```
+--------------------------------------------------+
| Spot a phishing email              high impact    |
|                                                   |
| [expand] Why this matters + Steps                 |
|                                                   |
| This skill will be tested by a simulated          |
| phishing email. For now, read the guidance        |
| and practice the action step below.               |
|                                                   |
| Action step: Look at the last 5 emails in your    |
| spam folder. Can you identify why they were        |
| flagged?                                           |
|                                                   |
| [ I have read and practiced this ]  [ Skip ]      |
|                                                   |
| Status: Awaiting verification (coming soon)       |
+--------------------------------------------------+
```

Changes from current:
- Two options instead of three: "I have read and practiced this" or "Skip."
- No "Done" -- because the item cannot be marked as done until verified (future phishing simulation).
- A visible "Awaiting verification" status signals that this is not just a checkbox exercise.
- The action step is surfaced prominently, not hidden in an expandable section.

**Transition path:** For PI 3, implement Model A for all items. Add a visual tag to awareness items that says "Tip: Read the guidance and complete the action step before marking this done." Defer Model B to the iteration that introduces phishing simulations.

### The "Assessment" Concept

Users do not understand what an assessment is. The BA reports confirm this across all three companies:

- Stefan: "What should I press to start assessment, I can only press Mark complete?"
- BA Report: "'Assessment already in progress' looks like an error."
- Company 2: "No explanation of what an assessment is."

The problem is conceptual. The app uses "assessment" as an internal term for a time-boxed round of checklist responses. Users think of it as a test or evaluation they need to take.

**Proposed fix:** Rename "Assessment" to "Security Review" throughout the app.

- "Start new assessment" becomes "Start your security review"
- "Assessment already in progress" becomes "Security review in progress -- your team is working through the checklist"
- "Mark complete" becomes "Finish this review" with a confirmation dialog: "Mark this security review as complete? You can start a new review later to track improvements."
- The Assessments page gets introductory text: "A security review is a round of your team working through the checklist together. When everyone has responded, mark it as finished. Start a new review any time to measure progress."

---

## 4. Onboarding Flow Redesign

### Current: What Each Role Sees on First Visit

**Owner:**
1. Login page -- "Send sign-in link" with no preview of what comes next
2. Magic link email from "Supabase Auth" (generic)
3. Onboarding form (org name, email platform, computers, company size, IT handling)
4. Workspace home with 3-step getting-started panel
5. Must manually navigate to start assessment, invite team, and find checklist

**IT Person:**
1. Generic Supabase "Confirm Your Signup" email (no mention of who invited them or why)
2. Accept-invite page showing "Join your team" (no org name, no role explanation, no time estimate)
3. Workspace home showing "employee - IT executor" with 3 cards and no welcome message
4. Dismissible blue banner on checklist: "Your admin has assigned you the IT Baseline track" (gone forever once dismissed)

**Employee:**
1. Same generic Supabase email as IT person
2. Same accept-invite page
3. Workspace home with 3 cards and zero guidance
4. Checklist with 11 items and no introductory context

### Proposed: What Each Role SHOULD See

**Owner -- Login Page:**

Below the email input, add a "How it works" section:

```
How it works
1. Set up your organisation (2 minutes)
2. Invite your team
3. Work through the security checklist together

Free for small teams. No credit card needed.
```

This directly addresses Stefan's feedback: "The 3-step process seems really easy. Why isn't it explained this way on the sign-up page?"

**Owner -- Post-Onboarding Welcome:**

Replace the current workspace home for first-time owners with a focused welcome screen:

```
Welcome to SMBsec, [Org Name]

Here is your plan:
1. [check] Organisation set up
2. [ ] Invite your team (or go solo)
   [Invite team member] or [Skip for now]
3. [ ] Start your first security review
   [Start security review]

Your security review has [X] items for you and [Y] items
for your IT lead. Most people complete theirs in one sitting.
```

Key differences from current:
- Steps are interactive (buttons inline, not just links)
- Step 1 auto-completes (org was just set up)
- Step 2 offers "Skip for now" for solo owners
- Step 3 provides item counts so the owner knows the scope
- The word "assessment" is replaced with "security review"

**Owner -- "Invite IT lead" step adapts to onboarding choice:**

If the owner selected "I do" for IT handling, Step 2 becomes:
```
2. [check] IT checklist assigned to you
   You chose to handle IT yourself. You will see both IT and
   awareness items in your checklist.
```

This fixes the Company 3 bug where "Invite your IT lead" appears even when the owner is the IT executor.

**IT Person -- Accept Invite Page:**

```
Join [Org Name]'s security review

[Owner Name] has invited you to help secure [Org Name].

Your role: IT Lead
You will work through [25] technical security items covering
passwords, email security, updates, backups, and more.

Estimated time: Items range from 5 minutes to 1 hour each.
Most IT leads complete the high-priority items in 2-3 sessions.

Your name (shown to your team):
[_______________]

[Accept and get started]
```

Key differences from current:
- Shows the org name (currently missing)
- Shows who invited them (currently missing)
- Explains their role as "IT Lead" not "employee"
- Gives scope (25 items) and time estimate
- Sets expectations about what they will do

**IT Person -- First Workspace Visit:**

Show a one-time welcome panel (not a dismissible banner):

```
Welcome, [Name]. Here is what your team needs from you.

You have been assigned the IT Baseline checklist -- 25 technical
controls that protect [Org Name] from the most common attacks.

Suggested approach:
- Start with the high-impact items (marked in red)
- Each item has step-by-step instructions specific to [email platform]
- Click any item to expand the full guide

[Start your checklist]
```

**Employee -- Accept Invite Page:**

```
Join [Org Name]'s security review

[Owner Name] has invited you to a quick security awareness check.

What to expect:
- 11 short items about recognising threats and staying safe online
- Takes about 15 minutes
- Read each item's guidance, then mark whether you already do this

Your name (shown to your team):
[_______________]

[Accept and get started]
```

Key differences:
- Tells the employee exactly what to expect (11 items, 15 minutes)
- Frames it as "security awareness check" not a vague "team"
- Sets the expectation: read the guidance, then respond

**Employee -- First Workspace Visit:**

Skip the workspace home entirely. Redirect new employees straight to their checklist with a welcome header:

```
Your security awareness check

[Owner Name] has asked the team to review these 11 items.
Read the guidance for each one, then mark whether you already
do this. Takes about 15 minutes.

[11 items below]
```

This eliminates the empty workspace home problem. The employee has one job -- complete the checklist -- so take them directly there.

---

## 5. Checklist Item Presentation

### How Items Should Look in the Workspace Checklist

Current workspace item (bare, no guidance):
```
+--------------------------------------------------+
| Spot a phishing email    high impact              |
| [Done] [Unsure] [Skipped]                        |
+--------------------------------------------------+
```

Proposed workspace item (guidance visible, action step prominent):
```
+--------------------------------------------------+
| Spot a phishing email                high impact  |
|                                      ~10 min      |
|                                                   |
| [v] Why this matters                              |
|   Most attacks start with a phishing email. If    |
|   you can recognise one, you stop the attack      |
|   before it starts.                               |
|                                                   |
| Your action step:                                 |
|   Look at the last 5 emails in your spam folder.  |
|   Can you identify why each one was flagged?      |
|                                                   |
| [ Already done ]  [ Not yet ]  [ Not applicable ] |
+--------------------------------------------------+
```

Design principles:
1. **Time estimate visible** -- restore the time estimate from the anonymous checklist.
2. **"Why this matters" auto-expanded on first visit** -- the first time a user sees an item, the guidance is open. On return visits, it collapses (they have already read it).
3. **Action step surfaced** -- the single most concrete action is pulled out of the steps list and shown prominently. This is the "bridge" between guidance and response that the BA report identified as missing.
4. **Response labels clarified** -- "Already done" / "Not yet" / "Not applicable" instead of "Done" / "Unsure" / "Skipped."

### Should Guidance Text Match the Anonymous Checklist?

Yes, with additions. The workspace should show everything the anonymous checklist shows (why it matters, steps, time estimate) PLUS:
- Platform-specific steps (already exist in the DB, just not surfaced well)
- The action step pulled out and highlighted
- The "Done means" one-liner

The workspace should never show LESS than the anonymous checklist. The current state where anonymous users get more guidance than paying/registered users is backwards.

### How to Handle Awareness Items That Cannot Be "Done" Yet

Three categories of items need different treatment:

**Category 1: Verifiable actions.** "Lock your screen when you step away" -- the user can check their auto-lock setting right now. Keep standard response model.

**Category 2: Knowledge items with a concrete action step.** "Spot a phishing email" -- has the action step "check your last 5 spam emails." Show the action step prominently and label the response "I have read and practiced this" instead of "Done."

**Category 3: Team coordination items.** "Spot a phone or voice scam" -- requires setting up a code word with the team. Show a label: "This requires a team action. Discuss with your manager or IT lead." Response options: "We have set this up" / "Not yet" / "Not applicable."

For all awareness items, add a subtle note:

```
Note: In a future update, awareness items will be verified
through simulated phishing tests rather than self-reporting.
```

This sets the expectation for Stefan's planned phishing simulation feature without over-promising.

### Keeping It Simple

Stefan's core requirement is simplicity. The designs above add context without adding complexity by following these rules:

1. **The item list stays clean.** Item titles are the primary visual. Guidance is expandable, not always visible (except on first view).
2. **No new fields or forms.** We are not asking users to upload proof, write notes, or fill in additional data. We are just clarifying what the existing buttons mean.
3. **The action step is one sentence.** Not a multi-step process. One concrete thing to do.
4. **Three response options maximum.** The current three-button model stays; we just change the labels to be clearer.

What we are NOT doing (to stay simple):
- No comment/notes field on items (adds complexity for minimal value at this stage)
- No proof/screenshot uploads (Stefan explicitly said this is an unnecessary burden)
- No multi-step wizards per item
- No progress checkpoints within items

---

## 6. Dashboard Redesign Suggestions

### What the Owner Actually Needs to See

The owner's core questions are:
1. "Is my team making progress?" (aggregate)
2. "Who is stuck?" (per-person)
3. "What items are causing problems?" (per-item)
4. "Are we actually more secure now?" (outcome)

The current dashboard answers question 1 partially and question 2 poorly (UUIDs instead of names). It does not answer questions 3 or 4 at all.

**Proposed dashboard layout:**

```
Security Review Progress
Started: 18 March 2026

[==========----------] 58% complete (34 of 58 responses)

Done: 28  |  Not yet: 4  |  Not applicable: 2

---

Your team
                        Progress    Status
Employee One            9/11 (82%)  [On track]
IT Lead (You)           20/36 (56%) [In progress]
Employee Two            6/11 (55%)  [In progress]

Click any team member to see their item-by-item responses.

---

Items needing attention                     Responses
Set up 3-2-1 backups                        Not yet
Set up SPF, DKIM, and DMARC                 Not yet
Run a 30-min security awareness session     Not yet
Write a simple incident response plan       Not yet

---

[Print summary]  [Export as PDF]
```

Key changes from current:

1. **Fix the response total.** Currently shows 108 (36 x 3 members) when it should be 58 (36 + 11 + 11). Each person only sees their assigned items. The total must reflect actual expected responses.

2. **Show display names.** Use display_name from org_members, fall back to email, never show UUIDs.

3. **Add "Items needing attention" section.** Show items where any team member responded "Not yet" (currently "Unsure"). This answers the owner's question "what items are causing problems?" without requiring a per-person drill-down.

4. **Add per-person drill-down.** Clicking a team member's row expands to show their individual responses. This addresses the BA Company 2 finding that owners cannot see which specific items the IT person is stuck on.

5. **Remove the confusing "No assessment completed" banner.** Replace with the active review's start date and a clear progress indicator.

### Item-Level Visibility vs Aggregate

The dashboard should default to the aggregate view (progress bars, team summary) and allow drill-down to item-level on demand. This keeps the default view simple while allowing the owner to investigate when needed.

The drill-down view for a team member:

```
Employee One -- 9 of 11 items answered

Done (7):
  [check] Lock your screen when you step away
  [check] Use a strong, unique password
  [check] Turn on two-step login for your work accounts
  ... (4 more)

Not yet (2):
  [ ] Spot a phone or voice scam
  [ ] Turn on two-step login for all work tools

Not applicable (0)

Not answered (2):
  [ ] Think before opening files from USB drives
  [ ] Know what to do if you clicked something bad
```

### Display Name/Identity Issues

This is a pervasive bug affecting multiple pages:

| Page | Current display | Should display |
|------|----------------|----------------|
| Dashboard team progress | UUID fragment ("b5f08457...") | Display name, fallback to email |
| Settings IT executor dropdown | UUID ("b5f08457... (org admin)") | Display name + role |
| GDPR members list | Truncated UUID ("40089b6a-17a...") | Display name, fallback to email |
| Nav bar greeting | Nothing | "Hi, [First name]" or omit |

The fix: query `display_name` from `org_members` everywhere a user identity is shown. If `display_name` is null, fall back to the user's email from `auth.users`. Never show a raw UUID to an end user.

Additionally, add a display name field to the onboarding form for owners. Currently, owners never get a chance to set their name (only invited users see the name field on the accept-invite page).

---

## 7. Priority UX Fixes for PI 3

Ranked by impact on user experience, with effort estimates.

| Rank | Fix | Impact | Effort | Details |
|------|-----|--------|--------|---------|
| 1 | **Add guidance text to workspace checklist items** | Critical | M | Port "Why & how" content + steps from anonymous checklist into workspace item cards. Add time estimates. Ensure platform-specific steps render. This is the #1 issue from both Stefan and all 3 BA walkthroughs. |
| 2 | **Fix display names everywhere (dashboard, settings, GDPR)** | High | S | Query display_name from org_members with email fallback. Fix dashboard team progress, settings IT executor dropdown, GDPR members list. Never show UUID. |
| 3 | **Fix the landing page time claim** | High | S | Change H1 from "Fix the biggest cyber risks in 30 minutes" to "Find your biggest cyber risks in 30 minutes" or "Start fixing your biggest cyber risks today." Update body text "30-60 minutes" to match reality. |
| 4 | **Add employee onboarding context** | High | S | When an employee first visits their checklist, show a welcome header: what this is, why they are here, how long it takes (~15 min), what "Done" means. One-time display, dismissible. |
| 5 | **Clarify response labels** | High | S | Change "Done" to "Already done", "Unsure" to "Not yet", "Skipped" to "Not applicable." Update all references. This small copy change significantly reduces the ambiguity identified by every tester. |
| 6 | **Add owner display name field to onboarding** | Medium | S | Add an optional "Your name" field to the onboarding form. Owners currently have no way to set their display name, resulting in UUID/email on the dashboard. |
| 7 | **Fix dashboard response total calculation** | Medium | S | Calculate total expected responses as sum of each member's visible items (role-based), not 36 x member count. Current "0/108" is wrong and undermines trust in the tool. |
| 8 | **Adapt "Get started" panel for owner-as-IT** | Medium | S | When owner selected "I do" during onboarding, mark Step 1 as complete and change text to "You are handling IT yourself" instead of "Invite your IT lead." |
| 9 | **Add topic grouping to workspace IT Baseline items** | Medium | M | Group the 25 IT Baseline items into sub-categories (Passwords & Accounts, Email Security, Updates, Backups, Access Control, Network, Documentation) to match the structure users saw in the anonymous checklist. |
| 10 | **Add item-level drill-down on dashboard** | Medium | M | Allow the owner to click a team member's row to see their individual item responses. Answers "what is my IT person stuck on?" without requiring them to ask. |

### Honourable mentions (next iteration):

- Add a public privacy/GDPR policy page (important for EU trust, but not blocking core UX)
- Brand the magic link emails via Resend (currently generic Supabase sender)
- Add mobile hamburger menu for workspace navigation
- Show current team members on Team page (not just pending invites)
- Add contextual back buttons at the bottom of every workspace page
- Explain the "security review" concept on the assessments page
- Add reminder/notification settings to org settings
- Fix stale auth token causing /checklist redirect for returning users
- Add `autocomplete="off"` to onboarding form fields to prevent browser autofill contamination

---

## Appendix: Design Philosophy for PI 3

Stefan's feedback reveals a clear product philosophy: **keep it simple, but not empty.** The current workspace checklist is empty -- it shows titles and buttons but no content. The anonymous checklist is simple -- it shows titles, content, and steps in a clean, scannable format.

The goal for PI 3 is not to add features. It is to make the existing features understandable. Every screen should answer three questions for the user:

1. **What am I looking at?** (clear headings, introductory text)
2. **What should I do?** (action steps, clear response labels)
3. **Where do I go next?** (contextual navigation, progress indicators)

The app already has good content, good data models, and solid technical implementation. The UX work is about surfacing what is already there in a way that makes sense to real people who are not security experts and who have 15 minutes to spend on this.
