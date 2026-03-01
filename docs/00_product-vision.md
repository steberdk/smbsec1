# 📄 Product Vision — smbsec1

## Mission
Help small business owners reduce 80% of common cyber risk easily — without needing enterprise tools or IT expertise.

## What this product is
A guided, repeatable security baseline tool for SMBs:
Assess → Fix → Track → Reassess

It starts as a checklist with proof and progress tracking, and later grows into delegation, reassessments, and simulated phishing campaigns.

## Personas (people)
### Primary persona: Executive Sponsor (Owner)
Limited IT knowledge. Wants:
- clarity
- risk reduction
- practical steps
- delegation capability
- proof of basic security posture

### Secondary persona: Manager (Org / Department)
Acts like an owner for their scope. Wants:
- assign tasks
- see progress of team
- run reassessments on schedule

### Third persona: Employee (Member)
Wants:
- small tasks
- simple language
- clear “done” state
- minimal time cost

## Roles (permissions in the app)
These are product roles (authorization), separate from personas.

- Org Admin
  - can manage organization settings
  - can invite managers/members
  - can export GDPR report
  - can delete org and all data

- Manager
  - can invite/manage their team scope
  - can view team progress
  - can schedule reassessments for their scope

- Member
  - can complete assigned/self assessments
  - can view their own progress and history

## Non-negotiable constraints
- Free tiers only (Supabase/Vercel/GitHub)
- Simple UX over feature density
- GDPR transparent: export + deletion controls
- Security posture: no secrets in frontend, RLS enforced in Supabase

## MVP definition (current)
MVP0 (today):
- public pages: what/why + checklist preview
- login (Supabase)
- workspace for a logged-in user
- checklist completion tracking (persisted per user)
- summary page

MVP1 (next):
- organization + invites (admin/manager/member)
- team progress view
- GDPR export + delete user data