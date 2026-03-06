-- reset_and_create_all.sql
--
-- Drop everything and recreate from scratch.
-- Safe to run on a fresh or existing Supabase project with no important data.
-- Replaces migration files 001–006.
--
-- Run this in the Supabase SQL editor (Project → SQL editor → New query).
-- =============================================================================

-- =============================================================================
-- 0. DROP EVERYTHING (reverse FK order)
-- =============================================================================

drop table if exists public.assessment_responses  cascade;
drop table if exists public.assessment_items       cascade;
drop table if exists public.assessments            cascade;
drop table if exists public.invites                cascade;
drop table if exists public.org_members            cascade;
drop table if exists public.orgs                   cascade;
drop table if exists public.checklist_items        cascade;
drop table if exists public.checklist_groups       cascade;
drop table if exists public.user_checklists        cascade;

-- Drop helper functions
drop function if exists public.get_my_org_ids()       cascade;
drop function if exists public.is_org_admin(uuid)     cascade;
drop function if exists public.is_org_member(uuid)    cascade;
drop function if exists public.set_updated_at()       cascade;

-- =============================================================================
-- 1. Shared trigger function
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 2. user_checklists  (legacy anonymous checklist — public /checklist page)
-- =============================================================================

create table public.user_checklists (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger trg_user_checklists_updated_at
  before update on public.user_checklists
  for each row execute function public.set_updated_at();

alter table public.user_checklists enable row level security;

create policy "read own checklist"   on public.user_checklists for select to authenticated using (auth.uid() = user_id);
create policy "insert own checklist" on public.user_checklists for insert to authenticated with check (auth.uid() = user_id);
create policy "update own checklist" on public.user_checklists for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 3. orgs
-- =============================================================================

create table public.orgs (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  created_by     uuid        not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  email_platform text        check (email_platform in ('google_workspace','microsoft_365','gmail_personal','other')),
  primary_os     text        check (primary_os in ('windows','mac','mixed')),
  company_size   text        check (company_size in ('1-5','6-20','21-50','50+'))
);

alter table public.orgs enable row level security;

-- =============================================================================
-- 4. org_members
-- =============================================================================

create table public.org_members (
  org_id          uuid    not null references public.orgs(id) on delete cascade,
  user_id         uuid    not null references auth.users(id) on delete cascade,
  role            text    not null check (role in ('org_admin','manager','employee')),
  manager_user_id uuid    null,
  is_it_executor  boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint fk_manager
    foreign key (org_id, manager_user_id)
    references public.org_members(org_id, user_id)
    on delete cascade
);

-- Only one IT executor per org
create unique index ux_one_it_executor_per_org
  on public.org_members (org_id) where is_it_executor = true;

alter table public.org_members enable row level security;

-- =============================================================================
-- 5. assessments
-- =============================================================================

create table public.assessments (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.orgs(id) on delete cascade,
  created_by   uuid        not null references auth.users(id),
  scope        text        not null check (scope in ('org','subtree')),
  root_user_id uuid        null,
  status       text        not null check (status in ('active','completed')) default 'active',
  created_at   timestamptz not null default now(),
  completed_at timestamptz null
);

-- Only one active assessment per org
create unique index ux_one_active_assessment_per_org
  on public.assessments (org_id) where status = 'active';

alter table public.assessments enable row level security;

-- =============================================================================
-- 6. assessment_items  (immutable snapshot)
-- =============================================================================

create table public.assessment_items (
  id                uuid        primary key default gen_random_uuid(),
  assessment_id     uuid        not null references public.assessments(id) on delete cascade,
  checklist_item_id text        not null,  -- NOT a FK — snapshot decoupled from master
  group_id          text        not null,
  title             text        not null,
  description       text,
  order_index       int         not null,
  track             text        not null default 'it_baseline' check (track in ('it_baseline','awareness')),
  impact            text        check (impact in ('high','medium','low')),
  effort            text        check (effort in ('minutes','hour','day')),
  created_at        timestamptz not null default now()
);

create index idx_assessment_items_track
  on public.assessment_items (assessment_id, track);

alter table public.assessment_items enable row level security;

-- =============================================================================
-- 7. assessment_responses
-- =============================================================================

create table public.assessment_responses (
  assessment_id      uuid        not null references public.assessments(id) on delete cascade,
  assessment_item_id uuid        not null references public.assessment_items(id) on delete cascade,
  user_id            uuid        not null references auth.users(id) on delete cascade,
  status             text        not null check (status in ('done','unsure','skipped')),
  updated_at         timestamptz not null default now(),
  primary key (assessment_item_id, user_id)
);

alter table public.assessment_responses enable row level security;

-- =============================================================================
-- 8. invites
-- =============================================================================

create table public.invites (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references public.orgs(id) on delete cascade,
  invited_by      uuid        not null references auth.users(id) on delete cascade,
  email           text        not null check (email <> ''),
  role            text        not null check (role in ('manager','employee')),
  manager_user_id uuid        not null references auth.users(id) on delete cascade,
  is_it_executor  boolean     not null default false,
  token           text        not null unique default encode(gen_random_bytes(32),'hex'),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '7 days',
  accepted_at     timestamptz null,
  updated_at      timestamptz not null default now()
);

-- No duplicate pending invites for same email + org
create unique index ux_pending_invite_per_email_per_org
  on public.invites (org_id, lower(email)) where accepted_at is null;

create index idx_invites_token      on public.invites (token);
create index idx_invites_org_pending on public.invites (org_id) where accepted_at is null;

create trigger trg_invites_updated_at
  before update on public.invites
  for each row execute function public.set_updated_at();

alter table public.invites enable row level security;

-- =============================================================================
-- 9. checklist_groups  (master content)
-- =============================================================================

create table public.checklist_groups (
  id          text        primary key,
  title       text        not null,
  description text,
  track       text        not null check (track in ('it_baseline','awareness')),
  order_index int         not null,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.checklist_groups enable row level security;
create policy "authenticated read groups" on public.checklist_groups for select to authenticated using (active = true);
create policy "anon read groups"          on public.checklist_groups for select to anon          using (active = true);

-- =============================================================================
-- 10. checklist_items  (master content)
-- =============================================================================

create table public.checklist_items (
  id             text        primary key,
  group_id       text        not null references public.checklist_groups(id),
  track          text        not null check (track in ('it_baseline','awareness')),
  title          text        not null,
  outcome        text,
  why_it_matters text,
  steps          jsonb       not null default '[]',
  time_estimate  text,
  impact         text        check (impact in ('high','medium','low')),
  effort         text        check (effort in ('minutes','hour','day')),
  tags           text[]      not null default '{}',
  order_index    int         not null,
  active         boolean     not null default true,
  created_at     timestamptz not null default now()
);

create index idx_checklist_items_track_active
  on public.checklist_items (track, active, group_id, order_index);

alter table public.checklist_items enable row level security;
create policy "authenticated read items" on public.checklist_items for select to authenticated using (active = true);
create policy "anon read items"          on public.checklist_items for select to anon          using (active = true);

-- =============================================================================
-- 11. RLS helper functions  (SECURITY DEFINER — avoids org_members recursion)
-- =============================================================================

create or replace function public.get_my_org_ids()
returns setof uuid
language sql security definer stable
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.is_org_admin(_org_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.org_members
    where org_id = _org_id and user_id = auth.uid() and role = 'org_admin'
  );
$$;

create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.org_members
    where org_id = _org_id and user_id = auth.uid()
  );
$$;

-- =============================================================================
-- 12. RLS policies
-- =============================================================================

-- orgs ---------------------------------------------------------
create policy "members read org"
  on public.orgs for select to authenticated
  using (id in (select public.get_my_org_ids()));

create policy "create org"
  on public.orgs for insert to authenticated
  with check (created_by = auth.uid());

create policy "admin update org"
  on public.orgs for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "admin delete org"
  on public.orgs for delete to authenticated
  using (public.is_org_admin(id));

-- org_members --------------------------------------------------
create policy "members see peers"
  on public.org_members for select to authenticated
  using (org_id in (select public.get_my_org_ids()));

create policy "add member"
  on public.org_members for insert to authenticated
  with check (
    org_id in (select public.get_my_org_ids())
    or (
      role = 'org_admin'
      and manager_user_id is null
      and exists (select 1 from public.orgs where id = org_id and created_by = auth.uid())
    )
  );

create policy "admin update member"
  on public.org_members for update to authenticated
  using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create policy "admin delete member"
  on public.org_members for delete to authenticated
  using (public.is_org_admin(org_id));

-- assessments --------------------------------------------------
create policy "members read assessments"
  on public.assessments for select to authenticated
  using (public.is_org_member(org_id));

create policy "members create assessment"
  on public.assessments for insert to authenticated
  with check (public.is_org_member(org_id) and created_by = auth.uid());

create policy "creator or admin update assessment"
  on public.assessments for update to authenticated
  using  (created_by = auth.uid() or public.is_org_admin(org_id))
  with check (created_by = auth.uid() or public.is_org_admin(org_id));

create policy "admin delete assessment"
  on public.assessments for delete to authenticated
  using (public.is_org_admin(org_id));

-- assessment_items ---------------------------------------------
create policy "members read items"
  on public.assessment_items for select to authenticated
  using (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and public.is_org_member(a.org_id)
  ));

create policy "creator insert items"
  on public.assessment_items for insert to authenticated
  with check (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and a.created_by = auth.uid()
  ));

-- assessment_responses -----------------------------------------
create policy "members read responses"
  on public.assessment_responses for select to authenticated
  using (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and public.is_org_member(a.org_id)
  ));

create policy "insert own response"
  on public.assessment_responses for insert to authenticated
  with check (user_id = auth.uid());

create policy "update own response"
  on public.assessment_responses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admin delete response"
  on public.assessment_responses for delete to authenticated
  using (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and public.is_org_admin(a.org_id)
  ));

-- invites ------------------------------------------------------
create policy "members read invites"
  on public.invites for select to authenticated
  using (public.is_org_member(org_id));

create policy "members create invite"
  on public.invites for insert to authenticated
  with check (public.is_org_member(org_id) and invited_by = auth.uid());

create policy "inviter or admin update invite"
  on public.invites for update to authenticated
  using  (invited_by = auth.uid() or public.is_org_admin(org_id))
  with check (invited_by = auth.uid() or public.is_org_admin(org_id));

create policy "inviter or admin delete invite"
  on public.invites for delete to authenticated
  using (invited_by = auth.uid() or public.is_org_admin(org_id));

-- =============================================================================
-- 13. Seed — checklist_groups
-- =============================================================================

insert into public.checklist_groups (id, title, description, track, order_index) values
  ('accounts', 'Passwords & Accounts',     'Stop account takeovers and reduce ransomware risk quickly.',           'it_baseline', 1),
  ('email',    'Email Security',            'Most attacks start in email. Make phishing less effective.',           'it_baseline', 2),
  ('patching', 'Updates & Patching',        'Close known holes that attackers actively scan for.',                  'it_baseline', 3),
  ('backups',  'Backups & Recovery',        'If ransomware hits, backups are your business insurance.',             'it_baseline', 4),
  ('access',   'Least Privilege',           'Reduce damage if an account is compromised.',                         'it_baseline', 5),
  ('human',    'Human Security',            'Org-level security habits and policies set by the IT person.',         'it_baseline', 6),
  ('network',  'Network Basics',            'Easy router and Wi-Fi hygiene that prevents common exposure.',         'it_baseline', 7),
  ('awareness','Employee Security Awareness','Behaviour and recognition skills for all staff. No technical knowledge required.','awareness', 8)
on conflict (id) do nothing;

-- =============================================================================
-- 14. Seed — IT Baseline items
-- =============================================================================

insert into public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
values

  ('acct-password-manager','accounts','it_baseline',
   'Use a password manager',
   'Stronger passwords everywhere without memorising them.',
   'Most breaches start with reused or weak passwords. A password manager makes strong unique passwords practical.',
   '["Pick one (Bitwarden, 1Password, KeePass).","Install it on your computer and phone.","Move your email and admin passwords into it first."]',
   '10–20 minutes','high','hour',array['passwords'],1),

  ('acct-enable-mfa-email','accounts','it_baseline',
   'Turn on MFA for email accounts',
   'Stops most account takeovers even if a password leaks.',
   'Email is the #1 entry point for attackers. MFA blocks login with only a stolen password.',
   '["In Google Workspace or Microsoft 365 admin settings, enable MFA.","Require MFA for all users, especially admins.","Prefer authenticator app or security key over SMS if possible."]',
   '5–15 minutes','high','minutes',array['mfa','email'],2),

  ('acct-separate-admin-accounts','accounts','it_baseline',
   'Separate admin accounts from daily accounts',
   'If a user gets phished, attackers don''t automatically get admin control.',
   'Using admin accounts for daily work makes compromises much worse. Separate accounts reduce blast radius.',
   '["Create dedicated admin accounts for admins.","Use daily accounts for email and normal work.","Use admin accounts only when needed."]',
   '15–30 minutes','high','hour',array['admins'],3),

  ('acct-remove-shared-accounts','accounts','it_baseline',
   'Remove or lock down shared accounts',
   'Clear accountability and fewer easy targets.',
   'Shared accounts make it hard to track incidents and often have weak controls.',
   '["List shared accounts (e.g., shared mailbox logins).","Replace with individual accounts and shared mailbox access.","If a shared account must exist: strong password and MFA and limited access."]',
   '15–45 minutes','medium','hour',array['identity'],4),

  ('email-phishing-filters','email','it_baseline',
   'Enable anti-phishing and spam filters',
   'Fewer dangerous emails reach your team.',
   'Most attacks start in email. Filtering reduces the number of threats people must handle.',
   '["Check your email admin settings (Google Workspace or Microsoft 365).","Turn on recommended anti-phishing and spam protection.","Verify quarantine and alerts are configured."]',
   '10–20 minutes','high','minutes',array['email','phishing'],1),

  ('email-disable-macros','email','it_baseline',
   'Disable Office macros by default',
   'Blocks a common malware delivery method.',
   'Malicious macros are a common way to run malware on a computer from a document attachment.',
   '["If you use Microsoft Office, set macros to be blocked by default.","Allow only signed or trusted macros if needed."]',
   '10–30 minutes','medium','hour',array['office','macros'],2),

  ('email-phish-reporting','email','it_baseline',
   'Add an easy ''Report Phishing'' method',
   'Staff can report suspicious emails quickly.',
   'Reporting helps you spot campaigns early and prevents multiple people being tricked.',
   '["Enable a ''Report phishing'' add-on or button if available.","Or define a simple process: forward to a security inbox (e.g., security@company).","Tell employees what to do when in doubt."]',
   '10–20 minutes','medium','minutes',array['process'],3),

  ('patch-auto-updates-os','patching','it_baseline',
   'Turn on automatic OS updates',
   'Closes known security holes automatically.',
   'Attackers exploit known vulnerabilities. Updates are one of the highest ROI security actions.',
   '["Enable automatic updates on Windows or macOS.","Ensure updates install regularly (not postponed indefinitely)."]',
   '5–10 minutes','high','minutes',array['patching'],1),

  ('patch-update-key-systems','patching','it_baseline',
   'Update routers, firewalls, VPNs and website plugins',
   'Removes easy-to-scan attack paths.',
   'Internet-facing systems are actively scanned. Keeping them updated reduces risk quickly.',
   '["Check router and firewall firmware and update if needed.","Update VPN software if used.","If you use WordPress: update core and plugins and themes."]',
   '30–90 minutes','high','day',array['router','vpn','wordpress'],2),

  ('backup-3-2-1','backups','it_baseline',
   'Set up 3-2-1 backups',
   'You can recover from ransomware or accidents.',
   'Backups are only useful if they exist in multiple places and one copy is offline or off-site.',
   '["3 copies of important data.","2 different media (e.g., cloud and external drive).","1 off-site or offline copy (not always connected)."]',
   '60–180 minutes','high','day',array['backups'],1),

  ('backup-test-restore','backups','it_baseline',
   'Test restoring backups (quarterly)',
   'Confidence that backups actually work.',
   'Many backups fail silently. If you cannot restore, the backup does not exist when it matters.',
   '["Pick one important file or folder.","Restore it to a separate location.","Confirm it opens and is complete.","Set a calendar reminder to repeat quarterly."]',
   '15–45 minutes','high','hour',array['backups','recovery'],2),

  ('access-no-local-admin','access','it_baseline',
   'Remove local admin rights from daily users',
   'Limits what malware can do on compromised machines.',
   'Admin rights make infections worse. Standard users reduce damage and prevent many installations.',
   '["Check who has local admin rights on computers.","Remove admin rights from daily accounts.","Keep a separate admin account for IT tasks."]',
   '30–90 minutes','high','day',array['least-privilege'],1),

  ('access-offboarding','access','it_baseline',
   'Create an offboarding checklist for leavers',
   'Former employees lose access immediately.',
   'Old accounts are a common weak point. Offboarding discipline reduces long-term risk.',
   '["Disable accounts on the leaving date.","Remove access to shared drives and tools.","Rotate shared secrets if any existed."]',
   '10–20 minutes','medium','minutes',array['process'],2),

  ('human-30-min-session','human','it_baseline',
   'Run a 30-minute security awareness session',
   'Fewer clicks on scams; faster reporting.',
   'People are targeted every day. A short practical session reduces successful phishing dramatically.',
   '["Show 3 real phishing examples relevant to your business.","Explain ''urgent boss email'' and fake invoice scams.","Set the rule: when in doubt, report — do not click.","Consider assigning the Employee Awareness Track so staff can self-serve this learning."]',
   '30 minutes','high','hour',array['training'],1),

  ('human-1-page-rules','human','it_baseline',
   'Write a 1–2 page ''Security Basics'' doc',
   'Clear rules people can follow.',
   'Rules only work if they exist. Short, simple guidance beats long policies.',
   '["Include password rules, what to do if something feels off, and who to contact.","Share it with staff and store it somewhere easy to find."]',
   '20–40 minutes','medium','hour',array['policy'],2),

  ('net-change-default-router-passwords','network','it_baseline',
   'Change default router and admin passwords',
   'Stops trivial takeovers of network gear.',
   'Default passwords are widely known and frequently exploited.',
   '["Log into router or firewall admin panel.","Change default admin password to a strong unique one.","Store it in your password manager."]',
   '10–20 minutes','medium','minutes',array['router'],1),

  ('net-separate-guest-wifi','network','it_baseline',
   'Separate guest Wi-Fi from internal devices',
   'Guests cannot access company devices easily.',
   'Guest devices are untrusted. Segmentation reduces risk of accidental or malicious access.',
   '["Enable guest Wi-Fi network on router.","Ensure guest network cannot access internal devices.","Use strong Wi-Fi password."]',
   '15–45 minutes','medium','hour',array['wifi'],2)

on conflict (id) do nothing;

-- =============================================================================
-- 15. Seed — Awareness Track items
-- =============================================================================

insert into public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
values

  ('aware-spot-phishing-email','awareness','awareness',
   'Spot a phishing email',
   'You can identify a fake email before clicking anything.',
   'Phishing is the #1 way attackers get in. Recognition is your first line of defence.',
   '["Check the sender address — display name and actual email often differ.","Urgency and pressure are red flags (e.g. ''Act now or your account is closed'').","Hover over links before clicking — does the URL match what they claim?","Real companies never ask for your password by email.","Action: look at the last 5 emails in your spam folder and see if you can spot what made them suspicious."]',
   '5 minutes','high','minutes',array['phishing','awareness'],1),

  ('aware-fake-login-page','awareness','awareness',
   'Recognise a fake login page',
   'You do not hand your password to an attacker''s copy of a real site.',
   'Fake login pages look identical to real ones. The URL is the only reliable signal.',
   '["Before entering any password, check the browser address bar — is it the real domain?","Attackers use tricks: g00gle.com, paypa1.com, login-microsoft.com.","A padlock (HTTPS) does NOT mean the site is safe — it only means the connection is encrypted.","Action: next time you log in anywhere, consciously check the address bar before typing."]',
   '3 minutes','high','minutes',array['phishing','awareness'],2),

  ('aware-voice-scam','awareness','awareness',
   'Spot a phone or voice scam',
   'You do not hand over access or payment under pressure from a caller.',
   'Attackers call pretending to be IT support, the bank, or a supplier. Urgency is the weapon.',
   '["Legitimate IT support will never cold-call and ask for your password.","Banks never ask you to move money for safety.","If in doubt: hang up, look up the official number, and call back independently.","A ''CEO'' calling from an unknown number asking for an urgent wire transfer is social engineering.","Action: agree with your team on a simple verbal code word for urgent out-of-band requests."]',
   '5 minutes','high','minutes',array['social-engineering','awareness'],3),

  ('aware-fake-invoice','awareness','awareness',
   'Spot a fake invoice or supplier email',
   'You do not pay money to an attacker''s bank account.',
   'Business Email Compromise (fake invoice fraud) causes the highest financial losses of any attack type.',
   '["Email from a known supplier but bank details have changed? Call them on their known number to verify — never reply to that email.","Watch for subtle sender spoofs: supplier@acme-corp.com vs. supplier@acme-c0rp.com.","If an invoice is unexpected or the amount is unusual, verify before paying.","Action: create a rule with your finance or admin person — any new bank details must be verified by phone before payment."]',
   '5 minutes','high','minutes',array['social-engineering','fraud','awareness'],4),

  ('aware-strong-password','awareness','awareness',
   'Use a strong, unique password for your work accounts',
   'If one of your accounts leaks, attackers cannot use that password anywhere else.',
   'Password reuse is how one breach becomes ten.',
   '["Use a different password for every work account.","Use a password manager (Bitwarden is free) — you only remember one master password.","Avoid: name and birth year, company name, ''Password1''.","Action: check if you reuse any password across work accounts. If yes, change the most important one today."]',
   '10 minutes','high','hour',array['passwords','awareness'],5),

  ('aware-mfa-personal','awareness','awareness',
   'Turn on two-step login for your work accounts',
   'Even if your password is stolen, attackers still cannot log in.',
   'MFA blocks the vast majority of automated account takeover attempts.',
   '["Go to your email account security settings.","Enable two-factor authentication or two-step verification.","Use an authenticator app (Google Authenticator, Authy) rather than SMS if available.","Action: enable MFA on your work email today."]',
   '5–10 minutes','high','minutes',array['mfa','awareness'],6),

  ('aware-lock-screen','awareness','awareness',
   'Lock your screen when you step away',
   'No one can access your computer when you are away from your desk.',
   'Physical access is an overlooked risk, especially in shared offices, cafés, or open-plan spaces.',
   '["Windows: press Win + L.","Mac: press Ctrl + Cmd + Q, or set auto-lock after 1–2 minutes.","Phone: enable automatic screen lock after 30–60 seconds.","Action: set auto-lock on your computer right now if it is longer than 2 minutes."]',
   '2 minutes','medium','minutes',array['physical','awareness'],7),

  ('aware-usb-drives','awareness','awareness',
   'Do not plug in unknown USB drives or cables',
   'You do not accidentally install malware.',
   'USB drives found in car parks or sent as free gifts are a real attack method. Malicious cables exist.',
   '["Never plug in a USB drive you did not buy yourself.","If you receive a USB drive as a promotional item, do not use it on a work computer.","Charging cables from unknown sources carry the same risk.","No action required — awareness only. Pass this on to your team."]',
   '2 minutes','medium','minutes',array['physical','malware','awareness'],8),

  ('aware-clicked-something','awareness','awareness',
   'Know what to do if you think you clicked something bad',
   'You act quickly and correctly, reducing damage.',
   'The response in the first minutes after a suspicious click matters enormously. Panic or silence makes it worse.',
   '["Disconnect from the internet immediately (disable Wi-Fi or unplug cable) — this stops malware calling home.","Do NOT turn the computer off — this may destroy forensic evidence.","Tell your IT contact or manager immediately — do not wait or try to fix it yourself.","Change passwords for any accounts accessed on that device — from a different device.","Action: make sure you know who to call right now. Save that person''s number."]',
   '3 minutes','high','minutes',array['incident','awareness'],9),

  ('aware-report-dont-hide','awareness','awareness',
   'Know the one rule: report, don''t hide',
   'Incidents get contained faster because people report instead of hoping the problem goes away.',
   'Most successful attacks are discovered weeks or months late because people were embarrassed to report.',
   '["If something feels off — an email, a login prompt, a call, a pop-up — report it.","There is no such thing as a stupid security question.","You will not get in trouble for clicking something accidentally — you will get in trouble if you hide it.","Action: find out right now who your ''report security concerns to'' contact is. If you do not know, ask today."]',
   '2 minutes','high','minutes',array['process','incident','awareness'],10)

on conflict (id) do nothing;

-- Done.
-- Verify with:
--   select count(*) from public.checklist_items;  -- should be 27
--   select count(*) from public.checklist_groups; -- should be 8
