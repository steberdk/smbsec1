# PI 10 -- Platform Expansion: Product Team Consensus

**Date:** 2026-03-19
**Theme:** Platform Expansion (final PI in current roadmap)
**Product Team:** PM, UX Designer, Security Expert, Business Analyst, Architect

---

## 1. Live App Walkthrough Findings

The Product Team browsed the production app at https://smbsec1.vercel.app/ on 2026-03-19 and documented the following current state.

### Landing Page -- Solid
- Hero section with clear value proposition ("Find your biggest cyber risks in 30 minutes")
- 5 breach scenario cards (phishing, stolen passwords, unpatched software, ransomware, CEO fraud)
- Trust signals section (EU data, no tracking, free, open checklist, delete anytime, magic link)
- Clear CTAs (Sign up free, Browse checklist, Log in)
- Footer with privacy policy link

### Checklist -- Complete (17 items, 7 groups)
- Passwords & Accounts (4), Email Security (3), Updates & Patching (2), Backups & Recovery (2), Least Privilege (2), Human Security (2), Network Basics (2)
- Each item has "Why & how" expandable section with platform-specific steps
- Done / Not sure / Skip / Reset buttons per item
- Progress bar at top
- Summary link at top and bottom

### Workspace (authenticated)
- Navigation: Home, Checklist, Dashboard, Team, Assessments, Campaigns, Billing, Settings
- Dashboard with per-track progress, member stats, campaign summary, cadence indicator
- Campaign infrastructure: 14 templates (7 EN, 7 DA), 4-step create wizard, scheduling, re-run, custom templates
- Team management with invite flow
- Settings: email platform, IT executor, locale, GDPR controls
- Billing page (waitlist mode, Stripe not configured)

### Campaign System (mature)
- 4 phishing templates + 3 knowledge test templates (x2 for Danish)
- Click/report tracking with educational landing pages
- Team performance table, response time metrics
- Custom template builder with HTML editor
- Campaign credits (1 free, paid bypasses)
- Auto-complete via cron (72h)

### What's Missing / Gaps Found
1. **No compliance/security report** -- no way to download or share org security posture
2. **All UI is English-only** -- campaign templates have Danish, but the app interface (nav, buttons, labels, pages) is English only
3. **No i18n foundation** -- no translation system at all for UI strings
4. **No privacy policy page content** -- `/privacy` route exists but content is minimal/placeholder
5. **2 pre-existing E2E test failures** -- awareness.spec.ts and checklist.spec.ts have timing issues

---

## 2. Product Team Discussion Record

### Round 1: Scope Assessment -- What Provides Most Value NOW?

**PM:** This is the final PI. We need to focus on what makes the product ready for real Danish customers. Looking at the backlog, the "PI 10+" items (AI campaign content, API access, SMS phishing) are all research/future items. What actually matters NOW?

**Security Expert:** A compliance/security report is the single highest-value feature remaining. When an SMB talks to their cyber insurance provider or gets asked "what are you doing about security?", they need a document to share. Right now, all the assessment data lives in the dashboard but can't be exported or shared with external parties. This is the #1 gap for real-world use.

**UX Designer:** I agree. The report should be a clean, printable HTML page (styled for print/PDF) that shows: org name, assessment date, completion stats, per-category results, campaign results if any, and recommended next steps. It should look professional enough to hand to an insurer or auditor. No actual PDF generation library needed -- `window.print()` with print-specific CSS is enough.

**Business Analyst:** Looking at what Stefan's market needs: Danish SMBs talk to insurance brokers, auditors, and sometimes Erhvervsstyrelsen (Danish Business Authority). A security posture report is concrete evidence they can show. This maps directly to the backlog item "Compliance reporting (cyber insurance, ISO 27001, SOC 2 evidence)."

**Architect:** Technically straightforward. A new page at `/workspace/report` that fetches dashboard + campaign data and renders a print-optimized summary. No new tables needed. API already exposes all the data we need via `/api/dashboard` and `/api/campaigns/summary`.

### Round 2: i18n -- How Deep Should We Go?

**PM:** Stefan's market is Denmark. The campaign templates already have Danish versions, but the entire UI is English. Should we build a full i18n system?

**UX Designer:** A full i18n framework (next-intl, react-intl) is too heavy for the final PI. But we can do something pragmatic: a simple translation dictionary approach for the most important user-facing strings. The workspace pages are where Danish users spend their time.

**Architect:** I propose a lightweight approach: a `lib/i18n/` module with a `t(key)` function and a locale context. We store translations in JSON files (`en.json`, `da.json`). The locale comes from `orgs.locale` (already exists). We don't need URL-based locale routing -- the org setting drives it.

**Security Expert:** For the security report specifically, Danish is critical. An insurance broker in Denmark won't accept an English security report. The report page should be fully translatable.

**Business Analyst:** Pragmatic scope: translate the security report, workspace nav, dashboard labels, and key action buttons. We don't need to translate the public landing page or checklist (those are intentionally in English for broader reach).

**PM:** Agreed. The report page MUST be in Danish when the org locale is 'da'. The workspace nav and key labels should also switch. The public pages stay English.

### Round 3: Campaign Polish and Final Items

**PM:** The BA verification from PI 9 found no issues, but there are 2 pre-existing E2E test failures. Should we fix those?

**Business Analyst:** The failures are timing-related (page load timeouts against live Supabase). They're infrastructure issues, not bugs. We should increase timeouts rather than fix app code. Low effort, worth doing.

**Security Expert:** One more thing: the privacy policy page at `/privacy` needs real content. For a security product targeting EU SMBs, not having a proper privacy policy is a credibility gap.

**UX Designer:** I'd also add: the report page should include a "generated by smbsec" footer with the date, making it clear this is a point-in-time snapshot. And we should consider adding a "Security Report" nav item for admins.

**Architect:** Let me also note: the `window.print()` approach means the user can save as PDF from their browser's print dialog. No server-side PDF generation, no new dependencies. Clean and simple.

---

## 3. Agreed PI 10 Scope

### Iteration 1: Security Posture Report
- New page: `/workspace/report` (org_admin only)
- Fetches assessment data + campaign summary
- Sections: Org info, Assessment overview, Per-category results (done/unsure/skipped), Campaign results summary, Recommended actions for unsure/skipped items
- Print-optimized CSS (clean layout, no nav, proper margins)
- `window.print()` button ("Download as PDF" label since browsers offer PDF from print)
- "Security Report" nav item for org_admin
- Report date and "Generated by smbsec" footer

### Iteration 2: i18n Foundation + Danish Report
- `lib/i18n/` module with `t(key, locale)` function
- Translation files: `lib/i18n/da.json` and `lib/i18n/en.json`
- Org locale context via WorkspaceProvider (already available via `orgData.org.locale`)
- Security report fully translated to Danish
- Workspace nav labels translated
- Dashboard key labels translated (progress, status, etc.)
- Settings page labels translated

### Iteration 3: Privacy Policy + Polish + E2E Fixes
- Privacy policy page with real content (data processing, Supabase/EU hosting, retention, rights)
- Fix pre-existing E2E test timeout issues
- Mobile responsiveness check on report page
- Final E2E tests for report page

---

## 4. Out of Scope (Deferred)

- AI-generated campaign content (requires LLM API integration, paid service)
- SMS phishing campaigns (requires Twilio, research only)
- API access for MSPs (future architecture decision)
- Full public page i18n (landing page, checklist stay English)
- URL-based locale routing (org setting is sufficient)
- Stripe integration (stays as waitlist mode)

---

## 5. Technical Plan

### No New DB Tables Required
- Report page reads from existing APIs: `/api/dashboard` + `/api/campaigns/summary`
- i18n translations stored as static JSON files in the codebase
- Privacy policy is a static page

### New Routes
| Route | Type | Auth |
|---|---|---|
| `/workspace/report` | Page | org_admin |
| `/privacy` | Page | Public (already exists, needs content) |

### New Files
| File | Purpose |
|---|---|
| `frontend/app/workspace/report/page.tsx` | Security posture report page |
| `frontend/lib/i18n/en.json` | English translations |
| `frontend/lib/i18n/da.json` | Danish translations |
| `frontend/lib/i18n/index.ts` | Translation helper (`t` function, `useTranslation` hook) |
| `frontend/app/privacy/page.tsx` | Privacy policy (update existing) |

### Risk Assessment
- **Low risk**: All features are read-only or static content
- **No new DB migrations**: Everything built on existing schema
- **No external service dependencies**: No paid APIs needed
- **Print CSS**: Standard approach, well-supported across browsers

---

## 6. Acceptance Criteria

### AC-REPORT-01: Security report page shows assessment data
- Given: org_admin with completed assessment
- When: navigating to /workspace/report
- Then: page shows org name, assessment date, per-category completion stats

### AC-REPORT-02: Report includes campaign results
- Given: org with completed campaigns
- When: viewing report
- Then: campaign pass rate and summary stats are shown

### AC-REPORT-03: Report is printable as PDF
- Given: report page loaded
- When: clicking "Download as PDF" button
- Then: browser print dialog opens with clean, print-optimized layout

### AC-I18N-01: Danish report for Danish orgs
- Given: org with locale='da'
- When: viewing report page
- Then: all labels, headings, and text are in Danish

### AC-I18N-02: Workspace nav respects locale
- Given: org with locale='da'
- When: viewing any workspace page
- Then: navigation labels are in Danish

### AC-PRIVACY-01: Privacy policy has real content
- Given: any visitor
- When: navigating to /privacy
- Then: page shows data processing info, hosting details, GDPR rights, contact info
