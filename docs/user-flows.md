# User Flows — SMBSec (as of PI 11, April 2026)

This document maps every page in the application, who can access it, what they see, and how they navigate between screens.

---

## 1. User Types

| Type | Description |
|---|---|
| **Anonymous visitor** | Not signed in. Can browse the landing page, public checklist (read-only), privacy policy, and campaign action pages. |
| **Owner / org_admin** | The user who created the organisation. Full access to all workspace features including settings, campaigns, billing, reports, assessments, team management, and GDPR data controls. |
| **Manager** | A team member with the `manager` role. Can view dashboard, manage team invites, start subtree assessments, and see their own checklist. Cannot access campaigns, billing, settings, or reports. |
| **Employee** | A regular team member. Can view their own checklist, the dashboard, and GDPR/data settings. Cannot manage team, assessments, campaigns, or org settings. |
| **IT Executor** | Any member (admin, manager, or employee) flagged as `is_it_executor`. Sees both IT Baseline and Security Awareness tracks on their checklist. Non-executors see only Awareness items. |

---

## 2. Page Index

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Email OTP / magic link sign-in |
| `/auth/callback` | Public | PKCE code exchange, redirects to workspace |
| `/onboarding` | Authenticated (no org) | First-time org setup |
| `/checklist` | Public (read-only) / Authenticated (interactive) | Static security checklist |
| `/summary` | Public (teaser) / Authenticated (full) | Checklist progress summary |
| `/privacy` | Public | GDPR privacy policy |
| `/accept-invite` | Authenticated | Accept a team invite |
| `/campaign/[token]` | Public | Campaign click landing (records "clicked") |
| `/campaign/[token]/report` | Public | Campaign report landing (records "reported") |
| `/workspace` | Authenticated + has org | Workspace home hub |
| `/workspace/checklist` | Authenticated + has org | Assessment checklist with AI guidance |
| `/workspace/dashboard` | Authenticated + has org | Team progress and cadence overview |
| `/workspace/team` | Manager or Admin | Invite members, view team, manage invites |
| `/workspace/assessments` | Manager or Admin | Start, view, and complete assessments |
| `/workspace/campaigns` | Admin only | List campaigns, credits, team history |
| `/workspace/campaigns/new` | Admin only | 4-step campaign creation wizard |
| `/workspace/campaigns/[id]` | Admin only | Campaign detail, send, re-run, timeline |
| `/workspace/campaigns/templates` | Admin only | Manage custom email templates |
| `/workspace/campaigns/templates/new` | Admin only | Create a custom campaign template |
| `/workspace/report` | Admin only | Printable security posture report |
| `/workspace/billing` | Admin only | Plan info, upgrade, waitlist |
| `/workspace/settings` | Admin only | Email platform, language, IT executor |
| `/workspace/settings/gdpr` | Authenticated + has org | Data storage info, account/org deletion, export |

---

## 3. Core Flows by User Type

### 3.1 Anonymous Visitor

```
Landing (/)
  |-- [Sign up free] --> Login (/login)
  |-- [Browse the checklist] --> Public Checklist (/checklist) [read-only]
  |-- [Log in] --> Login (/login)
  |-- [Privacy policy] --> Privacy (/privacy)
  |-- [Get started free] --> Login (/login)

Public Checklist (/checklist) [read-only]
  |-- Shows all checklist groups and items (no response buttons)
  |-- [Sign in] banner --> Login (/login)
  |-- [View summary] --> Summary (/summary) [sign-in prompt]
  |-- [Back to home] --> Landing (/)

Summary (/summary) [not signed in]
  |-- Shows sign-in prompt with example preview
  |-- [Sign in] --> Login (/login)
  |-- [Browse the checklist first] --> Public Checklist (/checklist)
  |-- [Home] --> Landing (/)

Privacy (/privacy)
  |-- Static GDPR privacy policy page
  |-- [Back to home] --> Landing (/)
```

### 3.2 Sign-up / Login Flow (all users)

```
Login (/login)
  |-- Enter email --> [Send sign-in link]
  |-- Email sent: two paths
  |    |-- Path A: Click magic link in email --> Auth Callback (/auth/callback) --> Workspace or Onboarding
  |    |-- Path B: Enter OTP code on login page --> [Verify] --> Workspace or Onboarding
  |-- [Use a different email] --> resets form
  |-- [Back to home] --> Landing (/)

Auth Callback (/auth/callback)
  |-- Exchanges PKCE code for session
  |-- Redirects to /workspace (or ?next= param)
  |-- On timeout: shows error with [Try again] --> Login (/login)
```

### 3.3 First-time User (Onboarding)

```
Login --> authenticated, no org yet --> Onboarding (/onboarding)
  |-- Form fields:
  |    - Organisation name (required)
  |    - Your name (optional)
  |    - Email system, Computers, Company size (optional)
  |    - Who handles IT? (required): I do / Staff member / External IT / Not sure
  |    - If "Staff member": IT person email (required) + name (optional)
  |    - If "External IT": IT person email (optional)
  |-- [Create organisation] --> POST /api/orgs --> Workspace (/workspace)

If user already has an org: auto-redirects to Workspace
If not authenticated: auto-redirects to Login
```

### 3.4 Invite Acceptance Flow

```
Email contains invite link --> /accept-invite?token=xxx
  |-- If not signed in: redirects to Login with ?next=/accept-invite?token=xxx
  |-- If signed in: shows "Join your team" form
  |    - Your name (optional)
  |    - [Accept invite] --> POST /api/invites/accept --> Workspace (/workspace)
  |-- On wrong email: shows error with [Sign out and try again]
  |-- On expired invite: shows "ask for a new one" message
```

### 3.5 Owner / org_admin Flows

#### Workspace Home

```
Workspace (/workspace)
  |-- Shows org name, role badge
  |-- Cadence warning banner (amber/red) if review due/overdue
  |-- Guided setup (if no active assessment):
  |    Step 1: Invite IT lead --> /workspace/team
  |    Step 2: Start assessment --> /workspace/assessments
  |    Step 3: View dashboard --> /workspace/dashboard
  |-- Navigation cards:
  |    - My checklist --> /workspace/checklist
  |    - Dashboard --> /workspace/dashboard
  |    - Team --> /workspace/team
  |    - Assessments --> /workspace/assessments
  |    - Org Settings --> /workspace/settings
  |    - Settings & data --> /workspace/settings/gdpr
```

#### Workspace Navigation Bar (persistent header)

```
All /workspace/* pages show top nav:
  Home | Checklist | Dashboard | Team* | Assessments* | Campaigns** | Report** | Billing** | Settings** | Log out

  * = visible to manager + admin
  ** = visible to admin only
```

#### My Checklist

```
Workspace Checklist (/workspace/checklist)
  |-- If no active assessment: "No active assessment yet" message
  |-- If active assessment:
  |    - Progress bar (X / Y answered, Z%)
  |    - "Resume where you left off" link (scrolls to first unanswered)
  |    - High-impact items warning banner
  |    - IT Baseline items (grouped by category) -- only if IT executor
  |    - Security Awareness items -- all users
  |    - Each item:
  |       - Tap title to expand: description, "Why it matters", steps, template downloads
  |       - [Help me do this] --> AI guidance panel (calls /api/guidance)
  |       - Response buttons: Done / Unsure / Skipped (tap again to clear)
  |       - Verification badges (verified/failed) from campaign results
  |    - When all answered: completion card with stats
  |       - [Add reminder to calendar (.ics)] --> downloads .ics file
  |       - [View dashboard] --> /workspace/dashboard
  |       - [Show checklist] toggle to review/change answers
```

#### Dashboard

```
Workspace Dashboard (/workspace/dashboard)
  |-- Cadence indicator (green/amber/red/never)
  |-- If no assessment: "Start an assessment" link --> /workspace/assessments
  |-- If assessment exists:
  |    - Overall stats: progress bar, done/unsure/skipped counts
  |    - Track breakdown: IT Baseline bar + Awareness bar
  |    - Team progress: expandable member rows
  |       - Click member --> drill-down showing per-item responses
  |       - Unsure items highlighted with follow-up suggestion
  |    - Campaign summary (admin only, if campaigns exist):
  |       - Total campaigns, pass rate, reported, clicked
  |       - Pass rate trend chart (bar chart)
  |       - [View all campaigns] --> /workspace/campaigns
  |-- [Print summary] button
```

#### Team Management

```
Workspace Team (/workspace/team)
  |-- Invite form:
  |    - Email (required)
  |    - Role: Employee or Manager
  |    - IT executor checkbox
  |    - [Send invite] --> POST /api/invites
  |-- Current members list (name, role, IT executor badge, join date)
  |-- Pending invites list:
  |    - Email, role, expiry date
  |    - [Copy link] --> copies invite URL to clipboard
  |    - [Revoke] --> DELETE /api/invites/:id
```

#### Assessments

```
Workspace Assessments (/workspace/assessments)
  |-- Explanation text
  |-- [Start new assessment] button (disabled if one already active)
  |    - Admin: starts "org" scope assessment
  |    - Manager: starts "subtree" scope assessment
  |-- Assessment list:
  |    - Each shows: scope, status, start date, completion date
  |    - Active assessment: [Go to checklist] --> /workspace/checklist
  |    - Active assessment (manager+): [Mark complete] --> completes assessment
```

#### Campaigns

```
Campaigns List (/workspace/campaigns)
  |-- [Templates] --> /workspace/campaigns/templates
  |-- [Create campaign] --> /workspace/campaigns/new (disabled if no credits or active campaign)
  |-- Credit info banner:
  |    - Shows remaining credits
  |    - If 0 credits: [View plans] --> /workspace/billing
  |-- Campaign list: click any --> /workspace/campaigns/[id]
  |    - Template title, date, recipient count, pass rate, status badge
  |-- Team performance table (expandable):
  |    - Per-employee: campaigns, reported, clicked, ignored, score %

Campaign Detail (/workspace/campaigns/[id])
  |-- Campaign info: template, date, type, difficulty, schedule, custom subject
  |-- If pending/draft: [Send campaign] button (confirms via dialog)
  |-- If completed: [Re-run campaign] button (creates new campaign with same template)
  |-- Stats: recipients, sent, clicked, reported
  |-- Pass rate bar
  |-- Response time metrics: average, fastest, slowest, avg click vs report time
  |-- Timeline (expandable): chronological events (sent, clicked, reported)
  |-- Recipients table: email, sent time, action time, status badge
  |-- Auto-refreshes every 15s while active
  |-- [Back to campaigns] --> /workspace/campaigns

Create Campaign (/workspace/campaigns/new)
  |-- 4-step wizard:
  |    Step 1 - Template: select from list, filter by language (org default / en / da / all)
  |       Shows type, difficulty, language badges; custom templates marked
  |    Step 2 - Preview: rendered HTML preview of selected template
  |    Step 3 - Recipients: checkbox list of team members (excludes self, marks opted-out)
  |       Select all / deselect all
  |    Step 4 - Review: template, editable subject line, recipient count, difficulty
  |       Timing: send now or schedule for later (datetime picker)
  |       [Send campaign] --> creates campaign, redirects to campaign list
  |-- Redirects away if no credits and not paid

Campaign Templates (/workspace/campaigns/templates)
  |-- Lists custom templates: title, subject, type, difficulty, language
  |-- [Create template] --> /workspace/campaigns/templates/new
  |-- [Delete] on each custom template
  |-- [Back to campaigns] --> /workspace/campaigns

Create Custom Template (/workspace/campaigns/templates/new)
  |-- Form: template name, subject, preview text, body HTML
  |-- Placeholder reference: {{RECIPIENT_NAME}}, {{CLICK_URL}}, {{REPORT_URL}}, {{SENDER_NAME}}
  |-- Type selector: phishing email / fake invoice / credential harvest / CEO fraud / knowledge test
  |-- Difficulty: easy / medium / hard
  |-- Language: English / Dansk
  |-- Live HTML preview toggle
  |-- [Create template] --> POST, redirects to template list
```

#### Security Report

```
Security Report (/workspace/report)
  |-- Admin only (non-admin sees "Access restricted")
  |-- Printable report with sections:
  |    1. Organisation Info: name, platform, members, cadence
  |    2. Assessment Overview: date, status, items, completion rate, progress bar
  |    3. Category Results: IT Baseline + Awareness breakdown, per-member table
  |    4. Campaign Results: total campaigns, emails sent, pass rate, click rate
  |    5. Recommendations: based on unsure/skipped items, low pass rate, overdue cadence
  |    6. Disclaimer
  |-- [Print / Save as PDF] button
  |-- Print-optimized CSS (hides nav, removes shadows)
```

#### Billing

```
Billing (/workspace/billing)
  |-- Admin only (non-admin sees error)
  |-- Current plan card: Free or Campaign Pro
  |    - Free: shows campaign credits remaining
  |    - Paid: shows unlimited credits
  |-- Upgrade section (free tier only):
  |    - Campaign Pro: EUR 15/mo per org
  |    - Feature list, [Upgrade] button (Stripe checkout)
  |-- Waitlist form (fallback if Stripe not configured)
  |-- Plan comparison table:
  |    Free vs Campaign Pro feature matrix
```

#### Org Settings

```
Settings (/workspace/settings)
  |-- Admin only (non-admin sees "Only admins can change settings")
  |-- Email platform dropdown
  |-- Campaign language dropdown (English / Dansk)
  |-- IT executor assignment dropdown (select from members)
  |-- [Save settings]
  |-- Link to Settings & data (GDPR) --> /workspace/settings/gdpr
```

#### GDPR / Data Settings

```
Settings & Data (/workspace/settings/gdpr)
  |-- Data storage info (EU, Ireland, AWS eu-west-1)
  |-- "Delete my account" section:
  |    - Warning if admin with other members
  |    - Warning if has direct reports
  |    - [Delete my account permanently] (confirmation dialog)
  |-- Non-admin: "Contact your org admin" note
  |-- Admin-only sections:
  |    - Export data: [Download JSON export]
  |    - Members list with [Remove] button (cannot remove self or other admins)
  |    - Delete organisation:
  |       - Type org name to confirm
  |       - [Delete organisation permanently] --> hard delete, redirect to /
```

### 3.6 Manager Flows

Managers see the same workspace as admins with these restrictions:

```
Workspace Home (/workspace)
  |-- Navigation cards: My checklist, Dashboard, Team, Assessments, Settings & data
  |-- No: Org Settings, Campaigns, Report, Billing cards

Nav bar shows: Home | Checklist | Dashboard | Team | Assessments
  |-- No: Campaigns, Report, Billing, Settings

Assessments: can start subtree assessments (own team only), not org-wide
Team: can invite members and manage invites
Dashboard: sees team progress but no campaign summary
Settings/GDPR: can delete own account, cannot export or delete org
```

### 3.7 Employee Flows

Employees have the most restricted workspace:

```
Workspace Home (/workspace)
  |-- Navigation cards: My checklist, Dashboard, Settings & data
  |-- No: Team, Assessments, Org Settings cards

Nav bar shows: Home | Checklist | Dashboard

Checklist: sees only Awareness track items (unless IT executor)
  |-- Welcome message on first visit
  |-- Same item interaction: expand, AI guidance, respond

Dashboard: sees team progress overview (own stats highlighted)
  |-- No campaign summary section

Settings/GDPR: can view data storage info, delete own account
  |-- Cannot export data, manage members, or delete org
```

### 3.8 Campaign Recipient Flows (any team member)

```
Recipient receives simulated phishing email
  |-- Path A: Clicks the link in the email
  |    --> Campaign Click Page (/campaign/[token])
  |    - Records "clicked" action
  |    - Shows educational content (varies by template type):
  |       - Phishing: "This Was a Simulated Phishing Test" + tips
  |       - Knowledge test: topic-specific education (passwords, MFA, macros)
  |    - [Go to your workspace] --> /workspace
  |    - [Review the security checklist] --> /checklist
  |
  |-- Path B: Clicks "Report this email" link
  |    --> Campaign Report Page (/campaign/[token]/report)
  |    - Records "reported" action
  |    - Shows congratulations: "Great Job - You Reported It!"
  |    - Next steps guidance
  |    - [Go to your workspace] --> /workspace
  |    - [Review the security checklist] --> /checklist
  |
  |-- Path C: Ignores the email
  |    - No page visit; status remains "ignored" after campaign completes
```

---

## 4. Public Checklist vs Workspace Checklist

| Aspect | Public (/checklist) | Workspace (/workspace/checklist) |
|---|---|---|
| Source | Static items from `lib/checklist/items.ts` | Assessment items (snapshot from DB) |
| Auth required | No (read-only), Yes (interactive) | Yes |
| Persistence | Remote sync via `/api/checklist` (user_checklists table) | Assessment responses via `/api/assessments/[id]/responses` |
| AI guidance | No | Yes ("Help me do this" button) |
| Template downloads | No | Yes (for applicable items) |
| Track filtering | All items shown | IT executor: both tracks; others: awareness only |
| Verification badges | No | Yes (from campaign results) |

---

## 5. Navigation Map

```
                            Landing (/)
                           /     |     \
                     Login    Checklist   Privacy
                    (/login)  (/checklist) (/privacy)
                       |          |
                   Auth Callback  Summary
                  (/auth/callback) (/summary)
                       |
              +--------+--------+
              |                 |
         Onboarding        Workspace Hub
        (/onboarding)     (/workspace)
              |                 |
              +--->  Workspace Hub  <--- Accept Invite
                         |               (/accept-invite)
            +------------+-------------+
            |            |             |
        Checklist    Dashboard      Team*
            |            |             |
        Report**    Assessments*   Campaigns**
            |                          |
        Billing**                 Campaign Detail**
            |                          |
        Settings**             Campaign Templates**
            |                          |
        GDPR/Data              Create Template**
                               Create Campaign**

  * = manager + admin    ** = admin only
  GDPR/Data = all authenticated users
```

---

## 6. External Entry Points

| Entry point | How user arrives | Destination |
|---|---|---|
| Direct URL | Types smbsec URL | Landing (/) |
| Magic link email | Clicks sign-in link | Auth Callback --> Workspace |
| Invite email | Clicks invite link | Accept Invite --> Login (if needed) --> Workspace |
| Campaign email (click) | Clicks simulated phishing link | Campaign Click Page (educational content) |
| Campaign email (report) | Clicks "Report this email" link | Campaign Report Page (congratulations) |

---

## 7. Role-based Visibility Summary

| Feature | Anonymous | Employee | Manager | Admin |
|---|---|---|---|---|
| Landing page | Yes | Yes | Yes | Yes |
| Public checklist (read-only) | Yes | Yes | Yes | Yes |
| Public checklist (interactive) | -- | Yes | Yes | Yes |
| Summary page | Teaser | Full | Full | Full |
| Privacy policy | Yes | Yes | Yes | Yes |
| Workspace home | -- | Yes | Yes | Yes |
| Workspace checklist | -- | Awareness only | Awareness only | Awareness only |
| Workspace checklist (IT executor) | -- | Both tracks | Both tracks | Both tracks |
| Dashboard | -- | Yes | Yes | Yes |
| Dashboard campaign summary | -- | -- | -- | Yes |
| Team management | -- | -- | Yes | Yes |
| Assessments | -- | -- | Yes (subtree) | Yes (org-wide) |
| Campaigns | -- | -- | -- | Yes |
| Campaign templates | -- | -- | -- | Yes |
| Security report | -- | -- | -- | Yes |
| Billing | -- | -- | -- | Yes |
| Org settings | -- | -- | -- | Yes |
| GDPR data export | -- | -- | -- | Yes |
| GDPR member removal | -- | -- | -- | Yes |
| GDPR org deletion | -- | -- | -- | Yes |
| GDPR self-deletion | -- | Yes | Yes | Yes* |

\* Admin can only self-delete when no other members exist.
