# PI 3 — Product Manager Recommendations

**Author:** Product Manager Agent
**Date:** 2026-03-18
**Inputs:** Stefan walkthrough (PDF), BA reports (Companies 1-3), current app state, monetization constraints

---

## 1. Strategic Assessment

### Where we are

The app works end-to-end. The technical foundation is solid: auth, org setup, team invites, role-based checklist assignment, dashboard, and assessment lifecycle all function correctly. The anonymous checklist is genuinely excellent — well-written, actionable, grouped logically. We have 53 E2E tests passing and a clean Vercel deployment.

### Where we need to be

The app needs to cross the gap from "functional tool" to "tool that actually improves security posture." Right now, we built a self-assessment system when what users need is a guided security improvement program. The app asks "have you done this?" but users need "let me help you do this."

### The single biggest gap

**The workspace checklist strips away the guidance that makes the anonymous checklist valuable.** This is not a minor UX issue — it is the central product failure. The anonymous checklist shows why each item matters, gives concrete steps, and provides time estimates. The workspace checklist — where users actually need to take action — shows only a title and three buttons (Done / Unsure / Skipped). Stefan noticed this immediately. The BA testing confirmed it across all three roles. An employee arriving at their workspace checklist has no idea what to do, why they are there, or what "Done" means.

### Stefan's vision vs BA findings — alignment

Strong alignment. Stefan's feedback can be distilled to three themes:

1. **Keep it simple** — he loves the clean item list, does not want it cluttered with long text. He suggested a click-to-expand model with optional AI guidance. The BA testing independently confirmed that guidance is needed but should not overwhelm the simple layout.

2. **Make responses meaningful** — Stefan flagged that awareness items (like "Spot a phishing email") cannot meaningfully be marked "Done" when no phishing test has been sent. The BA testing confirmed this across all roles: "Done" is ambiguous for most awareness items. Stefan's long-term vision is that awareness items should be verified by actual email campaigns, not self-reported.

3. **Accountability without bureaucracy** — Stefan explicitly rejected photo proof uploads ("unnecessary burden") but wants owners/managers to be able to follow up on responses. The BA testing confirmed that without any accountability mechanism, the checklist becomes a checkbox exercise where people click "Done" to look good.

Where they diverge slightly: the BA reports recommend more structure (category grouping for IT items, separate onboarding flows per role, item-level drill-down on dashboard). Stefan wants less structure, fewer rules. **Stefan wins here** — we should solve problems with better content and smarter defaults, not more features.

---

## 2. PI 3 Scope Recommendation

### Guiding principle

Stefan said: "this should be a quite simple checklist with few/necessary rules — leading to easy usage." Every PI 3 deliverable must pass this filter: does it make the checklist simpler and more useful, or does it add complexity?

### Iteration 1: "Make the checklist usable" (Foundation fixes)

**Theme:** Fix the things that make the current experience broken or misleading. No new features — just make what exists work properly.

**Deliverables:**

| # | Item | Rationale |
|---|------|-----------|
| 1.1 | **Add expandable guidance to workspace checklist items** | Critical gap. Port the "Why it matters" + action steps from anonymous checklist to workspace checklist. Click-to-expand so the clean list layout is preserved. Stefan specifically asked for this: "a short click-to-open guide/few bullet points." |
| 1.2 | **Fix landing page time claim** | Stefan's #2 issue. Change "Fix the biggest cyber risks in 30 minutes" to discovery/assessment framing ("Find your biggest cyber risks in 30 minutes" or similar). Update body text to match. |
| 1.3 | **Remove "No fear." from subtitle** | Stefan's #1 issue. Direct request. |
| 1.4 | **Fix display names everywhere** | Dashboard shows UUIDs/emails instead of display names. Settings shows UUID for IT executor. BA confirmed across all 3 company tests. Undermines trust in the tool. |
| 1.5 | **Fix dashboard response count** | Shows 108 (36 x 3 members) when correct total is 58 (items vary by role). Owners will notice this never reaches 100%. |
| 1.6 | **Add back/navigation buttons** | Stefan's #6 issue. Add contextual "Back to..." links at bottom of workspace pages. |
| 1.7 | **Fix "Get started" panel for owner-as-IT** | Step 1 says "Invite your IT lead" when owner selected "I do." Should auto-complete or show contextual text. |
| 1.8 | **Add time estimates to workspace checklist** | Present in anonymous checklist, missing in workspace. Helps users plan. |

**Acceptance criteria:**
- Every workspace checklist item has an expandable section with "Why it matters" text and numbered action steps
- Landing page H1 no longer claims "Fix" in 30 minutes; "No fear." removed
- All dashboard member names show display_name or email, never UUID
- Dashboard total response count correctly reflects role-filtered item counts
- Bottom-of-page navigation on all workspace pages
- "Get started" Step 1 is contextually correct for owner-as-IT scenario

**Why first:** Nothing else matters if users cannot understand what they are looking at. These are not enhancements — they are fixes to broken UX that Stefan and all three BA tests flagged.

---

### Iteration 2: "Make responses meaningful" (Checklist experience)

**Theme:** Address the fundamental "what does Done mean?" problem. Make the checklist experience appropriate for each item type without adding complexity.

**Deliverables:**

| # | Item | Rationale |
|---|------|-----------|
| 2.1 | **Reframe awareness items** | For awareness/knowledge items (the 4 "Spot a..." items, "Think before opening files," "Know what to do if...," "Know the one rule"), change the response framing. Instead of Done/Unsure/Skipped, use "I understand this" / "Not sure" / "Skip for now." The action remains the same (a response is recorded), but the language matches what the user is actually affirming. Keep Done/Unsure/Skipped for action items where "Done" is meaningful (password manager, MFA, lock screen). |
| 2.2 | **Add employee welcome/context** | When an employee first opens their checklist, show a brief intro: who asked them to do this (org name), how many items (11), estimated time (15 minutes), and what their responses mean. Dismissible, shown once. |
| 2.3 | **Explain sign-up journey on login page** | Stefan's #8 issue. Add a brief "How it works: 1. Enter email, 2. Set up your org, 3. Invite your team" preview on the sign-up/login page. |
| 2.4 | **Clarify assessment page UX** | Stefan's #4 issue. After starting an assessment, the Assessments page is confusing ("Assessment already in progress" with only "Mark complete"). Add explanatory text: "Your assessment is active. Go to My Checklist to work through items." with a direct link. |
| 2.5 | **Add IT executor contact to relevant items** | For awareness items that reference "know who to call" or "who to report to," auto-populate the IT executor's name/email if assigned. BA testing identified this as a quick win across all roles. |
| 2.6 | **Fix stale auth token on public checklist** | BA Company 1 found that expired auth tokens cause /checklist to redirect to /login instead of showing the public read-only view. Public pages must handle stale tokens gracefully. |

**Acceptance criteria:**
- Awareness-type items use "I understand this" / "Not sure" / "Skip for now" labels
- Action-type items retain Done / Unsure / Skipped labels
- Employee first-visit shows a welcome message with org name, item count, and time estimate
- Login page shows a 3-step preview of the sign-up journey
- Assessment page links to checklist when an assessment is active
- Items referencing IT contact auto-show IT executor name/email when available
- /checklist works for users with expired auth tokens in localStorage

**Why second:** Iteration 1 fixes what is broken. Iteration 2 makes the experience appropriate. The awareness reframing is the single most impactful UX change we can make — it directly addresses Stefan's core concern and the BA's "fundamental question." But it requires the guidance text from Iteration 1 to be in place first, because users need to understand items before they can meaningfully respond.

---

### Iteration 3: "Owner visibility and accountability" (Dashboard + follow-up)

**Theme:** Give the owner what they need to act on results. Light accountability that discourages checkbox-ticking without adding bureaucratic process.

**Deliverables:**

| # | Item | Rationale |
|---|------|-----------|
| 3.1 | **Item-level drill-down on dashboard** | Owner clicks a team member on the dashboard and sees their per-item responses (Done/Unsure/Skipped). No new page needed — expand in-place. BA Company 2 identified this as the top owner gap: "the owner cannot see which items each person answered." |
| 3.2 | **"Unsure" follow-up prompt for owner** | On the dashboard, highlight items where multiple team members marked "Unsure" or "Not sure." Show a subtle prompt: "3 team members are unsure about MFA — consider scheduling a quick walkthrough." This is Stefan's accountability model: not proof uploads, but visibility that motivates follow-up. |
| 3.3 | **Mention reminder emails in org setup** | Stefan's #9 issue. During onboarding and on settings page, mention that reminder emails will be sent. |
| 3.4 | **Category grouping for IT Baseline items** | The IT executor sees 25 items in a flat list. Restore the topic-based grouping (Passwords & Accounts, Email Security, Updates, Backups, etc.). BA Company 2 flagged this as the IT person's top blocker. This does not add rules or logic — it is a display-only change using existing category data. |
| 3.5 | **Public privacy/GDPR page** | BA Company 1 flagged: no public privacy policy page accessible from landing/checklist pages. Required for an EU-targeted security product. Add a /privacy page and link from footer. Stefan mentioned GDPR footer link. |
| 3.6 | **Onboarding: collect display name** | Currently display names are only collected during invite acceptance. The org creator (owner) never gets asked for their name, resulting in UUID display on dashboard. Add a name field to onboarding. |

**Acceptance criteria:**
- Dashboard team progress section allows expanding a member to see per-item responses
- Items with 2+ "Unsure"/"Not sure" responses are visually highlighted with a follow-up suggestion
- Onboarding mentions reminder emails; settings page shows reminder info
- IT Baseline items display in topic-based groups (not a flat list)
- /privacy page exists and is linked from the footer on all public pages
- Onboarding form includes a display name field

**Why third:** These features enhance the owner's ability to act on data and close the accountability loop Stefan wants. They depend on Iteration 1 (guidance) and Iteration 2 (meaningful responses) being in place — there is no point drilling down into item-level responses if those responses are not yet meaningful.

---

## 3. What to Defer (NOT PI 3)

| Item | Rationale for deferral |
|------|----------------------|
| **AI/LLM inline guidance** | Stefan mentioned this as a future direction. It is a significant technical addition (API costs, scoping, UX design). The expandable guidance text in Iteration 1 solves 80% of the problem without AI. Revisit in PI 4 after the basic guidance is validated. |
| **Email phishing campaigns** | Stefan's long-term vision for verifying awareness items. This is the paid tier feature. It requires email infrastructure, campaign management UI, response tracking, and scoring logic. It is a multi-PI effort. PI 3 lays groundwork by making awareness items clearly labeled as "self-reported" (implying future verification). |
| **i18n (Danish + English)** | Stefan explicitly said "not to be clarified or started now." |
| **Visual beautification** | Stefan noted the app looks "dull — black/white" but categorized this as a future topic. The current design is clean and functional. Polish after the experience is right. |
| **SEO** | No users yet. Optimize for search after the product is validated. |
| **Payment functionality** | No paid features exist yet. Build the paid feature (email campaigns) first, then add payment. |
| **Anonymous benchmarking stats** | Requires a user base that does not exist yet. |
| **DEV/PREPROD/PROD environments** | Stefan said "not at all needed now without any users." |
| **Mobile navigation (hamburger menu)** | BA flagged this. It is a nice-to-have but the app is primarily used on desktop. Defer to PI 4. |
| **Cross-tab sync** | Edge case. Not worth the effort now. |
| **Branded magic link emails** | BA flagged that emails come from "Supabase Auth." Important for trust, but requires Supabase custom SMTP setup. Medium effort, low urgency with no real users yet. Consider for PI 4. |
| **Item-level notes/comments** | BA Company 2 suggested an IT person should be able to add notes ("I need DNS access for this"). Useful but adds complexity Stefan wants to avoid. Defer. |

---

## 4. Risk Assessment

### Technical risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Workspace guidance text requires syncing anonymous checklist content with assessment_items data model | Medium | The anonymous checklist items (lib/checklist/items.ts) already have whyItMatters and steps. The workspace checklist items (assessment_items from DB) also have why_it_matters and steps fields. The data exists — it just is not being displayed. Low technical risk. |
| Response label changes (Done vs "I understand this") may require DB schema changes | Low | The response values stored are done/unsure/skipped. The label change is purely UI — we do not need to change the stored values, just the display text per item type. |
| Dashboard response count fix requires understanding role-item assignment logic | Medium | Need to calculate expected responses per member based on their track visibility (IT executor sees 36, others see 11). Must match the same filtering logic in the checklist page. |

### Product risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stefan may want AI guidance sooner than PI 4 | Medium | Could disrupt PI 3 scope | Deliver Iteration 1 guidance text quickly. If Stefan pushes for AI, it could be added as a "?" button that opens a chat — but scope it tightly. |
| Awareness item reframing may not go far enough — users may still treat it as a checkbox exercise | Medium | Reduces product value | The combination of better labels + owner drill-down + "unsure" highlighting creates a feedback loop. If it is still insufficient, email campaigns (PI 4+) are the real solution. |
| No real users yet — all design decisions are based on proxy testing | High | Could be building the wrong thing | This is acceptable. Stefan is the proxy user and decision maker. Ship fast, get real users, iterate. |

### Dependencies

- **Iteration 2 depends on Iteration 1**: Awareness item reframing makes no sense without guidance text.
- **Iteration 3 depends on Iteration 2**: Dashboard drill-down is only useful if responses are meaningful.
- **No external dependencies**: All PI 3 work is frontend + existing Supabase DB. No new services, no paid APIs, no new infrastructure.

---

## 5. Success Metrics

### Qualitative (primary — no real user base yet)

| Metric | Target |
|--------|--------|
| Stefan walkthrough of PI 3 output | Zero "I don't know what to do" feedback on workspace checklist |
| BA re-test across all 3 company setups | All roles can complete their checklist "meaningfully" (BA verdict upgrades from "Partially" to "Yes" for owner and employee) |
| "Does the checklist make sense for each user type?" | Yes for all three: owner, IT executor, employee |

### Quantitative (secondary — measurable in app)

| Metric | Target |
|--------|--------|
| Workspace checklist completion rate (all items answered) | > 60% of users who start, finish (vs current unknown baseline) |
| "Unsure" rate on awareness items | < 40% (indicates users understand what they are being asked) |
| Dashboard shows correct member names | 100% (no UUIDs visible anywhere) |
| Time from sign-up to first checklist response | < 5 minutes (indicates onboarding is clear) |

### Definition of PI 3 success

A new user — owner, IT executor, or employee — can sign up, understand what they need to do, work through their checklist with adequate guidance, and produce responses that their owner can review and act on. The tool moves from "self-assessment checkbox" to "guided security improvement with accountability."

---

## Summary: The PI 3 story in one sentence

**PI 3 makes the workspace checklist as useful as the anonymous checklist, makes responses meaningful for each item type, and gives owners visibility into what their team actually did.**

Three iterations. No new infrastructure. No AI. No paid features. Just making the existing product work the way a real user expects it to.
