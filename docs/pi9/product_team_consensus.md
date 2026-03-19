# PI 9 -- Email Knowledge Testing, Analytics, Multi-Language, Custom Builder: Product Team Consensus

**Date:** 2026-03-19
**Feature:** Email-based knowledge testing, campaign analytics, multi-language templates, custom campaign builder
**Product Team:** PM, UX Designer, Security Expert, Business Analyst, Architect

---

## 1. Live App Walkthrough Findings

The Product Team browsed the production app at https://smbsec1.vercel.app/ on 2026-03-19 and documented the following current state.

### Campaign Infrastructure (PI 7 + PI 8 -- shipped)
- **4 campaign templates** seeded in DB: phishing_email (easy), fake_invoice (medium), credential_harvest (hard), ceo_fraud (hard)
- **4-step create wizard**: Template > Preview > Recipients > Review (with scheduling + custom subject)
- **Campaign lifecycle**: draft > pending/scheduled > sending > active > completed (72h auto-complete via cron)
- **Public click/report pages**: `/campaign/[token]` and `/campaign/[token]/report`
- **Billing page**: Waitlist form (Stripe not yet configured)
- **Campaign credits**: 1 free, paid orgs bypass
- **Re-run campaigns**: Duplicate completed campaigns
- **Timeline view**: Chronological event list on campaign detail page
- **Dashboard integration**: Campaign summary card + trend chart

### Checklist Items (17 total, 7 groups)
- Passwords & Accounts (4): password manager, MFA email, separate admin accounts, remove shared accounts
- Email Security (3): anti-phishing filters, disable macros, report phishing method
- Updates & Patching (2): auto OS updates, update routers/firewalls/VPNs
- Backups & Recovery (2): 3-2-1 backups, test restoring
- Least Privilege (2): remove local admin, offboarding checklist
- Human Security (2): 30-min awareness session, security basics doc
- Network Basics (2): change default router passwords, separate guest WiFi

### Current Template-to-Checklist Mapping
| Template | Type | Checklist Item |
|---|---|---|
| phish-account-suspended | phishing_email | aware-spot-phishing-email |
| bec-overdue-invoice | fake_invoice | aware-fake-invoice |
| cred-shared-document | credential_harvest | aware-fake-login-page |
| ceo-urgent-payment | ceo_fraud | aware-fake-invoice |

**Note:** These all map to awareness-track items. The checklist items.ts does NOT contain `aware-*` IDs -- those are seeded in the DB as assessment items. The existing templates test social engineering awareness.

### Key Observations for PI 9
1. **No knowledge-testing templates exist yet** -- all 4 templates are social engineering simulations (phishing/fraud). Stefan wants tests for other checklist items like "Think before opening files from USB/downloads."
2. **Campaign infrastructure is mature** -- template system, sending, tracking, reporting all work. Adding new template types is low effort.
3. **No multi-language support** -- all templates and UI are English-only. Danish is Stefan's primary market.
4. **No custom builder** -- admins can only customise subject line. No ability to create their own scenario.
5. **Campaign analytics are basic** -- pass rate per campaign + trend chart. No deeper analytics (response time, improvement tracking, per-user history).

---

## 2. Product Team Discussion Record

### Round 1: Email-Based Knowledge Testing (Stefan's Top Priority)

**PM:** Stefan specifically asked for email-based knowledge testing beyond phishing simulations. The idea: after the initial assessment, send emails with small tests for checklist items that make sense. Not every checklist item lends itself to email testing, but several do. This is the top priority for PI 9.

**Security Expert:** Let me identify which checklist items can be meaningfully tested via email:

1. **"Use a password manager"** (acct-password-manager) -- Test: send an email saying "Please use this shared password document: [link]" to see if they click on a shared plaintext password list. Educational moment: "You should use a password manager, not shared documents."

2. **"Turn on MFA for email accounts"** (acct-enable-mfa-email) -- Test: send an email saying "Your MFA has been disabled for maintenance, click here to re-enable" with a fake admin portal link. Tests if they verify through official channels.

3. **"Disable Office macros"** (email-disable-macros) -- Test: send a document with a "Please enable macros to view this invoice" instruction. Educational moment: "Never enable macros in documents from unknown sources."

4. **"Report phishing method"** (email-phish-reporting) -- Already tested implicitly by all campaigns (report link). But we could add a specific "did you report this?" follow-up.

5. **"Update routers/firewalls"** (patch-update-key-systems) -- Test: send fake "Critical security update notification" with a link to download a "firmware update." Tests if they verify through official vendor channels.

Not all make sense as email tests. Items like "Set up 3-2-1 backups" or "Separate guest WiFi" are configuration tasks, not behavioural ones. I recommend we focus on 3-4 new knowledge test templates.

**UX Designer:** The key UX difference between a knowledge test and a phishing sim: knowledge tests need a clear **educational landing page** that's tailored to the specific topic, not just the generic "this was a simulation" page. When someone clicks a "shared password document" link, the landing page should explain *why password managers matter* and link to the relevant checklist item.

**Architect:** I propose a new template type: `knowledge_test`. This extends the existing `campaign_templates.type` CHECK constraint. The infrastructure is identical -- same sending, tracking, and reporting. The difference is:
1. Different `type` in the template
2. The click landing page (`/campaign/[token]`) should show topic-specific educational content based on the template
3. The template maps to a non-awareness checklist item via `checklist_item_id`

The click page currently shows generic phishing education. We need to make it template-aware.

**Business Analyst:** These knowledge tests are part of the **paid tier** per Stefan. So they should require active subscription or use campaign credits. The existing credit system handles this already -- no new billing logic needed.

### Round 2: Campaign Analytics Over Time

**PM:** Stefan wants trend charts and improvement tracking across campaigns. We already have basic trend data (pass rate per completed campaign). What's missing?

**UX Designer:** Three analytics improvements:
1. **Per-user response history** -- Track how individual employees perform across multiple campaigns. Show improvement or regression.
2. **Response time analysis** -- How quickly did people click vs report? First hour is critical.
3. **Category breakdown** -- Pass rates by template type (phishing, invoice fraud, knowledge tests).

For MVP I recommend: per-user history table on the campaigns page showing all campaigns a user has been part of and their action in each.

**Architect:** Per-user history is a read-only query across `campaign_recipients` grouped by user. No new tables needed. The API endpoint can aggregate this data. For the response time analysis, we already store `sent_at` and `acted_at` -- we just need to compute the delta.

**Security Expert:** The most valuable metric for SMBs is the **improvement trend**. "Last month 40% of your team clicked phishing links. This month only 20%." Simple, motivating. The trend chart exists but could be enhanced with labels and comparison.

### Round 3: Multi-Language Templates & Custom Builder

**PM:** Danish is Stefan's primary market. We need at least Danish versions of all templates. How do we approach multi-language?

**Architect:** Two options:
- **Option A:** Duplicate templates with a `locale` column. Each language is a separate template row. Simple but doubles the template count.
- **Option B:** Store translations in a jsonb column within the template. More compact but more complex rendering.

I recommend **Option A** -- separate rows with a `locale` column. It's cleaner for the template selection UI (filter by locale) and easier to maintain. We add `locale TEXT NOT NULL DEFAULT 'en'` to `campaign_templates` and seed Danish versions.

**UX Designer:** For the template selection UI: add a language filter dropdown above the template list. Default to the org's language setting (which we should add to org settings). The preview should show the selected language version.

**PM:** For the custom campaign builder -- this is the biggest item. Admin should be able to:
1. Choose a base template or start from scratch
2. Edit subject, body text, sender name
3. Set difficulty and map to a checklist item
4. Preview before sending

**Architect:** For MVP custom builder: a form with subject, body (textarea with basic HTML support), sender name, difficulty, and checklist item mapping. Store as a new template row with `custom = true` and `org_id` set (org-specific templates). The existing template selection UI shows both system templates and custom org templates.

**Security Expert:** Custom templates are powerful but risky. An admin could create offensive content. We should add a `custom` boolean flag but no content moderation for now -- SMB admins are responsible for their own campaigns. This matches the self-service model.

### Round 4: Scope Finalisation

**PM:** Let me consolidate PI 9 into 3 iterations:

**Iteration 1: Knowledge Test Templates & Enhanced Landing Pages**
- 3 new knowledge test templates (password sharing, fake MFA reset, macro-enabled document)
- Extend `campaign_templates.type` CHECK to include `knowledge_test`
- Template-aware educational landing page (shows topic-specific content based on template)
- New checklist item mappings for knowledge tests
- E2E tests

**Iteration 2: Campaign Analytics & Multi-Language**
- Per-user campaign history API + UI (table on campaigns page)
- Response time analytics (time-to-click/report metrics on campaign detail)
- Enhanced trend chart with labels and category breakdown
- Add `locale` column to campaign_templates
- Seed Danish translations for all 7 templates (4 existing + 3 new)
- Org language setting + template filter by locale
- E2E tests

**Iteration 3: Custom Campaign Builder & Polish**
- Custom template creation UI (/workspace/campaigns/templates/new)
- Custom template API (CRUD, org-scoped)
- Template management page (list system + custom templates)
- Preview for custom templates
- Documentation updates
- E2E tests

---

## 3. Agreed Scope

### PI 9 Iteration 1: Knowledge Test Templates & Enhanced Landing Pages

**Items:**
1. **3 new knowledge test templates** -- seeded via SQL migration 017:
   - `knowledge-password-sharing`: "Shared Password Document" -- tests if user clicks on a shared plaintext password link. Maps to `acct-password-manager`.
   - `knowledge-mfa-reset`: "MFA Maintenance Notice" -- fake MFA disabled notification. Maps to `acct-enable-mfa-email`.
   - `knowledge-macro-document`: "Enable Macros Required" -- document with macro enable prompt. Maps to `email-disable-macros`.
2. **Extend campaign_templates.type CHECK** -- add `knowledge_test` type
3. **Template-aware click landing page** -- `/campaign/[token]` shows different educational content based on template type and specific template. Each knowledge test has its own educational message explaining the correct behaviour.
4. **Migration 017** -- ALTER type CHECK, INSERT 3 templates
5. **E2E tests** -- Knowledge test template appears in list, landing page shows correct content

### PI 9 Iteration 2: Campaign Analytics & Multi-Language

**Items:**
1. **Per-user campaign history** -- `GET /api/campaigns/user-history` returns all campaigns each user participated in with their action. UI: table on campaigns page showing employee performance across campaigns.
2. **Response time metrics** -- Campaign detail page shows average time-to-click and time-to-report. Computed from `sent_at` and `acted_at` timestamps.
3. **Enhanced trend chart** -- Add campaign names/dates as labels, colour-code by template type, show improvement percentage.
4. **Multi-language: `locale` column** -- Migration 018: `ALTER TABLE campaign_templates ADD COLUMN locale TEXT NOT NULL DEFAULT 'en'`
5. **Danish template translations** -- 7 Danish templates (4 existing phishing + 3 knowledge tests)
6. **Org language setting** -- Add `locale` to `orgs` table (default 'en'). Setting on org settings page.
7. **Template filter by locale** -- Template selection in create wizard filters by org locale with fallback to English.
8. **E2E tests** -- User history renders, Danish templates appear with locale filter

### PI 9 Iteration 3: Custom Campaign Builder & Polish

**Items:**
1. **Custom template CRUD API** -- `POST/GET/DELETE /api/campaigns/templates/custom`. Org-scoped, admin only. Templates stored in same `campaign_templates` table with `org_id` set and `custom = true`.
2. **Custom template creation UI** -- `/workspace/campaigns/templates/new` with form: subject, body (textarea), sender name, difficulty, checklist item mapping, template name.
3. **Template management page** -- `/workspace/campaigns/templates` lists system and custom templates. Delete button for custom ones.
4. **Preview for custom templates** -- Same preview component used in create wizard.
5. **Migration 019** -- `ALTER TABLE campaign_templates ADD COLUMN org_id UUID`, `ADD COLUMN custom BOOLEAN DEFAULT false`
6. **Documentation updates** -- DECISIONS.md, backlog.md
7. **E2E tests** -- Create custom template, use it in campaign

---

## 4. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Knowledge test template type | New `knowledge_test` value in type CHECK | Clean separation from phishing simulations |
| Educational landing page | Template-aware content on `/campaign/[token]` | Each knowledge test needs topic-specific education |
| Multi-language approach | Separate template rows with `locale` column | Simpler than jsonb translations, cleaner UI filtering |
| Org language | `locale` column on `orgs` table | Drives default template language selection |
| Custom templates | Same table with `org_id` + `custom` flag | Reuses all existing infrastructure |
| Knowledge tests billing | Uses existing campaign credit system | No new billing logic needed, paid tier per Stefan |
| Per-user history | Query across `campaign_recipients` | No new tables, just aggregation |

---

## 5. Deferred Items

- Email client report button integration (Google Workspace / M365 API) -- needs API research, PI 10+
- Inbound email report detection (webhook-based) -- PI 10+
- Phone/vishing campaigns -- PI 10+
- AI-generated campaign content -- PI 10+
- Content moderation for custom templates -- trust SMB admins for now
