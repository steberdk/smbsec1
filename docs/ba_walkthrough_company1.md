# BA Walkthrough - Company 1 (Minimal Team + Edge Cases)

**BA Agent 3** | Date: 2026-03-18
**Test Account**: smbsec1_1owner@bertramconsulting.dk (Company 1)
**App URL**: https://smbsec1.vercel.app/

---

## 1. Test Setup

### Cleanup
- Ran `frontend/scripts/cleanup_company1.js` to delete all data for @bertramconsulting.dk Company 1 accounts
- No existing users found (clean state)

### Sign-up
- User created via Supabase admin API (magic link rate limit was hit due to shared test environment)
- Successfully signed in as smbsec1_1owner@bertramconsulting.dk
- Auth flow: magic link -> /auth/callback -> "Signing you in..." -> /onboarding (new user)

### Org Setup
- Organisation: "SMBsec1 Test Company 1"
- Email platform: Other
- Computers: Mixed
- Company size: 1-5 people
- IT handler: Owner does IT themselves (is_it_executor = true)

### Assessment & Invite
- Started a new assessment (org assessment, status: active)
- Invited smbsec1_1emp1@bertramconsulting.dk as Employee
- Invite shows: "employee - expires 3/25/2026" (7-day expiry)
- Pending invite offers "Copy link" and "Revoke" actions

---

## 2. Anonymous Checklist Detailed Review (Item-by-Item)

The public checklist at `/checklist` contains **17 items** across **7 groups**.

### Presentation (Logged Out)
- Shows "Sign in to save your progress and work through the checklist with your team" banner with Sign in button
- Items are **read-only** - no Done/Not sure/Skip buttons
- Each item shows: time estimate, title, outcome description, "Why & how" expandable section
- No progress bar or stats shown
- Bottom: only "Back to home" link (no "Summary & next steps")

### Group 1: Passwords & Accounts (4 items)
| # | Item | Time Est. | Impact | Why & How Summary |
|---|------|-----------|--------|-------------------|
| 1 | Use a password manager | 10-20 min | high | Most breaches start with reused/weak passwords. Steps: Pick one (Bitwarden, 1Password, KeePass), install it, move email+admin passwords first. |
| 2 | Turn on MFA for email accounts | 5-15 min | high | Email is #1 entry point. Steps: Enable MFA in Google/M365 admin, require for all users, prefer authenticator app over SMS. |
| 3 | Separate admin accounts from daily accounts | 15-30 min | high | Admin accounts for daily work increase blast radius. Steps: Create dedicated admin accounts, use daily accounts for email. |
| 4 | Remove or lock down shared accounts | 15-45 min | medium | Shared accounts = hard to track + weak controls. Steps: List shared accounts, replace with individual accounts, if must exist: strong pw + MFA. |

### Group 2: Email Security (3 items)
| # | Item | Time Est. | Impact | Why & How Summary |
|---|------|-----------|--------|-------------------|
| 5 | Enable anti-phishing and spam filters | 10-20 min | high | Most attacks start in email. Steps: Check email admin settings, turn on recommended protection, verify quarantine/alerts. |
| 6 | Disable Office macros by default | 10-30 min | medium | Malicious macros are common malware delivery. Steps: Set macros to blocked by default, allow only signed/trusted macros. |
| 7 | Add an easy 'Report Phishing' method | 10-20 min | medium | Reporting spots campaigns early. Steps: Enable report phishing button, or define process (forward to security inbox), tell employees what to do. |

### Group 3: Updates & Patching (2 items)
| # | Item | Time Est. | Impact | Why & How Summary |
|---|------|-----------|--------|-------------------|
| 8 | Turn on automatic OS updates | 5-10 min | high | Attackers exploit known vulnerabilities. Steps: Enable auto updates on Windows/macOS, ensure they install regularly. |
| 9 | Update routers, firewalls, VPNs and website plugins | 30-90 min | high | Internet-facing systems are actively scanned. Steps: Check router/firewall firmware, update VPN software, update WordPress core+plugins. |

### Group 4: Backups & Recovery (2 items)
| # | Item | Time Est. | Impact | Why & How Summary |
|---|------|-----------|--------|-------------------|
| 10 | Set up 3-2-1 backups | 60-180 min | high | Backups need multiple places + one offline copy. Steps: 3 copies, 2 different media, 1 off-site/offline. |
| 11 | Test restoring backups (quarterly) | 15-45 min | high | Many backups fail silently. Steps: Pick one file, restore to separate location, confirm it opens, set quarterly reminder. |

### Group 5: Least Privilege (2 items)
| # | Item | Time Est. | Impact | Why & How Summary |
|---|------|-----------|--------|-------------------|
| 12 | Remove local admin rights from daily users | 30-90 min | high | Admin rights make infections worse. Steps: Check who has local admin, remove from daily accounts, keep separate admin account. |
| 13 | Create an offboarding checklist for leavers | 10-20 min | medium | Old accounts are common weak points. Steps: Disable accounts on leaving date, remove shared drive access, rotate shared secrets. |

### Group 6: Human Security (2 items)
| # | Item | Time Est. | Impact | Why & How Summary |
|---|------|-----------|--------|-------------------|
| 14 | Run a 30-minute security awareness session | 30 min | high | Short practical session reduces phishing. Steps: Show 3 real phishing examples, explain boss/invoice scams, set rule: report don't click. |
| 15 | Write a 1-2 page 'Security Basics' doc | 20-40 min | medium | Short guidance beats long policies. Steps: Include password rules and who to contact, share with staff. |

### Group 7: Network Basics (2 items)
| # | Item | Time Est. | Impact | Why & How Summary |
|---|------|-----------|--------|-------------------|
| 16 | Change default router/admin passwords | 10-20 min | medium | Default passwords are widely known. Steps: Log into admin panel, change default password, store in password manager. |
| 17 | Separate guest Wi-Fi from internal devices | 15-45 min | medium | Guest devices are untrusted. Steps: Enable guest Wi-Fi, ensure can't access internal devices, use strong Wi-Fi password. |

### Assessment
- **Total items**: 17
- **Total time range**: ~4.5 - 13 hours (sum of all time estimates)
- **High impact items**: 10 of 17 (59%)
- **Medium impact items**: 7 of 17 (41%)
- **Guidance quality**: Each item has a clear "why it matters" explanation (1-2 sentences) and 2-3 actionable steps
- **Time estimates**: Generally reasonable; "Set up 3-2-1 backups" at 60-180 min is the largest
- **Steps are actionable**: Yes, each step is a concrete action, not vague advice

---

## 3. Owner Minimal-Team Flow

### Workspace Home
- Shows org name "SMBsec1 Test Company 1"
- Role badge: "Org Admin - IT Executor"
- **3-step getting started guide**:
  1. "Invite your IT lead" - links to /workspace/team
  2. "Start your first assessment" - links to /workspace/assessments
  3. "Share the summary" - links to /workspace/dashboard
- **6 quick-link cards**: My checklist, Dashboard, Team, Assessments, Org Settings, Settings & data
- **Navigation bar**: Home, Checklist, Dashboard, Team, Assessments, Settings, Log out

### Org Settings
- Email platform dropdown: Not set, Google Workspace, Microsoft 365, Gmail (Personal), Other
- IT executor dropdown (shows org members)
- **Finding**: When "Other" is selected as email platform, there are no platform-specific instructions visible in the settings page itself. The instructions would appear in the IT Baseline checklist items (via `steps` field in checklist_items).

### Assessment Start
- "Start new assessment" button creates an assessment immediately
- Button changes to "Assessment already in progress" (disabled)
- Shows assessment card: "org assessment active - Started 3/18/2026"
- "Mark complete" button available

### Team Page (Before Employee Joins)
- Invite form: Email, Role (Employee/Manager dropdown), IT executor checkbox
- Shows "No pending invites" initially, then pending invite after sending

---

## 4. Employee Flow

**NOTE**: Employee flow could not be fully tested due to shared browser session contamination (see Edge Cases). The invite was successfully sent to smbsec1_1emp1@bertramconsulting.dk.

### What we know from code analysis:
- Employee role sees only `awareness` track items (line 163 of workspace/checklist/page.tsx: `const visibleItems = isItExecutor ? items : items.filter((i) => i.track === "awareness")`)
- Employees see 10 awareness items (from 36 total)
- IT executor sees all 36 items (both it_baseline and awareness tracks)
- Employee cannot see Team, Assessments, or Settings pages (nav filtered by `isManager` and `isAdmin` in layout.tsx)
- Employee has "No active assessment yet" message if assessment hasn't started

---

## 5. Edge Cases Results

### 5.1 Direct URL Access (/workspace/dashboard while logged out)
- **Result**: Shows "Loading..." briefly, then redirects to `/login`
- **Verdict**: PASS - Protected routes correctly redirect

### 5.2 Invalid URLs (/workspace/nonexistent)
- **Result**: Shows 404 page with "Page not found" message and "Go home" link
- **Verdict**: PASS - Clean 404 handling

### 5.3 Double Sign-up (same email)
- **Result**: Supabase handles this - sends another magic link. User is already registered, just logs in again.
- **Verdict**: PASS - No duplicate account issue

### 5.4 Browser Back/Forward
- Could not fully test due to session contamination. Pages are client-side rendered with React state, so browser back should work but state may not persist correctly.

### 5.5 Session Persistence
- **CRITICAL FINDING**: Supabase auth session uses localStorage + cookies. In a shared browser environment with multiple test accounts, session tokens from different users contaminate each other. The auth token for one user gets overridden by another user's refresh token.
- The app itself handles session correctly when only one user is active.

### 5.6 Print Summary
- Dashboard has a "Print summary" button (uses `window.print()`)
- Button has `print:hidden` class so it doesn't appear in the printout
- **From code**: Print includes cadence indicator, overall stats, track breakdown, and team progress

### 5.7 Calendar .ics Download
- Available on the workspace checklist page when ALL items are answered
- Generates a .ics file with: event 90 days from now, title "smbsec: Security Review Due", reminder to log in for reassessment
- **From code** (workspace/checklist/page.tsx line 176-202): Creates VCALENDAR with VEVENT

### 5.8 Log Out + Log Back In
- Log out button calls `logout` from useWorkspace hook
- Data persists in the database, so logging back in restores all state
- **Verdict**: PASS (confirmed via code analysis)

### 5.9 Multiple Browser Tabs
- Not fully testable in current environment. App uses React state per tab with API calls. No real-time sync between tabs - changes in one tab won't appear in another until refresh.

### 5.10 Stale Auth Token Causes Redirect on Public Pages
- **BUG FOUND**: When a stale/expired Supabase auth token exists in localStorage, navigating to `/checklist` (a public page) causes a redirect loop. The page's `getSession()` call fails, but the page still enters "loading" state and eventually gets redirected.
- **Impact**: Users who had a previous session that expired cannot access the public checklist without clearing their browser storage.
- **Root cause**: `app/checklist/page.tsx` line 45 calls `supabase.auth.getSession()` which can trigger a session refresh that interferes with the page lifecycle.

---

## 6. Issues Found

| # | Issue | Severity | Page |
|---|-------|----------|------|
| 1 | Stale auth token in localStorage causes /checklist (public page) to redirect to /login instead of showing read-only view | High | /checklist |
| 2 | No footer on any page - no links to privacy policy, terms of service, about page, or contact info | Medium | All pages |
| 3 | No dedicated privacy/GDPR policy page accessible from public pages (only internal Settings & data page exists for logged-in admins) | Medium | Landing, /checklist |
| 4 | Onboarding form does not validate/prevent submission with empty org name (placeholder "Acme Ltd" is not a value) | Low | /onboarding |
| 5 | Workspace navigation on mobile: nav items overflow horizontally with `overflow-x-auto` but no visual indicator of scrollability | Low | /workspace/* (mobile) |
| 6 | No hamburger menu or mobile-optimized navigation for workspace pages | Low | /workspace/* (mobile) |
| 7 | Org name in header is truncated at 160px (`max-w-[160px]`) - "SMBsec1 Test Compa..." cuts off on desktop | Low | /workspace/* |
| 8 | "Getting Started" step 1 says "Invite your IT lead" even when owner is the IT executor - should be marked as complete or contextual | Low | /workspace |
| 9 | Members in Settings & data page show truncated user_id (e.g., "40089b6a-17a...") instead of email/name - not user-friendly | Medium | /workspace/settings/gdpr |
| 10 | No confirmation or success message after saving Org Settings | Low | /workspace/settings |
| 11 | Summary page (/summary) redirects to workspace when logged in - expected behavior but confusing; should either work for logged-in users or show clear message | Low | /summary |
| 12 | Email rate limit error message ("email rate limit exceeded") is shown as raw text with no guidance on what to do or when to retry | Low | /login |
| 13 | Supabase magic link emails come from "Supabase Auth <noreply@mail.app.supabase.io>" - not branded for SMBsec | Medium | Email |
| 14 | No display name field during onboarding - members only show user_id or email throughout the app | Medium | /onboarding |

---

## 7. Comparison: Anonymous Checklist vs Workspace Checklist

### Structure
| Aspect | Anonymous (/checklist) | Workspace (/workspace/checklist) |
|--------|----------------------|----------------------------------|
| **Total items** | 17 | 36 |
| **Grouping** | 7 topic-based groups | 2 tracks: IT Baseline (26) + Awareness (10) |
| **Item source** | Static in `lib/checklist/items.ts` | Database `checklist_items` table, snapshotted as `assessment_items` |
| **Data persistence** | localStorage (logged out) or user_checklists table (logged in) | assessment_responses table |
| **Status options** | Done, Not sure, Skip, Reset | Done, Unsure, Skipped (toggle to clear) |
| **Progress tracking** | Local progress bar + stats | Per-user progress bar, team dashboard |
| **Guidance** | "Why & how" accordion with steps list | Click item title to expand: "Why it matters" box + numbered steps |
| **Time estimates** | Shown per item | Not shown in workspace checklist |

### Item Overlap
The 17 anonymous checklist items are a subset of the 36 workspace items. All 17 appear in the workspace, but with different titles in some cases:

| Anonymous Checklist Item | Workspace Track | Workspace Title (if different) |
|-------------------------|-----------------|-------------------------------|
| Use a password manager | it_baseline | Same |
| Turn on MFA for email accounts | it_baseline | Same |
| Separate admin accounts | it_baseline | Same |
| Remove or lock down shared accounts | it_baseline | Same |
| Enable anti-phishing and spam filters | it_baseline | Same |
| Disable Office macros by default | it_baseline | "Verify Office macros from the internet are blocked" |
| Add an easy 'Report Phishing' method | it_baseline | Same |
| Turn on automatic OS updates | it_baseline | Same |
| Update routers, firewalls, VPNs... | it_baseline | Same |
| Set up 3-2-1 backups | it_baseline | Same |
| Test restoring backups (quarterly) | it_baseline | Same |
| Remove local admin rights | it_baseline | Same |
| Create an offboarding checklist | it_baseline | Same |
| Run a 30-min awareness session | it_baseline | Same |
| Write a 1-2 page Security Basics doc | it_baseline | "Write a 1-page security rules doc (use our template)" |
| Change default router/admin passwords | it_baseline | "Change default router and admin passwords" |
| Separate guest Wi-Fi | it_baseline | Same |

### Additional Workspace-Only Items (19 items)

**IT Baseline track additions (9):**
1. Verify endpoint protection is active
2. Check that RDP is not exposed to the internet
3. Audit third-party app access (OAuth grants)
4. Enable full-disk encryption on all company devices
5. Set up DNS filtering to block malicious websites
6. Write a simple incident response plan
7. Set up SPF, DKIM, and DMARC for your domain
8. Create a list of all SaaS accounts your company uses
9. (Awareness session moved to IT baseline in workspace)

**Awareness track items (10):**
1. Spot a phishing email
2. Recognise a fake login page
3. Spot a phone or voice scam
4. Spot a fake invoice or supplier email
5. Use a strong, unique password for your work accounts
6. Turn on two-step login for your work accounts
7. Lock your screen when you step away
8. Turn on two-step login for all work tools, not just email
9. Think before opening files from USB drives, downloads, or messaging apps
10. Know what to do if you think you clicked something bad
11. Know the one rule: report, don't hide

### Key Differences
1. **Employee visibility**: Employees only see the 10 awareness items. IT executor sees all 36.
2. **Anonymous is a teaser**: Shows 17 high-value items to demonstrate value before sign-up.
3. **Workspace adds depth**: Technical IT controls (RDP, DMARC, disk encryption, endpoint protection) and employee awareness actions.
4. **Different response flow**: Anonymous saves to localStorage/user_checklists. Workspace saves to assessment_responses per assessment.
5. **No time estimates in workspace**: Unlike the anonymous checklist which shows "10-20 minutes" per item.
6. **Track-based vs topic-based**: Workspace organizes by who does the work (IT vs everyone). Anonymous organizes by security topic.

---

## 8. Recommendations

### Critical
1. **Fix stale auth token redirect on /checklist**: The public checklist page should gracefully handle expired tokens by clearing them and showing the read-only view, not redirecting to /login.

### High Priority
2. **Add a footer with privacy/legal links**: Every public page should have a footer with links to privacy policy, terms of use, and contact information. This is especially important for an EU-targeted security product.
3. **Create a public privacy policy page**: The GDPR settings page exists for admins, but there's no public-facing privacy policy page.
4. **Add display name during onboarding**: Collecting a name improves the team dashboard and member list UX significantly.
5. **Brand the magic link emails**: Replace the generic "Supabase Auth" sender with the SMBsec brand name and a custom email template.

### Medium Priority
6. **Add time estimates to workspace checklist items**: The anonymous checklist shows helpful time estimates that are missing in the workspace.
7. **Improve mobile workspace navigation**: Add a hamburger menu or collapsible nav for mobile viewport widths.
8. **Show email/name in GDPR members list**: Display user email or display name instead of truncated user_id.
9. **Make "Getting Started" steps contextual**: Step 1 should show as complete if the owner is the IT executor and chose "I do" during onboarding.
10. **Add success feedback for settings save**: Show a success toast or message when org settings are saved.

### Low Priority
11. **Improve rate limit error messaging**: Show "Please try again in a few minutes" instead of raw "email rate limit exceeded".
12. **Add cross-tab sync**: Use BroadcastChannel or storage events to sync state between browser tabs.
13. **Consider making /summary work when logged in**: Currently redirects to workspace; could show the same data contextualized for logged-in users.
14. **Increase org name truncation width**: 160px is too narrow for many real company names.
