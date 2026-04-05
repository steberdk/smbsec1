# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Playwright

All code lives in `frontend/`. No separate backend.

## Commands

Run inside `frontend/`:

```bash
npm run dev       # dev server (--webpack; Turbopack unstable on Windows)
npm run build     # production build + TypeScript check
npm run lint      # ESLint (--max-warnings=0)
npm run test:e2e  # Playwright E2E tests
```

## Definition of Done

Every change must pass — in this order:

1. `npm run lint` — zero warnings
2. `npm run build` — clean
3. `npm run test:e2e` — locally, for any changed user flows
4. **`git push` → wait for CI green** — run `gh run list --limit 1` and poll until complete. **Never push a second commit until the first one passes.** If CI fails, fix before pushing more code.
5. **Verify Vercel deployment** — after CI green, spot-check the live app (Playwright MCP or browser)
6. **Update docs** — `docs/DECISIONS.md` for new decisions; `docs/product/backlog.md` for delivered items

New user-facing flows require at least one Playwright happy-path test.

## Architecture

### Auth (PKCE)

- Passwordless email auth via Supabase (magic link + OTP code fallback)
- PKCE flow (`flowType: "pkce"` in `lib/supabase/client.ts`) — tokens never appear in URLs
- Auth callback at `/auth/callback` exchanges `?code=` for session
- API routes: `supabaseForRequest(req)` in `lib/supabase/server.ts` validates caller JWT, uses service-role for DB writes
- RLS enabled on all tables as defence-in-depth
- Never use `service_role` key in frontend code

### Permission model

Roles: `org_admin` > `manager` > `employee`. Tree via `manager_user_id`. Permissions enforced in DB (RLS) + backend API — frontend checks alone are never sufficient. See `docs/31_permissions-model.md`.

### Services

| Service | Purpose | Env vars |
|---|---|---|
| Supabase | Auth + PostgreSQL + RLS | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Vercel | Hosting, auto-deploy on push to main | — |
| Resend | Email delivery (invites + auth via Supabase custom SMTP) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Stripe | Billing (Campaign Pro plan) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Anthropic | AI checklist guidance (Claude Haiku) | `ANTROPIC_API_KEY` |

All services use free tiers. Do not introduce paid dependencies without approval.

### Database

Schema: `smbsec1` (not public). All tables use RLS.

| Table | Purpose |
|---|---|
| `orgs` | Organisation record (name, platform, locale, billing) |
| `org_members` | Membership + role + manager tree |
| `assessments` | One active per org (partial unique index) |
| `assessment_items` | Immutable snapshot of checklist items |
| `assessment_responses` | Per-user responses (done / unsure / skipped) |
| `checklist_items` | Master checklist controls |
| `checklist_groups` | Grouping for checklist items |
| `invites` | Pending invites with token + expiry |
| `campaigns` | Phishing awareness campaigns |
| `campaign_templates` | Built-in + custom campaign templates |
| `campaign_recipients` | Per-recipient tracking (sent/clicked/reported) |
| `audit_logs` | Org lifecycle events |
| `user_checklists` | Legacy localStorage sync — do not extend |

SQL migrations: `docs/sql/` (001–020). Applied manually in Supabase SQL editor.

### Key routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | Public | Landing page (auth-aware: shows "Go to workspace" if signed in) |
| `/login` | Public | Magic link + OTP code entry |
| `/auth/callback` | Public | PKCE code exchange |
| `/checklist` | Public | Browse-only checklist (read-only for anon, interactive if signed in) |
| `/summary` | Public | Progress summary (sign-in required for real data) |
| `/privacy` | Public | GDPR privacy policy |
| `/onboarding` | Protected | First-time org setup |
| `/workspace` | Protected | Hub — links to all workspace pages |
| `/workspace/checklist` | Protected | Interactive checklist with AI guidance |
| `/workspace/dashboard` | Protected | Team progress overview |
| `/workspace/report` | Protected | Printable security posture report |
| `/workspace/campaigns/*` | Protected | Campaign creation, templates, results |
| `/workspace/billing` | Protected | Plan comparison, Stripe checkout |
| `/workspace/team` | Protected | Member list, invites |
| `/workspace/settings` | Protected | Org settings + GDPR data export/deletion |

## Environment Variables

`frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=              # sender for auth + invite emails
NEXT_PUBLIC_APP_URL=            # defaults to http://localhost:3000
ANTROPIC_API_KEY=               # AI guidance (Claude Haiku)
PLAYWRIGHT_ADMIN_EMAIL=         # E2E test account (must have completed onboarding)
```

Vercel production: all of the above plus `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

## Key Constraints

- `docs/DECISIONS.md` and `docs/31_permissions-model.md` are canonical — they win if anything conflicts
- One active assessment per org at a time (enforced by DB partial unique index)
- Assessment items are immutable once created (full snapshot on assessment start)
- Hard deletes only — no soft-delete flags
- Schema is `smbsec1`, not `public`
- localStorage pages must guard renders with a `mounted` state (hydration mismatch)
- `npm run lint` uses `--max-warnings=0` — any warning fails CI

## Documentation Map

| Doc | Purpose | Status |
|---|---|---|
| `docs/DECISIONS.md` | Architectural + product decisions (canonical) | Extend when making new decisions |
| `docs/31_permissions-model.md` | Role capabilities (canonical) | Current |
| `docs/00_product-vision.md` | Mission, personas, MVP definition | Current |
| `docs/10_design-system.md` | UI principles, visual tokens | Current |
| `docs/product/backlog.md` | PI-by-PI feature tracking | Update per PI |
| `docs/sql/` | Database migrations (001–020) | Source of truth for schema |
| `docs/agents/` | Agent roles, output format, templates | Current |
| `docs/pi3–pi10/` | Historical PI planning + BA verification | Archive — read-only |
