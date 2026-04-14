# State Matrix — Privacy Policy (`/privacy`)

**Page file:** `frontend/app/privacy/page.tsx`
**Route:** `/privacy`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** Phase A retrofit for F-045 / PI-16 Quality Baseline (authored 2026-04-14).
**Persona source:** `docs/quality/personas.md` (last reviewed 2026-04-14).
**Invariant source:** `docs/quality/invariants.md`.
**Linked features:** F-045, F-032 (privacy policy MVP), F-033 (GDPR delete), F-012 (AI guidance + opt-out).

---

## Canonical state assumed by the page

The privacy page is a **pure static document** — no API calls, no session dependency, no persona-dependent rendering. It renders identical HTML for every visitor. The matrix therefore asserts:

1. Every persona reaches the page and sees the same content (INV-state-pure-of-navigation).
2. Every **claim** in the copy must correspond to a real product affordance (**INV-advertised-deletion-actually-deletes** analogue, extended to non-deletion claims).
3. No claim contradicts any other claim elsewhere in the app (privacy ↔ Settings UI ↔ email copy).

The "persona" dimension on this page is less about what each persona *sees* (all see identical markup) and more about which claims each persona can *act on* — e.g. only admins can exercise "Right to data portability" (per §8), only employees are the subject of "Right to object (phishing)" (per §8).

---

## Page regions (columns)

Section IDs follow the H2 numbering in the rendered markup (`§1`–`§11`).

| Region ID | Section heading (as rendered) | Code anchor |
|---|---|---|
| R§1 | **1. Who we are** | lines 13–21 |
| R§2 | **2. What data we collect** | lines 23–37 |
| R§3 | **3. Legal basis for processing** | lines 39–45 |
| R§4 | **4. Where data is stored** | lines 47–58 |
| R§5 | **5. Sub-processors** (includes Anthropic row + 30-day retention note) | lines 60–103 |
| R§6 | **6. No tracking, no ads** | lines 105–112 |
| R§7 | **7. Data retention** | lines 114–121 |
| R§8 | **8. Your rights under GDPR** (access, rectification, erasure, portability, object, object-AI) | lines 123–137 |
| R§9 | **9. Emails we send** | lines 139–148 |
| R§10 | **10. Security measures** | lines 150–159 |
| R§11 | **11. Contact** (+ `mailto:stefan@bertramconsulting.dk`) + "Back to home" link | lines 161–180 |

---

## Matrix

Legend: `⚠ DEFECT` = claim does not match reality or app behaviour. Every cell intent is "persona reaches the page and the section renders identically"; the interesting dimension is **claim traceability** — tabulated in the second matrix below the persona matrix.

### Per-persona reachability (trivial but enforced)

| Region | ANON | O1 | O2 | O3 | IT1 | E1 | E2 | Linked invariants | Status |
|---|---|---|---|---|---|---|---|---|---|
| R§1–R§11 | Reachable via `/privacy` link on landing, footer, `/login`, and (via workspace nav "Settings & data" card for logged-in personas — indirect). Identical HTML for all. | same | same | same | same | same | same | INV-state-pure-of-navigation, INV-workspace-auth-boundary (priv page is public so boundary trivially holds) | OK |

No persona-specific divergence to tabulate region-by-region.

### Claim traceability (the operative matrix for this page)

Each row is a **claim** in the copy; each column asserts whether the claim is backed by current app reality. `Verified` = the affordance exists AND is reachable by the affected persona; `⚠ DEFECT` = claim does not match reality; `N/A` = claim is not a user-facing affordance (company statement only).

| # | Claim (abbreviated) | Section | Backed by code / affordance | Persona who can exercise it | Invariants | Status |
|---|---|---|---|---|---|---|
| C1 | "Email address used for login (magic link)" | R§2 | `frontend/app/login/page.tsx` — PKCE magic link + OTP (F-026). | ANON, all logged-in | INV-workspace-auth-boundary | OK |
| C2 | "Display name — optional, shown to team" | R§2 | `/workspace/settings` (Display name field); rendered on `/workspace/team` rows. | O1/O2/O3/IT1/E2 | INV-state-pure-of-navigation | OK |
| C3 | "Organisation name and settings… email platform preference, language setting" | R§2 | `orgs.name`, `orgs.email_platform`, `orgs.campaign_language` — editable at `/workspace/settings`. | O1/O2/O3 | INV-no-not-set-when-derivable | OK |
| C4 | "Checklist responses (Done / Not sure / Skipped)" | R§2 | `smbsec1.assessment_responses`. | all logged-in | — | OK |
| C5 | "Campaign interactions (clicked / reported / ignored)" | R§2 | `smbsec1.campaign_recipients`. | O1/O2/O3 (admin view); E2/IT1 (as subjects) | — | OK |
| C6 | "We do NOT collect passwords" | R§2 | `flowType: "pkce"` in `lib/supabase/client.ts`; no password input anywhere. | all | — | OK |
| C7 | "Payment cards handled by Stripe (PCI-compliant)" | R§2 | `/api/billing/checkout` → Stripe Checkout (card details never touch our servers). | O1/O2/O3 | — | OK |
| C8 | "We do NOT collect browsing behaviour, device fingerprints, or IP addresses for tracking" | R§2 | No analytics scripts present in any layout/page. Rate-limiting uses IPs transiently but does not store them (per `lib/api/rateLimit.ts` — in-memory TTL). | all | — | OK (narrow — relies on rate-limiter remaining in-memory). |
| C9 | "Data stored in EU (Ireland, AWS eu-west-1) via Supabase" | R§4 | External hosting statement; depends on Supabase project region at console level. | all | — | OK — company statement; revisit if Supabase project ever moves. |
| C10 | "AI guidance requests processed by Anthropic in the US under SCCs" | R§4, R§5 | `/api/ai/guidance` routes (F-031 / F-012 chat) call Anthropic. | all logged-in (on `/workspace/checklist`, `/workspace/chat`) | — | OK |
| C11 | "Anthropic may retain API request data for up to 30 days for trust-and-safety review" | R§5 | Anthropic's published policy; app does not override. | all | — | OK — company statement. |
| C12 | "Organisation admins can disable AI guidance in Settings" | R§5, R§8 | `/workspace/settings` → "AI guidance" toggle (`ai_guidance_enabled` on `orgs`). Verified in `frontend/app/workspace/settings/page.tsx` lines 222–240. | O1/O2/O3 | INV-advertised-deletion-actually-deletes (analogue: "advertised toggle actually toggles") | OK |
| C13 | "Active accounts: data retained as long as account exists" | R§7 | Company statement; no retention job scheduled. | all | — | OK |
| C14 | "Deleted accounts: all personal data permanently deleted (hard delete) immediately" | R§7, R§8 | `/workspace/settings/gdpr` → "Delete my account permanently" (lines 272–296) calls a hard-delete RPC. F-033 / F-049 cover the class. | O1/O2/O3 (owners), IT1, E2 (self-delete) | INV-advertised-deletion-actually-deletes, INV-gdpr-delete-coherent, INV-destructive-action-double-confirm | OK — **verified during this Phase A pass**. Security-agent's earlier concern ("§8 'Employees can delete their own account' may not be backed by Settings UI") is NOT a defect: the self-delete button does exist at `/workspace/settings/gdpr` for non-admin members too. Flag for Security-agent to re-confirm during Phase B. |
| C15 | "Deleted organisations: all data permanently deleted" | R§7 | `/workspace/settings/gdpr` → "Delete organisation" (admin-only). | O1/O2/O3 | INV-advertised-deletion-actually-deletes, INV-gdpr-delete-coherent | OK |
| C16 | "An anonymised audit log entry may be retained for compliance" | R§7 | `smbsec1.audit_logs` — emails hashed per F-033 PI-14 decision. | — (not an affordance) | INV-audit-log-pii-hashed | OK |
| C17 | "Right of access — Settings & Data shows all info stored about you" | R§8 | `/workspace/settings/gdpr` exists for all logged-in personas (admin sees export; employee sees self-delete + "Contact your organisation owner to export… other organisation data"). | all logged-in | INV-role-page-access, INV-no-not-set-when-derivable | OK — but see D1 below. |
| C18 | "Right to rectification — Update display name and org settings at any time" | R§8 | `/workspace/settings` editable fields. | O1/O2/O3 (org settings); all (display name) | — | OK — needs verification that non-admin display-name editing works (E2 / IT1 flow). |
| C19 | "Right to erasure — Employees can delete their own account. Admins can delete the entire org." | R§8 | Self-delete: `/workspace/settings/gdpr` (all personas); org-delete: same page (admin only). | E2, IT1 (self); O1/O2/O3 (both) | INV-advertised-deletion-actually-deletes | OK — **verified 2026-04-14**. |
| C20 | "Right to data portability — Admins export all org data as JSON from Settings & Data" | R§8 | `/workspace/settings/gdpr` → "Download JSON export" button, calls `/api/gdpr/export`. | O1/O2/O3 | INV-advertised-deletion-actually-deletes (analogue: "advertised export actually exports") | OK |
| C21 | "Right to object — Employees can opt out of phishing campaigns by contacting their owner" | R§8 | **No in-app opt-out UI**. The claim is "contact your owner"; this is a compliant GDPR workaround but depends on owner action. | E2, IT1 | — | ⚠ WEAK — see D2 below. |
| C22 | "Right to object (AI) — Employees can ask admin to disable AI guidance (Settings → AI guidance toggle)" | R§8 | Toggle exists at `/workspace/settings` (C12). Again: no in-app self-serve, but the admin-mediated path is accurate. | E2, IT1 via O* | — | OK — copy is honest about the mediation. |
| C23 | "Magic link login email" | R§9 | Supabase Auth via Resend SMTP. | all | — | OK |
| C24 | "Team invite email" | R§9 | `/api/invites/create` → Resend. | E1 (recipient); O1/O2/O3 (sender) | — | OK |
| C25 | "Reassessment reminder email" | R§9 | Cadence banner on Home (R2 of home matrix) links to reassessments; actual email send path — **unverified at claim scope**. | O1/O2/O3 | — | ⚠ WEAK — see D3 below. |
| C26 | "Phishing awareness campaign emails" | R§9 | `smbsec1.campaign_recipients` + send worker. | O* as sender; E2/IT1 as recipient | — | OK |
| C27 | "We do not send marketing emails or newsletters" | R§9 | No marketing email route in code. | all | — | OK — company statement. |
| C28 | "Passwordless auth, RLS on all tables, HTTPS + CSP, rate limiting, JWT short-lived sessions" | R§10 | PKCE flow; RLS declared in migrations; `next.config.ts` headers; `lib/api/rateLimit.ts`; Supabase JWT defaults. | all | INV-rls-on-every-smbsec1-table, INV-no-service-role-in-client-bundle | OK — invariants already guard most of this. |
| C29 | "Contact: organisation owner for data questions; `mailto:stefan@bertramconsulting.dk` for no-account users" | R§11 | Mailto link present. | all | — | OK |

---

## Defects flagged

| ID | Claim | Severity | Reasoning | Owner of fix |
|---|---|---|---|---|
| D1 | C17 — §8 "Right of access — Settings & Data shows all info stored about you" | Medium | The claim reads as if **every persona** can see their full data in one place. In practice: admin sees a JSON export; employees see only "Contact your org owner to export other organisation data". An employee cannot trivially produce a dump of everything stored about them — they get self-delete and display-name edits, not an export. This is a partial gap against the GDPR right of access text. Either (a) soften the copy to "Admins can export…; employees can request an export from their admin", or (b) add a personal-data export button for employees. | Product + legal review |
| D2 | C21 — §8 "Right to object (phishing) — contact your org owner" | Low/Medium | Legally defensible but friction-heavy. An employee who objects has no in-app record; the owner may ignore the request. No audit trail. Consider adding a per-member `opt_out_phishing` flag on `org_members` with a self-serve toggle at `/workspace/settings/gdpr`. Flagged for product backlog; not a PI blocker. | Product |
| D3 | C25 — "Reassessment reminder email" | Low | Claim that we send reassessment reminders is in the policy but the send-path is not obviously wired. Home page has a cadence banner (visual reminder inside the app) but an outbound email worker for cadence is **not located in `frontend/app/api/**`** during this pass. Might live in a cron/worker repo or be planned but unshipped. Verify on Phase B — if the email is never actually sent, the claim is false and must be removed or the worker scheduled. | IT Dev (verify) |
| D4 | C8 — "We do not collect IP addresses for tracking" (partial) | Low | Narrow: rate-limiter is in-memory today; if the rate-limiter is ever moved to Redis / Upstash (likely at scale), IPs or hashed IPs will touch a logged store. Copy should pre-qualify: "We do not collect IP addresses **for user tracking or profiling**" — which is true now and remains true after any durable rate-limit change. | Copy |
| D5 | §10 (R§10) drift risk | Low | The bullet "Rate limiting on all API endpoints" is the strongest of the five security claims. `lib/api/rateLimit.ts` is applied in many but **not necessarily every** route — a spot-check of `/api/billing/checkout` shows it IS applied; this should be systematically verified as part of PI-16 Phase B (or enshrined as a new invariant — see "Invariant gaps" below). | IT Dev |

No high-severity defects. C14 / C19 (the Security agent's flagged §8 erasure claim) is **verified OK** — self-delete is wired for all member personas.

---

## Invariant gaps (new findings)

1. **INV-privacy-claim-backed-by-code** — "Every affordance claim in `/privacy` has a working in-app route (or an explicit 'contact owner' disclaimer). A claim without a backing affordance is a defect." This would codify the matrix in this file and make privacy-policy drift a CI failure via a regex probe. Candidate for next invariants review.
2. **INV-rate-limit-on-every-mutating-api** — "Every `POST` / `PUT` / `PATCH` / `DELETE` route under `frontend/app/api/**` calls `rateLimit(...)` before executing work." Privacy §10 claims this and D5 suggests we should actually test it. Candidate.
3. **INV-missing-integration-graceful** — already referenced in `billing.md`. Also relevant here: claim C11 + C12 (Anthropic + AI opt-out) degrade gracefully when `ANTROPIC_API_KEY` is missing. Verify on Phase B.

---

## Notes

- Privacy page renders identical HTML to every persona; the matrix's value is claim-traceability, not per-region-per-persona variation. Do **not** split this file into 7 persona rows × 11 sections — that would be noise.
- The Security agent flagged §8 erasure as a suspected defect during Phase A triage. **Verified as OK on 2026-04-14**: `/workspace/settings/gdpr` renders a "Delete my account permanently" button for non-admin personas (IT1, E2). Close the Security-agent concern with this matrix cell (C14, C19).
- Keep this matrix in lockstep with `/workspace/settings/gdpr` matrix (to be authored when a future PI touches GDPR copy) — claim C20's JSON export wording must match the button label on that page.
- "Last updated: March 2026" in the rendered page (line 10) — consider updating to reflect the next policy review date; drift risk.
