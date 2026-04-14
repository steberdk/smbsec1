# State Matrix — Billing (`/workspace/billing`)

**Page file:** `frontend/app/workspace/billing/page.tsx`
**Checkout API:** `frontend/app/api/billing/checkout/route.ts`
**Route:** `/workspace/billing`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** Phase A retrofit for F-045 / PI-16 Quality Baseline (authored 2026-04-14).
**Persona source:** `docs/quality/personas.md` (last reviewed 2026-04-14).
**Invariant source:** `docs/quality/invariants.md`.
**Linked features:** F-045, F-030 (Campaign Pro billing), F-035 (Stripe integration).

---

## Canonical state assumed by the page

From `useEffect` + `apiFetch` on mount:
- `/api/orgs/me` → `org.subscription_status` (`"active"` ⇒ `isPaid = true`) and `org.campaign_credits` (number, default 0).

Derived flags:
- `isPaid = billing.subscription_status === "active"`
- `isAdmin` — from `useWorkspace()`; non-admins are short-circuited at the guard on lines 95–103.

Client-side localStorage: `waitlist_submitted_<orgId>` persists the waitlist-submitted state per org.

Stripe configuration detection: the **checkout button does NOT pre-flight check** whether `STRIPE_SECRET_KEY` is set. Instead, it calls `POST /api/billing/checkout` on click and the route returns 501 `"Payment processing is not configured yet. Paid plans are launching soon."` when the env var is missing. The page catches this via `msg.includes("not configured") || msg.includes("501")` (lines 72–74) and silently falls through to the waitlist card without showing an error. That is by design — the waitlist card is the graceful-degradation fallback.

---

## Page regions (columns)

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Access-restricted card** — shown when `!isAdmin` | lines 95–103 |
| R2 | **Header** — `<h1>Billing</h1>` | line 113 |
| R3 | **Error banner** — generic API failure | lines 115–119 |
| R4 | **Current plan card** — plan name badge + credit count (Free) / unlimited statement (Paid) | lines 122–159 |
| R5 | **Campaign Pro upsell card** — feature list, €15/mo price, "Upgrade to Campaign Pro" button (free tier only) | lines 162–207 |
| R6 | **Waitlist fallback card** — "Paid plans launching soon" + "Join waitlist" button / confirmation (free tier only) | lines 210–238 |
| R7 | **Plan comparison table** — Feature × Free × Campaign Pro (free tier only) | lines 241–301 |

---

## Matrix

Legend: `—` = region not rendered for this persona. Invariant IDs reference `docs/quality/invariants.md`.

### R1 — Access-restricted card

| Persona | Intended | Status |
|---|---|---|
| ANON | — (auth boundary redirects to `/login`) | OK — INV-workspace-auth-boundary |
| O1 / O2 / O3 | Not rendered — admin passes guard | OK — INV-role-page-access |
| IT1 | Rendered: red-bordered card "Only organisation admins can manage billing." No API calls. | OK — INV-role-page-access |
| E1 | — (no org) | OK — INV-workspace-auth-boundary |
| E2 | Same as IT1 — "Only organisation admins can manage billing." | OK — INV-role-page-access |

Linked invariants: INV-role-page-access, INV-workspace-auth-boundary.

⚠ UX inconsistency (new finding, low): Campaigns page (R1) renders access-restricted as a centered grey block ("Access restricted / Only organisation admins can manage campaigns."); Billing page renders it as a red-bordered error banner. Same meaning, two visual treatments. Candidate copy/UI polish to unify (does not warrant its own invariant — would be covered by a hypothetical future `INV-access-restricted-copy-consistent`; skip for now).

### R2 — Header

| Persona | Intended | Status |
|---|---|---|
| O1 / O2 / O3 | `<h1>Billing</h1>`, no subtitle. | OK |
| Other | — | OK |

Linked invariants: INV-state-pure-of-navigation.

### R3 — Error banner

Rendered when the `POST /api/billing/checkout` response is a non-501 error OR when `/api/orgs/me` fails on mount.

| Persona | Intended | Status |
|---|---|---|
| O1 / O2 / O3 | Red-bordered card with human-readable message. Never a raw Postgres / Stripe stack trace. | OK — INV-no-raw-db-errors. |
| Other | — | OK |

Linked invariants: INV-no-raw-db-errors.

### R4 — Current plan card

Two branches: `isPaid === true` (Campaign Pro) vs `isPaid === false` (Free).

| Persona | Intended | Status |
|---|---|---|
| O1 (free, default) | Badge "Free"; "Campaign credits remaining: N"; sub-copy "The free plan includes 1 campaign credit. Upgrade to Campaign Pro for unlimited…". | OK |
| O2 (free by default) | Same as O1, credits may be 0 if a free campaign has been consumed. | OK |
| O3 (free) | Same as O1. | OK |
| O* (after Stripe upgrade) | Badge "Campaign Pro" (teal); "You have unlimited campaign credits…" + "To manage your subscription or update payment details, contact support." | OK in intent; **unverified path** — no persona in the fixture set is in the paid state (needs Stripe test-mode webhook delivery, which is not wired in test env). |
| IT1 / E1 / E2 / ANON | — | OK |

Linked invariants: INV-state-pure-of-navigation, INV-no-not-set-when-derivable (credit count renders the number, never "Not set").

⚠ Coverage gap — new finding: paid-state copy says "contact support" without an email / link. For a user mid-subscription wanting to cancel, the only affordance is the privacy-page footer email (`stefan@bertramconsulting.dk`). Candidate future fix: either add a Stripe customer-portal link once the portal session API is wired, or show the support email inline. Tracked as a low-severity UX defect, not a PI blocker.

### R5 — Campaign Pro upsell card (free tier only)

Rendered iff `!isPaid`. Contains: price badge €15/mo, 8-item feature grid, "Upgrade to Campaign Pro" button.

| Persona | Intended | Status |
|---|---|---|
| O1 / O2 / O3 | Upsell card visible. Button enabled by default. On click: `handleCheckout` calls `/api/billing/checkout`. If 501, page silently falls through (no error banner, waitlist card is the resolution). If 200, redirects to Stripe. On any other error, R3 shows the message. | OK by design. |
| O* (paid) | Not rendered (gated by `!isPaid`). | OK |
| IT1 / E1 / E2 / ANON | — | OK |

Linked invariants: INV-no-raw-db-errors (checkout errors are user-readable), INV-destructive-action-double-confirm (not applicable here — subscription start is not destructive; a single click is correct).

⚠ DEFECT — **low, new finding**: the upsell button **does not indicate** that Stripe is not yet configured (production env today has no `STRIPE_SECRET_KEY`). The user clicks "Upgrade to Campaign Pro", experiences a ~200ms loading spinner, then sees no visible change — because the page silently swallows the 501 and keeps the waitlist card below. This is a confusing UX: the click appears to do nothing. Two acceptable resolutions:
  1. Gracefully: after a 501, scroll to / highlight the waitlist card AND show a neutral info banner "Paid plans are launching soon — join the waitlist below."
  2. Feature-flag: hide the upsell card entirely when `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` is unset (requires exposing a `NEXT_PUBLIC_*` feature flag or a `/api/billing/available` probe on mount).

Flag with severity **low** (does not block checkout — waitlist catches the intent) but definitely a medium-priority copy fix for the next PI once Stripe is live in prod.

### R6 — Waitlist fallback card (free tier only)

| Persona | Intended | Status |
|---|---|---|
| O1 / O2 / O3 | Visible when `!isPaid`. Two states: (a) pre-submit: "Join the waitlist to be notified when Campaign Pro becomes available." + "Join waitlist" button; (b) post-submit: green confirmation "Thanks! We'll notify you at {userEmail}". Submit state persisted in `localStorage` keyed by org ID. | OK. |
| O* (paid) | Not rendered. | OK. |
| IT1 / E1 / E2 / ANON | — | OK |

Linked invariants: INV-state-pure-of-navigation (with one caveat — see below).

⚠ DEFECT — **low, new finding**: the waitlist submitted state lives in localStorage **per org**, not on the server. If O2 clicks "Join waitlist" on laptop A, then signs in on laptop B, the fresh browser shows the pre-submit card and they can click again. No backend record is created; the button is effectively a no-op (only a UX flag). Worth calling out — the copy "We'll notify you…" implies a server-side record that does not exist. Candidate new invariant: **INV-advertised-action-persists** — any UI claiming the user has "joined" / "signed up" / "been added to" a list must have a backing server record. (Skip creating this invariant now; flag for review with Security expert when billing launches.)

### R7 — Plan comparison table (free tier only)

Static 11-row table. No persona-dependent content within it.

| Persona | Intended | Status |
|---|---|---|
| O1 / O2 / O3 | Table visible beneath waitlist card. Copy matches features listed in R5. "Phishing campaigns: 1 free / Unlimited"; "Campaign templates: 2 basic / All 4"; etc. | OK. |
| O* (paid) | Not rendered. | OK. |
| IT1 / E1 / E2 / ANON | — | OK |

⚠ DEFECT — **low, new finding**: R5 feature grid says "All 4 phishing templates" but R7 table row says "Campaign templates: 2 basic / All 4". The R5 list implicitly claims Free also has all 4, by omission. Also: with the PI-9 Danish templates addition, the actual current template count may be > 4 — copy drift risk between marketing surface and `campaign_templates` table count. Candidate for next content review — not urgent.

Linked invariants: INV-state-pure-of-navigation.

---

## Stripe-missing behaviour summary

| State | Checkout button | Error banner | Waitlist card | Comparison table |
|---|---|---|---|---|
| Stripe configured, normal flow | Enabled → redirects to Stripe | Hidden (unless Stripe API fails) | Visible | Visible |
| `STRIPE_SECRET_KEY` missing | Enabled → 501 swallowed silently | Hidden | Visible (and is the de-facto CTA) | Visible |
| `STRIPE_SECRET_KEY` missing + network failure | Enabled → generic fetch error | **Shown** | Visible | Visible |

The checkout button **does not disable gracefully** when Stripe is missing — it clicks through to the 501 path. Not a crash, not a leaked error, but not a polished affordance either.

---

## Defect summary (feeds next PI fix scope)

| Cell | PDF # | One-liner | Severity |
|---|---|---|---|
| R5 × O1/O2/O3 | new finding | "Upgrade" button clicks through silently when Stripe is unconfigured — no user-facing cue that the action was deferred, other than the waitlist card below. | Medium — confusing UX once a user tries it |
| R6 × O1/O2/O3 | new finding | Waitlist submission is localStorage-only; "We'll notify you" copy implies a server record that does not exist. | Low — pre-launch copy risk |
| R7 × O1/O2/O3 | new finding | Copy drift between R5 feature list and R7 comparison table ("All 4 templates" claimed in both places, both definitions now stale vs PI-9 Danish templates). | Low — content review |
| R4 (paid) | new finding | Paid-state "contact support" with no link / email — orphan affordance once customers exist. | Low — unverified path |
| R1 cross-page | new finding | Access-restricted treatment differs between Billing (red banner) and Campaigns (grey centered block). | Low — UX consistency |

---

## Notes / invariant gaps

- **No invariant asserts graceful degradation when an integration key is missing** — Stripe, Anthropic, Resend all have "missing key ⇒ what should happen" questions that currently depend on each route's judgement. Candidate future invariant: **INV-missing-integration-graceful** — "When a third-party integration env var is absent, user-visible behaviour is: (a) action-disabled with explanatory copy, OR (b) silent fallback to a known-working alternative path; never a raw 501 surfaced, never a console.error the user sees, never a spinner that never resolves." This would cover Stripe here, Anthropic AI guidance on `/workspace/checklist`, and Resend email sends on invite. Flag for Phase B / Security-expert review.
- **INV-advertised-action-persists** (see R6) — a future invariant.
- Paid-state persona missing from `personas.md`. If PI-16 or later tests the paid path, add `O4 — Owner on Campaign Pro` with setup steps that stub a `subscription_status = 'active'` row (or a real Stripe test-mode session). Until then, R4's paid branch and R5/R6/R7's hidden-when-paid behaviours are untested by any persona.
