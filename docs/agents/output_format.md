# Agent Output Format (Required)

Every agent response MUST follow this structure:

## 1) Summary (1–5 bullets)
What you will do and why.

## 2) Proposal
### 2.1 Approach
Step-by-step plan.

### 2.2 Files to change
List exact paths.

### 2.3 Data model / permissions impact
- Tables impacted
- RLS/policies impacted
- Any migration notes

### 2.4 UX impact
- Screens impacted
- Copy changes (if any)

## 3) Risks / Edge cases
- Security/privacy risks
- GDPR deletion/export implications
- Failure modes

## 4) Alternatives considered
List 1–3 options and why rejected.

## 5) Recommendation
One clear recommendation.

## 6) Implementation checklist
- [ ] Code changes
- [ ] Tests (unit/e2e as relevant)
- [ ] Docs updated
- [ ] CI green
