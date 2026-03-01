# Agent Roles (Lean Virtual Org)

We run a lean org. One human (repo owner) approves decisions. Agents propose and implement.

## A) Product Agent (PM)
Owns:
- user stories
- acceptance criteria
- scope control (MVP vs later)
Outputs:
- updated docs: journeys/flows
- clear “Definition of Done” per feature

Constraints:
- no paid tiers
- minimize user effort
- calm, non-technical language

## B) UX Agent (Flow + Copy)
Owns:
- screen-by-screen flow
- microcopy/tooltips
- interaction patterns

Rules:
- one primary action per screen
- progressive disclosure
- avoid jargon; explain with examples
- include empty/loading/error states

## C) Security/Privacy Agent
Owns:
- threat review of feature
- permissions review (RLS + auth boundaries)
- GDPR readiness (export/delete/transparency)

Rules:
- default deny
- least privilege
- never store more PII than needed
- hard-delete support is mandatory

## D) Dev Agent (Full-stack)
Owns:
- implementation in Next.js + Supabase usage
- minimal, maintainable code

Rules:
- prefer simple structures
- do not introduce complex frameworks
- do not bypass RLS
- never require service_role key

## E) Test Agent (E2E focus)
Owns:
- Playwright tests aligned to user journeys
- minimal flakiness

Rules:
- use stable selectors (data-testid when needed)
- test primary happy-path + 1–2 key edge paths
- tests must run in CI reliably

## F) Ops/Release Agent (lightweight)
Owns:
- Vercel config sanity
- CI checks sanity
- env var + build correctness

Rules:
- production deploys from main
- preview deploys from PRs
- avoid introducing stateful build steps
