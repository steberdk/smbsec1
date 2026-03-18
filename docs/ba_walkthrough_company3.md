# BA Walkthrough: Company 3 -- Owner Does IT

**Date**: 2026-03-18
**Tester**: BA Agent 2
**Scenario**: Owner handles IT themselves (no separate IT person)
**Email platform**: Microsoft 365
**OS**: Windows
**Company size**: 6-20 people

---

## 1. Test Setup

### Accounts Used

| Role | Email | Password |
|---|---|---|
| Owner (+ IT executor) | smbsec1_3owner@bertramconsulting.dk | 3DVmbo+VHUNbwmy9RuiFeyPdEBc |
| Employee 1 | smbsec1_3emp1@bertramconsulting.dk | 3DVmbo+VHUNbwmy9RuiFeyPdEBc |
| Employee 2 | smbsec1_3emp2@bertramconsulting.dk | 3DVmbo+VHUNbwmy9RuiFeyPdEBc |

### Cleanup

Ran `frontend/scripts/cleanup_company3.js` to ensure a clean slate. All prior data for these emails was deleted from: assessment_responses, assessment_items, assessments, invites, org_members, orgs, auth.users.

---

## 2. Step-by-Step Observations

### Step 1: Login Page

- Navigated to https://smbsec1.vercel.app/login
- Clean login form: heading "Log in", subtext "We'll send you a secure sign-in link. No password needed."
- Email field with placeholder "you@company.com"
- "Send sign-in link" button
- "Back to home" link
- **Observation**: After entering the email and clicking send, the first submission appeared to succeed silently (no visible success message), and subsequent attempts showed "email rate limit exceeded". The success/confirmation feedback was missing or very brief.

### Step 2: Magic Link and Auth Callback

- Supabase sends a magic link email
- Clicking the link redirects to `/auth/callback#access_token=...`
- Shows "Signing you in..." briefly
- Auth callback has a 5-second timeout; if session not established, redirects to /login
- **Observation**: The Supabase session was sometimes not properly persisting, requiring multiple magic link attempts. The auth callback page relies on `onAuthStateChange` to detect the session from the URL hash.

### Step 3: Onboarding Page

After successful auth, new users (without an org) are redirected to `/onboarding`.

**Onboarding form fields:**
- Organisation name (required)
- Email system: Not sure, Google Workspace, Microsoft 365, Personal Gmail, Other
- Computers: Not sure, Windows, Mac, Mixed
- Company size: Not sure, 1-5, 6-20, 21-50, 50+
- Who handles IT (required, radio buttons):
  - "I do" -- You'll work through the IT checklist yourself.
  - "A staff member" -- We'll send them an invite with the IT checklist assigned.
  - "An external IT company or consultant" -- We can send them an invite, or you can share the checklist with them.
  - "Not sure yet" -- We'll assign it to you for now.

**For Company 3, selected:**
- Organisation name: "Company Three BA Test"
- Email system: Microsoft 365
- Computers: Windows
- Company size: 6-20 people
- IT handling: "I do"

When "I do" is selected, no additional fields appear (unlike "A staff member" which shows email/name fields for the IT person).

**CRITICAL BUG FOUND: Browser Autofill Contamination**
When using the same browser that previously completed onboarding for another company, the onboarding form was pre-populated with stale data from the previous session. The browser's form autofill feature filled in the org name, email platform, and even the IT handling radio selection from Company 2's onboarding. In some cases, the form appeared to auto-submit with the wrong data, creating an org with the wrong name and settings. This happened multiple times during testing.

- Root cause: The form inputs lack `autocomplete="off"` or unique naming that would prevent browser autofill interference
- Impact: Users who test from the same browser or who previously visited the onboarding page for a different account will get wrong data

### Step 4: Workspace Home (Owner as IT Executor)

After org creation, the workspace shows:
- **Header**: "Company Three BA Test" in nav bar
- **Role badge**: "Org Admin . IT Executor" -- correctly shows both roles
- **Get started in 3 steps** panel:
  1. "Invite your IT lead" -- with "Invite team member" link
  2. "Start your first assessment"
  3. "Share the summary"

**UX BUG**: Step 1 says "Invite your IT lead" even though the owner chose "I do" (handles IT themselves). This step should either be auto-completed or show different text like "You're handling IT yourself" with a checkmark. The current text is confusing because it suggests the owner still needs to invite an IT person.

**Navigation links** (for org admin + IT executor):
- Home, Checklist, Dashboard, Team, Assessments, Settings, Log out

**Cards**: My checklist, Dashboard, Team, Assessments, Org Settings, Settings & data

### Step 5: Org Settings

- Email platform: Microsoft 365 (correctly saved)
- IT executor dropdown: Initially appeared empty on first visit after org creation. On subsequent visits with team members present, correctly shows the owner selected with all team members available as options.
- "Save settings" button

### Step 6: Start Assessment

- Assessments page showed "No assessments yet"
- Clicked "Start new assessment" -- assessment created immediately
- Button changed to "Assessment already in progress" (disabled)
- Assessment shows: "org assessment . active . Started 3/18/2026"
- "Mark complete" button available

### Step 7: Owner's Checklist

The owner sees **36 items total** across two tracks:

**IT Baseline (25 items):**

| # | Item | Impact |
|---|---|---|
| 1 | Turn on automatic OS updates | high |
| 2 | Remove local admin rights from daily users | high |
| 3 | Enable anti-phishing and spam filters | high |
| 4 | Run a 30-minute security awareness session | high |
| 5 | Change default router and admin passwords | medium |
| 6 | Use a password manager | high |
| 7 | Set up 3-2-1 backups | high |
| 8 | Separate guest Wi-Fi from internal devices | medium |
| 9 | Turn on MFA for email accounts | high |
| 10 | Write a 1-page security rules doc (use our template) | medium |
| 11 | Update routers, firewalls, VPNs and website plugins | high |
| 12 | Test restoring backups (quarterly) | high |
| 13 | Create an offboarding checklist for leavers | medium |
| 14 | Verify Office macros from the internet are blocked | medium |
| 15 | Verify endpoint protection is active | high |
| 16 | Add an easy 'Report Phishing' method | medium |
| 17 | Audit third-party app access (OAuth grants) | high |
| 18 | Check that RDP is not exposed to the internet | high |
| 19 | Enable full-disk encryption on all company devices | high |
| 20 | Set up DNS filtering to block malicious websites | high |
| 21 | Write a simple incident response plan | high |
| 22 | Separate admin accounts from daily accounts | high |
| 23 | Remove or lock down shared accounts | medium |
| 24 | Set up SPF, DKIM, and DMARC for your domain | high |
| 25 | Create a list of all SaaS accounts your company uses | medium |

**Security Awareness (11 items):**

| # | Item | Impact |
|---|---|---|
| 1 | Spot a phishing email | high |
| 2 | Recognise a fake login page | high |
| 3 | Spot a phone or voice scam | high |
| 4 | Spot a fake invoice or supplier email | high |
| 5 | Use a strong, unique password for your work accounts | high |
| 6 | Turn on two-step login for your work accounts | high |
| 7 | Turn on two-step login for all work tools, not just email | high |
| 8 | Lock your screen when you step away | medium |
| 9 | Think before opening files from USB drives, downloads, or messaging apps | medium |
| 10 | Know what to do if you think you clicked something bad | high |
| 11 | Know the one rule: report, don't hide | high |

**Banner message**: "Your admin has assigned you the IT Baseline track -- these are the technical controls for Company Three BA Test."

**Platform-specific steps (M365) confirmed working:**
- "Enable anti-phishing and spam filters" shows M365-specific steps: "Open security.microsoft.com", "Edit the Anti-phishing policy", "Edit the Safe Attachments policy", "Edit the Safe Links policy"
- "Turn on MFA for email accounts" shows M365-specific steps: "Open entra.microsoft.com", "Enable Microsoft Authenticator and FIDO2 security keys", "Create Conditional Access policy"

**Item expansion**: Each item can be expanded to show:
- Short description
- "Why it matters" explanation
- "Steps" with actionable instructions (platform-specific where applicable)

**Response buttons**: Done, Unsure, Skipped (with Reset option after answering)

**Progress bar**: Updates in real-time (e.g., "3 / 36 answered . 8%")

**Other UI elements that appear after responding:**
- "Resume where you left off" button
- "X high-impact items still need attention" counter

### Step 8: Invite Employees

On the Team page:
- Invite form: Email (required), Role dropdown (Employee/Manager), IT executor checkbox
- Invited smbsec1_3emp1@bertramconsulting.dk as Employee
- Success message: "Invite sent to smbsec1_3emp1@bertramconsulting.dk"
- Pending invite shows: "employee . expires 3/25/2026" with "Copy link" and "Revoke" buttons
- Invited smbsec1_3emp2@bertramconsulting.dk as Employee
- Both invites appeared under "Pending invites"

### Step 9: Employee 1 Experience

**Accept invite flow:**
- Navigated to `/accept-invite?token=...`
- Page shows "Join your team" with "You are signing in as smbsec1_3emp1@bertramconsulting.dk"
- Optional display name field ("Shown to your team on the dashboard instead of your email")
- Entered "Employee One" as display name
- Clicked "Accept invite" -- shows "Invite accepted! Redirecting to your workspace..."

**Employee 1 workspace:**
- Role: "employee" (no IT executor badge)
- **Restricted navigation**: Home, Checklist, Dashboard, Log out (NO Team, Assessments, Settings)
- **Cards**: My checklist, Dashboard, Settings & data (limited view)

**Employee 1 checklist:**
- **Only Security Awareness items** (11 items, 0/11)
- **No IT Baseline items** -- correct separation
- No IT-related banner message
- Marked 3 items as Done: Spot a phishing email, Recognise a fake login page, Spot a phone or voice scam

**Employee 1 dashboard:**
- Shows only their own progress: 3/36 responses (8%)
- IT Baseline: 0/25 (0%) -- can see the category but not respond to it
- Awareness: 3/11 (27%)
- **No "Team progress" section** -- employees cannot see other people's responses
- "Print summary" button available

### Step 10: Employee 2 Experience

**Same flow as Employee 1:**
- Accept invite, entered "Employee Two" as display name
- Same restricted navigation and view
- Checklist: 11 Security Awareness items, all fresh (Employee 1's responses not visible)
- Marked 1 item as Done, 1 as Unsure
- Dashboard shows only Employee 2's own data

### Step 11: Owner Dashboard with Full Team

After all responses, the owner's dashboard shows:
- **8 / 108 responses (7%)** -- 108 = 36 items x 3 team members
- Done: 5, Unsure: 2, Skipped: 1
- IT Baseline: 3/25 items (4%) -- only owner's responses
- Awareness: 5/11 items (15%)
- **Team progress** section (admin-only):
  - Owner: 8% (1 done, 1 unsure, 1 skipped)
  - Employee 1: 27% (3 done)
  - Employee 2: 18% (1 done, 1 unsure)

**BUG**: Display names ("Employee One", "Employee Two") entered during invite acceptance are NOT shown. The dashboard displays raw email addresses instead.

### Step 12: Edge Case Testing

**Employee accessing /workspace/settings:**
- Page loads but shows: "Only organisation admins can change settings."
- No form or controls exposed -- good permission enforcement

**Employee accessing /workspace/assessments:**
- Page loads, shows the active assessment info
- No "Start new assessment" or "Mark complete" buttons -- view-only, correct

**Employee accessing /workspace/team:**
- Not tested via direct URL, but nav link is hidden from employees

**IT executor reassignment:**
- On Settings page, the IT executor dropdown shows all team members
- Owner could reassign IT executor to an employee if desired
- This would presumably move the IT Baseline items to that employee

---

## 3. Issues Found

| # | Issue | Severity | Page | Role | Details |
|---|---|---|---|---|---|
| 1 | Browser autofill contaminates onboarding form | Critical | /onboarding | New user | Form inputs lack autocomplete="off"; browser autofill pre-populates fields from previous sessions, potentially creating orgs with wrong name/settings |
| 2 | "Invite your IT lead" step shown when owner IS IT | Medium | /workspace | Owner (IT executor) | Step 1 of "Get started in 3 steps" says "Invite your IT lead" even though owner selected "I do" during onboarding. Should be auto-completed or show different text |
| 3 | Display names not shown on dashboard | Medium | /workspace/dashboard | Admin | Employees entered display names during invite acceptance but dashboard shows raw email addresses instead |
| 4 | IT executor dropdown initially empty on Settings | Low | /workspace/settings | Admin | After org creation, the IT executor dropdown appeared blank on first visit. Populated correctly on subsequent visits |
| 5 | Login form lacks visible success feedback | Low | /login | Any | After submitting the magic link form, there's no clear "Check your email" confirmation message (or it's too brief to notice) |
| 6 | Auth session sometimes not persisting | Medium | /auth/callback | Any | The auth callback relies on Supabase's onAuthStateChange with a 5-second timeout. If session isn't established in time, user is redirected to /login. Multiple magic link attempts may be needed |
| 7 | "Get started" panel inconsistently shown | Low | /workspace | Admin | The 3-step guide appeared on first visit but not on subsequent visits. No clear logic for when to show/hide it |

---

## 4. Comparison: Owner-as-IT vs Separate IT Person

| Aspect | Owner-as-IT (Company 3) | Separate IT Person (Company 2) |
|---|---|---|
| Onboarding IT selection | "I do" | "A staff member" (shows email/name fields) |
| Owner role badge | "Org Admin . IT Executor" | "Org Admin" |
| Owner checklist items | 36 (25 IT Baseline + 11 Awareness) | 11 (Awareness only) |
| IT person checklist | N/A (owner handles both) | 25 IT Baseline items |
| Invite flow | Only employees (no IT invite needed) | IT person invited with IT executor flag |
| Settings IT executor | Shows owner pre-selected | Shows IT person pre-selected |
| Dashboard IT Baseline progress | Only owner's responses | Only IT person's responses |
| Total team items to track | More items per person for owner | Distributed across more people |
| Get started steps | Step 1 "Invite IT lead" is misleading | Step 1 "Invite IT lead" correctly applies |

**Key insight**: The owner-as-IT path creates more cognitive load for the owner (36 items vs 11), but simplifies org setup (no IT invite needed). The platform correctly handles both scenarios from a data/permission perspective, but the UX (especially the "Get started" panel) doesn't fully adapt to the owner-as-IT scenario.

---

## 5. UX Assessment Per Role

### Owner (Org Admin + IT Executor)
- **Strengths**: Clear role badge, full dashboard with team progress, access to all admin functions
- **Weaknesses**: 36 items is a lot for one person, no prioritization guidance beyond high/medium tags, "Get started" panel text is misleading
- **Overall**: Functional but could feel overwhelming; the checklist doesn't acknowledge the dual responsibility

### Employee
- **Strengths**: Clean, focused experience with only relevant items; restricted navigation prevents confusion; dashboard shows only own progress (privacy)
- **Weaknesses**: No display name shown on their own dashboard or profile; no way to know how team is progressing overall; no onboarding guidance or welcome message
- **Overall**: Good experience for completing assigned tasks, but feels isolated

---

## 6. Recommendations

### Critical
1. **Fix browser autofill contamination**: Add `autocomplete="off"` or use randomized field names on the onboarding form to prevent browser autofill. Consider adding a confirmation step before org creation.

### High Priority
2. **Adapt "Get started" panel for owner-as-IT**: When owner selects "I do" for IT, mark Step 1 as completed or change text to "You're handling IT yourself" with a checkmark.
3. **Show display names on dashboard**: Use the display_name field from org_members instead of raw email addresses in the Team progress section.
4. **Improve auth session reliability**: Increase the 5-second timeout on the auth callback, or implement retry logic for session establishment.

### Medium Priority
5. **Add visible feedback on login form**: Show a clear "Check your email for your sign-in link" message after successful magic link send.
6. **Show display names in employee profiles**: Display the name entered during invite acceptance in the nav bar or dashboard.
7. **Consider a "Quick wins" view for IT executor owners**: When one person has 36 items, show a filtered view of the fastest/highest-impact items to start with.
8. **Add employee welcome message**: When an employee first lands on their workspace, show a brief welcome explaining what they need to do and why.

### Low Priority
9. **Persist "Get started" panel visibility**: Use a clear dismiss mechanism rather than inconsistent show/hide behavior.
10. **Show team progress summary to employees**: Consider showing a team-level completion percentage (without individual details) to motivate employees.
