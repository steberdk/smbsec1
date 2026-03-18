# PI 4 — Product Team Consensus

**Date:** 2026-03-18
**Participants:** Product Manager, UX Designer, Security Domain Expert, Business Analyst, Architect
**Process:** 3 rounds of cross-functional discussion, consensus reached

---

## Discussion Record

### Round 1: What is the biggest gap?

**Product Manager:** PI 3 fixed the usability foundation — guidance is visible, labels are meaningful, dashboard math is correct. But two large gaps remain: (1) the admin still cannot see individual item responses (item-level drill-down was scoped for PI 3 Iteration 3 but not delivered), and (2) there are zero downloadable materials for the three "content-creation" items (awareness session slides, security rules doc, incident response plan). Both Stefan and the BA flagged these as high-impact. Beyond those, the next value leap is either AI guidance or visual polish. Stefan mentioned both. I lean toward templates + drill-down first because they are concrete deliverables that close known gaps, then visual polish because first impressions matter when we start acquiring real users.

**UX Designer:** Agree on drill-down and templates. But I want to raise something bigger: the app still looks like a developer prototype. Stefan called it "dull — black/white." Every page is gray-on-white with no color, no illustrations, no visual hierarchy beyond font weight. When we start putting this in front of real SMB owners, first impression matters enormously. A security tool that looks unfinished undermines trust. I would prioritize a visual refresh — not a full redesign, but color palette, card styling, a logo/wordmark, and consistent component styling. This is not "beautification for vanity" — it is trust-building for a security product.

**Security Domain Expert:** The two biggest content gaps are: (1) templates for content-creation items (awareness session, security doc, incident plan) — without these, 3 of 36 items are effectively impossible for most SMB IT people; and (2) the mobile hamburger menu is missing, which matters because employees will often complete their awareness checklist on a phone. On the verification side, we deferred the "Ask about this" accountability feature from PI 3. That is the lightest-weight accountability mechanism Stefan asked for. I would not start AI integration yet — the static guidance text delivered in PI 3 handles 80% of the need, and AI adds cost, complexity, and scope risk.

**Business Analyst:** Looking at what was deferred from PI 3: item-level dashboard drill-down, downloadable templates, mobile hamburger menu, branded magic link emails, item-level notes/comments. Of these, drill-down and templates have the highest severity ratings from the original BA synthesis (ISS-23 was High, ISS-17 was High). I also note that the Team page still only shows pending invites, not current members (ISS-10, Medium). The current member list was an AC in PI 3 (AC-PI3-14) but was not delivered. For PI 4, I recommend: Iteration 1 = drill-down + templates + team members list (close the PI 3 deferred items); Iteration 2 = visual refresh + mobile nav; Iteration 3 = prepare for real users (SEO basics, branded emails, error states).

**Architect:** From a technical perspective, the codebase is clean. The biggest architectural gap is that the dashboard API is a monolith — one endpoint returns everything. For drill-down, we need either a new endpoint (`GET /api/dashboard/members/[userId]`) or to expand the existing response. I recommend a new endpoint to keep response sizes manageable. Templates are a content problem, not a code problem — we just need to host PDF/DOCX files and link them from checklist items (static assets or a storage bucket). The visual refresh is CSS/Tailwind work with no architectural impact. Mobile hamburger menu is a layout component change. None of these are architecturally risky. The biggest risk in PI 4 is scope creep into AI — that requires new infrastructure (API keys, rate limiting, streaming, prompt management) and should be a dedicated PI.

### Round 2: Convergence on theme and ordering

**Product Manager:** Clear pattern from Round 1: everyone agrees on drill-down + templates as highest priority. The visual refresh debate is interesting — UX says it is a trust-builder, Security says mobile nav is more important, BA wants to close PI 3 deferred items first. I propose the PI 4 theme as **"Ready for real users"** — everything we need before putting this in front of actual SMB owners who are not Stefan. That means: close the known gaps (drill-down, templates, team members list), make it look professional (visual refresh, mobile nav), and handle the basics of being a real product (branded emails, SEO meta tags, error pages). No AI, no paid features, no i18n.

**UX Designer:** "Ready for real users" is exactly right. I want to refine the visual refresh scope to be achievable in one iteration. Proposal: (1) introduce a primary brand color (teal/green — conveys security + action), (2) apply it to buttons, progress bars, and nav, (3) add subtle background texture or gradient to the landing page hero, (4) style the card components consistently (currently some have `rounded-xl`, some `rounded-lg`, inconsistent border colors), (5) add a simple SVG wordmark/logo in the nav bar. This is 2-3 days of work, not a redesign. For mobile: a hamburger menu with slide-out drawer for workspace nav. Both can fit in one iteration.

**Security Domain Expert:** I support "Ready for real users." One addition: the branded magic link emails are important for a security product. The current emails come from "Supabase Auth" — an IT-savvy employee might flag this as phishing, which is ironic for a security tool. We already have Resend integrated for invite emails. Configuring Resend as the custom SMTP sender for Supabase Auth emails is a configuration task, not a code task — but it requires DNS setup (SPF/DKIM for the sending domain). This should be in PI 4 scope. Also, the 404 page is still bare Next.js default — this was flagged in the QA sweep (BUG-02) and never fixed.

**Business Analyst:** Revised proposal based on Round 2 convergence:

- **Iteration 1 (Close the gaps):** Item-level drill-down on dashboard, downloadable templates for 3 content-creation items, current team members list on Team page
- **Iteration 2 (Look professional):** Visual refresh (brand color, consistent cards, wordmark), mobile hamburger menu, custom 404 page
- **Iteration 3 (Real-product basics):** Branded auth emails via Resend SMTP, SEO meta tags (per-page titles partially done, add og:tags), fix remaining QA sweep items (BUG-01 stale copy, UX-01 mobile hero CTA)

**Architect:** This scope is technically feasible across 3 iterations. Drill-down needs a new API endpoint + frontend expansion component — maybe 1-2 days. Templates are static file hosting — trivial. Team members list needs a small API change to return accepted members alongside pending invites. The visual refresh is pure CSS/Tailwind — no architectural impact. Mobile hamburger is a layout component. Branded emails require Supabase custom SMTP configuration + DNS records for the sending domain. One concern: we should verify that the Supabase free tier supports custom SMTP. If not, this item needs to move to after we have a custom domain email setup.

### Round 3: Final consensus and acceptance criteria

**Product Manager:** The team is aligned. Let me sharpen the deliverables and add what we are explicitly NOT doing.

**NOT doing in PI 4:**
- AI/LLM integration (separate PI, requires new infrastructure)
- Email phishing campaigns (paid tier, multi-PI effort)
- i18n (Stefan said "not now")
- Payment/billing functionality
- Anonymous benchmarking (no user base)
- Item-level notes/comments (adds complexity Stefan wants to avoid)
- DEV/PREPROD/PROD environments (no real users yet)

**UX Designer:** Agreed. One final addition to Iteration 1: the dashboard drill-down should include a visual indication of which items are "unsure" or unanswered — these are the items the owner needs to follow up on. Color-coding: green for done, amber for unsure/not yet, gray for skipped/not applicable, white for unanswered. This creates the accountability loop Stefan requested without adding an explicit "Ask about this" feature.

**Security Domain Expert:** For the templates, I recommend: (1) a Google Slides template for the awareness session (5 slides: why security matters, phishing examples, password hygiene, what to do if compromised, your IT contact), (2) a 1-page security policy template in Markdown rendered as downloadable PDF, (3) an incident response plan template with fill-in sections. All hosted as static assets in `/public/templates/`. Additionally, I want the offboarding checklist template and SaaS inventory spreadsheet template added — these were identified as needed items where users cannot meaningfully complete the checklist item without them. That makes 5 templates total.

**Business Analyst:** Final acceptance criteria confirmed by the full team (see Section 3 below). All test scenarios from the PI 3 BA synthesis that were not implemented (TS-08 team members, TS-10 drill-down) carry forward as PI 4 requirements.

**Architect:** Confirmed technical feasibility. No migrations needed for any PI 4 item — all work is frontend + static assets + configuration. The one exception is if we want to store template URLs in `checklist_items` (a new `template_url` column), but we can also hardcode links in the guidance text. I recommend hardcoding for now — simpler, no migration, and we only have 5 templates.

**All:** Consensus reached.

---

## 1. Current State Assessment

### What is working
- End-to-end flow: sign up, create org, invite team, start assessment, complete checklist, view dashboard
- Guidance text visible on workspace checklist items (chevron + "tap for guidance")
- Track-aware response labels (awareness items: "I've done this / Not yet / Not applicable")
- Dashboard math is correct (role-adjusted response counts)
- Display names shown everywhere (no more UUIDs)
- Employee welcome message, login journey explanation, assessment page explanation
- IT Baseline items grouped by topic
- Privacy page, footer links, reminder email mention
- 53 E2E tests, clean lint + build, Vercel deployment

### What is still missing
- **Item-level drill-down on dashboard** — owner cannot see which specific items each team member answered. This was the #1 deferred item from PI 3 and Stefan's core accountability request.
- **Downloadable templates** — 3-5 checklist items require users to create content (awareness session, security doc, incident plan, offboarding checklist, SaaS inventory) but provide no starter materials. Most users will skip these.
- **Current team members on Team page** — only pending invites shown, not accepted members.
- **Visual identity** — the app is functional but visually bare (black/white/gray, no brand color, no logo). First impressions matter for a security product asking for trust.
- **Mobile navigation** — workspace nav overflows on mobile with no hamburger menu.
- **Branded auth emails** — magic link emails come from "Supabase Auth" which looks like spam/phishing.
- **Custom error pages** — 404 is bare Next.js default, no branding.

### The biggest gap
**Item-level drill-down + accountability.** Stefan's core insight is that without visibility into individual responses, the checklist becomes a "stupid no-good checklist where people just press Done." The combination of drill-down (owner sees individual responses) + visual highlighting of "unsure" items creates a lightweight accountability loop. This is the feature that transforms the tool from a checkbox exercise into a security improvement program.

---

## 2. PI 4 Theme

**"Ready for Real Users"**

PI 1 built the foundation. PI 2 added activation and retention. PI 3 made the checklist usable and responses meaningful. PI 4 closes the remaining functional gaps, adds visual polish, and handles the basics of being a real product. After PI 4, the app should be ready for Stefan to put in front of actual SMB customers without caveats.

---

## 3. Prioritized Deliverables (3 Iterations)

### Iteration 1: Close the Gaps

**Theme:** Deliver the high-priority items deferred from PI 3 that directly impact product value.

**Features:**

| # | Feature | Details |
|---|---------|---------|
| 1.1 | **Item-level drill-down on dashboard** | Owner clicks a team member row to expand and see their individual item responses. Color-coded: green (done), amber (unsure/not yet), gray (skipped/not applicable), white (unanswered). Items where multiple members marked "unsure" get a subtle highlight: "3 team members are unsure about this item." No new page — expand in-place. |
| 1.2 | **Downloadable templates for content-creation items** | 5 templates hosted as static assets in `/public/templates/`: (1) Security awareness session slides (5 slides, PDF), (2) 1-page security rules doc template (PDF), (3) Incident response plan template (PDF), (4) Offboarding checklist template (PDF), (5) SaaS inventory spreadsheet (CSV or XLSX). Linked directly from the relevant checklist item's guidance steps. |
| 1.3 | **Current team members on Team page** | The Team page shows both accepted members (name, role, IT executor status) and pending invites. Uses existing `/api/team` data — just needs frontend rendering of accepted members. |

**Acceptance Criteria:**
- AC-PI4-01: Admin clicks a team member on the dashboard and sees per-item responses with color-coding (done=green, unsure=amber, skipped=gray, unanswered=white).
- AC-PI4-02: Items where 2+ members responded "unsure" or "not yet" are visually highlighted with a follow-up suggestion.
- AC-PI4-03: Each of the 5 content-creation checklist items has a "Download template" link in its guidance section that downloads a usable template file.
- AC-PI4-04: The Team page shows all current members (accepted) with display name/email, role, and IT executor badge, alongside the existing pending invites section.

**Why first:** These are the highest-severity deferred items from PI 3. Drill-down directly addresses Stefan's accountability concern. Templates make 5 currently-impossible checklist items completable. Team members list closes a known gap (AC-PI3-14).

---

### Iteration 2: Look Professional

**Theme:** Transform the visual appearance from "developer prototype" to "trustworthy security product."

**Features:**

| # | Feature | Details |
|---|---------|---------|
| 2.1 | **Visual refresh** | Introduce a brand color (teal-600/green-700 range — conveys security + action). Apply to: primary buttons, progress bars, nav active state, landing page hero accent. Consistent card styling across all pages (uniform border-radius, shadow, padding). Simple SVG wordmark in workspace nav bar. Subtle gradient or texture on landing page hero section. |
| 2.2 | **Mobile hamburger menu** | Workspace nav bar collapses to a hamburger icon on screens < 768px. Slide-out drawer with all nav items. Close on navigation or outside click. |
| 2.3 | **Custom 404 page** | Branded 404 page with nav links back to home/workspace. Matches the visual refresh styling. |
| 2.4 | **Fix mobile hero CTA layout** | Landing page hero buttons stack vertically on mobile instead of wrapping awkwardly (UX-01 from QA sweep). |

**Acceptance Criteria:**
- AC-PI4-05: Primary buttons across the app use a consistent brand color (not gray-900).
- AC-PI4-06: Progress bars use the brand color gradient.
- AC-PI4-07: The workspace nav bar shows a wordmark/logo.
- AC-PI4-08: Card components use consistent border-radius, padding, and shadow across all pages.
- AC-PI4-09: On mobile (< 768px), workspace nav collapses to a hamburger menu with slide-out drawer.
- AC-PI4-10: Navigating to a non-existent URL shows a branded 404 page with navigation links.
- AC-PI4-11: Landing page hero buttons stack cleanly on mobile without wrapping issues.

**Why second:** Visual polish comes after functional completeness. The drill-down and templates (Iteration 1) add product value; the visual refresh adds perceived value and trust. Both are needed before real users, but function comes first.

---

### Iteration 3: Real-Product Basics

**Theme:** Handle the details that distinguish a real product from a prototype — email branding, SEO, and remaining polish.

**Features:**

| # | Feature | Details |
|---|---------|---------|
| 3.1 | **Branded auth emails via Resend** | Configure Supabase custom SMTP to route auth emails (magic links, confirmations) through Resend. Emails come from a product domain (e.g., auth@smbsec.app or noreply@smbsec1.vercel.app) instead of "Supabase Auth." Requires DNS records (SPF/DKIM) for the sending domain. If Supabase free tier does not support custom SMTP, defer to post-domain-purchase. |
| 3.2 | **SEO meta tags** | Per-page `<title>` tags (partially done), Open Graph tags (og:title, og:description, og:image) on landing page and public checklist. Basic robots.txt and sitemap.xml. No content marketing — just the technical foundation. |
| 3.3 | **Clean up remaining QA items** | BUG-01: Remove stale localStorage copy references from landing page. Fix any remaining copy inconsistencies. |
| 3.4 | **Improve error states** | Auth callback timeout: show a user-friendly error with "Try again" button instead of silent redirect. Loading states: replace bare "Loading..." text with subtle skeleton UI on workspace pages. |

**Acceptance Criteria:**
- AC-PI4-12: Magic link emails show a product-branded sender name and domain (not "Supabase Auth"), OR this is documented as blocked by Supabase free tier limitations with a clear path to resolution.
- AC-PI4-13: Landing page has og:title, og:description, og:image meta tags. Public /checklist has a unique og:title.
- AC-PI4-14: robots.txt exists and allows crawling of public pages. sitemap.xml lists public routes.
- AC-PI4-15: No references to localStorage sync exist on any public page.
- AC-PI4-16: Auth callback shows a "Something went wrong — try again" message instead of silently redirecting on timeout.
- AC-PI4-17: Workspace pages show skeleton loading states instead of bare "Loading..." text.

**Why third:** These items are important for a real product but have lower impact than functional features (Iteration 1) and visual trust (Iteration 2). They are the "last mile" polish before inviting real users.

---

## 4. Updated Backlog (Not in PI 4 Scope)

Ordered by priority:

| Priority | Item | Rationale |
|----------|------|-----------|
| 1 | **AI/LLM inline guidance** | Stefan's explicit request. Requires API infrastructure, rate limiting, prompt engineering, cost management. Dedicated PI. |
| 2 | **Email phishing campaigns (paid tier)** | Stefan's long-term monetization vision. Multi-PI effort: email infrastructure, campaign management, result tracking, scoring. Requires custom domain + sending reputation first. |
| 3 | **i18n (Danish + English)** | Stefan said "not now." Extract strings to constants files as prep work. Full i18n in a later PI. |
| 4 | **Item-level notes/comments** | IT executor communicating blockers to admin. Useful but adds complexity. Consider when real user feedback confirms the need. |
| 5 | **"Ask about this" accountability feature** | Admin sends notification to employee requesting verification of a response. Lightweight, but drill-down + visual highlighting may be sufficient. |
| 6 | **Scenario-based verification gates** | 2-3 quiz questions before "Done" unlocks on awareness items. Improves quality of self-assessment. Medium complexity. |
| 7 | **Monthly pulse check-in** | Quick login prompt: "New staff? New apps? Incidents?" Triggers relevant checklist items. No backend needed. |
| 8 | **AI phone "scam calls"** | Far future. Depends on email campaigns being in place. |
| 9 | **Anonymous benchmarking stats** | Requires user base. No value without data. |
| 10 | **DEV/PREPROD/PROD environments** | Not needed until real user scale. |
| 11 | **Payment/billing functionality** | No paid features exist yet. Build paid features first, then payment. |

---

## 5. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Supabase free tier does not support custom SMTP** | Medium | Iteration 3.1 blocked | Investigate early. If blocked, defer branded emails to post-custom-domain. Document the limitation clearly. |
| **Visual refresh scope creep** | Medium | Iteration 2 takes too long | Define the exact color palette, card style, and components before starting. No redesign — only consistent application of a brand color + standardized components. |
| **Templates require content expertise** | Low | Templates are low quality | Use established security frameworks (CIS Controls v8, Cyber Essentials) as the source. Keep templates simple — fill-in-the-blank, not comprehensive. |
| **Stefan wants AI sooner** | Medium | Disrupts PI 4 scope | The PI 3 guidance text + templates handle 80% of the "help me do this" need. AI is a PI 5 feature. Present the reasoning: foundation must be solid before adding AI complexity. |
| **No real users to validate against** | High | Building wrong features | Stefan is the proxy user. Ship fast, get real users in PI 5. PI 4's "Ready for real users" theme directly addresses this by removing barriers to first real adoption. |

**Dependencies:**
- Iteration 2 depends on Iteration 1 (drill-down informs dashboard visual treatment)
- Iteration 3 branded emails depends on DNS access for sending domain
- No external service dependencies beyond existing Supabase + Resend + Vercel (all free tier)
- No database migrations required for any PI 4 item

---

## 6. Success Metrics

### Qualitative (primary — no real user base yet)

| Metric | Target |
|--------|--------|
| Stefan walkthrough of PI 4 output | "This looks like a real product I can show to customers" |
| Admin drill-down usability | Owner can identify which items their IT person is stuck on within 30 seconds |
| Template usefulness | An IT person with no security background can complete the awareness session item using only the provided template |
| Visual impression | A first-time visitor does not describe the app as "bare" or "prototype-looking" |

### Quantitative (measurable in app)

| Metric | Target |
|--------|--------|
| Content-creation item completion rate | > 30% (up from ~0% without templates) |
| Mobile usability | All workspace pages navigable on 390px screen without horizontal scroll |
| Page load / error rate | Zero bare "Loading..." states visible; zero silent auth redirects |
| SEO readiness | og:tags present on all public pages; sitemap.xml valid |

### Definition of PI 4 success

The app is visually professional, functionally complete for the core assessment workflow (including admin visibility into individual responses), and free of the rough edges that would cause a real SMB owner to lose trust. Stefan can demo the product to a customer without explaining away visual or functional shortcomings.

---

## Summary

**PI 4 in one sentence:** Close the remaining functional gaps (drill-down, templates, team list), add visual polish (brand identity, mobile nav), and handle real-product basics (branded emails, SEO, error states) so the app is ready for its first real users.

Three iterations. No new infrastructure. No AI. No paid features. Just making the product look and feel as professional as its content already is.
