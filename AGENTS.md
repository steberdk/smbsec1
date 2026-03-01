# AI Agents — Operating Contract (smbsec1)

This repo is designed for AI-assisted development. Agents are welcome, but must follow the contract below.

## Non-negotiables
- **No secrets** in code, commits, logs, screenshots, or docs.
- **No Supabase service_role key** anywhere except in Supabase SQL editor (manual) or secure server-only env (not used yet).
- **Free tiers only** (Supabase/Vercel/GitHub). Do not introduce paid services or dependencies that require paid plans.
- **Small PRs**: one goal per PR. Prefer incremental merges.
- **Proposal-first**: agents must propose a plan before implementation.
- **Docs are source of truth**: user journeys, permissions, GDPR map, and schema rules live in `/docs`.

## Repo layout (high level)
- `frontend/` Next.js app (UI + API routes)
- `docs/` product + architecture + policies + SQL
- `docs/sql/` SQL migrations to apply manually in Supabase
- `.github/workflows/` CI checks (lint/build/e2e)

## Required workflow
1. **Open or select a Work Request** (use `/docs/WORK_REQUEST_TEMPLATE.md`)
2. **Read relevant docs**:
   - `/docs/20_user-journeys.md`
   - `/docs/21_screen-flow.md`
   - `/docs/30_domain-model.md`
   - `/docs/31_permissions-model.md`
   - `/docs/32_gdpr-data-map.md`
   - `/docs/DECISIONS.md`
3. **Write a proposal** using `/docs/agents/output_format.md`
4. Wait for human approval (repo owner)
5. Implement in a branch
6. Ensure Definition of Done (see `/docs/agents/definition-of-done.md`)
7. Open PR, CI must be green

## Guardrails
- Avoid large refactors without explicit approval.
- Prefer simple solutions over “enterprise patterns”.
- Keep UX calm, simple, non-scary. One primary action per screen.
- GDPR features must remain possible: export, delete, transparency.

## Environment rules
- Run npm commands inside `frontend/` (not repo root).
- Docker is supported; local Node is supported.
- Any changes that affect env vars must update README + `.env.example`.

## If anything conflicts
`/docs/DECISIONS.md` and `/docs/31_permissions-model.md` win.
