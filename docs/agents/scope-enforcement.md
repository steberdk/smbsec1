# Scope Enforcement Rules (MVP Safety Rails)

This repo is an MVP. Agents must keep scope tight.

## What is IN scope (now)
- Checklist UX + persistence per user
- Org + membership tree foundations (owner creates direct reports; managers create their direct reports)
- One active assessment per org at a time
- Reassessment creates a full copy of checklist items (snapshotted)
- Hard delete for GDPR (with safeguards/confirmations per model)
- Dynamic aggregation (compute tree on query; optimize later)
- Basic dashboard and summary views
- E2E tests for the main flows

## What is OUT of scope (now)
- Multi-tenant enterprise admin panels
- Complex role engines beyond defined roles
- Paid integrations/tools
- Heavy analytics, data warehouses, event buses
- Complex background job systems (unless explicitly approved)
- Long refactors or architecture rewrites

## “Stop and ask” triggers (must get approval)
If a change includes ANY of:
- new database tables beyond those needed for the WR
- new auth providers
- introducing queues/workers/cron systems
- rewriting existing checklist UI patterns
- changing the permission model
- storing new categories of PII

## MVP UX principles
- calm tone, non-scary
- one primary action per screen
- defaults over settings
- explain “why” in 1–2 lines max
- show progress and next step always
