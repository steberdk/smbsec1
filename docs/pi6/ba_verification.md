# PI 6 — BA Post-PI Verification Report

**Date:** 2026-03-19
**Tester:** BA Agent
**Environment:** https://smbsec1.vercel.app/
**Account:** smbsec1_3owner@bertramconsulting.dk (org admin, Company Three BA Test)

---

## Page-by-Page Results

### 1. `/` — Landing Page
**PASS**

- Gradient hero section renders correctly with teal-to-white gradient
- "smbsec" brand header present at top
- Three CTA buttons: "Sign up free" (teal), "Browse the checklist" (outline), "Log in" (outline)
- "How SMBs actually get breached" section: 5 attack cards with color-coded left borders (red, blue, orange, purple, green)
- "Why this checklist" section with green checkmarks
- "Why trust this tool" section: 6 trust signal cards in 3x2 grid with emojis
- Footer CTA with "Get started free" button on dark teal background
- Footer links: Privacy policy, Browse checklist, Log in

### 2. `/checklist` — Public Checklist
**PASS**

- Title "Security checklist" with "View summary" link
- Progress bar showing 0% (correct for fresh session)
- All 17 items across 7 groups displayed (Passwords & Accounts, Email Security, Updates & Patching, Backups & Recovery, Least Privilege, Human Security, Network Basics)
- Each item has: time estimate, title, description, status badge, "Why & how" expandable, Done/Not sure/Skip/Reset buttons
- "Why & how" expand/collapse works correctly — shows explanation text and step-by-step instructions
- Card-style items with subtle shadows

### 3. `/login` — Login Page
**PASS**

- "smbsec" header with link to home
- Card layout with rounded corners and shadow
- "Log in" heading with description text
- Email input field with placeholder "you@company.com"
- Teal "Send sign-in link" button (full width)
- Onboarding steps card: "New here? Here's how it works:" with 3 numbered steps
- "Back to home" link at bottom
- Magic link send works — confirmation message appears with same-browser warning

### 4. `/privacy` — Privacy Policy
**PASS**

- "Privacy Policy" heading
- All sections present and readable: What data we store, Where data is stored, No tracking/no ads, Your rights, Emails, Contact
- Bold text for key phrases (See your data, Delete your data, Export your data)
- "Back to home" link at bottom

### 5. `/nonexistent-page` — 404 Page
**PASS**

- "smbsec" brand text at top
- Large "404" heading
- Descriptive message: "The page you're looking for doesn't exist or has been moved."
- Two navigation links: "Go to home page" and "Browse the checklist"

### 6. `/workspace` — Workspace Home (Authenticated)
**PASS**

- Nav bar: smbsec | Company Three BA Test | Home, Checklist, Dashboard, Team, Assessments, Settings, Log out
- Org name "Company Three BA Test" as main heading
- Role display: "Org Admin . IT Executor"
- 6 navigation cards with shadows: My checklist (with progress bar), Dashboard, Team, Assessments, Org Settings, Settings & data
- Cards have descriptions and clean layout

### 7. `/workspace/checklist` — Workspace Checklist
**PASS**

- "My checklist" heading
- Progress bar: "4 / 36 answered — 11%"
- Contextual message: "24 high-impact items still need attention"
- IT executor track assignment banner with dismiss button
- "Resume where you left off" button present
- All 36 items across IT Baseline (25) and Security Awareness (11) tracks
- Items show: expand arrow, title, impact level badge (high/medium), "tap for guidance" hint
- Response buttons: Done/Unsure/Skipped (IT Baseline) and I've done this/Not yet/Not applicable (Awareness)
- Expanded item shows: description, "Why it matters", "Steps" list, **"Help me do this" button visible**

### 8. `/workspace/dashboard` — Dashboard
**PASS**

- "Dashboard" heading with "Print summary" button
- Assessment status: "ORG ASSESSMENT . ACTIVE . STARTED 3/18/2026"
- Overall progress: "9 / 58 responses — 16%" with gradient progress bar
- Summary cards: Done (6), Unsure (2), Skipped (1) — colored numbers
- Track breakdown: IT Baseline 16% (4/25), Awareness 15% (5/11) with individual progress bars
- Team progress section with click-to-drill-down instruction
- Three team members shown with display names, roles, percentages, and mini progress bars
- **Drill-down works**: clicking Employee One shows 11 individual item responses (3 Done, 8 Unanswered)

### 9. `/workspace/team` — Team Management
**PASS**

- "Team" heading
- Invite form: email field, role dropdown (Employee/Manager), IT executor checkbox, "Send invite" button
- Team members section: 3 members with display names and roles, join dates
- Pending invites section: "No pending invites."
- All members show display names (not UUIDs)

### 10. `/workspace/assessments` — Assessments
**PASS**

- "Assessments" heading with explanation text
- "Assessment already in progress" button (disabled, correct)
- Active assessment card: "org assessment — active" with start date
- **"Go to checklist" link present** and points to /workspace/checklist
- "Mark complete" button present

### 11. `/workspace/settings` — Org Settings
**PASS**

- "Org Settings" heading
- Email platform dropdown: Microsoft 365 selected (with other options: Google Workspace, Gmail, Other, Not set)
- IT executor dropdown: shows display names with roles — "Company 3 Owner (org admin)" selected
- "Save settings" button
- Link to "Settings & data (export, deletion)"

### 12. `/workspace/settings/gdpr` — Settings & Data (GDPR)
**PASS**

- "Settings & data" heading
- Data storage card: EU location info with bold emphasis
- Delete my account section: red-themed card with two warning messages (org admin with members, has direct reports), **delete button is disabled** (correct)
- Export data section: "Download JSON export" button
- Members section: 3 members with **display names** (not UUIDs), roles shown, "Remove" buttons on non-admin members
- Delete organisation section: confirmation text input, delete button disabled until correct name typed

---

## Mobile Layout (390px width)

### Landing Page — PASS
- Buttons stack vertically (full width)
- Text readable, no overflow
- Cards stack single-column
- Trust signal cards stack properly

### Workspace Home — PASS
- Hamburger menu (three bars icon) replaces nav links
- Toggle opens full nav with all links + Log out
- Toggle icon changes to X when open
- Cards stack single-column
- Progress bar visible on checklist card

---

## Console Errors
**PASS** — Zero console errors detected across all page navigations. Only expected 404 resource error on the /nonexistent-page route.

---

## Issues Found

**None.** All pages render correctly, all interactive elements function as expected, no visual regressions detected.

---

## Overall Verdict

## PASS

All 12 pages verified. All interactive elements working. Mobile responsive layout correct. No console errors. No visual regressions from PI 6 changes. The beautification work (gradient hero, card shadows, progress bars, trust signals) renders cleanly across desktop and mobile viewports.
