# CLAUDE.md
Guidance for Claude Code when working in this repository.

## Product Vision
Goal: Help SMB owners address top security risks in 30 minutes - without creating account (user/password) and without payment, but with guidance. If owner logs in and creates organisation then it will provide more guidance, learn organisation, and collect/document about security topics.
Primary user: Business Owner.
Core loop: Assess → Fix → Track → Reassess
MVP (already provided): Guided checklist + progress + company workspace
Constraints: Free tier must work. Simple and cool UX. GDPR native/transparent.
Acceptance criteria:
- For non-logged in users:
   - Explanation why and how.
   - Checklist.
   - Account creation (no payment).
   - GDPR and data
- For logged in users:
   - Explanation and checklist available as for non-logged in.
   - Can set himself as owner, define who is IT responsible, and add employees to all be included in security assessment, learning and improvement.
   - User can see progress of his team.
   - GDPR and data
   - Guided checklist

## Development Process
### Features
All development must bemaintained in a Feature (in \docs\product\features.md) after every work related to feature, from idea to finished accept tested delivery, according to \docs\product\feature_rules.md
Read \docs\product\feature_rules.md before maintaining features.
### Feature Backlog
In \docs\product\backlog.md
 in Backlog (after every work related to feature, from idea to finished accept tested delivery), according to \docs\product\backlog_rules.md
Read \docs\product\backlog_rules.md before maintaining features in backlog to do it right.

### PI's and iterations
To be followed for all development.
Work is conducted in SAFe (Scaled Agile) manner, but with one PI having 3 iterations (if there is enough features for 3 iterations). After one PI the next starts.
The process of a PI:
1. PI-START:
1a. Each PI starts with Product Team analyzing what to do in this PI based on product vision, knowledge of current functionality (team, maybe apart from Product manager) must see and use the actual solution, e.g. with playwright, to assess what makes most sense.
    The Product team is described in section below. Product team iterates as many times as needed until they agree on next features - at least 3 team internal iterations before they had a chance to consider each others ideas/analysis and subsequent comments.
1b. Based on Product Teams decisions, you provide a summary of Backlog and next PI's features to me/Stefan, so I can assess if I agree.
    A focus point is if it contains all Feature sections, including test expectations.
    Either I ask stuff you must take back for more team-internal iterations with the Product Team, or I approve and you run the 3 iterations without asking me/Stefan anything - unless there is a hard stop somehow.
2. PI-DEV:
2a. In each iteration included features go from status Ready to Developed IF tests in local environment succeed. All tests that can be done in local environment should be done here also, because finding defects in DEV is much cheaper than finding them in PROD.
    During start/dev/test/.. you keep backlog and feature status updated (and feature updated in case something more than expected pops up. The Feature definition is the place for information about the feature.
    When iteration 1 is done, you start iteration 2, and then iteration 3. In each iteration and for each feature, the feature cannot be set to status Developed unless all tests according to feature Risk and amount of Test has been covered.
    All testing in iterations is done by IT Dev Team. Preferably with automatic tests, alternatively with browser control. All tests are documented, so they can be read and re-executed any time. Defining what tests are to be done is high level a Product Team responsibility (see section "Risk and amount of Test" in Feature), but lower level whitebox and exact test case definition e.g. in browser must wait until after exact implementation, and is a IT Dev responsibility. No feature is set into Develped state before all tests are documented and ready for execution - and test IT Dev team can do in lower env are done. Also all defects found are handled (and all planned tests are redone) inside iteration before feature is set to Developed.
3. PI-END:
3a. All PI features are deployed (in one go at the end to preserve resources).
    All tests must succeed. In case of defects a feature and defect goes back to IT Dev team and must be remediated, including possible new test cases to cover possible new code, before PI can be closed and features can be set to Deployed or Done. In case of defects the PI goes back into 2. PI-DEV state.
3b. Business Test Team is started and conducts tests according to "Business Test Team" below.
Features in Ready state can be prioritized for a PI by Product Team for IT Dev team. I.e. features must be in Ready state to be prioritized for PI.
One feature must fit into one iteration. One iteration can have multiple features. All features to be tested locally within iteration before moving feature to Developed state. No errors are allowed.
In the start of PI coordinator starts Product Team to 

### Product Team
Consists of individual AI agents (not you rotating), coordinated by you. Each time Product Team is used, start 5 single/individual agents with roles of:
Product Manager, UX/UI designer, Security Expert, Architect, Business Analyst.

### IT Dev Team
You coordinating and doing development and testing.

### Business Test Team
You coordinate a number of independent/single AI agents (not you rotating) to test full solution at end of PI.
Reason: Too many times have I used half or full days to test, and find things that were not entirely according to features.
Goal:
- Walkthrough of all combinations of user types, creatings of new users, existing users, ANON and logged in, menu options, options to select, checklist usage, choices.
- Also check for inconsistencies in naming/description on menu items/links/topics.
- Also check if it all looks and functions nice/easy.
Issues found:
- To be put in issues log (issue number, name, description, percieved priority) to be presented for Product Team at the start of next PI for their consideration. Product Team can chose to put it into 1..n feature(s).
- Put issue log in separate PI named file.

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
This is the technical definition. You must 
Every change must pass — in this order:

1. `npm run lint` — zero warnings
2. `npm run build` — clean
3. `npm run test:e2e` — locally, for any changed user flows
4. **`git push` → wait for CI green** — run `gh run list --limit 1` and poll until complete. **Never push a second commit until the first one passes.** If CI fails, fix before pushing more code.
5. **Verify Vercel deployment** — after CI green, regression test live app (Playwright MCP or browser)
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
