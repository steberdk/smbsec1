# PI 7 — Email/Phone Fraud Campaigns: Product Team Consensus

**Date:** 2026-03-19
**Feature:** Simulated phishing/fraud campaigns to verify employee security awareness
**Product Team:** PM, UX Designer, Security Expert, Business Analyst, Architect

---

## 1. Live App Walkthrough Findings

The Product Team browsed the production app at https://smbsec1.vercel.app/ on 2026-03-19 and documented the following current state relevant to campaign design.

### Current Structure
- **Landing page** — highlights the 5 attack types SMBs face: phishing email, stolen/reused password, unpatched software, ransomware, fake invoice/CEO fraud. Campaigns will test exactly these scenarios.
- **Public checklist** — 17 items across 7 groups (Passwords & Accounts, Email Security, Updates & Patching, Backups & Recovery, Least Privilege, Human Security, Network Basics). Each item has "Why & how" expandable guidance with steps.
- **Workspace checklist** — 36 items across 2 tracks:
  - **IT Baseline** (25 items) — technical controls assigned to IT executor. Actions: Done / Unsure / Skipped.
  - **Security Awareness** (11 items) — behavioural/recognition skills assigned to all employees. Actions: "I've done this" / "Not yet" / "Not applicable".
- **Dashboard** — org-wide progress, per-track progress bars (IT Baseline vs Awareness), team member breakdown with individual response counts.
- **Team page** — invite flow with email + role + IT executor checkbox.
- **Assessments page** — one active assessment at a time, "Mark complete" button.
- **Settings** — org email platform, IT executor assignment, GDPR data export/delete.

### Awareness Track Items Directly Relevant to Campaigns
These 4 items are self-reported today. Campaigns would **verify** them:

| Item ID | Title | Campaign Type |
|---|---|---|
| `aware-spot-phishing-email` | Spot a phishing email | Phishing email campaign |
| `aware-fake-login-page` | Recognise a fake login page | Credential harvest campaign |
| `aware-voice-scam` | Spot a phone or voice scam | Vishing campaign (future) |
| `aware-fake-invoice` | Spot a fake invoice or supplier email | BEC/invoice fraud campaign |

### Key Observations
1. The awareness items currently use self-attestation ("I've done this"). This is the weakest form of verification — Stefan's exact frustration.
2. The `email-phish-reporting` checklist item ("Add an easy 'Report Phishing' method") is in the IT Baseline track. This is the **prerequisite** for campaigns — the org needs a reporting method before simulated phishing tests make sense.
3. The assessment model (assessment_items + assessment_responses) is per-user and immutable. Campaign results need to integrate with this model.
4. The domain model already has `PhishingCampaign` and `PhishingResult` entities defined (docs/30_domain-model.md).
5. Resend is already integrated for invite emails (100/day free tier).
6. The team page already captures employee emails — campaign targeting is trivially available.

---

## 2. Product Team Discussion Record

### Round 1: Problem Definition & Integration Model

**PM:** Stefan's core insight is right — self-reported awareness is weak. The value proposition is clear: "Don't just say you can spot phishing — prove it." The first question: does a campaign replace the awareness item, or supplement it?

**Security Expert:** It must supplement, not replace. The awareness checklist items teach recognition (read the guidance, understand the signs). The campaign tests whether that knowledge transfers to actual behaviour. These are different things. A user could read all the guidance and still click a phishing link under time pressure. The checklist item status should remain self-reported, but we add a new "verified" badge when campaign results confirm it.

**UX Designer:** I agree with supplementing. From a UX perspective, the checklist should show two layers: (1) the self-report status ("I've done this"), and (2) a verification badge ("Verified by campaign — you correctly reported the phishing email on March 15"). The dashboard should distinguish between self-reported completion and verified completion.

**Business Analyst:** The metric we care about is "verification rate" — what percentage of employees who said "I've done this" actually pass the campaign test? This is the killer metric for the paid tier value proposition. If 80% of employees who clicked "I've done this" fail the actual phishing test, that's a powerful story for why campaigns matter.

**Architect:** Integration approach: campaigns sit alongside assessments, not inside them. An assessment is a point-in-time snapshot of the org's security posture (checklist completion). A campaign is an ongoing activity. I propose:
- New tables: `campaigns`, `campaign_emails`, `campaign_results`
- A campaign references checklist item IDs (e.g., `aware-spot-phishing-email`)
- Campaign results generate a `verification_status` on the assessment response (new column)
- The dashboard reads both `assessment_responses` and `campaign_results` to show a combined view

### Round 2: Campaign Flow & Email Infrastructure

**UX Designer:** The admin flow should be dead simple. Stefan said "simplicity" — not an enterprise phishing platform. I propose:

1. **Admin creates campaign:** Pick a template (e.g., "Fake invoice"), choose recipients (all employees / specific people), set timing window (e.g., "send sometime this week").
2. **System sends emails:** Random time within the window. Email looks realistic but is clearly from SMBsec infrastructure.
3. **Employee receives email:** Three possible actions:
   - **Click the suspicious link** = FAIL (lands on an educational page: "This was a test. Here's what you missed...")
   - **Report via the Report Phishing button/process** = PASS
   - **Ignore/delete** = NEUTRAL (neither good nor bad — but tracked)
4. **Results appear on dashboard:** Per-employee pass/fail/neutral, aggregate stats.

**Security Expert:** Critical anti-abuse requirements:
- **Opt-in only:** The org admin explicitly enables campaigns and selects recipients. No one receives a simulated phishing email they didn't opt into (through their org admin).
- **Clear branding on landing pages:** When someone clicks a campaign link, the landing page immediately identifies it as a simulation. No actual credential harvesting, no data collection.
- **Email headers:** Include `X-SMBsec-Campaign: true` header and proper DKIM/SPF so email admins can identify these as legitimate.
- **Rate limiting:** Maximum 1 campaign per org per week. No more than 3 emails per employee per month.
- **Unsubscribe:** Employees can opt out of future campaigns (visible to admin, but the employee's choice).

**Architect:** Email infrastructure plan:
- **Resend** for sending (already integrated, 100/day free tier). For paid tier, upgrade to 10,000/month ($20/month Resend plan).
- **Tracking:** Each email contains a unique token in the link URL. When clicked, we know which campaign + which user.
- **Endpoint:** `GET /api/campaigns/[id]/track?token=xxx&action=click` — records the click, redirects to educational page.
- **Report tracking:** More complex. Two approaches:
  - *Option A:* Employee forwards the email to a dedicated SMBsec reporting address (e.g., `report@smbsec.com`). We check inbound email for the campaign token. Requires inbound email processing (Resend webhook or separate service).
  - *Option B:* The campaign email includes a "Report this email" button/link that goes to `GET /api/campaigns/[id]/track?token=xxx&action=report`. Simpler but less realistic.
  - *Recommendation:* Start with Option B (MVP). It's less realistic but orders of magnitude simpler. Add Option A in a future PI.

**PM:** I strongly support Option B for MVP. The "Report this email" button in the simulated email itself is actually good UX — it teaches employees that reporting should be easy. Later we can integrate with actual email client report buttons (Google Workspace "Report phishing" / Outlook "Report Message").

**Business Analyst:** Timing consideration: random delivery within a window is important for realism, but adds infrastructure complexity. For MVP, can we simplify to "admin clicks send, emails go out within the next 1-4 hours with random jitter"? We use a simple `setTimeout` or scheduled task approach. No need for a full job queue in PI 7.

### Round 3: Templates, Scoring & Payment Model

**Security Expert:** Campaign templates for MVP (4 types, matching the awareness items):

1. **Phishing email** — generic "Your account has been suspended, click here to verify" (maps to `aware-spot-phishing-email`)
2. **Fake login page** — "Sign in to view your document" with a link to a branded-looking login page that's actually a simulation landing page (maps to `aware-fake-login-page`)
3. **Fake invoice** — "Invoice #12345 overdue — updated bank details attached" (maps to `aware-fake-invoice`)
4. **CEO/authority fraud** — "Urgent request from [OrgAdmin name] — need you to process this payment" (maps to `aware-fake-invoice` too, or a new campaign-specific item)

Templates should use the org name and admin name for realism. Each template has:
- Subject line
- Email body (HTML)
- Landing page content (shown after click — educational)
- Associated checklist item ID

**UX Designer:** Scoring model proposal:
- **Pass:** Reported the email (clicked "Report this email" link) = green badge
- **Fail:** Clicked the suspicious link = red badge, shown educational page
- **Neutral:** No action within 72 hours = grey badge, no penalty
- **Org score:** % of employees who passed (reported) out of those who acted (passed + failed). Neutral is excluded from the denominator.

Dashboard changes:
- New "Campaigns" tab in workspace nav (alongside Checklist, Dashboard, Team, Assessments)
- Campaign list: active/completed campaigns with aggregate pass rate
- Per-campaign detail: employee-by-employee results
- Awareness items on checklist get a "Verified" or "Not verified" badge based on latest campaign result

**Business Analyst:** Payment model:
- **Free tier:** Everything current + 1 free campaign (lifetime). This lets admins see the value before paying.
- **Paid tier (Campaigns):** Unlimited campaigns. Price point: EUR 10-20/month per org (not per user — SMBs hate per-user pricing). This covers Resend costs (10k emails/month plan = ~$20/month, our cost).
- **Gate:** After the first free campaign completes, the "Create campaign" button shows a paywall. The results of the free campaign remain visible forever — this is the hook.
- **No gate on anything existing:** Checklist, assessments, team, dashboard all remain free forever. Only campaigns are paid.

**PM:** I like the "1 free campaign" model. It's the classic product-led-growth motion: let them see results, then gate more. The key metric is conversion rate from free campaign to paid.

**Architect:** Payment infrastructure: Stripe Checkout (free to integrate, pay-as-you-go). Store `orgs.subscription_status` (free | active | cancelled) and `orgs.campaign_credits` (integer, starts at 1 for free). Each campaign creation decrements credits. Paid tier = unlimited credits (set to 9999 or null check).

Stripe is straightforward — one-time Checkout Session creation, webhook to update org status. No recurring billing complexity needed for MVP (can be monthly or one-time "campaign pack" purchase).

**Security Expert:** One more critical point: **GDPR implications**. Campaign emails contain tracking links. We need:
- Clear disclosure in the org settings that campaigns include email tracking
- The org admin (data controller) is responsible for informing their employees
- We (data processor) store only: email sent, link clicked/reported, timestamp
- No IP tracking, no device fingerprinting, no geolocation
- Data retention: campaign results deleted when org is deleted (already our model)
- Privacy policy update to cover campaign data processing

### Round 4: Implementation Phasing

**PM:** This is too big for one PI. I propose three PIs:

**PI 7 (3 iterations):** Minimum Viable Campaign
- Campaign CRUD (create, list, view results)
- 2 email templates (phishing email + fake invoice)
- Send via Resend with random jitter (1-4 hours)
- Click tracking + report tracking (in-email button)
- Educational landing page after click
- Campaign results page
- Awareness item verification badges
- 1 free campaign gate

**PI 8:** Campaign Polish & Payment
- 2 more templates (fake login page + CEO fraud)
- Stripe payment integration
- Campaign scheduling (set a future date range)
- Repeat campaigns (quarterly re-test)
- Email template customisation (admin can edit subject/body)
- Dashboard integration (campaign results on main dashboard)

**PI 9:** Advanced Campaigns
- Inbound email report detection (Option A from Round 2)
- Phone/vishing campaigns (AI voice calls — research phase)
- Campaign analytics over time (trend charts)
- Multi-language support for templates
- API for external integrations

**Architect:** Agreed on phasing. For PI 7, the database schema is:

```sql
-- campaigns table
CREATE TABLE public.campaigns (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  template_id   text        NOT NULL,  -- e.g. 'phishing-account-suspended', 'bec-fake-invoice'
  status        text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'active', 'completed')),
  created_by    uuid        NOT NULL,  -- user_id of org_admin who created it
  send_after    timestamptz,           -- earliest send time
  send_before   timestamptz,           -- latest send time (random within window)
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- campaign_recipients: who gets the email
CREATE TABLE public.campaign_recipients (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL,
  email         text        NOT NULL,
  token         text        NOT NULL UNIQUE,  -- unique tracking token per recipient
  sent_at       timestamptz,
  result        text        CHECK (result IN ('pending', 'clicked', 'reported', 'ignored')),
  result_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- link campaigns to checklist items they verify
CREATE TABLE public.campaign_templates (
  id              text      PRIMARY KEY,
  title           text      NOT NULL,
  description     text,
  subject_line    text      NOT NULL,
  body_html       text      NOT NULL,
  landing_html    text      NOT NULL,  -- shown after click (educational)
  checklist_item_id text,              -- which awareness item this verifies
  active          boolean   NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**UX Designer:** The key UX flows for PI 7:

1. **Create campaign page** (`/workspace/campaigns/new`):
   - Select template (card with preview)
   - Select recipients (all employees / pick specific ones)
   - Set timing: "Send now" or "Send within next [1-7] days"
   - Confirm and launch

2. **Campaign list page** (`/workspace/campaigns`):
   - List of campaigns with status badge (sending / active / completed)
   - Aggregate pass rate per campaign

3. **Campaign detail page** (`/workspace/campaigns/[id]`):
   - Per-recipient results table: name, status (pending/clicked/reported/ignored), timestamp
   - Aggregate stats: X% reported, Y% clicked, Z% no action

4. **Educational landing page** (`/campaign/[token]`):
   - Public page (no auth required — the employee clicked a link from their email)
   - Shows: "This was a simulated phishing test from [Org Name]"
   - Shows: what red flags they should have noticed
   - Shows: link to report phishing instead
   - Records the click result

5. **Report endpoint** (`/campaign/[token]/report`):
   - Public page (no auth required)
   - Shows: "Well done! You correctly identified this as suspicious."
   - Records the report result

---

## 3. Campaign Architecture Design

### Integration with Existing Model

```
Existing:                           New:

checklist_items                     campaign_templates
  (master list)                       (email templates)
       |                                   |
assessment_items                    campaigns
  (snapshot per assessment)           (per-org campaign instance)
       |                                   |
assessment_responses                campaign_recipients
  (per-user: done/unsure/skip)        (per-user: clicked/reported/ignored)
       |                                   |
       +--- verification_status <----------+
             (new field on assessment_responses,
              set by campaign results)
```

### Key Design Decisions

1. **Campaigns are separate from assessments.** An assessment is a point-in-time checklist completion snapshot. A campaign is an ongoing testing activity. They reference the same checklist items but are stored separately.

2. **Verification badge flows from campaign to checklist.** When a campaign completes and an employee passed (reported the email), the corresponding awareness item in the current assessment gets a `verification_status = 'verified'` update. This is the "email-verified" status Stefan described.

3. **Campaign templates are seeded in the database**, not hardcoded. New templates are added via SQL migrations, same as checklist items.

4. **One campaign at a time per org** (same constraint as assessments). Prevents confusion and email fatigue.

5. **72-hour window.** A campaign moves from `active` to `completed` 72 hours after the last email is sent. Any recipient who hasn't acted is marked `ignored`.

### Anti-Abuse Measures

- Campaigns can only be created by `org_admin` role
- Recipients must be members of the org (verified via `org_members` table)
- Maximum 1 active campaign at a time
- Maximum 3 campaigns per org per month
- All campaign emails include `X-SMBsec-Simulation: true` header
- Landing pages clearly identify as simulations immediately
- No actual credentials are collected — ever
- Employee opt-out flag stored in `org_members.campaign_opt_out`

### Email Sending Strategy

- Use Resend (already integrated)
- Each recipient gets a unique token embedded in links
- Random jitter: emails sent at random intervals within the admin-specified window
- Implementation: API route `/api/campaigns/[id]/send` processes recipients in a loop with random delays (or a simple queue via Vercel cron)
- Free tier limitation: 100 emails/day. For an org with 10 employees, one campaign = 10 emails. Free tier supports ~10 campaigns/day across all orgs.

### The Report Phishing Button

For MVP, the simulated phishing email includes a small "Report this email" link at the bottom (styled to look like an email client's report button). This link goes to `/campaign/[token]/report`.

The link must be:
- Visually subtle (not obvious it's part of the test)
- Present in the email body (not just headers)
- Functionally simple (one click = report recorded)

Future improvement (PI 9): integrate with actual email client Report Phishing buttons (Google Workspace API, Microsoft Graph API) to detect when users use the native report function.

---

## 4. PI 7 Scope — 3 Iterations

### PI 7 Iteration 1: Campaign Foundation

**Theme:** Database schema, campaign CRUD, email templates

**Items:**
1. **Migration: campaign tables** — `campaigns`, `campaign_recipients`, `campaign_templates` tables with RLS policies
2. **Seed 2 campaign templates** — "Account suspended" (phishing) and "Overdue invoice" (BEC fraud)
3. **API: campaign CRUD** — `POST /api/campaigns` (create), `GET /api/campaigns` (list), `GET /api/campaigns/[id]` (detail)
4. **UI: campaigns nav item** — Add "Campaigns" to workspace nav (visible to org_admin only)
5. **UI: campaign list page** — `/workspace/campaigns` showing campaigns with status
6. **UI: create campaign page** — `/workspace/campaigns/new` with template selection, recipient selection, timing
7. **Permission enforcement** — Only org_admin can create/view campaigns. RLS + API checks.
8. **Campaign credits field** — Add `campaign_credits` (default 1) to `orgs` table

**E2E tests:** Campaign creation happy path, permission check (employee cannot create campaign)

### PI 7 Iteration 2: Email Sending & Tracking

**Theme:** Send campaign emails, track clicks and reports

**Items:**
1. **API: send campaign** — `POST /api/campaigns/[id]/send` — sends emails via Resend with unique tokens, random jitter within window
2. **Email templates** — HTML email templates for the 2 campaign types (responsive, realistic-looking)
3. **Public: click landing page** — `/campaign/[token]` — records click, shows educational content
4. **Public: report landing page** — `/campaign/[token]/report` — records report, shows success message
5. **API: campaign status updates** — Status transitions: draft -> sending -> active -> completed
6. **Campaign auto-complete** — Vercel cron job: mark campaigns completed 72 hours after last send, set unacted recipients to `ignored`
7. **UI: campaign detail page** — `/workspace/campaigns/[id]` — per-recipient results table, aggregate stats
8. **Anti-abuse: rate limits** — Maximum 1 active campaign, 3 per month per org

**E2E tests:** Email send mock, click tracking, report tracking, campaign completion

### PI 7 Iteration 3: Dashboard Integration & Free Campaign Gate

**Theme:** Connect campaign results to awareness checklist, implement free tier gate

**Items:**
1. **Verification badge on awareness items** — Checklist items show "Verified by campaign" or "Failed campaign test" based on latest result
2. **Dashboard campaign summary** — Campaign pass rate card on the main dashboard
3. **Campaign results on team progress** — Per-member campaign pass/fail visible in team progress section
4. **Free campaign gate** — After 1st campaign completes, "Create campaign" shows upgrade prompt
5. **Campaign opt-out** — Employee can opt out of future campaigns (stored in `org_members.campaign_opt_out`)
6. **Privacy disclosure** — Campaign tracking disclosure in org settings
7. **Assessment response verification_status** — New column on `assessment_responses` linking campaign results to checklist items
8. **Documentation** — Updated domain model, decisions, acceptance criteria

**E2E tests:** Verification badge display, free campaign gate, opt-out flow

---

## 5. PI 8+ Roadmap

### PI 8: Campaign Polish & Payment (planned)

1. **2 more templates:** Fake login page (credential harvest simulation), CEO/authority fraud
2. **Stripe payment integration:** Checkout session, webhook, org subscription status
3. **Campaign scheduling:** Set a future date range for sending
4. **Repeat campaigns:** "Re-run this campaign" with fresh tokens
5. **Template customisation:** Admin can edit subject line and body before sending
6. **Dashboard deep integration:** Campaign trend chart, comparison across assessments
7. **Email template preview:** Admin sees exactly what the email will look like before sending

### PI 9: Advanced Campaigns (future)

1. **Inbound email report detection:** Monitor a dedicated inbox for forwarded campaign emails (Resend inbound webhook or Mailgun)
2. **Phone/vishing campaigns (research):** AI voice call simulations — "This is your bank calling..." Research feasibility, GDPR, telephony APIs (Twilio)
3. **Campaign analytics over time:** Trend charts showing improvement across multiple campaigns
4. **Multi-language templates:** Danish, German, French, Dutch (key EU SMB markets)
5. **Custom campaign builder:** Admin creates their own scenario from scratch
6. **Integration with email client report buttons:** Google Workspace / Microsoft 365 API integration to detect native "Report phishing" clicks

### PI 10+: Platform Expansion (vision)

1. **AI-generated campaign content:** Use LLM to generate realistic phishing emails based on the org's industry and context
2. **SMS phishing (smishing) campaigns**
3. **Compliance reporting:** Generate reports for cyber insurance, ISO 27001, SOC 2 evidence
4. **API access:** Let MSPs (managed service providers) run campaigns for their clients
5. **Benchmarking:** Anonymous aggregate — "Your team performs better than 70% of similar-size companies"

---

## 6. Backlog Update Summary

### Moved to Done
- PI 1-6: all items previously in backlog marked done

### PI 7 Planned (3 iterations)
- Iteration 1: Campaign foundation (schema, CRUD, templates, nav)
- Iteration 2: Email sending & tracking (Resend, click/report tracking, cron)
- Iteration 3: Dashboard integration & free campaign gate

### Future PIs
- PI 8: Campaign polish & Stripe payment
- PI 9: Advanced campaigns (inbound reports, vishing research, analytics)
- PI 10+: Platform expansion (AI content, smishing, compliance, API)

### Deferred Items (carried forward)
- Evidence uploads
- Branch delete UI
- Audit logs
- Mobile responsiveness audit
- Account recovery UI
- SEO / Open Graph

---

## Appendix: Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Campaign vs Assessment model | Separate tables, linked by checklist_item_id | Campaigns are ongoing; assessments are point-in-time snapshots |
| Email sending | Resend (existing integration) | Already integrated, free tier sufficient for MVP, paid tier affordable |
| Click tracking | Unique token per recipient in URL | Simple, reliable, no JavaScript tracking needed |
| Report mechanism (MVP) | "Report this email" link in email body | Much simpler than inbound email parsing; teaches good behaviour |
| Report mechanism (future) | Inbound email webhook + native client integration | More realistic but requires email infrastructure |
| Payment | Stripe Checkout | Industry standard, no upfront cost, easy webhook integration |
| Pricing | Per-org, not per-user | SMBs hate per-seat pricing; aligns with existing free model |
| Anti-abuse | Rate limits + org_admin only + opt-out | Prevents misuse while keeping the tool useful |
| Random timing | Jitter within admin-specified window | Realistic without full job queue infrastructure |
| Campaign templates | Seeded in DB via SQL migrations | Same pattern as checklist items; consistent, versionable |
