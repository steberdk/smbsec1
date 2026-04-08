# PI 13 — Test Results

## Iteration 1: All features (High + Medium + Low)

### E2E Tests
- **58 passed**, 4 skipped (pre-existing skips)
- Lint: zero warnings
- Build: clean TypeScript compilation

### Features Tested

| Feature | Tests Covering | Status |
|---------|---------------|--------|
| F-026: Role labels | E2E-ONBOARD-04 (Owner · IT Executor), E2E-ROLE-01 (access restricted text), E2E-DEL-01/05, E2E-ORG-01 | Pass |
| F-027: IT Executor flow | E2E-ONBOARD-02/03/04 (onboarding), E2E-INV-04 (invite accept) | Pass |
| F-028: Dashboard status | E2E-DASH-01/02, E2E-TRACK-AGG-01 | Pass |
| F-029: Privacy/login/UUID | E2E-PUB-01, E2E-NAMES-01 | Pass |
| F-030: Email platform list | Visual (settings page) | Pass |

### Changes Summary
1. "Org Admin" → "Owner" across all user-facing UI (~10 pages)
2. "IT Lead" → "IT Executor" on workspace home
3. "Skipped" → "Not applicable" across IT Baseline checklist, dashboard, public checklist
4. Settings IT Executor dropdown: fetch from /api/orgs/members (works without active assessment)
5. Workspace home "Invite IT Executor" step: checks actual member is_it_executor flag
6. POST /api/orgs: server-side guard blocks org creation for users with pending invites
7. Privacy page: removed claims about opt-out self-service, simulation identification, in-app contact
8. Login page: "Sending to:" → "Sent to:"
9. Org creation: stores owner email in org_members row
10. Dashboard: cadence factors in unsure ratio (>30% → amber), hides IT Baseline for non-executors, adds "Resolved" stat
11. Email platform list: added "Exchange/Outlook" suffix, Apple iCloud Mail option
