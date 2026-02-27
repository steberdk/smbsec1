# Architecture (smbsec1)

## Purpose
smbsec1 is an SMB security quick-check tool. MVP0 provides an interactive checklist and summary. Next phases add authentication, a company workspace, and employee invites.

Core loop:
Assess → Fix → Track → Reassess

## Tech stack
- Frontend: Next.js 16 (App Router), TypeScript, Tailwind
- Auth/DB: Supabase (Auth now, DB next)
- Tests: Playwright E2E + ESLint
- Hosting: Vercel
- CI: GitHub Actions

## Environments
### Local (Windows)
- Native: `cd frontend && npm run dev`
- Docker: `docker compose up --build`

### Cloud
- Preview deployments: per PR (Vercel)
- Production: main branch deploy (Vercel)

## Routing (current + planned)
### Public (no login required)
- `/` Home (why + start)
- `/checklist` Checklist UI (currently browser localStorage)
- `/summary` Summary UI (currently browser localStorage)
- `/login` Login (Supabase Auth)

### Protected (login required)
- `/workspace` Minimal landing for signed-in user (will become company workspace)

## Data model
### MVP0 (today)
Progress is stored in browser localStorage only.

Key implications:
- Not shareable across devices
- Not multi-user
- Prone to hydration mismatch if rendered server-side without guarding
- Safe for MVP0, replaced later

### MVP1 (next)
Move progress into Supabase Postgres. Minimal tables:

- `companies`
  - `id` (uuid)
  - `name` (text)
  - `created_at` (timestamptz)

- `memberships`
  - `id` (uuid)
  - `company_id` (uuid FK companies.id)
  - `user_id` (uuid FK auth.users.id)
  - `role` (text: owner | manager | employee)
  - `created_at`

- `assessments` (later)
  - `id`
  - `company_id`
  - `user_id`
  - `period_start`, `period_end`
  - `data` (jsonb)
  - `created_at`

RLS (Row Level Security) will be required for all tables.

## Auth model
- Supabase Auth used for email sign-in
- Frontend uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Never use `service_role` on the client
- Protected pages redirect to `/login` if no session/user

## Security & privacy
- MVP0: stores progress locally (localStorage) only
- MVP1+: per-company access via RLS
- GDPR features planned:
  - export employee data
  - delete employee + their assessments
  - delete company (and all associated data)

## CI contract
Every PR must pass:
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

## Known gotchas
- Next.js dev on Windows can be unstable with Turbopack; use webpack dev mode if needed.
- localStorage-based pages must avoid server/client mismatch (guard with mounted state).
