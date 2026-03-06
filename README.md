# smbsec1

SMB Security Quick-Check — guided, repeatable security baseline for small businesses.

Production: https://smbsec1.vercel.app

## Status

- Public checklist + local persistence
- Supabase auth + per-user cloud persistence
- CI (lint + build + Playwright) + protected main branch

Next: workspace/company model, roles, org invites.

## Quick start

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Or with Docker (from repo root):

```bash
docker compose up --build
```

## Commands (run inside `frontend/`)

```bash
npm run dev        # dev server (webpack, avoids Turbopack instability on Windows)
npm run build      # production build + TypeScript check
npm run lint       # ESLint (0 warnings allowed)
npm run test:e2e   # Playwright E2E tests
```

## Environment variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Set the same two variables in Vercel (Production + Preview).

## Docs

See `docs/` for product vision, domain model, permissions, user journeys, decisions, and SQL migrations.
