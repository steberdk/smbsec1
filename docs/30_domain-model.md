# 🧱 Domain Model — smbsec1 (C2)

## Core Entities

### Organization
- id (uuid)
- name
- created_at
- created_by (user_id)

### User
(Supabase auth.users)
- id
- email

### OrganizationMember
- id
- organization_id
- user_id
- role (admin | manager | member)
- reports_to_member_id (nullable)
- created_at

### Assessment
- id
- organization_id
- version
- started_at
- completed_at
- score

### AssessmentItem
- id
- assessment_id
- checklist_item_key
- status (done | skipped | unsure | pending)
- updated_by (user_id)
- updated_at

### ChecklistDefinition (static / seeded)
- key
- category
- title
- description
- estimated_minutes
- order

### PhishingCampaign (MVP simplified)
- id
- organization_id
- scenario_key
- launched_at
- completed_at

### PhishingResult
- id
- campaign_id
- user_id
- action (clicked | reported | ignored)
- timestamp

