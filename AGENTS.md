# Agent Operating Guide (smbsec1)

This document defines how AI agents (or automation) should work on this repo.

## Hard rules
- Do NOT commit secrets or `.env.local`
- Do NOT use Supabase `service_role` key in frontend code
- Use free-tier services only
- Prefer small, scoped PRs
- If a task is large: propose a plan first, then implement incrementally
- Do not change architecture without an explicit decision note in `docs/DECISIONS.md` (create if missing)

## Definition of Done
A change is done only when all are true:
- `cd frontend && npm run lint` passes
- `cd frontend && npm run build` passes
- `cd frontend && npm run test:e2e` passes
- GitHub Actions CI is green
- Change matches acceptance criteria in the work request

## Project commands
All npm commands must run inside `frontend/`.

### Local (native)
- Start dev: `cd frontend && npm run dev`
- Lint: `cd frontend && npm run lint`
- Build: `cd frontend && npm run build`
- E2E: `cd frontend && npm run test:e2e`

### Docker (recommended)
- Start: `docker compose up --build`
- Stop: `Ctrl+C` then `docker compose down`

## Branch / PR workflow
- Create branch: `git checkout -b feat/short-name`
- Commit small changes with clear messages
- Push and open PR
- Wait for CI green
- Merge when ready (solo maintainer may merge without approvals)

## Code style
- Keep components small and readable
- Avoid clever abstractions
- Keep user-facing copy short and plain
- Prefer explicit types over `any`
- Avoid breaking import alias `@/`

## Supabase usage notes
- Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Handle missing env vars gracefully (do not hard-crash build)
- Plan for RLS early (no table should be readable without policies)

## Testing expectations
Minimum Playwright coverage for any feature touching UX:
- Page loads
- Primary CTA works
- Auth gate works if relevant
- No console errors on main flows (optional but ideal)
