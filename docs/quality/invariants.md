# Invariants — SMBSec cross-page truths

Owned by Business Analyst (per `docs/agents/roles.md`, sharpened in F-047).
Reviewed by UX Designer (consistency) and Architect (state-transition implementability) at step 2b of every PI that touches a covered page.

An **invariant** is an app-wide statement that must hold at every moment, regardless of which page the user is on or how they arrived. Invariants exist precisely because feature-scoped verification (and feature-scoped BA testing) misses contradictions between features. Stefan's PDF #42–#47 is the founding evidence: the Home page, the Settings page, and the Team page each verified independently in PI 13–14, but the *combination* leaked obvious contradictions (Home subtitle "Owner · IT Executor" while Settings showed "Not set" while Team showed someone else assigned).

Each invariant has:

- **ID** — `INV-<area>-<short-name>`, kebab-case. Stable forever; never renumber.
- **Statement** — a single sentence.
- **Applies to** — page routes that must obey it.
- **Personas affected** — IDs from `personas.md`, or `all`.
- **Why it exists** — one sentence, normally referencing a finding or a class of risk.
- **Mechanical test idea** — concrete sketch for `frontend/tests/invariants.spec.ts` (F-046).

Invariants are the testable atoms of the state matrices. A page matrix cell that cannot be linked to at least one invariant is a candidate for promotion to a new invariant — either the cell is wrong, or the matrix is enforcing a truth nothing else does.

Mechanical-test idea conventions:
- "Per persona" means: loop the persona set in `frontend/tests/smoke/personas.spec.ts`.
- "Cross-page" means: the spec navigates between two pages in one test and asserts a comparison.
- "No raw-DB-error leak" means: assert the visible message does not contain `function ` `does not exist`, ` SQLSTATE `, `relation "`, or `column "..." does not exist`.

---

## INV-home-exec-parity

**Statement:** The Home page header subtitle's "IT Executor" indicator and `/workspace/settings`'s "IT executor assignment" field resolve to the same member (or both to "not assigned").

**Applies to:** `/workspace`, `/workspace/settings`, `/workspace/team` (Pending Invites + Members rows).

**Personas affected:** O1, O2, O3, IT1 (read-only on Home — IT1 cannot see Settings, but the read on Home must still match server state).

**Why it exists:** PDF #42–#43 — Home said "Owner · IT Executor" while Settings showed "Not set" because the Home subtitle read `membership.is_it_executor` for the *current viewer* while Settings read the *org-level* assignment. Two sources of truth for one fact.

**Mechanical test idea:** As O2, navigate `/workspace` → capture the subtitle string → navigate `/workspace/settings` → read the IT-executor dropdown's selected option → assert both name the same member. Repeat for O3 (subtitle must NOT contain "IT Executor"; Settings must show "Not set" or the pending-invite name with a clear "(invited, not yet accepted)" suffix). For O1, both must say the owner.

---

## INV-home-steps-deterministic

**Statement:** The Home "Get started" checklist visible state (which steps are struck through, which is the "next" CTA) is a pure function of org state — same org state always produces identical visible state, regardless of how many times the page has been navigated to in this session.

**Applies to:** `/workspace`.

**Personas affected:** O1, O2, O3 (employees do not see "Get started"; if F-048 changes that, expand the list).

**Why it exists:** PDF #44 — Step 1 strikethrough flickered in/out between navigations because the component computed it from a session-cached "first visit" flag instead of from server state.

**Mechanical test idea:** As O3 with no acceptance, fresh sign-in → snapshot the Home `Get started` block markup → navigate to `/workspace/settings` → back to `/workspace` → snapshot again → assert byte-equal markup of the steps list. Repeat after a hard reload (no session storage).

---

## INV-home-step-text-coherent

**Statement:** Home "Get started" step text never contradicts org state. Specifically: the "Invite your IT Executor" step is hidden / replaced when an IT executor (accepted member or pending invite with the IT-executor flag) exists.

**Applies to:** `/workspace`.

**Personas affected:** O1 (handles IT self → step text says "IT checklist assigned to you", not "Invite"), O2 (IT1 accepted → step is satisfied/hidden), O3 (pending invite → step text reflects "invite sent, awaiting acceptance", not a fresh CTA).

**Why it exists:** PDF #47 — after Stefan reassigned IT executor, the Home step still said "Invite your IT Executor" because the step renderer had not been wired to the IT-exec source of truth.

**Mechanical test idea:** Per persona, assert the visible Home step text matches an expected lookup table keyed on org state. Use page-object methods `homePage.getStep(1).title()` and `.cta()`; never substring-match the whole markup.

---

## INV-no-raw-db-errors

**Statement:** No user-facing screen, banner, toast, or modal ever surfaces a raw Postgres / Supabase error string. User-facing errors are either app-defined ("This action is temporarily unavailable — contact support") or generic transport errors ("Network error, please retry"). Server logs may contain the raw error.

**Applies to:** every page; in particular high-risk forms — `/workspace/team` (revoke), `/workspace/settings` (save), `/workspace/settings/gdpr` (delete account/org), `/onboarding` (create org), `/accept-invite` (accept).

**Personas affected:** all (anyone who can trigger a mutation).

**Why it exists:** PDF #46 — `function digest(text, unknown) does not exist` leaked verbatim into the Team page UI when migration 024 was missing. F-049 fixes the specific case; this invariant prevents the class.

**Mechanical test idea:** A network-intercepted spec that forces the `revoke-and-delete` RPC to return `{ error: "function digest(text, unknown) does not exist" }` and asserts the visible message does NOT contain `function `, `SQLSTATE`, `relation "`, or `column "`. Repeat for `/api/orgs` create on duplicate, `/api/invites/accept` on expired, `/api/orgs/[id]/delete` on bad input.

---

## INV-no-not-set-when-derivable

**Statement:** No screen displays "Not set" / "Not configured" / blank for a value that can be derived from existing org state. If the data exists in the DB, the screen renders it; otherwise the screen renders a clear empty-state with a CTA, not the literal string "Not set".

**Applies to:** `/workspace/settings` (IT executor field, Email platform, Campaign language), `/workspace`, `/workspace/dashboard` (cadence indicator), `/workspace/report` (org info section).

**Personas affected:** O1, O2, O3 (admin-only screens). Reads on Home subtitle apply to all `/workspace` viewers.

**Why it exists:** PDF #43 — Settings showed "Not set" for IT executor when the value was clearly derivable from `org_members.is_it_executor` (O1 case) or from the pending invite (O3 case). "Not set" became a tell for "nobody wired this query".

**Mechanical test idea:** Per persona, navigate every admin screen and grep the visible text for `Not set`. Each occurrence is either (a) accompanied by a primary CTA to set it AND backed by a server check confirming the value is genuinely null, or (b) a defect.

---

## INV-state-pure-of-navigation

**Statement:** A page's visible content is a pure function of `(persona, org state, route + query params)` — never of navigation history, time-of-day, or session-cached flags. The same `(persona, org state, route)` produces identical content whether reached by direct URL, by clicking a card on Home, or by the back button.

**Applies to:** every page.

**Personas affected:** all.

**Why it exists:** Generalisation of PDF #44. Cached "first visit" / "just signed in" / "just saved" flags are the most common source of cross-page incoherence. Pages that legitimately need transient banners (e.g. "Settings saved") must derive them from URL state (`?saved=1`), not from session storage.

**Mechanical test idea:** For each page, render via direct URL and via two navigation paths; assert the matched section markup is identical. Excludes legitimate transient toasts (which must vanish within 5s and not survive a reload).

---

## INV-team-pending-invite-actions-safe

**Statement:** On `/workspace/team`, every action button on a pending-invite row (Copy link, Revoke, Revoke + delete data) either completes successfully OR shows a non-leaky error AND leaves the invite row in a deterministic state (still pending, or removed — never "looks removed but still in DB").

**Applies to:** `/workspace/team`.

**Personas affected:** O1, O2, O3.

**Why it exists:** PDF #46 — Revoke + delete data appeared to do nothing because the `digest()` error was swallowed by a generic try/catch and the row was not re-fetched, so the user saw the row remain with no explanation. F-049 fixes the immediate symptom; this invariant locks the class.

**Mechanical test idea:** For each pending-invite action, intercept the API to inject (a) success, (b) generic 500, (c) RPC missing. Assert: success path removes the row; (b) and (c) keep the row visible AND show a non-raw error AND a retry affordance.

---

## INV-gdpr-delete-coherent

**Statement:** When a member or organisation is deleted via `/workspace/settings/gdpr`, every page that previously listed that subject (Team, Dashboard team rows, Report per-member breakdown, audit log entries containing the email) reflects the deletion immediately on next load. No "ghost member" rows remain.

**Applies to:** `/workspace/team`, `/workspace/dashboard`, `/workspace/report`, `/workspace/settings/gdpr`.

**Personas affected:** O1, O2, O3 (the actor); plus any persona who could refresh and see stale state.

**Why it exists:** F-033 (GDPR member deletion) and F-049 (Revoke + delete data) both manipulate `org_members`, `audit_logs`, and `invites` — three tables, three opportunities for a missed cascade. A ghost row on Dashboard would silently misrepresent team progress.

**Mechanical test idea:** As O2, delete IT1 via GDPR; assert IT1 absent from Team, Dashboard team list, Report per-member table, and that any `audit_logs` row referencing IT1's email has been redacted to `[deleted]` (not the raw email).

---

## INV-dashboard-report-parity

**Statement:** The numbers shown on `/workspace/dashboard` (overall progress, per-track progress, per-member counts) match the numbers shown on `/workspace/report` for the same active assessment within the same minute. Both pages source from the same RPC/query.

**Applies to:** `/workspace/dashboard`, `/workspace/report`.

**Personas affected:** O1, O2, O3.

**Why it exists:** F-038 + F-040 already enforce this within the dashboard math fix; codifying as an invariant makes regression cheap to detect (and any future "small UI tweak" cannot accidentally re-fork the calculation).

**Mechanical test idea:** As O2, navigate Dashboard, scrape the four canonical pill numbers (`done`, `unsure`, `skipped`, `total`), navigate Report, scrape the equivalents, assert equal.

---

## INV-checklist-track-visibility

**Statement:** On `/workspace/checklist`, IT-executor personas (and only IT-executor personas) see the IT Baseline track. Non-executors see Awareness only. The track filter must agree with the `org_members.is_it_executor` flag at time of page load — never with a stale value from a prior session.

**Applies to:** `/workspace/checklist`.

**Personas affected:** O1 (sees both), IT1 (sees both), O2/O3 (Awareness only because they did not flag themselves), E2 (Awareness only).

**Why it exists:** A regression here is invisible until a user wonders "why don't I see this item my colleague mentioned?" — i.e. it could ship for a long time before discovery. Locking it as an invariant makes the smoke suite assert it every deploy.

**Mechanical test idea:** Per persona, count `[data-track=it-baseline]` items vs. `[data-track=awareness]` items; assert IT-baseline count == 0 for non-executors, > 0 for executors.

---

## INV-role-page-access

**Statement:** Routes restricted to admin / manager+admin (per `docs/user-flows.md` §7) hard-redirect or render the documented "Access restricted" message for personas without the required role. They do NOT render the page chrome and then 403 the API call (which would briefly leak the layout).

**Applies to:** `/workspace/team`, `/workspace/assessments`, `/workspace/campaigns/*`, `/workspace/report`, `/workspace/billing`, `/workspace/settings`.

**Personas affected:** IT1, E2 (the personas that *fail* this check); O1/O2/O3 (the personas that *pass* it).

**Why it exists:** F-018 enforced this at the route level; this invariant prevents a future client-side refactor from regressing it.

**Mechanical test idea:** As IT1 / E2, attempt direct navigation to each restricted route; assert one of (a) redirected to `/workspace`, or (b) main `<h1>` matches the restricted-access wording. Assert no API call to a privileged endpoint was issued.

---

## INV-public-checklist-readonly

**Statement:** `/checklist` accessed without a session never shows interactive response buttons (`Done` / `Unsure` / `Skipped`); the AI guidance button is also hidden. The presence of those buttons in the DOM is the signal a user has been promoted to interactive mode — they must not appear pre-auth.

**Applies to:** `/checklist`.

**Personas affected:** ANON.

**Why it exists:** Accidentally-rendered response buttons that 401 on click would imply the user can save anonymously, then lose the data — a worse UX than not showing them at all. Easy regression class.

**Mechanical test idea:** As ANON, render `/checklist` and assert zero elements matching the response-button selector. Then sign in, assert > 0.

---

## INV-advertised-deletion-actually-deletes

**Statement:** Any button labelled "delete" / "permanently delete" that returns UI success MUST have actually removed the advertised rows. If the backing RPC or migration is missing, the client shows a clear non-jargon error AND does NOT claim success.

**Applies to:** `/workspace/team` (Revoke + delete data), `/workspace/settings/gdpr` (delete organisation, delete my account).

**Personas affected:** O1, O2, O3 (owners); E2 (employee self-delete).

**Why it exists:** PDF #46 appeared to do nothing; a silent no-op after a GDPR-labelled click is a compliance misstatement. F-049 AC-2/AC-3 codifies the fix for the specific button; this invariant locks the class.

**Mechanical test idea:** After any confirmed delete, query the target table via service-role and assert zero rows remain for the advertised subject. If the RPC is missing (503 `migration_pending` or equivalent), assert the success toast is NOT shown AND a non-leaky error banner IS shown.

---

## INV-audit-log-pii-hashed

**Statement:** `smbsec1.audit_logs` never stores plaintext PII (email, display name) for revoke / delete / member-management events. Emails are stored as SHA-256 hashes (per F-033 PI-14 decision). Copy that references audit-log content uses plain language — never the jargon phrase "audit log PII".

**Applies to:** every code path that writes to `smbsec1.audit_logs`; `/workspace/team` Revoke + delete confirmation copy; `/workspace/settings/gdpr` delete confirmation.

**Personas affected:** all (subjects whose email could land in audit logs); O1/O2/O3 (actors who read the copy).

**Why it exists:** PDF #45 — "audit log PII" is opaque because the value is *already* hashed; the copy does not match the reality. Invariant pairs copy with data shape so they cannot drift.

**Mechanical test idea:** SQL probe after an invite + revoke+delete cycle — assert no row in `audit_logs` contains the invitee's plaintext email (regex on `details::text`). UI probe — assert the Revoke+Delete confirmation dialog body does NOT match `/audit log PII/i`.

---

## INV-workspace-auth-boundary

**Statement:** Any `/workspace/*` route renders zero sensitive content for an unauthenticated caller. Response is either a redirect to `/login` OR an empty shell with no org/member/email data in HTML.

**Applies to:** all `/workspace/**` routes and their server components.

**Personas affected:** ANON.

**Why it exists:** Cheap defence-in-depth. Catches accidental `"use client"` leaks, misconfigured guards, or SSR data-in-HTML escapes.

**Mechanical test idea:** For each `/workspace/*` route, fetch with no cookie; assert either (a) 3xx to `/login`, or (b) body contains none of the seeded org name, any seeded email address, or any member id from the test fixture.

---

## INV-no-service-role-in-client-bundle

**Statement:** `SUPABASE_SERVICE_ROLE_KEY` (the value and the env var name) never appears in client-side JavaScript bundles, client-rendered HTML, or any `NEXT_PUBLIC_*` env variable.

**Applies to:** build output — `frontend/.next/static/**` and any HTML served by the app.

**Personas affected:** N/A — build-time check.

**Why it exists:** CLAUDE.md already requires this; the invariant makes it automatically verifiable on every CI run. The cost of a leaked service-role key is unrecoverable.

**Mechanical test idea:** CI job greps `frontend/.next/static/**` and server chunks shipped to the client for the literal string `SUPABASE_SERVICE_ROLE_KEY` and for the JWT prefix of the current service-role key. Non-zero match → fail build.

---

## INV-rls-on-every-smbsec1-table

**Statement:** Every table in schema `smbsec1` has `rowsecurity = true` in `pg_tables` AND at least one policy in `pg_policies`. A new table without RLS silently exposes data via the anon key.

**Applies to:** Supabase schema `smbsec1`.

**Personas affected:** all — defence-in-depth.

**Why it exists:** A common mistake during migrations is creating a table and forgetting the enabling `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Invariant catches it at the earliest possible moment (CI probe or smoke run).

**Mechanical test idea:** Probe `pg_tables` + `pg_policies` via service-role from a test; fail if any `schemaname = 'smbsec1'` row has `rowsecurity = false` or zero rows in `pg_policies` for that table.

---

## INV-destructive-action-double-confirm

**Statement:** Every destructive action that deletes cross-user or org-scope data requires either (a) typed-confirm of the subject email/org name, OR (b) an explicit second click on a distinct red button. Confirmation copy is plain-language and names every category being deleted — never jargon like "audit log PII".

**Applies to:** `/workspace/team` (Remove member, Revoke + delete data), `/workspace/settings/gdpr` (Delete organisation, Delete my account).

**Personas affected:** O1, O2, O3 (actors); E2 (self-deleter).

**Why it exists:** F-049 AC-3 requires plain-language copy; this invariant extends that to the whole class of destructive actions and formalises the two-step guard that prevents accidental irreversible clicks.

**Mechanical test idea:** For each destructive action, assert the confirm button is disabled until the typed-confirm matches (where used) OR a second click on a visually distinct red button is required. Assert the dialog body does not match the jargon regex `/(audit log PII|digest\(text|SQLSTATE)/i`.

---

## INV-email-case-normalised-on-delete

**Statement:** Deletion-by-email is case-insensitive and whitespace-trimmed on both the RPC input and any subsequent lookup. `Foo@X.com` deletes the row stored as `foo@x.com`.

**Applies to:** `DELETE /api/orgs/members`, revoke + delete RPC, any GDPR delete endpoint keyed on email.

**Personas affected:** O1, O2, O3.

**Why it exists:** A classic silent-miss — UI says success because one normalisation path matched, but another lookup used raw case and the row survives. Makes `INV-advertised-deletion-actually-deletes` fail silently if unguarded.

**Mechanical test idea:** Seed an invite / membership with `Mixed@Case.com`; call delete with `mixed@case.com`; assert row gone. Repeat with trailing whitespace.

---

## How to add a new invariant

1. Trigger: a defect that touches more than one page, OR a state matrix cell that is "true everywhere" but not enforced anywhere.
2. Pick a stable ID — `INV-<area>-<short-name>` — and never rename it.
3. Fill all six fields.
4. Add a test in `frontend/tests/invariants.spec.ts` that fails before the fix and passes after.
5. Reference the new ID in every state matrix cell it covers (`Linked invariants:` row).
6. If the invariant restricts how a *future* feature must behave, mention it in `docs/product/feature_rules.md` so the next BA refinement picks it up.
