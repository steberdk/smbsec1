# State Matrix — Login (`/login`)

**Page file:** `frontend/app/login/page.tsx` (callback at `frontend/app/auth/callback/page.tsx` referenced where reached from login)
**Route:** `/login` (query params: `next`, `email`, `intent=signup`)
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** PI-16 Phase A retrofit (F-045). Authored 2026-04-14 by UX + Architect pair.

- Persona source: `docs/quality/personas.md` (last reviewed: 2026-04-14)
- Invariant source: `docs/quality/invariants.md`
- Last full walkthrough: 2026-04-14 by UX+Architect (source-only; no browser)
- Linked features: F-024 (headline parity), F-045, F-046

---

## Canonical source of truth

The login page is a **stateless entry surface**. Its visible state is a pure function of:

```
(authState, searchParams{next, email, intent}, formStatus, error)
```

- `authState` — result of `supabase.auth.getSession()` at mount. **TODAY THIS IS NOT CHECKED** — the page unconditionally renders the form even if a session already exists (see Defect L-AUTH-SIGNED-IN below).
- `next` — `sanitizeNext(searchParams.get("next"))` → defaults to `/workspace`, rejects `//` and non-rooted values.
- `intent` — `searchParams.get("intent")` → when `"signup"`, swaps the H1 (landing "Sign up free" CTA appends it; F-024).
- `inviteToken` — extracted from `next` when `next` points to `/accept-invite?token=…`. Drives the side info-card copy and persists the token in `sessionStorage` so `/onboarding`'s safety-net redirect can fire it.
- `formStatus` ∈ {`idle`, `sending`, `sent`, `verifying`, `error`}.

Everything else (OTP 6-digit auto-submit, "Use a different email" reset, rate-limit friendly error copy) is derived from the above.

---

## Page regions (columns)

Enumerated from `frontend/app/login/page.tsx` (lines 141–294):

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Top bar** — `smbsec` wordmark linking to `/` | lines 144–148 |
| R2 | **Headline block** — `<h1>` + subtitle; two variants driven by `isSignupIntent` | lines 153–167 |
| R3 | **Email form** — label, `<input type=email>`, "Send sign-in link" button, error line | lines 170–200 |
| R4 | **Sent confirmation banner** — green "Sent! Check your email…" box + recipient echo | lines 203–215 |
| R5 | **OTP code entry** — 6–8 digit numeric input, auto-submit, Verify button, "Use a different email" reset | lines 217–263 |
| R6 | **Context info card (side)** — EITHER invite-context (teal) OR new-user-steps (white) | lines 268–285 |
| R7 | **Back-to-home link** | lines 287–291 |
| R8 | **Post-success redirect** — `router.replace(next)` after PKCE or OTP verify | lines 113, 129; R8 is behaviour, not a visible region |
| R9 | **Already-signed-in guard** — intended: redirect signed-in callers to `next` / `/workspace` / post-login destination | INTENDED — **not implemented today** |

`/auth/callback` is covered by its own (future) matrix but appears in R8's "after successful magic-link click" flow. The PKCE invariant (below) straddles both pages.

---

## Personas (rows)

Fixed order per `state-matrix-template.md` §Rows:
`ANON | O1 | O2 | O3 | IT1 | E1 | E2`

---

## Matrix

Legend: `—` = region not rendered for this persona. `DEFECT — …` = today's code diverges from intent. `INV-…` = invariant IDs from `docs/quality/invariants.md`.

### R1 — Top bar

| Persona | Expected | Status |
|---|---|---|
| ANON | `smbsec` wordmark links to `/`. No user menu. | OK |
| O1 / O2 / O3 / IT1 / E2 | Never reach R1 — would have been redirected by R9. See R9 defect; today they DO see R1 (cosmetic only). | OK (contingent on R9 fix) |
| E1 | As ANON — invitee lands here signed-out. | OK |

Linked invariants: INV-state-pure-of-navigation.

### R2 — Headline block

Two variants:
- `isSignupIntent` → H1 "Create your free account" + subtitle "Enter your email — we'll send you a link to get started. No password needed."
- else → H1 "Welcome back" + subtitle "Enter your email — we'll send you a sign-in link."

| Persona | Expected | Status |
|---|---|---|
| ANON (no intent) | "Welcome back" + sign-in subtitle. | DEFECT L-WELCOMEBACK-FIRSTVISIT — a first-time visitor arriving from any non-signup entry (direct URL, footer link, blog post) sees "Welcome back" even though they have never signed in. F-024 partially addresses via `?intent=signup` from landing, but anyone landing without the query param still gets the returning-user headline. Recommend: three-state headline driven by `(intent, inviteContext)` → `signup` → "Create your free account"; `invite` → "Sign in to accept your invitation"; default → neutral "Sign in or sign up" with unified subtitle. |
| ANON (invite context, `next=/accept-invite?token=…`) | Headline should read "Sign in to accept your invitation" or similar — current code leaves it at "Welcome back" because `isInviteContext` only drives R6, not R2. | DEFECT L-INVITE-HEADLINE-PARITY (new finding, extends F-024) — the invite side-card (R6) and the headline (R2) are two surfaces for the same fact; they must not disagree. Candidate for a new invariant — see "Invariant gap" below. |
| ANON (`?intent=signup`) | "Create your free account" + signup subtitle. | OK |
| O1 / O2 / O3 / IT1 / E2 | — (should be redirected per R9; see R9 defect) | N/A — contingent on R9 |
| E1 | As ANON(invite context). | DEFECT L-INVITE-HEADLINE-PARITY (as above). |

Linked invariants: INV-state-pure-of-navigation; candidate `INV-login-headline-context-parity` (see gap).

### R3 — Email form

Renders when `status ∉ {sent, verifying}`.

| Persona | Expected | Status |
|---|---|---|
| ANON | Empty email field (unless `?email=` prefill), "Send sign-in link" primary button, form submit calls `supabase.auth.signInWithOtp({ email, emailRedirectTo })`. Error copy rewrites `rate limit` → "Too many attempts — please try again in a few minutes." | OK |
| O1 / O2 / O3 / IT1 / E2 | — (should be redirected per R9) | N/A — contingent on R9 |
| E1 | As ANON. Email prefill from `?email=` recommended when invite email is known to the landing URL (not currently passed through invite emails — flag). | DEFECT L-INVITE-EMAIL-PREFILL (new finding, Low priority) — invite email template does not append `?email={invitee}` to the invite link's login fallback, so E1 retypes an email that the system already knows. Surfaces as a Medium-severity F-024/F-027 adjacent polish. |

Linked invariants: INV-no-raw-db-errors (error copy must not leak provider internals — rate-limit path already complies; other Supabase errors currently render raw `error.message`).

**Secondary finding L-RAW-ERROR-LEAK (new):** on non-rate-limit errors, `setError(error.message)` passes the Supabase/Postgres message through verbatim. While Supabase auth errors are usually user-safe, a DB-level failure during signup can leak `function … does not exist` style strings. INV-no-raw-db-errors applies; recommend wrapping in a whitelist / generic fallback. Low priority but in-scope for invariant enforcement.

### R4 — Sent confirmation banner

Renders when `status ∈ {sent, verifying}`.

| Persona | Expected | Status |
|---|---|---|
| ANON / E1 | Green banner: "Sent! Check your email for a sign-in link or enter the code below." + grey recipient echo "Sent to: **{email}**". | OK |
| O1 / O2 / O3 / IT1 / E2 | — (should be redirected per R9) | N/A — contingent on R9 |

Linked invariants: INV-state-pure-of-navigation (banner must re-appear on reload-same-status; today the page has no URL `?sent=1`, so a reload resets to R3. Acceptable because the magic-link email is already in the user's inbox — no data loss.)

### R5 — OTP code entry

Renders when `status ∈ {sent, verifying}`. Numeric-only input, 6–8 digits, auto-submits at 6. Verify button posts `verifyOtp({ type: "magiclink" })` then falls back to `{ type: "signup" }` for first-time users. On success: `router.replace(next)`.

| Persona | Expected | Status |
|---|---|---|
| ANON / E1 | Functional OTP entry. "Use a different email" resets status + email + code. On success: redirect to sanitized `next` (default `/workspace`). | OK |
| O1 / O2 / O3 / IT1 / E2 | — (R9) | N/A — contingent on R9 |

Linked invariants: INV-workspace-auth-boundary (post-success redirect lands on `/workspace` which must have its own auth guard — and does, via `useWorkspace`/`useSession`). Candidate `INV-no-auth-token-in-url` (PKCE) — see invariant gap.

**Finding L-OTP-DOUBLE-VERIFY-RACE (source inspection):** lines 106–129 attempt `type: "magiclink"` then `type: "signup"`. If the first call succeeds the redirect fires; if it fails with a non-expiry reason the second call still runs. A user who typed a genuinely wrong code gets the second API's error back (which will also fail with "Token has expired or is invalid"). Acceptable because the end error message is stable, but architecturally the two-branch pattern masks which code type the user actually has — flag as low-priority refactor candidate, no visible defect today.

### R6 — Context info card (side)

Two variants, mutually exclusive:
- `isInviteContext` (teal) — "Joining an existing team? Log in with the email address your invitation was sent to — then you can accept in one click."
- else (white) — "New here? Here's how it works:" + 3-step ordered list ("Enter your email…", "Name your organisation (takes 2 minutes)", "Invite your team and start your security review").

| Persona | Expected | Status |
|---|---|---|
| ANON (default) | White "New here?" card with 3-step list. | OK |
| ANON (invite context) | Teal "Joining an existing team?" card. | OK — *content* consistent. But headline (R2) does not match invite context — see L-INVITE-HEADLINE-PARITY above. |
| ANON (`?intent=signup`) | White "New here?" card. | OK |
| O1 / O2 / O3 / IT1 / E2 | — (R9) | N/A — contingent on R9 |
| E1 | Teal "Joining an existing team?" card. | OK |

Linked invariants: candidate `INV-login-headline-context-parity`.

### R7 — Back-to-home link

| Persona | Expected | Status |
|---|---|---|
| All | "Back to home" link to `/`. | OK |

### R8 — Post-success redirect (behaviour, not visible)

Expected: on OTP-verify success (`router.replace(next)`) OR on magic-link click → `/auth/callback?code=…` exchange → `router.replace(next)`. Sanitization in both files rejects protocol-relative (`//evil`) and non-rooted values, defaulting to `/workspace`.

| Persona | Expected | Status |
|---|---|---|
| ANON → becomes a new owner | Redirect to `/workspace`; `/workspace` routes to `/onboarding` (via `useWorkspace` 404 handling). | OK |
| ANON → becomes returning O1/O2/O3/IT1/E2 | Redirect to `next` (default `/workspace`) — Home page loads. | OK |
| E1 (invite context) | After verify, sessionStorage token triggers `/onboarding` → `/accept-invite?token=…` safety-net redirect (see onboarding matrix R-GUARD). | OK |

Linked invariants: INV-workspace-auth-boundary (the callback page must never echo the magic-link token in HTML — today it uses PKCE `?code=` and passes it to `exchangeCodeForSession`; URL code is short-lived and single-use — acceptable per PKCE spec). Candidate `INV-no-auth-token-in-url` documents this explicitly.

### R9 — Already-signed-in guard (intended, not implemented)

**Intended:** on mount, if `supabase.auth.getSession()` returns a session, `router.replace(sanitizeNext(searchParams.get("next")))`. Signed-in users who type `/login` directly, click an old bookmarked login link, or follow a stale magic-link after already being signed in another tab must NOT see the form.

| Persona | Expected | Status |
|---|---|---|
| ANON | No guard fires; form renders. | OK |
| O1 / O2 / O3 / IT1 / E2 | Guard fires → `router.replace("/workspace")` (or `next` if provided). | **DEFECT L-AUTH-SIGNED-IN — today `/login` has no session check; a signed-in user sees the full form, can re-request a magic link, and only lands in `/workspace` after re-authenticating.** New finding. Priority: High. Fix scope: add a `useSession()` guard mirroring `/onboarding`'s pattern (lines 35–39), redirecting to `sanitizeNext(next)` when `token && !sessionLoading`. This is the exact counterpart of `/onboarding`'s "already has org" redirect and is the direct enforcement of `INV-workspace-auth-boundary`'s spirit on the inverse route. |
| E1 | If E1 is signed in to a different identity (not their invited email), the guard should still fire (redirect to `next`), and the `/accept-invite` landing will handle the "wrong email" mismatch. | DEFECT L-AUTH-SIGNED-IN (same root). |

Linked invariants: INV-workspace-auth-boundary (indirect); candidate `INV-login-page-no-authed-users`.

---

## Invariants referenced

| ID | Statement | Cells |
|---|---|---|
| INV-workspace-auth-boundary | Signed-in users at `/login` must not see the sign-in form — the route's purpose is satisfied, redirect to `next`. (Today the invariant is stated only for `/workspace/*`; this matrix surfaces the inverse direction — see gap.) | R8, R9 |
| INV-state-pure-of-navigation | The login form's visible state derives only from `(authState, searchParams, formStatus)`. | R1, R2, R4 |
| INV-no-raw-db-errors | Error banner rewrites `rate limit` to user copy; all other paths must not leak raw Supabase/Postgres strings. | R3 |

---

## Invariant gaps (proposed new invariants)

1. **`INV-no-auth-token-in-url`** — No magic-link JWT, OTP code, or access_token ever appears in URL path / query / fragment visible in the browser address bar after session establishment. PKCE's `?code=` is a one-time exchange token (not a JWT) and is acceptable for the duration of the `/auth/callback` exchange; it must be removed from history once consumed. Applies to `/auth/callback`. Personas: ANON, E1 (entry point personas). Why: CLAUDE.md "Architecture > Auth (PKCE)" says "tokens never appear in URLs" — no invariant enforces it. Test idea: network + location-bar snapshot at each step; assert no string matching `eyJ[A-Za-z0-9_-]{20,}` (JWT prefix) in `window.location.href` after `/auth/callback` redirect completes.

2. **`INV-login-page-no-authed-users`** — `/login` mounted with an active Supabase session redirects to `sanitizeNext(next)` before rendering the form. Applies to `/login`. Personas: O1, O2, O3, IT1, E2. Why: closes R9 defect. Test idea: seed persona session, navigate to `/login`, assert `router.replace` happens and form markup is never visible (zero elements matching `input[type=email]`).

3. **`INV-login-headline-context-parity`** — The login headline (R2) and the side info card (R6) agree on which context the user is in: fresh sign-in vs. signup vs. invite acceptance. Applies to `/login`. Personas: ANON, E1. Why: today R6 changes for invite context but R2 does not (L-INVITE-HEADLINE-PARITY). Test idea: for each context permutation, assert H1 text and side-card heading belong to the same context class.

Raising all three as candidates for `invariants.md` in the same PR as this matrix set.

---

## Defect summary (feeds PI-16 fix scope)

| Cell | Tag | PDF # / source | Priority | One-liner |
|---|---|---|---|---|
| R9 × {O1, O2, O3, IT1, E2} | L-AUTH-SIGNED-IN | new finding | High | `/login` has no already-signed-in redirect; authed users see the form. |
| R2 × ANON (no intent, first visit) | L-WELCOMEBACK-FIRSTVISIT | extends F-024 | Medium | Default H1 "Welcome back" misleads first-time visitors who didn't come via `?intent=signup`. |
| R2 × ANON (invite context) / E1 | L-INVITE-HEADLINE-PARITY | new finding | Medium | Headline stays "Welcome back" while side card says "Joining an existing team?" — two surfaces, one context. |
| R3 × E1 | L-INVITE-EMAIL-PREFILL | new finding | Low | Invite email could pass `?email=` to pre-fill the login field. |
| R3 × ANON | L-RAW-ERROR-LEAK | INV-no-raw-db-errors | Low | Non-rate-limit errors render `error.message` verbatim. |

---

## Notes / dependencies

- Sanitization helper `sanitizeNext()` is duplicated in `/login` and `/auth/callback`. Architect note: extract to `frontend/lib/auth/sanitize.ts` before either page is modified further — the duplication will silently drift.
- `sessionStorage.setItem("smbsec_pending_invite_token", ...)` at line 63 creates a cross-page channel read by `/onboarding` (lines 44–52) and `/accept-invite`. This is documented here so the onboarding matrix's R-GUARD cell can reference the same mechanism.
- OTP input `pattern="[0-9]{6,8}"` + `maxLength={8}` + auto-submit at 6 is an implicit contract with Supabase's token length. If Supabase ever issues 4-digit or alphanumeric codes, this UI breaks silently — low-priority architectural note for monitoring.
- This matrix does not cover `/auth/callback` comprehensively; it references it only via R8 and the PKCE invariant. A dedicated `auth-callback.md` matrix should be authored in the next Phase A batch — add to the F-045 backlog.
