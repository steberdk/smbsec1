# PI 8 -- Campaign Polish, Payment Gate & Audit: Product Team Consensus

**Date:** 2026-03-19
**Feature:** Campaign templates, Stripe payment gate, scheduling, template customisation, org deletion audit log
**Product Team:** PM, UX Designer, Security Expert, Business Analyst, Architect

---

## 1. Live App Walkthrough Findings

The Product Team browsed the production app at https://smbsec1.vercel.app/ on 2026-03-19 and documented the following current state.

### Campaign Feature (PI 7 -- shipped)
- **Campaigns list page** (`/workspace/campaigns`) -- shows campaigns with status badges, pass rate, credit info. "Create campaign" button disabled when credits = 0 or active campaign exists.
- **Create campaign wizard** (`/workspace/campaigns/new`) -- 3-step flow: template selection, recipient selection, review & send. Two templates available: "Account Suspended Notice" (phishing_email, easy) and "Overdue Invoice Payment Request" (fake_invoice, medium).
- **Campaign detail page** (`/workspace/campaigns/[id]`) -- stats grid (Recipients, Sent, Clicked, Reported), pass rate progress bar, per-recipient results table. Auto-refresh every 15 seconds for active campaigns.
- **Public click page** (`/campaign/[token]`) -- educational content after clicking phishing link. Shows "This Was a Simulated Phishing Test" with 4 tips.
- **Public report page** (`/campaign/[token]/report`) -- success message for employees who reported the email.
- **Campaign auto-complete** (`/api/campaigns/complete`) -- cron job marks campaigns completed after 72h, updates verification_status on assessment_responses.
- **Dashboard integration** -- campaign summary card appears when campaigns exist.

### PI 7 BA Issues Still Open
1. **Issue #1 (Medium):** "You've used your free campaign" shown when no campaigns exist but credits = 0. Contradictory messaging.
2. **Issue #2 (Low):** No client-side credit check on `/workspace/campaigns/new` -- user can walk through wizard before server rejection.

### Campaign Templates in DB
- `phish-account-suspended` -- phishing_email type, easy difficulty, maps to `aware-spot-phishing-email`
- `bec-overdue-invoice` -- fake_invoice type, medium difficulty, maps to `aware-fake-invoice`

### DB Schema Supports (from migration 013)
- `campaign_templates.type` CHECK allows: `phishing_email`, `fake_invoice`, `credential_harvest`, `ceo_fraud`
- All campaign infrastructure (RLS, tokens, tracking) is in place

### Org Deletion
- `DELETE /api/gdpr/org` -- hard deletes org with CASCADE. No audit trail currently. Stefan specifically requested an audit log for deletion events.

### Stefan's New Inputs for PI 8
a) **Org deletion audit log** -- log email + timestamp when org is deleted (GDPR compliance for complaint handling)
b) **Email-based knowledge testing** -- broader than phishing; test any checklist item via email (paid tier, future)
c) **Anonymous benchmarking** -- move to deferred (not active backlog)
d) **GitGuardian security incident** -- DB password leaked in committed scripts. Scripts removed, .gitignore updated. Password rotation needed.

---

## 2. Product Team Discussion Record

### Round 1: Scope Prioritisation & Stefan's Inputs

**PM:** We have the PI 7 roadmap items plus Stefan's new inputs. Let me prioritise. The two new campaign templates (credential harvest, CEO fraud) are the highest value -- they complete the template set that maps to the 4 awareness checklist items. Stripe payment is critical for monetisation but depends on Stefan providing a Stripe key. The org deletion audit log is small but important for GDPR compliance.

**Security Expert:** The audit log is non-negotiable. GDPR Article 17 gives users the right to erasure, but Article 5(2) requires the controller to demonstrate compliance. We need a record that the deletion was user-initiated. The log must be stored *outside* the deleted org's data -- a separate table that survives the CASCADE delete. Fields needed: org_id (UUID, kept for reference), org_name, deleted_by_email, deleted_at timestamp, and a reason field (always "user_requested" for now).

**Architect:** I agree. A new `audit_logs` table in the `smbsec1` schema, not referenced by `orgs` foreign key (so it survives CASCADE). Minimal: `id, event_type, org_id, org_name, actor_email, details_json, created_at`. RLS: only service-role can insert (via API route), nobody can read via RLS (admin-only via service-role query). This table is append-only.

**UX Designer:** For the payment gate -- Stefan said to build the UI but defer actual Stripe integration until he provides the key. So we build a "payment required" screen with pricing, but the "Pay now" button either shows "Coming soon" or goes to a placeholder. This is actually better UX -- we can iterate on the pricing page design without worrying about Stripe webhook complexity.

**Business Analyst:** Regarding email-based knowledge testing (Stefan's input b) -- this is a significant expansion. It extends campaigns beyond phishing to *any* checklist item. For example, "Think before opening USB files" could have an email test where we send a file and see if they open it. This is PI 9+ scope. For PI 8, we should add a note in the template model that `checklist_item_id` can reference any item, not just awareness items. But actual implementation is future.

**PM:** And anonymous benchmarking moves to deferred per Stefan. Good -- one less thing. GitGuardian incident is an ops task, not a code task. We note it in decisions but implementation is password rotation in Supabase dashboard.

### Round 2: Template Design & Customisation

**Security Expert:** The two new templates:

1. **Credential harvest** (`credential_harvest` type, hard difficulty): "Your shared document is ready for review" -- mimics Google Docs/SharePoint sharing. Link goes to a fake login page that is actually our educational landing page. Maps to `aware-fake-login-page`. Hard difficulty because the email looks very legitimate.

2. **CEO/authority fraud** (`ceo_fraud` type, hard difficulty): "Urgent: Need you to process this today" -- impersonates the org admin. Uses the actual org admin's name and org name for realism. Maps to `aware-fake-invoice` (same awareness item as invoice fraud, since both test recognition of authority-based social engineering). Hard difficulty.

**UX Designer:** Template customisation UX. Admin should be able to:
- Preview the email template before sending (rendered HTML, not raw)
- Edit the subject line (keep default as placeholder)
- Edit the email body (simple textarea with the HTML, or better: a few editable fields like "sender name", "company name", not full HTML editing)

I recommend **field-based customisation**, not full HTML editing. The admin sees:
- Subject line (editable text input, default from template)
- Sender display name (editable, default from template)
- Key content fields specific to each template (e.g., invoice amount, document title)
- Preview button that renders the final email

This is safer (can't break HTML) and simpler for SMB admins.

**Architect:** For customisation, I propose storing overrides in the `campaigns` table as a new `customisation` jsonb column. When sending, merge the template's default values with any overrides. The template body_html contains `{{SENDER_NAME}}`, `{{AMOUNT}}`, etc. as placeholders. The customisation JSON provides override values. If not provided, use template defaults.

**PM:** Template preview is simpler -- it's just rendering the HTML template with placeholders filled in. We can add a "Preview" step between template selection and recipient selection in the wizard. That's a good addition to the create flow.

### Round 3: Payment Gate, Scheduling & Implementation Plan

**Business Analyst:** Payment gate design for the "no Stripe key" scenario:
- After first free campaign, "Create campaign" button shows upgrade CTA
- Upgrade page shows: pricing (EUR 15/month per org), feature list, "Get started" button
- "Get started" button: if Stripe key configured, redirect to Stripe Checkout. If not, show "Paid plans launching soon -- enter your email to be notified" with an email capture field.
- This lets us ship the gate UI, test the messaging, and activate Stripe later with just an env var.

**Architect:** For Stripe integration (when key is available):
- New env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- API routes: `POST /api/billing/checkout` (create Stripe Checkout session), `POST /api/billing/webhook` (handle Stripe events)
- New columns on `orgs`: `subscription_status` (free | active | cancelled), `stripe_customer_id`, `stripe_subscription_id`
- Webhook handles: `checkout.session.completed` (set active, grant unlimited credits), `customer.subscription.deleted` (set cancelled, reset credits to 0)
- For now, without the key, we build the API routes but they return 501 "Not configured" and the UI shows the waitlist form.

**PM:** Campaign scheduling is straightforward. Add `scheduled_for` to the campaign creation flow. The campaign is created with status `scheduled` instead of `draft`. A cron job (or the existing complete cron extended) picks up scheduled campaigns when their time arrives and transitions them to `sending`. For MVP, just a date picker -- "Send on [date]" rather than complex time windows.

**UX Designer:** Repeat campaigns: "Re-run this campaign" button on completed campaign detail pages. Creates a new campaign with the same template and recipients (minus opted-out users). Fresh tokens generated. This is essentially a "duplicate" function with automatic recipient refresh.

**Security Expert:** One addition for PI 8: the **campaign results history view**. Completed campaigns should show a timeline of results -- when emails were sent, when clicks/reports happened. This helps admins understand the response pattern (did most people click within the first hour? Or did reports come in after an initial wave of clicks?). Simple: sort the recipient list by acted_at timestamp and add a small timeline visualisation.

**PM:** Let me consolidate. PI 8 scope, 3 iterations:

**Iteration 1: Templates & Audit**
- 2 new campaign templates (credential harvest, CEO fraud)
- Org deletion audit log table + API integration
- Fix PI 7 BA issues (#1 credit messaging, #2 client-side credit check)
- Email template preview in create wizard

**Iteration 2: Payment Gate & Customisation**
- Payment gate UI (pricing page, upgrade CTA, waitlist form)
- Stripe API routes (checkout + webhook) -- functional when key present, graceful fallback when not
- Template customisation (editable subject, sender name, key fields)
- `campaigns.customisation` jsonb column
- Billing-related org columns (subscription_status, stripe IDs)

**Iteration 3: Scheduling, Repeat & Polish**
- Campaign scheduling (scheduled_for date, scheduled status, cron pickup)
- Repeat campaign ("re-run" button on completed campaigns)
- Campaign results timeline on detail page
- Dashboard deep integration (campaign trend chart showing pass rates over time)
- Updated docs (decisions, domain model, backlog)

---

## 3. Agreed Scope

### PI 8 Iteration 1: Templates & Audit

**Items:**
1. **2 new campaign templates** -- Credential harvest ("Your shared document is ready") and CEO/authority fraud ("Urgent request from [Admin Name]"), seeded via SQL migration 014
2. **Org deletion audit log** -- New `audit_logs` table (survives org CASCADE delete), log entry created before org deletion in `DELETE /api/gdpr/org`
3. **Fix PI 7 Issue #1** -- Credit messaging: show "1 free campaign" when credits > 0 and no campaigns exist; only show "used your free campaign" when campaigns.length > 0 and credits = 0
4. **Fix PI 7 Issue #2** -- Client-side credit check on `/workspace/campaigns/new` (already done in PI 7 fix -- verify)
5. **Email template preview** -- New step in create wizard: after template selection, show rendered preview of the email HTML with sample data
6. **E2E tests** -- Template preview, audit log (mock)

### PI 8 Iteration 2: Payment Gate & Customisation

**Items:**
1. **Payment gate UI** -- `/workspace/billing` page with pricing, feature comparison, upgrade CTA
2. **Stripe checkout API** -- `POST /api/billing/checkout` (creates Stripe Checkout session or returns 501 if no key)
3. **Stripe webhook API** -- `POST /api/billing/webhook` (handles checkout.session.completed, subscription events)
4. **Org billing columns** -- Migration 015: `subscription_status`, `stripe_customer_id`, `stripe_subscription_id` on `orgs`
5. **Template customisation** -- `campaigns.customisation` jsonb column; editable subject line and sender name in create wizard
6. **Campaign credit logic update** -- Paid orgs get unlimited credits (skip credit check if subscription_status = 'active')
7. **Nav update** -- Add "Billing" link to workspace nav for org_admin
8. **E2E tests** -- Payment gate rendering, customisation fields

### PI 8 Iteration 3: Scheduling, Repeat & Polish

**Items:**
1. **Campaign scheduling** -- Date picker in create wizard, `scheduled` status, cron pickup logic in `/api/campaigns/complete`
2. **Repeat campaign** -- "Re-run this campaign" button on completed campaign detail page, creates new campaign with same template + current org members
3. **Campaign results timeline** -- Chronological event list on campaign detail page (sent/clicked/reported timestamps)
4. **Dashboard campaign trend chart** -- Pass rate over time for completed campaigns (simple bar/line chart, no charting library -- CSS-based)
5. **Documentation updates** -- DECISIONS.md, backlog.md, domain model
6. **E2E tests** -- Scheduling flow, repeat campaign, timeline rendering

---

## 4. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Audit log storage | Separate `audit_logs` table, no FK to orgs | Must survive org CASCADE delete for GDPR compliance |
| Audit log access | Service-role insert only, no RLS read | Audit trail is admin/compliance only, not user-facing |
| Stripe integration | Build routes, graceful 501 fallback | Ship UI now, activate Stripe when key provided |
| Template customisation | jsonb overrides on campaigns table | Clean separation: template = defaults, campaign = overrides |
| Scheduling | `scheduled` status + cron pickup | Reuses existing cron infrastructure, no new job queue |
| Repeat campaign | Duplicate with fresh tokens + current members | Simple implementation, correct semantics (opted-out users excluded) |
| Anonymous benchmarking | Moved to deferred per Stefan | Not active backlog for PI 8 |
| Email knowledge testing | Noted as PI 9+ expansion | Template model already supports arbitrary checklist_item_id |
| GitGuardian incident | Noted in decisions, password rotation is ops task | Not a code change -- Supabase dashboard password rotation |

---

## 5. Deferred Items

- Anonymous benchmarking (Stefan moved to deferred)
- Email-based knowledge testing for non-phishing items (PI 9+)
- Inbound email report detection (PI 9)
- Phone/vishing campaigns (PI 9)
- Full HTML template editor (too complex for SMB users)
