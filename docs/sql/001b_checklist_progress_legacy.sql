-- docs/sql/001b_checklist_progress_legacy.sql
-- Legacy: older checklist persistence model (kept for reference).
-- NOTE: Prefer user_checklists (jsonb) for the current app.

create table if not exists public.checklist_progress (
  user_id uuid not null,
  checked_keys text[] not null default '{}'::text[],
  percent integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint checklist_progress_pkey primary key (user_id),
  constraint checklist_progress_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade
);

-- Ensure updated_at function exists
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Keep only ONE trigger
drop trigger if exists trg_checklist_progress_updated_at on public.checklist_progress;
drop trigger if exists trg_set_updated_at on public.checklist_progress;

create trigger trg_checklist_progress_updated_at
before update on public.checklist_progress
for each row execute function public.set_updated_at();
