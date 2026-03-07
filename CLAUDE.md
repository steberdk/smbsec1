# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All npm commands must be run inside `frontend/` (not repo root):

```bash
cd frontend
npm install       # install dependencies
npm run dev       # dev server (webpack mode; avoids Turbopack instability on Windows)
npm run build     # production build (also runs TypeScript checks)
npm run lint      # ESLint (0 warnings allowed)
npm run test:e2e  # Playwright E2E tests
```

Docker alternative (from repo root):

```bash
docker compose up --build
```

## Definition of Done

Every PR must pass before merge:
1. `npm run lint` — zero warnings
2. `npm run build` — TypeScript + build must pass
3. `npm run test:e2e` — E2E must pass for any changed user flows
4. **Docs updated** — before a feature is considered complete, update the relevant docs:
   - `docs/DECISIONS.md` — any new architectural or product decisions made during implementation
   - `docs/20_user-journeys.md` — if a journey changes or a new one is added
   - `docs/40_acceptance-criteria.md` — mark completed ACs, add new ones for the feature
   - `docs/product/backlog.md` — move delivered items from backlog to done

New user-facing flows require at least one Playwright happy-path test.

## Architecture

**Stack**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase + Playwright

**Frontend-only repo**: `frontend/` contains the entire application. `backend/` is reserved for future services. All business logic and API routes live in the Next.js app.

### Routing

| Route | Auth | Notes |
|---|---|---|
| `/` | Public | Landing page |
| `/checklist` | Public | Interactive checklist (localStorage + optional remote sync) |
| `/summary` | Public | Progress summary |
| `/login` | Public | Supabase email auth |
| `/workspace` | Protected | Signed-in user landing (workspace model coming) |

Protected routes redirect to `/login` when no session exists.

### Data Flow — Checklist

The checklist page uses a **dual-layer persistence strategy**:

1. On mount: read from `localStorage` immediately (avoids hydration mismatch; guard with `mounted` state).
2. After mount: if logged in, fetch remote progress via `GET /api/checklist` — remote wins (source of truth).
3. On any change: save to localStorage instantly, then debounce a `PUT /api/checklist` (600ms) if logged in.

Key files:
- `frontend/lib/checklist/items.ts` — static checklist definition (groups + items)
- `frontend/lib/checklist/storage.ts` — localStorage helpers + API fetch/put wrappers
- `frontend/lib/checklist/progress.ts` — compute stats from `ChecklistProgress`
- `frontend/lib/checklist/types.ts` — `ChecklistProgress`, `ChecklistStatus` types
- `frontend/app/api/checklist/route.ts` — GET/PUT route handler (validates JWT, upserts `user_checklists`)
- `frontend/lib/supabase/client.ts` — browser Supabase client singleton
- `frontend/lib/db/checklistProgress.ts` — DB helpers for the legacy `checklist_progress` table (do not extend)

### Database (Supabase)

**Active table**: `public.user_checklists` — stores checklist progress as `jsonb data` keyed by item id, one row per user. Protected by RLS (users read/write only their own row).

**Legacy table** (do not extend): `public.checklist_progress` — older model using `checked_keys[]`.

**Planned schema** (see `docs/sql/002_workspaces.sql`):
- `orgs` — organization with `created_by`
- `org_members` — adjacency tree with `role` (org_admin | manager | employee) and `manager_user_id`
- `assessments` — one active assessment per org enforced by partial unique index
- `assessment_items` — immutable snapshot of checklist items at assessment creation time
- `assessment_responses` — per-user responses (done | unsure | skipped)

SQL migrations are applied **manually** in the Supabase SQL editor. Files live in `docs/sql/`.

### Auth

- Supabase email auth only
- Frontend uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- API routes create a Supabase client with the user's JWT forwarded via `Authorization: Bearer <token>` — RLS enforces access at DB level
- Never use `service_role` key in the frontend

### Permission Model

Roles: `org_admin` > `manager` > `employee`. Hierarchical tree via `manager_user_id` (adjacency list). Subtree queries use recursive CTEs at query time (SMB orgs are small).

**Canonical rule**: Permissions must be enforced in DB (RLS) + backend API. Frontend checks are not sufficient. See `docs/31_permissions-model.md` and `docs/DECISIONS.md`.

## Environment Variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Agent Workflow

Before implementing, agents must:
1. Open or identify a Work Request (`docs/WORK_REQUEST_TEMPLATE.md`)
2. Read relevant docs: `docs/20_user-journeys.md`, `docs/30_domain-model.md`, `docs/31_permissions-model.md`, `docs/DECISIONS.md`
3. Write a proposal using the format in `docs/agents/output_format.md`
4. Wait for human approval before implementing

Branch naming: `feat/<short-name>` or `fix/<short-name>`.

If a decision or new constraint is introduced during implementation, update `docs/DECISIONS.md`.

## Key Constraints

- `docs/DECISIONS.md` and `docs/31_permissions-model.md` are canonical — they win if anything conflicts
- One active assessment per org at a time (enforced by DB unique partial index)
- Assessment items are immutable once created (full snapshot on assessment start)
- Hard deletes only — no soft-delete flags
- Free tiers only — do not introduce paid services or dependencies
- No direct pushes to `main` — all changes via PR with CI green

## Known Gotchas

- Turbopack is unstable on Windows; `npm run dev` uses `--webpack` flag by default
- localStorage-based pages must guard renders with a `mounted` state to avoid server/client hydration mismatch
- `npm run lint` uses `--max-warnings=0` — any ESLint warning fails CI
