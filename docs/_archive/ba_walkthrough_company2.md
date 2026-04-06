# BA Walkthrough Report — Company 2

**Date**: 2026-03-18
**Tester**: BA Agent 1
**Environment**: https://smbsec1.vercel.app/
**Accounts**: Company 2 (@bertramconsulting.dk)

---

## 1. Executive Summary

The app has a solid foundation and the core flow works: owner signs up, sets up org, invites team, starts assessment, and everyone gets their role-appropriate checklist. The checklist content itself is genuinely good — well-written, practical, and appropriate for SMBs. However, the app currently asks users to **self-assess** their security posture without giving them enough scaffolding to do so meaningfully. For many items, "Done" is ambiguous because the user has no way to verify whether they have actually completed the control. The app tells people WHAT to do (steps) but then asks them to confirm they have ALREADY done it — there is a fundamental gap between "here is how to do this" and "have you done this?" that creates confusion. The experience is strongest for IT executors (who get concrete, actionable technical steps) and weakest for employees (who are asked to self-certify awareness skills they may not actually possess).

---

## 2. Owner Journey

### Page-by-Page Observations

**Landing page (/)**: Clear value proposition. "Fix the biggest cyber risks in 30 minutes" is compelling. The attack cards (phishing, stolen passwords, etc.) give good context. Trust signals are reassuring. No issues.

**Login page (/login)**: Clean, simple. The magic link warning ("Open the link in the same browser") is helpful. However, a non-technical owner might not understand "magic link" as a concept — the phrase "secure sign-in link" is better, which is what is used. Minor: the page title says "Log in" but the CTA on the landing page says "Sign up free" — clicking "Sign up free" takes you to the same page. A confused user might wonder if they are signing up or logging in.

**Onboarding (/onboarding)**: Good structure. "Takes about 2 minutes" sets expectations. The IT handling question is well-framed with clear sub-descriptions. **Issue**: When the owner selects "A staff member," the sub-text says "We'll send them an invite with the IT checklist assigned," but the invite is created with role "employee" not "manager." The owner might expect their IT person to have elevated permissions. **Observation**: There is no option for the owner to set their own display name during onboarding, which means they show up as a UUID on the dashboard later.

**Workspace home (/workspace)**: The guided 3-step setup is excellent for first-time owners. Step 1 (Invite IT lead) automatically marks as done since the IT person was invited during onboarding. Steps 2 and 3 are clear. The nav cards are well-organized. **Issue**: The owner's role shows "org admin" — a real business owner might not know what "org admin" means in this context. Something like "Owner" or "Organisation Owner" would be clearer.

**Checklist (/workspace/checklist)**: The owner sees 11 Security Awareness items only (correct, since IT was delegated). Progress bar shows 0/11.

**Dashboard (/workspace/dashboard)**: Shows all 3 members and their progress. **Bug**: The response counter shows "0 / 108 responses" which is calculated as 36 total items * 3 members = 108. But this is incorrect because the owner and employee each only see 11 items, while only the IT executor sees all 36. The correct total should be 11 + 36 + 11 = 58 expected responses. This misleading math will confuse the owner when the number never reaches 108 even with everyone completing their checklists. **Issue**: The owner appears as "dd271760..." (a UUID fragment) instead of a name or email. The IT person and employee show as email addresses despite having entered display names. This undermines the dashboard's usefulness. **Issue**: The cadence indicator says "No assessment completed" — accurate but could feel discouraging since the owner just started.

**Team (/workspace/team)**: Clean invite form. Pending invites show with email, role, expiry, and copy/revoke options. **Observation**: The "IT executor" checkbox label says "handles IT baseline checklist" which is clear. However, the role dropdown only offers "Employee" and "Manager" — the owner's IT person was invited as "Employee + IT executor" during onboarding, which might surprise the owner who expected their IT lead to be a "Manager."

**Assessments (/workspace/assessments)**: Simple and clear. Start/complete workflow works. "Assessment already in progress" disabled state is appropriate.

**Org Settings (/workspace/settings)**: Email platform and IT executor assignment. **Issue**: The IT executor dropdown shows "dd271760... (org admin)" as the only option initially (before other members accept invites). Once members join, it should show their display names but currently shows emails or UUIDs.

**Settings & Data (/workspace/settings/gdpr)**: Data residency info, export, member management, and delete org. Well-structured.

### Checklist Item-by-Item Analysis (Owner — 11 Awareness Items)

The owner sees only the "Security Awareness" track. For each item:

#### 1. Spot a phishing email (high impact)
- **Understandable?** Yes — the title is clear.
- **Can the owner meaningfully answer Done/Unsure/Skipped?** Partially. "Done" is ambiguous. Does it mean "I already know how to spot phishing emails" or "I have completed the action steps below"? The steps include "look at the last 5 emails in your spam folder" which is a concrete action, but "Done" could also just mean "I read this and feel confident."
- **What would help**: Reframe the response from "Done" to "I have read this and practiced the action step" or add a brief confirmation like "I checked my spam folder and identified suspicious patterns."

#### 2. Recognise a fake login page (high impact)
- **Understandable?** Yes.
- **Can they answer meaningfully?** Same ambiguity as above. The steps give good advice (check address bar, watch for domain tricks). The action step ("next time you log in, consciously check the address bar") is a future behaviour commitment, not something already done.
- **What would help**: An interactive example (show them a fake vs real URL and ask them to identify which is fake).

#### 3. Spot a phone or voice scam (high impact)
- **Understandable?** Yes.
- **Can they answer meaningfully?** The action step suggests agreeing on a "verbal code word" for urgent requests — this is genuinely actionable. But "Done" means... they set up the code word? Or they just read the tips?
- **What would help**: Clarify what "Done" means for this item.

#### 4. Spot a fake invoice or supplier email (high impact)
- **Understandable?** Yes, especially for an owner who handles finances.
- **Can they answer meaningfully?** The action step is excellent: "create a rule with your finance person — any new bank details must be verified by phone before payment." This is concrete and verifiable.
- **What would help**: This is one of the better items. Could be improved with a template email to send to the finance person.

#### 5. Use a strong, unique password for your work accounts (high impact)
- **Understandable?** Yes.
- **Can they answer meaningfully?** "Done" is ambiguous. Does it mean they have changed all passwords? Started using a password manager? The action step says "check if you reuse any password — if yes, change the most important one today."
- **What would help**: A clearer definition of what "Done" means. Perhaps "I use a password manager and have no reused passwords across work accounts."

#### 6. Turn on two-step login for your work accounts (high impact)
- **Understandable?** "Two-step login" is good plain language.
- **Can they answer meaningfully?** Yes — the action step is clear: "enable MFA on your work email today." They either did it or they didn't.
- **What would help**: The term "MFA" in the steps might confuse non-technical users since the title uses "two-step login." Stay consistent.

#### 7. Turn on two-step login for all work tools, not just email (high impact)
- **Understandable?** Yes.
- **Can they answer meaningfully?** This requires them to audit ALL work tools, which is a significant task. The steps are clear but the scope is large. Most users would not know all tools their company uses.
- **What would help**: Cross-reference with the IT Baseline item "Create a list of all SaaS accounts" — ideally this item would say "Ask your IT lead for the SaaS inventory" and check those tools.

#### 8. Lock your screen when you step away (medium impact)
- **Understandable?** Yes — very clear.
- **Can they answer meaningfully?** Yes. The action step is concrete: "set auto-lock on your computer right now if it is longer than 2 minutes." This is verifiable.
- **What would help**: This is one of the best items — clear, actionable, and verifiable.

#### 9. Think before opening files from USB drives, downloads, or messaging apps (medium impact)
- **Understandable?** Yes.
- **Can they answer meaningfully?** "Done" for a behavioural habit is inherently uncertain. The user cannot really certify that they will always think before opening files.
- **What would help**: This is better framed as "I have read and understood these guidelines" rather than "Done."

#### 10. Know what to do if you think you clicked something bad (high impact)
- **Understandable?** Yes.
- **Can they answer meaningfully?** The action step is excellent: "make sure you know who to call right now. Save that person's number." This is concrete.
- **What would help**: Auto-populate the contact name if the org has an IT executor assigned.

#### 11. Know the one rule: report, don't hide (high impact)
- **Understandable?** Yes — the title is memorable and clear.
- **Can they answer meaningfully?** The action step says "find out right now who your 'report security concerns to' contact is." This is concrete.
- **What would help**: Same as above — show the IT executor's contact info if available.

### Overall: Would a real owner know what to do?

**Partially.** The onboarding and guided setup are excellent. The owner knows how to navigate the app and invite their team. However, the awareness checklist items ask the owner to self-certify knowledge and behaviours without a clear standard for what "Done" means. The owner would likely click "Done" on items they feel confident about and "Unsure" on items where they are not sure if they have done enough. The result is a subjective self-assessment rather than a verified security posture. That said, the content quality is high and simply reading through the items with their steps would genuinely improve the owner's security awareness.

---

## 3. IT Person Journey

### Page-by-Page Observations

**Invite email**: The IT person receives a Supabase "Confirm Your Signup" email, not a branded SMBsec invite. **Major issue**: The email says "Confirm your signup" from "Supabase Auth" (noreply@mail.app.supabase.io). A real IT person would be suspicious of this email — it looks like a generic SaaS confirmation, not an invitation from their boss. There is no mention of the company name, who invited them, or what SMBsec is. The Resend invite email may have also been sent (the invite API tries to send via Resend), but the Supabase auth email is the one that contains the actual link.

**Accept invite (/accept-invite)**: Shows "Join your team" with the user's email and a name field. Clean and clear. However, there is no information about what organisation they are joining, what role they will have, or what is expected of them. A real IT person receiving this would wonder: "What team? What is this app? What do I need to do?"

**Workspace home (/workspace)**: Shows "employee - IT executor." No guided setup (that is admin-only). Only 3 cards: My checklist, Dashboard, Settings & data. **Issue**: The IT person sees "employee" as their role, which does not match their actual function. They were invited as the IT lead but the app calls them an "employee." This could feel dismissive or confusing. **Issue**: There is no welcome message explaining their role, what is expected, or how long it will take.

**Checklist (/workspace/checklist)**: Shows all 36 items (25 IT Baseline + 11 Security Awareness). A blue banner says "Your admin has assigned you the IT Baseline track — these are the technical controls for SMBsec1 Test Company 2." This is helpful but dismissible, and once dismissed it never comes back. **Issue**: 36 items is overwhelming. The IT person has no sense of priority beyond the "high/medium impact" labels. There is no grouping by category — all 25 IT Baseline items appear in a flat list under "IT Baseline." The original checklist groups (Passwords & Accounts, Email Security, etc.) are lost in the workspace view.

**Dashboard (/workspace/dashboard)**: The IT person can see the dashboard but it shows the same org-wide view. They can see all members' progress. **Issue**: The IT person has no way to see which items are specifically THEIRS (IT Baseline) vs which are shared awareness items, from the dashboard view.

### Checklist Item-by-Item Analysis (IT Person — 25 IT Baseline + 11 Awareness)

The IT person sees the full list. I will focus on the IT Baseline items (the awareness items are the same as what the owner and employee see):

#### IT Baseline Items:

#### 1. Turn on automatic OS updates (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — clear steps. But this depends on whether they have access to all company computers. If they are a part-time external consultant, they may not have physical access to every machine.
- **What's missing**: Guidance on how to verify this remotely (e.g., via MDM or Group Policy).

#### 2. Enable anti-phishing and spam filters (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — the Google Workspace-specific steps are excellent and specific (admin.google.com paths are given). This is one of the best items in the checklist.
- **What's missing**: Very little. Good item.

#### 3. Set up 3-2-1 backups (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** The Google Workspace-specific steps are excellent — they explain that Google Drive version history is NOT a backup, recommend third-party tools, and include testing. However, this is a significant project (rated "day" effort), not a simple checkbox item.
- **What's missing**: Specific tool recommendations with pricing for SMBs.

#### 4. Use a password manager (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — clear tool recommendations (Bitwarden, 1Password, KeePass). Steps are straightforward.
- **What's missing**: Guidance on rolling out a password manager org-wide vs just for themselves.

#### 5. Change default router and admin passwords (medium impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes, if they have router access. Steps are clear.
- **What's missing**: Nothing significant.

#### 6. Run a 30-minute security awareness session (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** This is a BIG ask. The steps say "Show 3 real phishing examples relevant to your business" but do not provide any examples, slides, or materials. A part-time IT person at a 10-person company is unlikely to create training content from scratch.
- **What's missing**: A downloadable slide deck or video. A template for the session. Example phishing emails. Without materials, this item will be marked "Unsure" or "Skipped" by most IT people.

#### 7. Remove local admin rights from daily users (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — steps are clear. But this can cause friction (users get angry when they cannot install software).
- **What's missing**: Guidance on handling user pushback. An exceptions process.

#### 8. Verify Office macros from the internet are blocked (medium impact)
- **IT person understands?** Yes, if they know what macros are.
- **Can they DO this?** Yes — the steps are very specific (Trust Center path, Group Policy check). The M365-specific steps are excellent.
- **What's missing**: May not be relevant if the company does not use Office (e.g., Google Workspace-only companies). No Google-specific alternative is given.

#### 9. Separate guest Wi-Fi from internal devices (medium impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — simple router configuration.
- **What's missing**: Nothing significant.

#### 10. Turn on MFA for email accounts (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — the Google Workspace-specific steps are excellent and detailed. Includes enforcement timeline advice ("give staff 1 week notice").
- **What's missing**: Very little. Excellent item.

#### 11. Write a 1-page security rules doc (medium impact)
- **IT person understands?** Yes.
- **Can they DO this?** The steps provide a template structure which is very helpful. However, writing even a 1-page document requires time and thought.
- **What's missing**: A downloadable template document (not just bullet points). A Google Docs or Word template they can copy and customize.

#### 12. Update routers, firewalls, VPNs and website plugins (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes, but this is a broad item covering multiple systems. Steps are high-level.
- **What's missing**: How to find out which firmware version they are running and whether it is up to date.

#### 13. Test restoring backups (quarterly) (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — steps are clear and practical.
- **What's missing**: Nothing significant. Good item.

#### 14. Create an offboarding checklist for leavers (medium impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — the Google Workspace-specific steps are detailed and actionable (admin paths, data transfer, timeline).
- **What's missing**: A downloadable checklist template.

#### 15. Audit third-party app access (OAuth grants) (high impact)
- **IT person understands?** Yes, if they know what OAuth is. "Third-party app access" is clear enough.
- **Can they DO this?** Yes — the Google Workspace-specific steps are excellent (admin.google.com paths, what to look for, how to restrict future grants).
- **What's missing**: Very little. One of the best items.

#### 16. Check that RDP is not exposed to the internet (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — steps include checking router, disabling RDP, using shodan.io to verify. Very actionable.
- **What's missing**: Nothing significant. Excellent item.

#### 17. Verify endpoint protection is active (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — steps are practical (check Windows Security, confirm real-time protection, run quick scan).
- **What's missing**: How to do this at scale (checking 10+ machines manually is tedious).

#### 18. Add an easy "Report Phishing" method (medium impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — the Google Workspace steps are specific (Workspace Marketplace, admin deployment).
- **What's missing**: Very little.

#### 19. Set up DNS filtering to block malicious websites (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — steps include specific DNS providers with IP addresses and router configuration instructions. Very actionable.
- **What's missing**: Nothing significant. Excellent item.

#### 20. Write a simple incident response plan (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** The template structure is very helpful (step-by-step: disconnect, call, do not turn off, change passwords). However, like the security rules doc, this is a writing task.
- **What's missing**: A downloadable template document.

#### 21. Separate admin accounts from daily accounts (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — Google Workspace steps are specific.
- **What's missing**: Nothing significant.

#### 22. Enable full-disk encryption on all company devices (high impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — steps cover both Windows (BitLocker) and Mac (FileVault).
- **What's missing**: How to verify encryption status on devices they do not physically have. Recovery key management best practices.

#### 23. Set up SPF, DKIM, and DMARC for your domain (high impact)
- **IT person understands?** A part-time IT person might not know what SPF/DKIM/DMARC are. The "why it matters" section explains it well, but the acronyms can be intimidating.
- **Can they DO this?** The Google Workspace-specific steps are excellent and include the actual DNS record values to add. mxtoolbox.com for verification is a great practical tip.
- **What's missing**: A brief plain-English explanation of each acronym before diving into the steps.

#### 24. Remove or lock down shared accounts (medium impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — steps are clear.
- **What's missing**: Nothing significant.

#### 25. Create a list of all SaaS accounts your company uses (medium impact)
- **IT person understands?** Yes.
- **Can they DO this?** Yes — the steps are practical (check credit card statements, ask team members, check browser saved passwords).
- **What's missing**: A spreadsheet template to download.

### Overall: Would a real IT person know what to do?

**Mostly yes.** The IT Baseline items are the strongest part of the checklist. The platform-specific steps (Google Workspace in this case) are genuinely excellent — they give exact admin console paths, specific settings to change, and verification steps. A competent part-time IT person could work through most of these items. The main gaps are: (1) items that require creating content (security awareness session, security rules doc, incident response plan) without providing templates or materials, (2) the flat list of 25 IT items without category grouping is overwhelming, and (3) there is no priority order beyond impact labels — the IT person does not know which items to tackle first.

---

## 4. Employee Journey

### Page-by-Page Observations

**Invite experience**: Same as the IT person — the employee receives a generic Supabase "Confirm Your Signup" email with no context about who invited them, what the tool is, or why they should click the link. A real employee who was told by their boss "go sign up for this security checklist" would need to know where to look. If the employee just receives the email without prior context from their boss, they might think it is spam.

**Accept invite (/accept-invite)**: Shows "Join your team" — same as IT person. No context about what the team is or what they will be asked to do. A real employee would want to know: "How long will this take? What do I need to do? Why?"

**Workspace home (/workspace)**: Shows "employee" role. Only 3 cards: My checklist, Dashboard, Settings & data. No welcome message, no explanation of what is expected. **Issue**: The employee lands on a blank workspace page with no guidance. They need to click "My checklist" to find their actual task. A new employee should be immediately directed to their checklist, or the home page should have a prominent message like "You have 11 items to review — start your checklist."

**Checklist (/workspace/checklist)**: Shows 11 Security Awareness items. No blue banner (that is only for IT executors). The progress bar shows 0/11. **Issue**: There is no introductory text explaining what this is, why the employee is here, or what is expected. The employee just sees a list of items with Done/Unsure/Skipped buttons. A real employee would wonder: "Am I supposed to DO all these things? Am I just saying whether I already do them? How long should this take?"

**Dashboard (/workspace/dashboard)**: The employee can see the full org dashboard including other members' progress. **Observation**: It is unusual for an employee to see everyone else's progress. This might create social pressure (good) or anxiety (bad). **Issue**: The employee can see their own progress by UUID or email, but the dashboard does not clearly highlight "your progress" vs others.

### Checklist Item-by-Item Analysis (Employee — 11 Awareness Items)

The employee sees the same 11 items as the owner. From the perspective of a real employee (accountant, sales person, receptionist) who was told by their boss to fill this out:

#### 1. Spot a phishing email (high impact)
- **Employee understands?** The title is clear — everyone has heard of phishing.
- **Can they meaningfully answer?** "Done" is very ambiguous. Has anyone shown them what a phishing email looks like? The steps are educational (check sender, hover over links), but the employee is self-certifying a SKILL they may not actually have. The action step ("look at the last 5 emails in your spam folder") is excellent and concrete.
- **Verdict**: The steps teach, but "Done" is self-assessed competence. An employee might click "Done" after reading the tips without actually checking their spam folder.

#### 2. Recognise a fake login page (high impact)
- **Employee understands?** "Fake login page" is clear enough.
- **Can they meaningfully answer?** Same issue — self-certifying a skill. The padlock myth-busting ("HTTPS does NOT mean the site is safe") is valuable education. The action step is a future behavior commitment.
- **Verdict**: Educational value is high, but "Done" has no verification.

#### 3. Spot a phone or voice scam (high impact)
- **Employee understands?** Yes.
- **Can they meaningfully answer?** The code word suggestion is a concrete team action. But has the employee actually discussed this with their team? Clicking "Done" without doing so would be misleading.
- **Verdict**: Good content, but requires a team action that one person cannot complete alone.

#### 4. Spot a fake invoice or supplier email (high impact)
- **Employee understands?** Depends on their role. An accountant would understand perfectly. A developer might not handle invoices.
- **Can they meaningfully answer?** The "create a rule with your finance person" action requires coordination. An employee who does not handle finances might legitimately skip this.
- **Verdict**: Role-dependent. Would benefit from a "Not applicable to my role" option or guidance on who should answer this.

#### 5. Use a strong, unique password for your work accounts (high impact)
- **Employee understands?** Yes — "strong password" is universally understood (even if not universally practiced).
- **Can they meaningfully answer?** The action step is excellent: "check if you reuse any password across work accounts. If yes, change the most important one today." This is concrete and actionable.
- **Verdict**: Good item. "Done" could mean "I checked and I am fine" or "I changed my reused passwords." Both are valid.

#### 6. Turn on two-step login for your work accounts (high impact)
- **Employee understands?** "Two-step login" is clear. "MFA" in the steps might confuse some.
- **Can they meaningfully answer?** Yes — either they have turned it on or they have not. The action step is clear: "enable MFA on your work email today."
- **Verdict**: Good, actionable item. One of the clearest for Done/Not Done.

#### 7. Turn on two-step login for all work tools, not just email (high impact)
- **Employee understands?** Yes, builds on the previous item.
- **Can they meaningfully answer?** This requires the employee to know which tools they use and whether each supports MFA. Most employees would not know all their tools off the top of their head. The step "List all work tools you log into" is a task in itself.
- **Verdict**: Overwhelming for a typical employee. Would benefit from a pre-populated list of common tools.

#### 8. Lock your screen when you step away (medium impact)
- **Employee understands?** Crystal clear.
- **Can they meaningfully answer?** Yes — the action step is "set auto-lock on your computer right now if it is longer than 2 minutes." Instantly verifiable.
- **Verdict**: Excellent item. Clear, actionable, verifiable. Model for other items.

#### 9. Think before opening files from USB drives, downloads, or messaging apps (medium impact)
- **Employee understands?** Yes.
- **Can they meaningfully answer?** "Done" for a behavioural habit is inherently subjective. The employee is committing to a future behaviour.
- **Verdict**: Hard to mark "Done" honestly. Better framed as "I understand the risks" rather than "Done."

#### 10. Know what to do if you think you clicked something bad (high impact)
- **Employee understands?** Yes — the title is clear and slightly anxiety-inducing (in a useful way).
- **Can they meaningfully answer?** The action step is concrete: "make sure you know who to call right now. Save that person's number." This is verifiable — either they have the number saved or they do not.
- **Verdict**: Good item. Would be even better if the app auto-populated the IT executor's contact info.

#### 11. Know the one rule: report, don't hide (high impact)
- **Employee understands?** Yes — memorable and clear.
- **Can they meaningfully answer?** The action step says "find out right now who your 'report security concerns to' contact is." Concrete and actionable.
- **Verdict**: Good item. Same improvement opportunity — show the IT executor's name/email automatically.

### Overall: Would a real employee know what to do?

**Partially.** The biggest problem is not the checklist content (which is good) but the FRAMING. The employee arrives at a list of 11 items with no context. They do not know:
- Why they are here (their boss told them, but the app does not reinforce this)
- What "Done" means (have I already done this? Should I do it now? Is reading about it enough?)
- How long this should take
- Whether anyone will check their answers

A real employee would likely speed through the list, clicking "Done" on items they feel ok about and "Unsure" on items they have not thought about. The result would be a compliance checkbox exercise rather than genuine security improvement. The content itself is educational — simply reading through the items would make most employees more security-aware — but the assessment model (Done/Unsure/Skipped) does not capture the nuance of "I read this and understand it now" vs "I was already doing this" vs "I have now completed the action step."

---

## 5. Cross-Role Analysis

### Dashboard from Owner's Perspective

The dashboard shows:
- Overall: "0 / 108 responses, 0%" — the 108 number is incorrect (should be 58), which will be confusing when the team completes their items and the percentage never reaches 100%.
- IT Baseline: "0 / 25 items, 0%" and Awareness: "0 / 11 items, 0%" — these track totals are correct.
- Team progress: Shows 3 members (org admin, employee + IT executor, employee) with their individual progress bars.

**Bug**: The owner appears as "dd271760..." (UUID fragment) on the dashboard. The IT person shows as "smbsec1_2it@bertramconsulting.dk" rather than their display name "IT Person." The employee shows as "smbsec1_2emp1@bertramconsulting.dk" rather than "Employee 1." Display names entered during invite acceptance are not being shown on the dashboard.

**Issue**: The dashboard does not show WHICH items each person answered or how they answered. The owner cannot see "the IT person marked RDP as Done but SPF/DKIM as Unsure." They only see aggregate numbers (X done, Y unsure, Z skipped). This limits the owner's ability to follow up on specific items.

### Information Flow Between Roles

1. **Owner to IT person**: The owner invites the IT person during onboarding. The IT person receives a generic Supabase email. There is no branded communication explaining what SMBsec is, what the IT person's role will be, or what is expected.

2. **Owner to Employee**: The owner invites the employee from the Team page. Same generic email issue. The employee gets no context about what to expect.

3. **IT person to Owner**: The IT person completes their checklist items, and the owner can see aggregate progress on the dashboard. But the owner cannot see individual item responses.

4. **Employee to Owner**: Same as IT-to-owner — only aggregate progress visible.

5. **Missing flow**: There is no way for the IT person to communicate with the owner through the app (e.g., "I marked SPF/DKIM as Unsure because I need DNS access — can you provide it?"). There is no comment or note field on checklist items.

### What's Missing for Each Role to Succeed?

**Owner**:
- A way to see individual item responses (not just aggregates)
- Their display name on the dashboard (currently shows UUID)
- Clearer explanation of what "Done" means for awareness items
- A notification or email when team members complete their checklists
- Guidance on what to do AFTER the assessment (what if 5 items are marked Unsure?)

**IT Person**:
- Category grouping for IT Baseline items (currently a flat list of 25)
- Templates and materials for content-creation items (awareness session, security doc, incident plan)
- A way to communicate "blockers" to the owner (e.g., "I need admin access to the router")
- Clearer priority ordering (which items to do first for maximum impact)
- Their display name shown on the dashboard (currently shows email)

**Employee**:
- An introductory message explaining what this is, why they are here, and what is expected
- Clearer definition of what "Done" means for each item
- An estimated time commitment upfront ("This will take about 15 minutes")
- Context from their manager/owner about why this matters
- Auto-populated contact info for the IT executor in relevant items

---

## 6. "Does It Make Sense?" Verdict

### Owner
- **Can they complete their checklist meaningfully?** Partially
- **Top 3 blockers**:
  1. "Done" is ambiguous for awareness items — the owner is self-certifying knowledge without verification
  2. Dashboard shows incorrect total (108 vs 58) and UUID instead of name, undermining trust in the tool
  3. No visibility into individual team members' item-level responses limits follow-up ability
- **What would fix it**:
  1. Reframe "Done" to something like "I have completed the action step" and make the action step more prominent
  2. Fix the dashboard response count calculation and display name resolution
  3. Add item-level drill-down on the dashboard (click a member to see their responses)

### IT Person
- **Can they complete their checklist meaningfully?** Mostly yes
- **Top 3 blockers**:
  1. Flat list of 25 IT items without category grouping is overwhelming — the original group structure (Passwords, Email, Patching, etc.) is lost
  2. Content-creation items (awareness session, security doc, incident plan) have no downloadable templates or materials
  3. No way to communicate blockers or questions to the owner through the app
- **What would fix it**:
  1. Restore category grouping in the workspace checklist view (Passwords & Accounts, Email Security, etc.)
  2. Provide downloadable templates for the 3 content-creation items
  3. Add a "note" or "comment" field on each item so the IT person can explain their response

### Employee
- **Can they complete their checklist meaningfully?** Partially
- **Top 3 blockers**:
  1. No onboarding context — the employee arrives at a bare list with no explanation of purpose, expectations, or time commitment
  2. "Done/Unsure/Skipped" does not capture the nuance of awareness items — "I read this and understand it" is different from "I was already doing this"
  3. Several items require team coordination (code word, phone verification rule) that one person cannot complete alone
- **What would fix it**:
  1. Add a welcome/intro screen for employees explaining the purpose, expected time, and what their responses mean
  2. Consider changing response options for awareness items to "I already do this / I will start doing this / I need help with this" instead of Done/Unsure/Skipped
  3. For items requiring team action, mark them as "team action" and track them differently

### Summary Table

| Role | Can complete meaningfully? | Biggest gap |
|------|--------------------------|-------------|
| Owner | Partially | "Done" is ambiguous; dashboard has bugs; no item-level visibility |
| IT Person | Mostly yes | No category grouping; no templates for content items; no way to flag blockers |
| Employee | Partially | No onboarding context; response options do not fit awareness items; no team coordination support |

### The Fundamental Question

The app works mechanically — the flows are smooth, the data flows correctly between roles, and the technical implementation is solid. The checklist content is genuinely high quality. But there is a gap between what the app IS (a self-assessment tool) and what it NEEDS to be (a guided security improvement program). Currently, the app asks "have you done this?" when it should be asking "let us help you do this." The items with specific action steps (check your spam folder, save your IT contact's number, set auto-lock) are the strongest because they bridge this gap. The items that are more abstract (spot a phishing email, think before opening files) are the weakest because "Done" does not mean anything verifiable.

The app's biggest opportunity is to lean into the action-step model: make every item about completing a specific, verifiable action, and make "Done" mean "I completed the action step and here is how I verified it."
