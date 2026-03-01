# Agent Workflow (Proposal → Approval → PR)

## 0) Inputs
- A Work Request (WR) exists (see `/docs/WORK_REQUEST_TEMPLATE.md`)
- Agent reads relevant docs + current code
- Agent identifies constraints and scope

## 1) Proposal stage (mandatory)
Agent produces proposal using `/docs/agents/output_format.md`.

Human outcome:
- Approve as-is
- Approve with edits
- Reject (needs re-plan)

## 2) Implementation stage
Agent creates a branch:
- `feat/<short-name>` or `fix/<short-name>`

Agent makes small commits.

## 3) Verification stage
Before opening PR:
- `cd frontend`
- `npm run lint`
- `npm run build`
- `npm run test:e2e` (when relevant)

## 4) PR stage
PR description must include:
- What changed
- Screens impacted
- Data model changes (if any)
- How to test manually
- Known risks

## 5) Merge stage
Only merge when CI is green.

## 6) Post-merge
If docs changed:
- ensure docs reflect actual behavior
- update DECISIONS.md if a new constraint is introduced
