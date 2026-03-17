# Acceptance Criteria — Full Specification

This document converts user journeys into testable, enforceable rules.

Each section contains:
- **Backend AC**: rules enforced by DB constraints, RLS, and API logic
- **E2E Scenarios**: step-by-step sequences for Playwright tests (happy path + key error paths)

These criteria must be satisfied by: backend logic, database constraints, RLS policies, and E2E tests.

E2E scenario format:
- **Actor**: the role performing the action
- **Start**: the URL or UI state where the test begins
- **Steps**: ordered user actions
- **Assert**: what must be true after steps complete

---

# 1. Public Pages

## AC-PUB-1
Landing page (`/`) must display:
- A headline communicating the product purpose
- A "What actually breaches SMBs" section naming at least 5 attack types
- A call-to-action to start the checklist or sign up

## AC-PUB-2
`/checklist` must be accessible without login.
Checklist item titles must be visible.
Status action buttons (Done / Not sure / Skip) must NOT be visible to anonymous users.
A sign-in prompt must be visible.

## AC-PUB-3
`/summary` must show a sign-in prompt and sign-in link when no session exists.

### E2E-PUB-01: Landing page shows breach scenarios and CTA
- Actor: anonymous
- Start: /
- Steps:
  1. Navigate to /
- Assert:
  - [ ] A section titled or containing "breaches", "how SMBs get hacked", or equivalent is visible
  - [ ] At least 5 attack type names are visible (e.g. phishing, ransomware, password, invoice fraud, BEC)
  - [ ] A link or button to start the checklist or sign up is visible

### E2E-PUB-02: Anonymous checklist is read-only
- Actor: anonymous
- Start: /checklist
- Steps:
  1. Navigate to /checklist
- Assert:
  - [ ] Page heading for the checklist is visible
  - [ ] At least one checklist item title is visible
  - [ ] No "Done" button is visible
  - [ ] No "Not sure" button is visible
  - [ ] No "Skip" button is visible
  - [ ] A sign-in prompt or CTA is visible

### E2E-PUB-03: Summary page prompts sign-in for anonymous user
- Actor: anonymous
- Start: /summary
- Steps:
  1. Navigate to /summary
- Assert:
  - [ ] Text communicating "sign in to see progress" (or equivalent) is visible
  - [ ] A sign-in link is visible

---

# 2. Authentication

## AC-AUTH-1
Protected routes (`/workspace` and its sub-routes) must redirect to `/login` when no valid session exists.

## AC-AUTH-2
After successful login, user is redirected to `/workspace` or the originally requested URL.

## AC-AUTH-3
Invalid credentials must show an error message. User must remain on `/login`.

### E2E-AUTH-01: Protected route redirects unauthenticated user
- Actor: anonymous
- Start: /workspace
- Steps:
  1. Navigate to /workspace without a session
- Assert:
  - [ ] Redirected to /login
  - [ ] Login form is visible

### E2E-AUTH-02: Successful login redirects to workspace
- Actor: registered user with an existing org
- Start: /login
- Steps:
  1. Enter valid email and password
  2. Submit the login form
- Assert:
  - [ ] Redirected to /workspace (or originally requested URL)
  - [ ] User is identified (name or email visible in UI)

### E2E-AUTH-03: Invalid login shows error
- Actor: anonymous
- Start: /login
- Steps:
  1. Enter an invalid email/password combination
  2. Submit the login form
- Assert:
  - [ ] An error message is visible
  - [ ] User remains on /login

---

# 3. Onboarding — Org Creation + IT Setup

## AC-ONBOARD-1
A user who logs in with no org must be shown the org creation flow before reaching /workspace.

## AC-ONBOARD-2
Org creation flow must include a question "Who handles IT for your business?" with four options:
- I do (owner handles IT)
- A staff member (prompts for name + email)
- An external IT company / consultant (optional email)
- Not sure

## AC-ONBOARD-3
If option B or C is selected and an email is provided, an invite must be queued for that email with the IT Executor assignment. The IT Baseline checklist is pre-assigned to that invitee, not the owner.

## AC-ONBOARD-4
If "Not sure" is selected, the IT Baseline checklist is assigned to the org admin. A dismissable notice is shown: "You can reassign IT tasks later in Team Settings."

## AC-ONBOARD-5
Onboarding captures (optional but prompted):
- Email platform: Google Workspace / Microsoft 365 / Personal Gmail / Other
- Primary OS: Windows / Mac / Mixed
- Company size: 1–5 / 6–20 / 21–50 / 50+

These answers are stored per org and used to show platform-specific checklist guidance.

### E2E-ONBOARD-01: First login routes new user to org creation
- Actor: newly registered user (no org)
- Start: /login
- Steps:
  1. Log in with new account credentials
- Assert:
  - [ ] User is NOT taken directly to /workspace
  - [ ] Org creation / onboarding flow is shown
  - [ ] "Create your organisation" heading or equivalent is visible

### E2E-ONBOARD-02: Org creation with "I do" for IT
- Actor: newly registered user
- Start: org creation flow
- Steps:
  1. Enter org name
  2. Select "I do" for the IT question
  3. Select email platform and OS (optional fields)
  4. Submit
- Assert:
  - [ ] Redirected to /workspace
  - [ ] IT Baseline checklist is visible and assigned to the current user
  - [ ] No pending invite is shown in team settings

### E2E-ONBOARD-03: Org creation with "A staff member" for IT
- Actor: newly registered user
- Start: org creation flow
- Steps:
  1. Enter org name
  2. Select "A staff member"
  3. Enter IT person's name and email
  4. Submit
- Assert:
  - [ ] Redirected to /workspace
  - [ ] Pending invite for the IT person is visible in team settings
  - [ ] IT Baseline checklist is NOT shown in the owner's task list
  - [ ] Dashboard notes IT Baseline as awaiting the invited person

### E2E-ONBOARD-04: "Not sure" shows reassignment notice
- Actor: newly registered user
- Start: org creation flow
- Steps:
  1. Enter org name
  2. Select "Not sure"
  3. Submit
- Assert:
  - [ ] IT Baseline checklist is shown and assigned to current user
  - [ ] A notice is visible mentioning that IT tasks can be reassigned later

### E2E-ONBOARD-05: Platform choice persists and drives checklist guidance
- Actor: org admin who selected "Google Workspace" during onboarding
- Start: IT Baseline checklist, "Enable anti-phishing filters" item
- Assert:
  - [ ] Steps reference admin.google.com
  - [ ] No Microsoft 365 instructions are shown

---

# 4. Organization Model

## AC-ORG-1
When a user creates an organization:
- A row must be inserted into `orgs`
- A corresponding `org_members` row must be created
  - role = 'org_admin'
  - manager_user_id = null

## AC-ORG-2
An organization must have exactly one root member:
- role = 'org_admin'
- manager_user_id IS NULL

### E2E-ORG-01: Org is created with admin as root
- Actor: newly registered user completing onboarding
- Assert:
  - [ ] /workspace loads without error after onboarding
  - [ ] User's role is shown as "Owner", "Admin", or equivalent
  - [ ] Team view shows only the current user initially

---

# 5. Invite Flow

## AC-INV-1
Org Admin can invite direct reports.
Invited member must reference the inviter as manager_user_id.

## AC-INV-2
Manager can invite direct reports only.
Invited member must reference the manager as manager_user_id.
Manager cannot assign the org_admin role.

## AC-INV-3
A user cannot invite anyone outside their subtree.

### E2E-INV-01: Org Admin invites a manager
- Actor: org_admin
- Start: /workspace/team
- Steps:
  1. Click "Invite team member"
  2. Enter a valid email address
  3. Select role: Manager
  4. Submit
- Assert:
  - [ ] Invite appears in the pending invites list
  - [ ] Invite shows the correct email and role

### E2E-INV-02: Manager invites a direct report
- Actor: manager (logged in after accepting invite)
- Start: /workspace/team
- Steps:
  1. Click "Invite team member"
  2. Enter a valid email, select role: Employee
  3. Submit
- Assert:
  - [ ] Invite is created and visible in manager's team view
  - [ ] "Org Admin" is NOT available as a role option in the dropdown

### E2E-INV-03: Employee has no invite capability
- Actor: employee
- Start: /workspace
- Assert:
  - [ ] No "Invite team member" button is visible
  - [ ] Direct navigation to the invite URL returns 403 or redirects

### E2E-INV-04: Invited user accepts and lands in workspace
- Actor: invited user following email link
- Steps:
  1. Follow invite link
  2. Create account (or log in if already registered)
- Assert:
  - [ ] User lands in /workspace
  - [ ] Assigned checklist track is visible
  - [ ] User appears in inviter's team view

---

# 6. Checklist Tracks

## AC-TRACK-1
Two tracks exist: IT Baseline and Employee Awareness.

## AC-TRACK-2
IT Baseline items carry tag `it-track`.
Awareness items carry tag `awareness-track`.

## AC-TRACK-3
The IT Executor (set at onboarding or via team settings) sees the IT Baseline track.
All org members (including org admin, managers, and IT executor) see the Awareness track.

## AC-TRACK-4
Platform-specific step content is shown based on the org's email platform setting:
- Google Workspace: steps reference admin.google.com
- Microsoft 365: steps reference security.microsoft.com / M365 admin center
- Personal Gmail: steps reference Gmail settings + note that Workspace offers more control
- Other / not set: generic steps shown with a prompt to configure the platform in org settings

### E2E-TRACK-01: IT Executor sees IT Baseline track
- Actor: user assigned as IT Executor
- Start: /workspace
- Assert:
  - [ ] "IT Baseline" (or equivalent) section is visible
  - [ ] Items such as "Enable anti-phishing filters" and "Turn on MFA" are present

### E2E-TRACK-02: Regular employee does not see IT Baseline
- Actor: employee (not assigned IT Executor role)
- Start: /workspace
- Assert:
  - [ ] IT Baseline section is NOT visible
  - [ ] Employee Awareness section IS visible

### E2E-TRACK-03: All members see the Awareness track
- Actor: org_admin, manager, and employee (test each)
- Start: /workspace
- Assert:
  - [ ] Awareness track items visible for all three role types
  - [ ] Items include: "Spot a phishing email", "Lock your screen", "Know what to do if you clicked something bad"

### E2E-TRACK-04: Google Workspace platform shows correct steps
- Actor: IT Executor, org platform = Google Workspace
- Start: "Enable anti-phishing filters" checklist item
- Assert:
  - [ ] Step text references admin.google.com
  - [ ] No mention of security.microsoft.com

### E2E-TRACK-05: Microsoft 365 platform shows correct steps
- Actor: IT Executor, org platform = Microsoft 365
- Start: "Enable anti-phishing filters" checklist item
- Assert:
  - [ ] Step text references security.microsoft.com or M365 admin center
  - [ ] No mention of admin.google.com

### E2E-TRACK-06: Unset platform shows generic steps and configuration prompt
- Actor: IT Executor, org with no email platform configured
- Start: "Enable anti-phishing filters" checklist item
- Assert:
  - [ ] Generic step text is shown
  - [ ] A prompt or link to configure email platform in org settings is visible

---

# 7. Checklist Item States

## AC-ITEM-1
Authenticated users can set item status: Done / Not sure / Skip.

## AC-ITEM-2
Status is saved to localStorage immediately and debounced to the backend (600ms).

## AC-ITEM-3
On page reload, remote state takes precedence over localStorage when the user is logged in.

### E2E-ITEM-01: Mark item as Done persists across reload
- Actor: authenticated user with assigned track
- Start: checklist page with at least one item
- Steps:
  1. Click "Done" on an item
- Assert:
  - [ ] Item immediately shows "Done" state
  - [ ] Progress bar percentage increases
  - [ ] On page reload, item remains "Done"

### E2E-ITEM-02: Mark item as Not sure
- Actor: authenticated user
- Steps:
  1. Click "Not sure" on an item
- Assert:
  - [ ] Item shows "Not sure" state
  - [ ] Item is counted separately from "Done" in progress stats

### E2E-ITEM-03: Mark item as Skip
- Actor: authenticated user
- Steps:
  1. Click "Skip" on an item
- Assert:
  - [ ] Item shows "Skipped" state
  - [ ] Skipped items do not increase the completion percentage

### E2E-ITEM-04: Reset item returns it to uncompleted
- Actor: authenticated user
- Steps:
  1. Mark an item as "Done"
  2. Click "Reset" (or equivalent undo action)
- Assert:
  - [ ] Item returns to uncompleted state
  - [ ] Progress bar percentage decreases

---

# 8. Assessment Lifecycle

## AC-ASMT-1
Only one assessment with status='active' may exist per org.
Attempting to create another must return HTTP 409.

## AC-ASMT-2
Assessment state transitions allowed: active → completed only.
No other transitions permitted in MVP.

## AC-ASMT-3
When an assessment is created, all current checklist items must be copied into `assessment_items`.
This snapshot is immutable for the lifetime of the assessment.

## AC-ASMT-4
If scope = 'subtree': root_user_id must be set. Only users within that subtree can submit responses.

## AC-ASMT-5
If scope = 'org': all org members can submit responses.

### E2E-ASMT-01: Org Admin starts an org-wide assessment
- Actor: org_admin (no active assessment)
- Start: /workspace/assessments
- Steps:
  1. Click "Start new assessment"
  2. Select scope: Org-wide
  3. Confirm
- Assert:
  - [ ] Assessment appears as "Active" in the assessment list
  - [ ] "Start new assessment" button is disabled or hidden
  - [ ] All org members see their assigned checklist items

### E2E-ASMT-02: Cannot start second assessment while one is active
- Actor: org_admin (active assessment already exists)
- Start: /workspace/assessments
- Steps:
  1. Attempt to start another assessment
- Assert:
  - [ ] Error or blocking message visible ("An assessment is already in progress" or equivalent)
  - [ ] No new assessment is created

### E2E-ASMT-03: Complete an active assessment
- Actor: org_admin
- Start: /workspace/assessments (active assessment visible)
- Steps:
  1. Click "Complete assessment"
  2. Confirm
- Assert:
  - [ ] Assessment status changes to "Completed"
  - [ ] "Start new assessment" button becomes available again
  - [ ] Completed assessment appears in assessment history

### E2E-ASMT-04: Manager starts a subtree reassessment
- Actor: manager
- Start: /workspace/assessments
- Steps:
  1. Click "Start reassessment for my team"
  2. Verify scope shown is manager's subtree only
  3. Confirm
- Assert:
  - [ ] Assessment created with scope = subtree
  - [ ] Only manager's direct reports see new assessment items
  - [ ] Employees outside the subtree do not see new items

---

# 9. Scope Enforcement

## AC-SCOPE-1
Assessment response creation must validate:
- User belongs to the same org
- User is within scope (org-wide or correct subtree)

Invalid requests must be rejected (HTTP 403).

## AC-SCOPE-2
Manager triggering a subtree assessment: root_user_id must equal the manager's own user_id.

### E2E-SCOPE-01: Out-of-scope user cannot submit responses
- Actor: employee outside the assessment's subtree scope
- Steps:
  1. Attempt to submit a response for an assessment not scoped to them (via direct API call)
- Assert:
  - [ ] API returns 403
  - [ ] No response record is created

---

# 10. Role Boundaries

## AC-ROLE-1
Employee:
- Cannot invite users
- Cannot start or complete an assessment
- Cannot delete any user

## AC-ROLE-2
Manager:
- Can invite and manage direct reports only
- Can trigger reassessment for their subtree
- Cannot delete subtree
- Cannot delete organization
- Cannot assign org_admin role

## AC-ROLE-3
Org Admin:
- Can start org-wide assessment
- Can delete any employee
- Can delete a subtree
- Can delete the organization

### E2E-ROLE-01: Employee cannot access admin actions
- Actor: employee
- Start: /workspace
- Assert:
  - [ ] No "Invite" button visible
  - [ ] No "Start assessment" button visible
  - [ ] No "Delete" options visible
  - [ ] Navigating directly to /workspace/team returns 403 or an empty/restricted state

### E2E-ROLE-02: Manager cannot delete
- Actor: manager
- Start: /workspace/team
- Assert:
  - [ ] No "Delete employee" button visible
  - [ ] No "Delete branch" button visible
  - [ ] DELETE request to the employee API endpoint returns 403

### E2E-ROLE-03: Manager cannot assign org_admin role when inviting
- Actor: manager
- Start: invite form
- Assert:
  - [ ] "Org Admin" is not present in the role selection dropdown

---

# 11. Progress & Dashboard

## AC-AGG-1
Manager dashboard must only aggregate data from their subtree.

## AC-AGG-2
Org Admin dashboard must aggregate data from the entire org.
Aggregation must use recursive tree traversal.

## AC-DASH-1
Dashboard displays:
- Completion percentage
- Counts by status (Done / Not sure / Skip)
- Date of last completed assessment

## AC-DASH-2
Dashboard shows a recurring review cadence indicator:
- Green: completed within the last 90 days
- Amber: 90-day mark is within 14 days
- Red: more than 90 days since last completion or never completed

## AC-DASH-3
After completing a track, the user is shown a post-completion screen with:
- A "Schedule next review" section
- A button to download a .ics calendar file (quarterly: today + 90 days)

### E2E-DASH-01: Org Admin sees org-wide completion data
- Actor: org_admin (org with multiple members who have responded)
- Start: /workspace/dashboard
- Assert:
  - [ ] Completion percentage reflects all members' responses
  - [ ] Done / Not sure / Skip counts are visible
  - [ ] All members appear in the member list

### E2E-DASH-02: Manager sees subtree-only data
- Actor: manager (manages a subset of org members)
- Start: /workspace/dashboard
- Assert:
  - [ ] Completion percentage reflects only the manager's direct reports
  - [ ] Members outside the subtree do not appear in the manager's view

### E2E-DASH-03: Post-completion screen offers calendar download
- Actor: any user who has just completed all items in their assigned track
- Start: checklist completion screen
- Assert:
  - [ ] "Schedule next review" section is visible
  - [ ] "Add quarterly reminder" (or equivalent) button is present
  - [ ] Clicking the button triggers a file download with .ics extension

### E2E-DASH-04: Overdue review indicator shown
- Actor: org_admin (last completed assessment > 90 days ago)
- Start: /workspace/dashboard
- Assert:
  - [ ] Review cadence indicator shows red or "Overdue" state
  - [ ] A "Start reassessment" CTA is prominently visible

---

# 12. Hard Delete — Employee

## AC-DEL-1
Deleting an employee must:
- Remove the org_members row
- Remove all assessment_responses rows for that user
- Cascade all dependent records

## AC-DEL-2
Deletion must be irreversible. No soft-delete. No undo.

### E2E-DEL-01: Org Admin deletes an employee with confirmation
- Actor: org_admin
- Start: /workspace/team, employee row
- Steps:
  1. Click "Delete employee" on a team member
  2. Read the confirmation warning dialog
  3. Confirm deletion
- Assert:
  - [ ] Employee no longer appears in the team list
  - [ ] Employee's profile URL returns 404 or "not found"
  - [ ] Employee's responses no longer appear in dashboard aggregation

### E2E-DEL-02: Cancelling the confirmation prevents deletion
- Actor: org_admin
- Steps:
  1. Click "Delete employee"
  2. Cancel / dismiss the confirmation dialog
- Assert:
  - [ ] Employee still appears in the team list
  - [ ] No deletion occurred

### E2E-DEL-03: Manager cannot delete an employee
- Actor: manager
- Start: /workspace/team
- Assert:
  - [ ] No "Delete employee" button is visible
  - [ ] A direct DELETE request to the employee API returns 403

---

# 13. Hard Delete — Subtree

## AC-DEL-3
Only Org Admin may delete a subtree.
Deleting a subtree must remove all descendants recursively and their assessment data.

### E2E-DEL-04: Org Admin deletes a branch
- Actor: org_admin
- Start: /workspace/team, manager node with direct reports
- Steps:
  1. Click "Delete branch" on a manager
  2. Warning dialog shows count of employees who will be deleted
  3. Confirm
- Assert:
  - [ ] Manager and all their direct/indirect reports removed from team list
  - [ ] Dashboard aggregation no longer includes deleted members
  - [ ] Org admin and other branches are unaffected

---

# 14. Hard Delete — Organization

## AC-DEL-4
Only Org Admin may delete the organization.
Deletion must remove: org, org_members, assessments, assessment_items, assessment_responses.

### E2E-DEL-05: Org Admin deletes the organization
- Actor: org_admin
- Start: /workspace/settings/gdpr (or data controls page)
- Steps:
  1. Click "Delete organization"
  2. Read the strong warning
  3. Type org name to confirm (or equivalent step-up confirmation)
  4. Confirm
- Assert:
  - [ ] User is redirected to "/" or org creation flow
  - [ ] /workspace redirects to org creation (org no longer exists)
  - [ ] API returns 404 for the deleted org

---

# 15. GDPR Export

## AC-GDPR-1
Org Admin can export:
- Org structure (members and roles)
- Assessment history (all assessments and their status)
- Employee results (responses per user per assessment)

Export must include all personal data stored for the org.
Export must not include data from other orgs.

### E2E-GDPR-01: Org Admin exports all org data
- Actor: org_admin
- Start: /workspace/settings/gdpr
- Steps:
  1. Click "Export data"
- Assert:
  - [ ] A file downloads (JSON or CSV)
  - [ ] File contains org name
  - [ ] File contains member list with roles
  - [ ] File contains at least one assessment record if assessments exist
  - [ ] File does not contain data referencing a different org

---

# 16. Awareness Track Completion

## AC-AWARE-1
The Awareness track consists of 10 items grouped into: Recognise Attacks / Safe Habits / When Something Feels Wrong.

## AC-AWARE-2
Each Awareness item supports the same Done / Not sure / Skip states as IT Baseline items.

## AC-AWARE-3
Awareness track completion is tracked separately from IT Baseline completion in the dashboard.

### E2E-AWARE-01: Employee completes the Awareness track
- Actor: employee
- Start: /workspace (awareness track visible)
- Steps:
  1. Mark all 10 Awareness items as Done
- Assert:
  - [ ] Awareness track shows 100% complete
  - [ ] Post-completion screen or message is shown
  - [ ] Manager's dashboard shows this employee as "Awareness: Complete"

### E2E-AWARE-02: Awareness completion does not affect IT Baseline progress
- Actor: employee who completes all Awareness items
- Start: manager's dashboard
- Assert:
  - [ ] IT Baseline % is unchanged (0% if employee has no IT items)
  - [ ] Awareness % shows 100% for that employee

---

# 17. Steps & Why It Matters (Iteration 5)

## AC-STEPS-01
Assessment snapshot (`POST /api/assessments`) must copy `steps` (resolved for org platform) and `why_it_matters` from `checklist_items` into `assessment_items`.

## AC-STEPS-02
`GET /api/assessments/:id` must return `steps` (string[]) and `why_it_matters` (string | null) per item.

## AC-STEPS-03
Expanding a checklist item shows:
- `why_it_matters` in a highlighted block
- Numbered steps list

## AC-STEPS-04
`resolveSteps(stepsMap, platform)` picks the platform-specific variant or falls back to `"default"`.

**Status: Implemented and tested (E2E-TRACK-04, E2E-TRACK-05, E2E-TRACK-06)**

---

# 18. Per-Track Dashboard Aggregation (Iteration 5)

## AC-TRACK-AGG-01
Dashboard API returns `stats.by_track: { it_baseline: TrackStats, awareness: TrackStats }`.

## AC-TRACK-AGG-02
Non-IT-executor member's `percent` is calculated against awareness items only (not all items). Resolves AC-AWARE-3 denominator bug.

## AC-TRACK-AGG-03
Dashboard UI shows IT Baseline and Awareness as separate labelled progress indicators.

**Status: Implemented and tested (E2E-TRACK-AGG-01)**

---

# 19. Named Members (Iteration 5)

## AC-NAMES-01
`email` is stored in `org_members` at invite acceptance from `invites.email`.

## AC-NAMES-02
Dashboard API returns `email` per member from `org_members.email`.

## AC-NAMES-03
Dashboard UI shows email address instead of truncated UUID when `email` is non-null.

## AC-NAMES-04
Graceful fallback to truncated UUID when `email` is null (existing members, self-created admin).

**Status: Implemented and tested (E2E-NAMES-01)**

---

# 20. Post-Completion Screen (Iteration 5)

## AC-ITER5-05
When all assigned items are answered, checklist page shows a post-completion screen instead of the regular item list.

## AC-ITER5-06
Post-completion screen shows stat grid: done / unsure / skipped counts.

## AC-ITER5-07
Post-completion screen has a "Add reminder to calendar (.ics)" button that triggers download of `smbsec-review.ics` with DTSTART = today + 90 days.

## AC-ITER5-08
Post-completion screen has a "View dashboard" link and a "Show checklist" disclosure to view items read-only.

**Status: Implemented and tested (E2E-DASH-03, E2E-ITEM-05)**

---

# 21. First Assessment CTA (Iteration 5)

## AC-ITER5-CTA
On workspace load, if the user is `org_admin` and no active assessment exists, a prominent "Start your first security review" CTA is shown inline. Not auto-started during onboarding.

**Status: Implemented**

---

# 22. Security Headers (PI 2, Iteration 1)

## AC-SEC-HEADERS
All responses include: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo denied), Content-Security-Policy (self + Supabase connect-src, frame-ancestors none).

**Status: Implemented in next.config.ts**

---

# 23. Rate Limiting (PI 2, Iteration 1)

## AC-RATE-LIMIT
API routes enforce in-memory rate limiting (60 req/min per user). Returns 429 with Retry-After header when exceeded. Keyed by user_id (authenticated) or IP (unauthenticated).

**Status: Implemented — applied to /api/dashboard and /api/invites/accept**

---

# 24. Force Light Mode (PI 2, Iteration 1)

## AC-LIGHT-MODE
Dark mode CSS variables override removed. All pages render in light mode regardless of OS preference.

**Status: Implemented**

---

# 25. Workspace Navigation Shell (PI 2, Iteration 1)

## AC-NAV-SHELL
All workspace pages share a persistent header with: org name, role-aware nav links (Home, Checklist, Dashboard, Team, Assessments, Settings), and logout button. Individual pages no longer have "Back" links or their own header/logout.

**Status: Implemented via workspace/layout.tsx + useWorkspace context**

---

# 26. Guided First-Run (PI 2, Iteration 1)

## AC-FIRST-RUN
When org_admin has no active assessment, workspace home shows a "Get started in 3 steps" guide: 1) Invite IT lead, 2) Start assessment, 3) Share summary. Steps show done/pending state. Step 1 is marked done when pending invites exist.

**Status: Implemented**

---

# 27. Display Name Capture (PI 2, Iteration 1)

## AC-DISPLAY-NAME
Invite acceptance flow shows a name prompt before calling the accept API. Display name is stored in `org_members.display_name` and shown on the dashboard (falls back to email, then truncated UUID).

**Status: Implemented (requires migration 011 for display_name column)**

---

# 28. DB Performance Index (PI 2, Iteration 1)

## AC-DB-INDEX
Index on `assessment_responses(assessment_id, user_id)` for dashboard query performance.

**Status: Defined in migration 011**

---

# 29. Analytics SQL Views (PI 2, Iteration 1)

## AC-ANALYTICS
Three analytics views created: `v_org_completion` (per-org completion rate), `v_cadence` (days since last assessment), `v_onboarding_funnel` (signup→org→assessment→response→invite stages).

**Status: Defined in migration 011**

---

# 30. New Checklist Items (PI 2, Iteration 2)

## AC-CONTENT-NEW
5 new checklist items added: disk encryption (BitLocker/FileVault), SaaS account inventory, MFA beyond email, DNS filtering, incident response plan. All with steps, why_it_matters, impact/effort ratings, and platform-specific variants where applicable.

**Status: Implemented (migration 012)**

---

# 31. Modified Checklist Items (PI 2, Iteration 2)

## AC-CONTENT-MODIFY
3 items modified: macros item updated for post-2022 framing (Office blocks internet macros by default), USB item broadened to include downloads/messaging apps, security rules doc item adds template structure.

**Status: Implemented (migration 012)**

---

# 32. Platform-Specific Steps (PI 2, Iteration 2)

## AC-CONTENT-PLATFORM
Platform-specific steps (Google Workspace + Microsoft 365) added for: admin accounts, offboarding checklist, phishing report method. Resolved at assessment snapshot time via `resolveSteps()`.

**Status: Implemented (migration 012)**

---

# 33. Shareable Print Summary (PI 2, Iteration 2)

## AC-PRINT
Dashboard page has a "Print summary" button. `@media print` CSS hides navigation, adjusts layout for paper output. Usable for insurance renewals or management reports.

**Status: Implemented**

---

# 34. Response Tooltip Guidance (PI 2, Iteration 2)

## AC-TOOLTIPS
Done/Unsure/Skipped buttons show hover tooltips explaining what each status means: Done = control is in place, Unsure = needs investigation, Skipped = not applicable or deferred.

**Status: Implemented**

---

# 35. Risk Prioritization (PI 2, Iteration 2)

## AC-RISK-PRIORITY
When the user has started answering items but has high-impact items still not marked Done, a banner shows "X high-impact items still need attention" on the checklist page.

**Status: Implemented**
