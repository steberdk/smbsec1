# Security Domain Expert Recommendations for PI 3

**Role**: Security Domain Expert, SMBsec Product Team
**Date**: 2026-03-18
**Inputs**: Stefan's PROD walkthrough, BA walkthroughs for Companies 1-3, current checklist items analysis

---

## 1. Checklist Content Assessment

### Item-by-Item Verdict: All 36 Workspace Items

#### IT Baseline Track (25 items)

| # | Item | Works as Self-Assessment? | Recommended Interaction Model | Notes |
|---|------|--------------------------|-------------------------------|-------|
| 1 | Turn on automatic OS updates | Yes | Self-certifiable | Clear binary action. User can verify in Settings. |
| 2 | Enable anti-phishing and spam filters | Mostly | IT-verified | IT person can verify, but needs admin access. Platform-specific steps are excellent. |
| 3 | Set up 3-2-1 backups | No | Action-required | This is a multi-day project, not a checkbox. "Done" is misleading for something rated "day" effort. |
| 4 | Use a password manager | Partially | Action-required | "Done" is ambiguous: installed it? Migrated all passwords? The action step should be "installed and moved email password into it." |
| 5 | Change default router and admin passwords | Yes | Self-certifiable | Clear action, easily verified. |
| 6 | Run a 30-minute security awareness session | No | Team-action | Requires content creation (slides, examples) that the app does not provide. No templates, no materials. Most IT people will skip this. |
| 7 | Remove local admin rights from daily users | Mostly | IT-verified | IT person can do this, but needs to handle pushback. Missing guidance on exceptions process. |
| 8 | Verify Office macros from the internet are blocked | Yes | IT-verified | Excellent platform-specific steps. Not relevant for Google Workspace-only shops -- needs conditional display. |
| 9 | Separate guest Wi-Fi from internal devices | Yes | Self-certifiable | Simple router config. |
| 10 | Turn on MFA for email accounts | Yes | IT-verified | Excellent item. Clear, verifiable, well-documented steps. Model item. |
| 11 | Write a 1-page security rules doc | No | Action-required (template needed) | Writing task without a downloadable template. Will be skipped by most. |
| 12 | Update routers, firewalls, VPNs and website plugins | Partially | IT-verified | Broad scope -- covers 4+ different system types. Should arguably be split. |
| 13 | Test restoring backups (quarterly) | Yes | Self-certifiable | Clear action step. Good item. |
| 14 | Create an offboarding checklist for leavers | No | Action-required (template needed) | Another writing task without a template. |
| 15 | Audit third-party app access (OAuth grants) | Yes | IT-verified | Excellent platform-specific steps. One of the best items. |
| 16 | Check that RDP is not exposed to the internet | Yes | IT-verified | Includes shodan.io verification -- excellent. |
| 17 | Verify endpoint protection is active | Yes | IT-verified | Clear steps, but hard to do at scale (10+ machines). |
| 18 | Add an easy "Report Phishing" method | Yes | IT-verified | Good platform-specific steps. |
| 19 | Set up DNS filtering | Yes | IT-verified | Specific DNS IPs and router config. Excellent. |
| 20 | Write a simple incident response plan | No | Action-required (template needed) | Writing task, no downloadable template provided. |
| 21 | Separate admin accounts from daily accounts | Yes | IT-verified | Clear steps. |
| 22 | Enable full-disk encryption on all company devices | Mostly | IT-verified | Covers BitLocker + FileVault. Missing: how to verify remotely, recovery key management. |
| 23 | Set up SPF, DKIM, and DMARC for your domain | Partially | IT-verified | Excellent steps, but acronyms are intimidating. Needs plain-English intro before technical detail. |
| 24 | Remove or lock down shared accounts | Yes | Self-certifiable | Clear steps. |
| 25 | Create a list of all SaaS accounts | Yes | Action-required (template needed) | Good practical steps but needs a spreadsheet template. |

#### Security Awareness Track (11 items)

| # | Item | Works as Self-Assessment? | Recommended Interaction Model | Notes |
|---|------|--------------------------|-------------------------------|-------|
| 1 | Spot a phishing email | No | Future-verified (email campaign) | Stefan's core insight: you cannot self-certify a skill you may not have. The only real test is an actual phishing simulation. |
| 2 | Recognise a fake login page | No | Future-verified (email campaign) | Same problem. The action step is a future behaviour commitment, not something already done. |
| 3 | Spot a phone or voice scam | Partially | Team-action | The code-word suggestion requires team coordination. One person cannot mark this "Done" alone. |
| 4 | Spot a fake invoice or supplier email | Partially | Team-action | The "create a rule with your finance person" action requires coordination. Also role-dependent -- not relevant for all employees. |
| 5 | Use a strong, unique password | Partially | Self-certifiable | The action step ("check if you reuse any password") is concrete and verifiable. |
| 6 | Turn on two-step login for your work accounts | Yes | Self-certifiable | Best awareness item. Binary: either MFA is on or it is not. |
| 7 | Turn on two-step login for all work tools | Partially | Action-required | Requires auditing all tools. Overwhelming for employees. Should cross-reference the SaaS inventory. |
| 8 | Lock your screen when you step away | Yes | Self-certifiable | Model item: clear, actionable, instantly verifiable. Set auto-lock to 2 minutes. |
| 9 | Think before opening files from USB/downloads | No | Knowledge-based | Behavioural habit cannot be self-certified. "Done" is meaningless for a future commitment. |
| 10 | Know what to do if you clicked something bad | Partially | Knowledge-based | Good action step (save IT contact number), but "knowing what to do" is knowledge, not action. |
| 11 | Know the one rule: report, don't hide | Partially | Knowledge-based | Memorable and clear. Would benefit from auto-populated IT contact info. |

### Items That Need Changes

**Should be split:**
- "Update routers, firewalls, VPNs and website plugins" -- covers 4 unrelated systems. Split into "Update router/firewall firmware" and "Update VPN and web platform plugins."

**Should be merged:**
- "Turn on two-step login for your work accounts" and "Turn on two-step login for all work tools, not just email" -- these are the same action at different scope. Merge into one item with a checklist of tools.

**Should be reworded:**
- "Think before opening files from USB drives, downloads, or messaging apps" -- reword to "I understand the risks of opening files from untrusted sources" to match what "Done" actually means.
- "Know what to do if you think you clicked something bad" -- reword to "I have saved my IT contact's number and know the first 3 steps" to make "Done" concrete.
- "Know the one rule: report, don't hide" -- reword to "I know who to report security concerns to" with auto-populated contact.
- "Verify Office macros from the internet are blocked" -- add qualifier: only shown if email platform is M365 or "Other." Hide for Google Workspace.

**Should be removed or deferred:**
- None should be removed. All 36 items are legitimate security controls for SMBs. However, 4 items should be explicitly marked as "future-verified" once email campaigns exist: Spot a phishing email, Recognise a fake login page, Spot a phone or voice scam, Spot a fake invoice or supplier email.

---

## 2. The Verification Problem

### The Core Issue

Stefan nailed it: the current model is "checkbox theatre." Users click "Done" without verification, and the resulting dashboard gives a false sense of security. This is worse than having no checklist, because it creates complacency.

The BA walkthroughs confirmed this across all three roles:
- **Owner** clicked "Done" on items they felt confident about, with no standard for what "Done" means
- **IT executor** could genuinely verify technical items but had no way to communicate blockers
- **Employees** speed-clicked through awareness items with no verification of actual skill

### Proposed Verification Framework: Three Tiers

#### Tier 1: Self-Attestation with Accountability (ship in PI 3)

For items where the user genuinely can verify their own work (lock screen, password manager, MFA):

- Keep Done/Unsure/Skipped buttons
- Add a one-line "I confirm" micro-statement specific to each item. Examples:
  - Lock screen: "I confirm my auto-lock is set to 2 minutes or less"
  - Password manager: "I confirm I have installed a password manager and moved my email password into it"
  - MFA for email: "I confirm MFA is enabled on my work email account"
- The confirm statement replaces the ambiguous "Done" -- the user is attesting to a specific, verifiable fact
- **Manager/owner can request evidence**: Add a "Ask about this" button on the dashboard drill-down view. This sends a notification (in-app or email) to the team member asking them to confirm or explain their response. Stefan specifically requested this: "they risk being asked about it." The deterrent effect matters more than the actual asking.

#### Tier 2: Verified by Email Campaign (ship later, paid feature)

For awareness items that cannot meaningfully be self-assessed (phishing recognition, fake login pages, invoice fraud):

- Show these items on the checklist but mark them with a distinct visual indicator: "Verified by test email" badge
- Before email campaigns are active, these items show an explanation: "This item will be verified when your organisation activates email security testing. For now, read the guidance below to prepare."
- Users can still read the educational content (steps, why it matters) but cannot mark the item "Done" themselves
- Once email campaigns are active: the item auto-resolves based on whether the user correctly identified the test email (clicked "Report phishing") or failed (clicked the link)
- Three outcomes from each campaign email:
  1. Correctly reported as phishing (pass)
  2. Ignored / deleted (neutral)
  3. Clicked the link / entered credentials (fail)

This directly implements Stefan's vision: "why not toss the whole idea of pressing Done/Unsure/Skipped for items to actually being checked by emails sent to employees?"

#### Tier 3: IT-Verified (ship in PI 3)

For technical controls that only the IT executor can verify (RDP, SPF/DKIM, endpoint protection):

- These items appear only on the IT executor's checklist (already the case)
- Add a verification step: when the IT executor marks "Done," they are asked to confirm the specific technical state. Examples:
  - RDP: "I confirmed via shodan.io that port 3389 is not exposed"
  - SPF/DKIM: "I verified DNS records via mxtoolbox.com"
  - Endpoint protection: "I confirmed Windows Defender / [other AV] is active on all company devices"
- The owner sees the IT executor's confirmation statement on the dashboard drill-down

### What This Framework Avoids

- **No photo uploads**: Stefan explicitly rejected this as an unnecessary burden
- **No complex rules engine**: The framework uses the existing Done/Unsure/Skipped model, just adds a confirmation micro-statement and a future hook for email campaign verification
- **No heavy DB changes**: A `confirmation_text` column on `checklist_items` (or `assessment_items`) and a `manager_query` flag on `assessment_responses` are sufficient

### Balancing Simplicity and Meaning

The key insight is that different items require different verification approaches. Trying to use one interaction model (Done/Unsure/Skipped) for all 36 items is what creates the "checkbox theatre" problem. By categorising items into tiers, each item gets the lightest-weight verification that is still meaningful:

- Self-certifiable items: micro-confirmation (one sentence)
- Future-verified items: locked until email campaign confirms
- IT-verified items: technical confirmation statement

---

## 3. Item Categorisation

### Proposed Categories

Every checklist item should be tagged with one of six assessment types. This tag drives the UI interaction model and determines what "Done" means for that item.

#### Category 1: Self-Certifiable
The user can genuinely verify this themselves. "Done" means "I did this specific thing."

| Item | Confirmation Statement |
|------|----------------------|
| Turn on automatic OS updates | "Auto-updates are enabled on my devices" |
| Change default router and admin passwords | "I changed the default admin password on my router" |
| Separate guest Wi-Fi from internal devices | "Guest Wi-Fi is on a separate network" |
| Test restoring backups (quarterly) | "I restored a test file from backup and confirmed it works" |
| Remove or lock down shared accounts | "All shared accounts are either removed or have MFA" |
| Use a strong, unique password for your work accounts | "I use a password manager and do not reuse passwords across work accounts" |
| Turn on two-step login for your work accounts | "MFA is enabled on my work email" |
| Lock your screen when you step away | "My auto-lock is set to 2 minutes or less" |

#### Category 2: Knowledge-Based
The user has read and understood guidance. "Done" means "I have read this and understand what to do."

| Item | Confirmation Statement |
|------|----------------------|
| Think before opening files from USB/downloads | "I understand the risks and will scan/verify before opening" |
| Know what to do if you clicked something bad | "I saved my IT contact's number and know the first 3 steps" |
| Know the one rule: report, don't hide | "I know who to report security concerns to: [IT contact auto-populated]" |

#### Category 3: Action-Required
The user needs to complete a multi-step task, often producing a deliverable. "Done" means "I completed the action and have the result."

| Item | Confirmation Statement |
|------|----------------------|
| Use a password manager (IT) | "I installed [manager name] and migrated email + admin passwords" |
| Set up 3-2-1 backups | "I have 3 copies, 2 media types, 1 offline/offsite" |
| Write a 1-page security rules doc | "I created the doc and shared it with staff" |
| Create an offboarding checklist for leavers | "I created the checklist and it is stored in [location]" |
| Write a simple incident response plan | "I created the plan and shared it with the team" |
| Create a list of all SaaS accounts | "I completed the inventory with [N] accounts listed" |
| Turn on two-step login for all work tools | "I audited my tools and enabled MFA on all that support it" |

#### Category 4: Team-Action
Requires coordination with another person. "Done" means "we agreed on this as a team."

| Item | Confirmation Statement |
|------|----------------------|
| Spot a phone or voice scam | "We agreed on a verbal code word for urgent requests" |
| Spot a fake invoice or supplier email | "We established a phone-verification rule for new bank details" |
| Run a 30-minute security awareness session | "Session held on [date] with [N] attendees" |

#### Category 5: IT-Verified
Only the IT executor can meaningfully verify these technical controls.

| Item | Confirmation Statement |
|------|----------------------|
| Enable anti-phishing and spam filters | "Verified in [platform] admin console" |
| Remove local admin rights from daily users | "Removed admin rights from [N] user accounts" |
| Verify Office macros from the internet are blocked | "Verified via Group Policy / Trust Center" |
| Turn on MFA for email accounts (org-wide) | "MFA enforced for all [N] users in admin console" |
| Update routers, firewalls, VPNs and plugins | "All firmware/software is current as of [date]" |
| Audit third-party app access (OAuth grants) | "Reviewed and revoked [N] unnecessary grants" |
| Check that RDP is not exposed to the internet | "Verified via shodan.io -- port 3389 not exposed" |
| Verify endpoint protection is active | "Confirmed AV active on all [N] company devices" |
| Set up DNS filtering | "DNS set to [provider] on router and verified" |
| Separate admin accounts from daily accounts | "Created separate admin accounts for [N] admins" |
| Enable full-disk encryption on all devices | "BitLocker/FileVault enabled on all [N] devices" |
| Set up SPF, DKIM, and DMARC | "Verified via mxtoolbox.com -- all 3 records present" |

#### Category 6: Future-Verified (Email Campaign)
These items measure a skill that can only be verified by actual testing. Self-assessment is not meaningful.

| Item | Behaviour Tested |
|------|-----------------|
| Spot a phishing email | Did the user report a simulated phishing email? |
| Recognise a fake login page | Did the user avoid entering credentials on a fake login? |
| Spot a fake invoice or supplier email (verification component) | Did the user follow the phone-verification rule? |

---

## 4. Missing Security Content

### Items to Add for PI 3

Based on the walkthrough findings and standard SMB security frameworks (CIS Controls v8, Cyber Essentials), the following items are missing and should be considered:

**High priority additions:**

1. **Review who has access to what (quarterly access review)** -- Currently there is no item covering periodic access review. This is a fundamental security control. Simple action: "List all people who can access your email admin, cloud storage admin, and financial systems. Remove anyone who should not be there."

2. **Enable logging and review alerts** -- No item covers audit logging. For Google Workspace / M365, enabling admin audit logs and reviewing alerts is a 10-minute task with high value. Without logs, you cannot investigate incidents.

3. **Secure mobile devices (phones and tablets)** -- No item covers mobile device security. At minimum: enable screen lock, enable remote wipe, do not install apps from unknown sources. This is critical because many SMB employees access work email on personal phones.

**Medium priority additions:**

4. **Verify your domain is not on blacklists** -- Quick check via mxtoolbox.com or similar. Takes 2 minutes. Useful early warning of compromise.

5. **Review browser extensions** -- Malicious browser extensions are an increasing attack vector. A quick audit of installed extensions across Chrome/Edge profiles takes minutes and can catch data-exfiltration plugins.

### Items That Need Better Guidance/Steps

The following items have good titles but insufficient guidance for the target audience:

1. **Run a 30-minute security awareness session**: Needs downloadable materials. Without slides, examples, and a facilitator guide, this item is aspirational. The IT person at a 10-person company will not create training content from scratch.

2. **Write a 1-page security rules doc**: Needs a downloadable template (Google Docs / Word). The bullet-point structure in the steps is helpful but insufficient.

3. **Write a simple incident response plan**: Same -- needs a downloadable template with fill-in-the-blank sections.

4. **Set up SPF, DKIM, and DMARC**: Needs a plain-English explanation of what each acronym means before diving into DNS records. A part-time IT person may never have heard of DMARC.

5. **Use a password manager**: Stefan specifically noted that some users do not know how to download and install software. The steps should link to specific setup guides for Bitwarden (free) with screenshots or a video.

### Templates Needed (PI 3 deliverables)

| Template | Format | Estimated Effort |
|----------|--------|-----------------|
| Security awareness session slide deck | Google Slides / PDF (5-8 slides) | Half day to create |
| Security rules doc (1-page) | Google Docs / Word template | 2 hours to create |
| Incident response plan | Google Docs / Word template with fill-in sections | 2 hours to create |
| SaaS inventory spreadsheet | Google Sheets / Excel template | 1 hour to create |
| Offboarding checklist | Google Docs / Word template | 1 hour to create |
| Device security checklist (new item) | In-app guidance | 1 hour to create |

These templates convert "writing tasks" into "fill-in-the-blank tasks," which dramatically increases completion rates.

---

## 5. The "30 Minutes" Problem

### The Numbers

**Landing page claim**: "Fix the biggest cyber risks in 30 minutes"

**Actual time estimates (anonymous checklist, 17 items):**
- Sum of minimum estimates: ~4.5 hours
- Sum of maximum estimates: ~13 hours
- BA Agent 3 calculated this precisely

**Workspace checklist (36 items):**
- No time estimates shown (they are stripped from the workspace view)
- Realistic total: 5-12.5 hours for the IT executor
- Employee awareness items: 30-60 minutes if just reading and responding

### Why This Matters

Stefan called this out directly: "It's a disappointment to user and we must handle it." A user who signs up expecting 30 minutes and finds 4+ hours of work will feel misled. This damages trust in a security product, which is the exact opposite of what we want.

### Recommended Approach: "Quick Start 5" + Role-Based Framing

**Option A: Reframe the landing page messaging (recommended)**

Change "Fix the biggest cyber risks in 30 minutes" to something like:
- "Start fixing your biggest cyber risks today"
- "The 5 most critical security steps take under 30 minutes"
- "Protect your business in 5 steps -- then keep improving"

Create a "Quick Start 5" -- the 5 highest-impact, lowest-effort items that genuinely can be done in 30 minutes:

| # | Item | Time | Impact |
|---|------|------|--------|
| 1 | Turn on MFA for email accounts | 5-15 min | Blocks most account takeovers |
| 2 | Turn on automatic OS updates | 5-10 min | Closes known vulnerabilities |
| 3 | Change default router/admin passwords | 10-20 min | Stops trivial network takeover |
| 4 | Lock your screen when you step away | 2 min | Prevents physical access |
| 5 | Enable anti-phishing and spam filters | 10-20 min | Reduces dangerous emails |

Total: 32-67 minutes. Close enough to "30 minutes" for a landing page claim if we say "Start with the top 5."

**Option B: Role-based time estimates**

Show different estimates by role on the landing page and in the workspace:
- **Employees**: "15-30 minutes to review your security awareness checklist"
- **IT person**: "3-5 hours to work through the IT baseline (spread over a week)"
- **Owner (no IT person)**: "4-6 hours total (tackle 2-3 items per day)"

**Option C: Both A and B (recommended)**

Use the "Quick Start 5" as the landing page hook, then show role-based estimates during onboarding and in the workspace. This sets honest expectations while still having a compelling entry point.

### Time Estimates in Workspace

The BA walkthrough noted that time estimates are present in the anonymous checklist but missing from the workspace checklist. These should be restored. Users need to know whether an item is a 5-minute task or a half-day project before deciding what to tackle next.

---

## 6. Recommendations for PI 3

### Priority 1: Fix the Interaction Model (the fundamental gap)

The single most important change for PI 3 is fixing what "Done" means. The current three-button model (Done / Unsure / Skipped) is the same for all 36 items, regardless of whether the item is a 2-minute settings change or a day-long project, whether it is self-verifiable or requires an email campaign.

**Concrete actions:**
1. Tag every item with an assessment category (Section 3 above)
2. Add confirmation micro-statements to all self-certifiable and IT-verified items
3. Mark future-verified items (phishing recognition) with a distinct visual state that explains they will be tested by email campaign. Allow users to read the guidance but not self-certify. Stefan's language: "show/disable which ones are to be skipped until fake emails have been sent"
4. Add "Ask about this" capability for managers/owners to query employees about their responses

### Priority 2: Provide Templates for Content-Creation Items

Three items currently require the user to create content from scratch (awareness session, security rules doc, incident response plan). Without templates, these will be skipped by 80%+ of users. Providing fill-in-the-blank templates converts these from "too hard" to "20 minutes."

**Concrete actions:**
1. Create and host 5 downloadable templates (Section 4 table)
2. Link templates directly from the checklist item steps
3. For the awareness session, provide a 5-slide deck with real phishing examples baked in

### Priority 3: Restore Context and Guidance

The BA walkthroughs revealed that the workspace checklist strips out guidance that exists in the anonymous checklist. Employees arrive at a bare list with no context.

**Concrete actions:**
1. Add time estimates to workspace checklist items (they already exist in the data)
2. Add a welcome/context message for employees: "Your manager has asked you to review these security items. It takes about 15-20 minutes. Your responses help your organisation understand its security posture."
3. Restore category grouping for IT Baseline items (Passwords, Email, Patching, etc.) -- the flat list of 25 items is overwhelming
4. Add the "Why it matters" and steps as expandable sections (as in the anonymous checklist)

### Priority 4: Fix the "30 Minutes" Messaging

**Concrete actions:**
1. Create a "Quick Start 5" subset of the highest-impact, fastest items
2. Reframe landing page from "30 minutes" to "Start with the 5 most critical steps"
3. Add role-based time estimates during onboarding and in the workspace

### Priority 5: Prepare for Email Campaign Integration

Stefan's strongest product insight is that awareness items should be verified by actual email campaigns, not self-report. While the full email campaign feature is a paid tier for later, PI 3 should lay the groundwork.

**Concrete actions:**
1. Tag 4 awareness items as "future-verified by email campaign"
2. Design the UI state for these items: educational content visible, but "Done" button replaced with "Will be tested by email campaign"
3. Add a teaser on the owner's dashboard: "Verify your team's phishing awareness with real test emails -- coming soon"
4. This creates a natural upgrade path to the paid tier without blocking the free checklist

### Priority 6: Dashboard Drill-Down

The owner currently sees only aggregate progress per team member. Stefan and the BA walkthroughs both identified that the owner needs item-level visibility to follow up meaningfully.

**Concrete actions:**
1. Add click-to-expand on each team member's row in the dashboard
2. Show individual item responses (Done/Unsure/Skipped) with the confirmation statement where applicable
3. Add the "Ask about this" button for items where the owner wants to follow up

### What Would Make This Genuinely Useful for a 10-Person Company

A 10-person company with a part-time IT person and a non-technical owner needs:

1. **Clarity on what to do first**: The Quick Start 5 gives them a 30-minute win on day one.
2. **Honest framing**: Role-based time estimates so nobody is surprised.
3. **Templates, not blank pages**: Fill-in-the-blank documents for the writing tasks.
4. **Meaningful verification**: Confirmation statements that make "Done" mean something specific, plus the deterrent of "your manager can ask you about this."
5. **A path to real testing**: The email campaign teaser sets expectations that this is not just a one-time checkbox exercise but an ongoing security posture improvement tool.

The current app has excellent security content and solid technical implementation. The gap is entirely in the interaction model -- bridging "here is what to do" with "prove you did it." Fixing this gap is what separates a useful security tool from a compliance checkbox.
