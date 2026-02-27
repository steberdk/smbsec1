# Work Request Template (for AI agents / contributors)

## Title
[Short imperative title, e.g. "Add Supabase login page"]

## Goal
What user-visible outcome should exist when done?

## Non-goals
What should NOT be done as part of this work?

## Context / Background
Why are we doing this? Any constraints (free tier, security, GDPR)?

## UX / Screens affected
List routes and expected changes:
- /
- /checklist
- /summary
- /login
- /workspace
(etc.)

## Functional requirements
Bullet list of required behaviors.

## Acceptance criteria (must be testable)
Write as "Given / When / Then" or simple checklist. Example:
- [ ] User can open /login and request a sign-in email
- [ ] After signing in, user can open /workspace
- [ ] If not signed in, /workspace redirects to /login
- [ ] CI passes (lint + build + e2e)

## Data model changes
If DB changes are needed:
- Tables/columns
- RLS policies
- Migrations

## Security considerations
- Secrets handling (no secrets in repo)
- Supabase keys usage (no service_role on client)
- GDPR implications (export/delete requirements)

## Implementation plan (proposed)
Step-by-step plan before coding.

## Test plan
What must be covered:
- Lint + build
- Playwright tests (list the flows)
- Manual smoke test steps

## Rollback plan
How to revert safely if needed.

## Notes / Links
Relevant docs, screenshots, references.
