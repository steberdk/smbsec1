# State Matrix — Campaigns index (`/workspace/campaigns`)

**Page file:** `frontend/app/workspace/campaigns/page.tsx`
**Route:** `/workspace/campaigns`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** Phase A retrofit for F-045 / PI-16 Quality Baseline (authored 2026-04-14).
**Persona source:** `docs/quality/personas.md` (last reviewed 2026-04-14).
**Invariant source:** `docs/quality/invariants.md`.
**Linked features:** F-045, F-030 (billing tier gating), F-028/F-029 (campaign MVP), F-036 (per-user history).

---

## Scope note — sub-routes

Campaigns is a sub-tree. This matrix covers **only** the index page. Sub-routes reachable via links from this page (flagged per cell as "navigable to" — they do NOT have their own matrix this PI):

| Sub-route | Linked from | Matrix in this PI? |
|---|---|---|
| `/workspace/campaigns/templates` | "Templates" header button | No (defer) |
| `/workspace/campaigns/new` | "Create campaign" header button + empty-state CTA | No (defer) |
| `/workspace/campaigns/[id]` | Each campaign row in the list | No (defer) |

Create matrices for these sub-routes when a future PI mutates them (per `state-matrix-template.md` § "When to create a matrix").

---

## Canonical state assumed by the page

The page reads, in `useEffect`:
- `/api/campaigns` → `campaigns: Campaign[]`
- `/api/orgs/me` → `org.campaign_credits` (number, default 0), `org.subscription_status` ("active" ⇒ `isPaid`)
- `/api/campaigns/user-history` → `users: UserHistory[]` (non-fatal on failure)

Derived flags used in the JSX:
- `hasActiveCampaign = campaigns.some(c ∈ {pending, scheduled, sending, active})`
- `canCreate = isAdmin && (isPaid || credits > 0) && !hasActiveCampaign`

Persona access boils down to the top-level guard `if (!isAdmin) return <AccessRestricted/>` at lines 97–104 — every non-admin persona short-circuits there regardless of org state.

---

## Page regions (columns)

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Access-restricted card** — shown when `!isAdmin` | lines 97–104 |
| R2 | **Header row** — `<h1>Campaigns</h1>` + "Templates" + "Create campaign" buttons | lines 112–137 |
| R3 | **Credit / plan info card** — credits remaining OR "free campaign used" upsell OR "1 free campaign" intro | lines 140–177 |
| R4 | **Error banner** — generic API failure | lines 179–183 |
| R5 | **Empty state** — "No campaigns yet…" + optional "Create your first campaign" CTA | lines 185–199 |
| R6 | **Campaign list** — per-campaign summary cards (template title, date, recipient count, pass rate, status badge); each links to `/workspace/campaigns/[id]` | lines 200–232 |
| R7 | **Team performance history** — collapsible table of per-member report/click/ignore counts + score | lines 234–304 |

---

## Matrix

Legend: `—` = region not rendered for this persona. `⚠ DEFECT` = today's code diverges from intended. Invariant IDs reference `docs/quality/invariants.md`.

### R1 — Access-restricted card

| Persona | Intended | Status |
|---|---|---|
| ANON | — (workspace auth boundary redirects to `/login` before this page renders) | OK — INV-workspace-auth-boundary |
| O1 / O2 / O3 | Not rendered (admins pass the guard) | OK — INV-role-page-access |
| IT1 | Rendered: "Access restricted / Only organisation admins can manage campaigns." No API calls issued. | OK — INV-role-page-access |
| E1 | — (no org membership; routed to `/accept-invite` or `/login` before reaching here) | OK — INV-workspace-auth-boundary |
| E2 | Same as IT1 (non-admin employee). | OK — INV-role-page-access |

Linked invariants: INV-role-page-access, INV-workspace-auth-boundary.

### R2 — Header row (title + action buttons)

| Persona | Intended | Status |
|---|---|---|
| ANON | — | OK |
| O1 | `<h1>Campaigns</h1>` + **Templates** link enabled + **Create campaign** button enabled iff `canCreate` (O1 default: `credits=1, isPaid=false, hasActiveCampaign=false` ⇒ enabled). Navigable to `/workspace/campaigns/templates` and `/workspace/campaigns/new`. | OK |
| O2 | Same title + buttons. For O2 with an active campaign running against IT1+E2+E1, `hasActiveCampaign=true` ⇒ **Create campaign** disabled (greyed, `pointer-events-none`, `aria-disabled`). Templates still enabled. | OK |
| O3 | Same as O1. Pending invite to IT1 does not affect `canCreate`. | OK |
| IT1 | — (short-circuited at R1) | OK |
| E1 | — | OK |
| E2 | — (short-circuited at R1) | OK |

Linked invariants: INV-role-page-access, INV-state-pure-of-navigation.

### R3 — Credit / plan info card

Shown only when `isAdmin && credits !== null`. Three mutually-exclusive branches (code lines 141–177):
- **B1** `credits > 0` → "Campaign credits remaining: N". Appends amber line "A campaign is currently active…" when `hasActiveCampaign`.
- **B2** `credits === 0 && campaigns.length > 0` → "You've used your free campaign. / Upgrade to continue testing your team." + "View plans" CTA → `/workspace/billing`.
- **B3** `credits === 0 && campaigns.length === 0` → "You have 1 free campaign to test your team's phishing awareness. Create your first campaign below."

| Persona | Intended branch | Status |
|---|---|---|
| ANON | — | OK |
| O1 (fresh org, no campaigns, credits=1) | B1 — "Campaign credits remaining: 1". | OK |
| O2 (active campaign, credits=0, campaigns exist) | B2 — upsell card, "View plans" → `/workspace/billing`. | OK (assumes F-030 defaults applied new orgs to `credits=1`; O2's run consumed it). |
| O3 (fresh org, no campaigns, credits=1) | B1 — "Campaign credits remaining: 1". | OK |
| IT1 | — | OK |
| E1 | — | OK |
| E2 | — | OK |

Linked invariants: INV-state-pure-of-navigation, INV-no-not-set-when-derivable (the numeric credit value is always concrete — never "Not set").

⚠ Coverage gap — new finding: there is no invariant asserting that `campaign_credits` is never displayed as `null` / "undefined". The `?? 0` guards on lines 54 and 151 mean a missing DB column would silently render `0`, making the page look like the free campaign is already used even for a fresh org. Candidate new invariant: **INV-org-defaults-applied** — every org row has `campaign_credits` and `subscription_status` non-null (migration 014 enforces, but not asserted anywhere). Flagged for next invariant review.

### R4 — Error banner

| Persona | Intended | Status |
|---|---|---|
| O1 / O2 / O3 | On API failure the banner shows the `Error.message` thrown by `apiFetch`. Must be a human-readable string, never a raw Postgres error. | OK — relies on `apiFetch` / `apiError` conventions. INV-no-raw-db-errors. |
| IT1 / E1 / E2 / ANON | — | OK |

Linked invariants: INV-no-raw-db-errors.

### R5 — Empty state

Rendered iff `campaigns.length === 0`. Contains "Create your first campaign" CTA iff `canCreate`.

| Persona | Intended | Status |
|---|---|---|
| O1 (no campaigns, credits=1) | "No campaigns yet. Send your first security test…" + **Create your first campaign** CTA (enabled). Navigable to `/workspace/campaigns/new`. | OK |
| O2 (campaigns exist) | — (list branch R6 renders instead) | OK |
| O3 (no campaigns, credits=1) | Same as O1. | OK |
| IT1 / E1 / E2 / ANON | — | OK |

Linked invariants: INV-state-pure-of-navigation.

### R6 — Campaign list (per-campaign summary cards)

Rendered iff `campaigns.length > 0`. Each card shows: `template_title`, `created_at` (locale date), `recipient_total`, pass rate (`(total-acted)/total`), status badge.

| Persona | Intended | Status |
|---|---|---|
| O1 | Rendered when O1 has at least one completed/pending campaign. Each card is a link to `/workspace/campaigns/[id]`. | OK |
| O2 | Rendered — O2's default fixture has an active campaign. Status badge shows "active"; pass rate shows `(total-acted)/total` as a whole-number percent. | OK |
| O3 | Likely empty (defaults to no campaigns) → falls to R5. | OK |
| IT1 / E1 / E2 / ANON | — | OK |

⚠ DEFECT (low severity, new finding): `passRate` returns `"---"` for `recipient_total === 0`, which can happen transiently after creation before recipients resolve. The status badge will say "pending" but the pass-rate column shows `"---"` — acceptable. However, the right-hand column header says "Pass rate" with no tooltip explaining that reporting (green) is "pass" and clicking (red) is "fail". For a non-technical owner this is ambiguous (F-023 retrospective note — covered at aggregate level but not per card). Flag as **DEFECT — low** — candidate for copy polish, not a PI blocker.

Linked invariants: INV-state-pure-of-navigation.

### R7 — Team performance history (collapsible table)

Rendered iff `isAdmin && userHistory.length > 0`. Toggles open/closed via local state; sorted by score (descending).

| Persona | Intended | Status |
|---|---|---|
| O1 (solo org) | `userHistory` likely empty (only owner has no campaigns) → section hidden. | OK |
| O2 | Rendered. Rows: IT1, E2 (with per-user totals). Each row: email, campaign count, reported, clicked, ignored, score. No raw user_id leak — falls back to `user_id.slice(0,8)` only when email missing. | OK |
| O3 | Hidden (no campaigns yet). | OK |
| IT1 / E1 / E2 / ANON | — | OK |

Linked invariants: INV-audit-log-pii-hashed (note: `user-history` RPC reveals plaintext emails **by design** to admins — this is NOT an audit-log write; the invariant applies to `audit_logs` rows only). INV-gdpr-delete-coherent — after O2 GDPR-deletes E2, E2 must disappear from this table on next load.

⚠ Coverage gap — new finding: `INV-gdpr-delete-coherent` currently lists `/workspace/team`, `/workspace/dashboard`, `/workspace/report`, `/workspace/settings/gdpr`. It should also list `/workspace/campaigns` (this R7 region is a per-member read) so a ghost user doesn't linger here. Candidate amendment to `INV-gdpr-delete-coherent.Applies to`.

---

## Defect summary (feeds next PI fix scope)

| Cell | PDF # | One-liner | Severity |
|---|---|---|---|
| R3 × O1/O3 | new finding | No invariant guards against null `campaign_credits` rendering as `0` and lying to the user ("free campaign used"). | Low — latent risk |
| R6 × O1/O2 | new finding | "Pass rate" column has no tooltip; green-vs-red semantics for non-technical owner not self-evident. | Low — copy polish |
| R7 — invariant list | new finding | `INV-gdpr-delete-coherent` does not list `/workspace/campaigns` yet. | Low — invariant doc amendment |

No high / medium defects blocking PI close for this page.

---

## Notes

- Billing-tier gating (F-030) is the mechanism controlling B1/B2/B3 branches; verify any B2→B1 transition after successful Stripe upgrade on the Billing page.
- `/workspace/campaigns/templates`, `/campaigns/new`, `/campaigns/[id]` inherit the `isAdmin` check via the same `useWorkspace` hook; their own matrices (future PI) must restate R1 for each.
- The "Access restricted" copy on this page matches the convention used on `/workspace/team` and `/workspace/billing` — keep synced when F-018 access-copy is ever standardised.
