# BA Structured Walkthrough Report

**Date:** 2026-03-18
**Environment:** https://smbsec1.vercel.app/ (production on Vercel)
**Test account:** smbsec1_2owner@bertramconsulting.dk (Company 2, org_admin)
**Browser:** Chrome 146 on Windows 10

---

## 1. Executive Summary

The app is functional end-to-end: anonymous browsing, sign-up via magic link, org setup, assessment creation, team invites, and workspace checklist all work. However, several UX and content issues identified by Stefan during his 2026-03-18 walkthrough are confirmed. The most significant are the time-estimate mismatch on the landing page, missing guidance text in the workspace checklist, and the lack of a clear onboarding explanation during sign-up.

---

## 2. Anonymous Flow Findings

### 2.1 Landing Page (`/`)

**What works:**
- Clean layout with clear CTAs: "Sign up free", "Browse the checklist", "Log in"
- "How SMBs actually get breached" section with 5 attack types is compelling
- "Why trust this tool" section with 6 trust signals (EU data, no tracking, free, open checklist, delete anytime, magic link)
- Footer privacy reminder is good

**Issues found:**

| # | Issue | Severity | Stefan ref |
|---|-------|----------|------------|
| L1 | **"No fear." is gone from the headline** -- the subheading reads "No fear. No enterprise complexity." which is in the paragraph below the H1, not the headline itself. The H1 says "Fix the biggest cyber risks in 30 minutes". Stefan's concern was that "No fear." sounds wrong -- it IS present but as body text, not the headline. | Low | #1 |
| L2 | **Time mismatch: "30 minutes" vs actual totals.** The H1 claims "Fix the biggest cyber risks in 30 minutes". The "Why this checklist" section says "Takes 30-60 minutes for the highest-impact items." However, the actual checklist items sum to **300-750 minutes (5-12.5 hours)** at the low-high range. Even just the "high impact" items total roughly 3-6 hours. The "30 minutes" claim is misleading. | High | #2 |
| L3 | No explanation of what happens after sign-up (the 3-step process: set up org, invite team, start assessment). A first-time visitor clicking "Sign up free" has no idea what to expect. | Medium | #8 |

### 2.2 Anonymous Checklist (`/checklist`)

**What works:**
- All 17 items displayed across 7 groups with time estimates and descriptions
- "Why & how" expandable sections with guidance text and actionable steps
- Progress bar at top (0%)
- "View summary" link at top right
- "Sign in" banner prompting registration
- "Back to home" link at bottom

**Issues found:**

| # | Issue | Severity |
|---|-------|----------|
| C1 | Page title in browser tab says "SMB Security Quick-Check" -- inconsistent with "Security Checklist for Small Business" on the landing page tab title | Low |
| C2 | The checklist shows items as "Not started" but there are no interactive checkboxes for anonymous users -- this is correct behavior but could confuse users who expect to check things off before signing in | Low |

### 2.3 Summary Page (`/summary`)

**What works:**
- Clear message: "Sign in to see your progress summary"
- Explains what the summary shows when signed in
- "Sign in" button
- Two back-navigation links: "Browse the checklist first" and "Home"

**Issues found:**

| # | Issue | Severity | Stefan ref |
|---|-------|----------|------------|
| S1 | **Anonymous summary is nearly empty** -- just a sign-in prompt. No preview of what the summary would look like. Not very useful for anonymous users who came from the checklist "View summary" link. | Medium | #3 |

### 2.4 Login Page (`/login`)

**What works:**
- Simple email-only form with clear "No password needed" message
- After submission: clear success message "Sent! Check your email..."
- Helpful warning about opening link in same browser
- "Back to home" link

**Issues found:**

| # | Issue | Severity | Stefan ref |
|---|-------|----------|------------|
| LG1 | **No explanation of the sign-up journey.** After entering email, the user has no idea they'll need to: (1) create/join an org, (2) set up settings, (3) start an assessment. The post-submit message only says "check your email." | Medium | #8 |

---

## 3. Authenticated Flow Findings

### 3.1 Magic Link & Auth Callback

**What works:**
- Magic link email arrived within seconds
- Clicking link in same browser session worked correctly
- Redirect to `/workspace` after auth was smooth
- "Signing you in..." loading state shown during callback

**Notes:**
- This was a returning user (org already existed from a previous session), so the setup wizard was skipped
- Two emails were sent: "Confirm Your Signup" AND "Your Magic Link" -- both arrived, which could confuse a new user

### 3.2 Workspace Home (`/workspace`)

**What works:**
- Shows org name ("SMBsec1 Test Company 2") and role ("Org Admin")
- 6 card-style navigation tiles with descriptions
- Top navigation bar with all sections: Home, Checklist, Dashboard, Team, Assessments, Settings
- Log out button in nav bar

**Issues found:**

| # | Issue | Severity |
|---|-------|----------|
| W1 | **Org name truncated in nav bar** -- "SMBsec1 Test Compa..." is cut off. Long org names need handling (tooltip or wrapping). | Low |
| W2 | **No welcome/onboarding message for first-time users.** A new org admin lands here without any guidance on what to do first. | Medium |

### 3.3 Workspace Checklist (`/workspace/checklist`)

**What works:**
- Shows "My checklist" with progress (1/11 answered, 9%)
- "Resume where you left off" button
- High-impact items banner ("8 high-impact items still need attention")
- Done/Unsure/Skipped buttons for each item
- Items show impact level (high/medium)

**Issues found:**

| # | Issue | Severity | Stefan ref |
|---|-------|----------|------------|
| WC1 | **No guidance text on items.** Unlike the anonymous `/checklist` which has "Why & how" expandable sections with steps and explanations, the workspace checklist shows ONLY the item title and Done/Unsure/Skipped buttons. No "why it matters", no steps, no time estimates. This is a major gap -- employees are expected to mark items Done/Unsure/Skipped without understanding what the item means or how to do it. | Critical | #5 |
| WC2 | **Awareness items can't meaningfully be marked "Done."** Items like "Spot a phishing email" and "Know the one rule: report, don't hide" are awareness/knowledge items. Marking them "Done" doesn't make sense -- how does an employee prove they can "spot a phishing email"? There's no test or acknowledgment mechanism. | High | #7 |
| WC3 | **Only "Security Awareness" section visible.** The workspace checklist for this user (org admin) shows only 11 awareness items. The 25 "IT Baseline" items are presumably assigned to the IT executor. But there's no indication of this -- no message like "25 IT items are assigned to your IT executor." | Medium |
| WC4 | **No back button or breadcrumb.** Only navigation is the top nav bar. | Low | #6 |

### 3.4 Dashboard (`/workspace/dashboard`)

**What works:**
- Shows assessment status (active, started date)
- Progress bar (1/36 responses, 3%)
- Done/Unsure/Skipped breakdown
- Category breakdown (IT Baseline 0%, Awareness 9%)
- Team progress section showing each member's progress
- "Print summary" button

**Issues found:**

| # | Issue | Severity |
|---|-------|----------|
| D1 | **"No assessment completed" banner is confusing.** It appears at the top even though there IS an active assessment shown below. The message means "no assessment has been completed yet" but reads as "there is no assessment." | Medium |
| D2 | **User shown as UUID hash** ("b5f08457...") instead of name or email. The display_name feature is apparently not set for this user. | Medium |
| D3 | **No explanation of "cadence indicator"** mentioned in the workspace home card description ("Progress overview and cadence indicator") -- the dashboard doesn't show any cadence indicator. | Low |

### 3.5 Assessments (`/workspace/assessments`)

**What works:**
- Shows active assessment with "Mark complete" button
- "Assessment already in progress" button (disabled) prevents starting a second one

**Issues found:**

| # | Issue | Severity | Stefan ref |
|---|-------|----------|------------|
| A1 | **No explanation of what an assessment is.** A first-time user sees "Assessments" with a greyed-out "Assessment already in progress" button but no context for what this means, what completing it does, or why they'd want to start another one. | Medium | #4 |
| A2 | **"Assessment already in progress" looks like an error.** It's a disabled dark button that looks like something went wrong rather than a helpful status indicator. | Low | #4 |

### 3.6 Team (`/workspace/team`)

**What works:**
- Invite form with email, role dropdown, IT executor checkbox
- Pending invites list with email, role, expiry date
- "Copy link" and "Revoke" actions per invite

**Issues found:**

| # | Issue | Severity |
|---|-------|----------|
| T1 | **No list of current team members** -- only pending invites are shown. The org admin (current user) doesn't appear in any "Members" section. | Medium |
| T2 | **No explanation of roles.** The dropdown shows "Employee" and "Manager" but doesn't explain the difference or what permissions each has. | Low |

### 3.7 Org Settings (`/workspace/settings`)

**What works:**
- Email platform dropdown (Google Workspace, Microsoft 365, Gmail, Other)
- IT executor assignment dropdown
- "Save settings" button
- Link to "Settings & data (export, deletion)"

**Issues found:**

| # | Issue | Severity | Stefan ref |
|---|-------|----------|------------|
| ST1 | **No mention of reminders or notifications.** Stefan expected settings for reminders ("remind team members weekly") but nothing like that exists. | Medium | #9 |
| ST2 | **IT executor shown as UUID** ("b5f08457... (org admin)") instead of display name or email. | Medium |

---

## 4. Time Estimate Analysis

The landing page H1 claims "Fix the biggest cyber risks in 30 minutes."

### Actual time estimates from checklist items (all 17 items):

| Group | Items | Low estimate | High estimate |
|-------|-------|-------------|--------------|
| Passwords & Accounts | 4 | 45 min | 110 min |
| Email Security | 3 | 30 min | 70 min |
| Updates & Patching | 2 | 35 min | 100 min |
| Backups & Recovery | 2 | 75 min | 225 min |
| Least Privilege | 2 | 40 min | 110 min |
| Human Security | 2 | 50 min | 70 min |
| Network Basics | 2 | 25 min | 65 min |
| **Total** | **17** | **300 min (5 hrs)** | **750 min (12.5 hrs)** |

### High-impact items only (11 items):

| Item | Time |
|------|------|
| Password manager | 10-20 min |
| MFA for email | 5-15 min |
| Separate admin accounts | 15-30 min |
| Anti-phishing filters | 10-20 min |
| Auto OS updates | 5-10 min |
| Update routers/VPNs | 30-90 min |
| 3-2-1 backups | 60-180 min |
| Test backups | 15-45 min |
| Remove local admin | 30-90 min |
| Awareness session | 30 min |
| **Total high-impact** | **210-530 min (3.5-9 hrs)** |

**Conclusion:** The "30 minutes" claim is significantly misleading. Even the "30-60 minutes for the highest-impact items" in the body text understates it by 5-10x. Consider changing the headline to something like "Find your biggest cyber risks in 30 minutes" (assessment/discovery framing) rather than "Fix" (implementation framing).

---

## 5. Stefan's Issues Verification Summary

| # | Stefan's issue | Status | Details |
|---|---------------|--------|---------|
| 1 | Landing page "No fear." text | CONFIRMED | Present in subheading paragraph, not the H1. The phrase reads naturally in context ("No fear. No enterprise complexity.") but Stefan felt it sounded odd. |
| 2 | Time mismatch (30 min claim vs actual) | CONFIRMED - CRITICAL | H1 says 30 min, body says 30-60 min, actual total is 5-12.5 hours. Even high-impact-only is 3.5-9 hours. |
| 3 | /summary navigation inconsistency | PARTIALLY FIXED | The anonymous summary page now has back links ("Browse the checklist first", "Home"). But it's still an empty page for anon users. |
| 4 | Assessment start UX confusion | CONFIRMED | "Assessment already in progress" disabled button with no explanation of what assessments are or what to do. |
| 5 | Workspace checklist missing guidance | CONFIRMED - CRITICAL | Workspace checklist has zero guidance text. Anonymous checklist has full "Why & how" sections. Workspace users (who actually need to act) get less information than anonymous browsers. |
| 6 | Missing back buttons | CONFIRMED | Workspace pages rely solely on the top nav bar. No contextual back buttons or breadcrumbs. |
| 7 | Awareness items can't meaningfully be marked Done | CONFIRMED | "Spot a phishing email" with a "Done" button makes no practical sense. These need a different interaction model (acknowledge/confirm understanding). |
| 8 | Sign-up doesn't explain 3-step process | CONFIRMED | Login page and post-submit message give no preview of the onboarding journey ahead. |
| 9 | Org settings doesn't mention reminders | CONFIRMED | No reminder/notification settings exist anywhere in the app. |

---

## 6. Priority Recommendations

### Must-fix (before next user testing)

1. **Fix the time claim on landing page.** Change H1 from "Fix the biggest cyber risks in 30 minutes" to something like "Find your biggest cyber risks in 30 minutes" or "Start fixing your biggest cyber risks today." Update the body text similarly.

2. **Add guidance text to workspace checklist items.** Port the "Why & how" content (whyItMatters + steps) from the anonymous checklist to the workspace checklist. Employees cannot meaningfully act on items without this.

3. **Show display names instead of UUIDs.** Dashboard "Team progress" and Settings "IT executor" show raw UUIDs. Fall back to email address if no display_name is set.

### Should-fix (next iteration)

4. **Rethink awareness item interaction.** Instead of "Done" for knowledge items, consider "I understand this" or a brief acknowledgment flow.

5. **Add onboarding guidance.** After first login, show a brief welcome explaining: (1) Set up your org settings, (2) Invite your team, (3) Work through the checklist together.

6. **Clarify assessment concept.** Add explanatory text on the Assessments page describing what an assessment is and what completing one means.

7. **Show current team members on Team page**, not just pending invites.

### Nice-to-have

8. Fix org name truncation in nav bar
9. Add breadcrumbs or contextual back buttons
10. Consider adding a reminder/notification settings section
11. Make anonymous /summary page more useful (show sample or structure preview)

---

## 7. What Works Well

- The anonymous checklist is excellent -- well-organized, clear guidance, practical steps
- Trust signals on landing page are compelling for SMB audience
- Magic link auth flow is smooth and fast
- Dashboard gives a good org-level overview
- Team invite flow is simple and functional
- The separation of IT Baseline vs Awareness items by role is a sound design choice
- Print summary feature on dashboard is useful
- "Resume where you left off" on workspace checklist is helpful
