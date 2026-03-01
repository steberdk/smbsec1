-- 002_workspaces.sql
-- Repurposed: Organization + Membership + Assessments

-- =========================
-- 1. Organizations
-- =========================

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- =========================
-- 2. Organization Members (Adjacency Tree)
-- =========================

create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('org_admin', 'manager', 'employee')),
  manager_user_id uuid null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint fk_manager
    foreign key (org_id, manager_user_id)
    references public.org_members(org_id, user_id)
    on delete cascade
);

-- =========================
-- 3. Assessments
-- =========================

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  scope text not null check (scope in ('org', 'subtree')),
  root_user_id uuid null,
  status text not null check (status in ('active', 'completed')) default 'active',
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

-- Only one active assessment per org
create unique index if not exists ux_one_active_assessment_per_org
  on public.assessments (org_id)
  where status = 'active';

-- =========================
-- 4. Assessment Items Snapshot
-- =========================

create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  checklist_item_id text not null,
  group_id text not null,
  title text not null,
  description text,
  order_index int not null,
  created_at timestamptz not null default now()
);

-- =========================
-- 5. Assessment Responses
-- =========================

create table if not exists public.assessment_responses (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assessment_item_id uuid not null references public.assessment_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('done', 'unsure', 'skipped')),
  updated_at timestamptz not null default now(),
  primary key (assessment_item_id, user_id)
);

-- =========================
-- NOTES
-- =========================

-- Aggregation is dynamic:
-- Subtree computed at query time via recursive CTE.
-- No rollup tables in MVP.
--
-- Hard delete enforced via ON DELETE CASCADE.
--
-- RLS policies to be added in later migration.
