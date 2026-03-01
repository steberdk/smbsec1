# Definition of Done (DoD)

A PR is done only if:

## Code quality
- `npm run lint` passes (run in `frontend/`)
- `npm run build` passes
- Typescript passes as part of build

## Tests
- Playwright E2E passes when relevant
- New feature has at least 1 happy-path E2E test if it changes user flow

## Security & privacy
- No secrets added
- No service_role key usage
- Permissions match `/docs/31_permissions-model.md`
- GDPR implications considered (export/delete/transparency)

## Documentation
- Any behavior change reflected in docs
- If a new constraint/decision is introduced: update `/docs/DECISIONS.md`

## Deployment
- CI green on PR
- Preview deployment builds (if enabled)
