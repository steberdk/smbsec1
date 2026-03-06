-- 006_checklist_master.sql
--
-- Master checklist definition tables.
--
-- These replace items.ts as the canonical source of checklist content.
-- At assessment creation, POST /api/assessments reads from checklist_items
-- and copies rows into assessment_items (immutable snapshot).
--
-- Two tracks:
--   it_baseline  — technical configuration tasks, assigned to IT Executor only
--   awareness    — behaviour/recognition tasks, assigned to all org members
--
-- Updating checklist content = a new SQL migration that INSERTs, UPDATEs, or
-- sets active = false on rows here. Never edit seed data in place once in prod.
--
-- assessment_items.checklist_item_id (text) matches checklist_items.id but is
-- intentionally NOT a foreign key — the snapshot must remain intact even if
-- a master item is later retired. Decoupling is by design.
--
-- Apply after 005_rls_policies.sql.

-- =============================================================================
-- 1. checklist_groups
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_groups (
  id          text        PRIMARY KEY,
  title       text        NOT NULL,
  description text,
  track       text        NOT NULL CHECK (track IN ('it_baseline', 'awareness')),
  order_index int         NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.checklist_groups IS
  'Master group (category) definitions. Source of truth for checklist structure.';

-- RLS: authenticated users can read; no client writes (content managed via migrations).
ALTER TABLE public.checklist_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users can read checklist groups" ON public.checklist_groups;
CREATE POLICY "authenticated users can read checklist groups"
  ON public.checklist_groups FOR SELECT
  TO authenticated
  USING (active = true);

-- Also allow anonymous read so the public checklist page works without login.
DROP POLICY IF EXISTS "anonymous users can read checklist groups" ON public.checklist_groups;
CREATE POLICY "anonymous users can read checklist groups"
  ON public.checklist_groups FOR SELECT
  TO anon
  USING (active = true);

-- =============================================================================
-- 2. checklist_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id              text        PRIMARY KEY,
  group_id        text        NOT NULL REFERENCES public.checklist_groups(id),
  track           text        NOT NULL CHECK (track IN ('it_baseline', 'awareness')),
  title           text        NOT NULL,
  outcome         text,
  why_it_matters  text,
  steps           jsonb       NOT NULL DEFAULT '[]',
  time_estimate   text,
  impact          text        CHECK (impact IN ('high', 'medium', 'low')),
  effort          text        CHECK (effort IN ('minutes', 'hour', 'day')),
  tags            text[]      NOT NULL DEFAULT '{}',
  order_index     int         NOT NULL,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.checklist_items IS
  'Master checklist item definitions. Source of truth for all checklist content.
   items.ts is now types + display helpers only — data lives here.';

COMMENT ON COLUMN public.checklist_items.steps IS
  'Ordered array of instruction strings. Stored as jsonb for flexibility.
   Example: ["Step one text", "Step two text"]';

COMMENT ON COLUMN public.checklist_items.active IS
  'Set to false to retire an item without deleting it. Retired items are excluded
   from new assessments but remain in historical assessment_items snapshots.';

-- Index for the common query: all active items for a given track.
CREATE INDEX IF NOT EXISTS idx_checklist_items_track_active
  ON public.checklist_items (track, active, group_id, order_index);

-- RLS: same pattern as groups — readable by authenticated + anon, no client writes.
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users can read checklist items" ON public.checklist_items;
CREATE POLICY "authenticated users can read checklist items"
  ON public.checklist_items FOR SELECT
  TO authenticated
  USING (active = true);

DROP POLICY IF EXISTS "anonymous users can read checklist items" ON public.checklist_items;
CREATE POLICY "anonymous users can read checklist items"
  ON public.checklist_items FOR SELECT
  TO anon
  USING (active = true);

-- =============================================================================
-- 3. Seed — groups
-- =============================================================================

INSERT INTO public.checklist_groups (id, title, description, track, order_index)
VALUES
  -- IT Baseline groups
  ('accounts',
   'Passwords & Accounts',
   'Stop account takeovers and reduce ransomware risk quickly.',
   'it_baseline', 1),

  ('email',
   'Email Security',
   'Most attacks start in email. Make phishing less effective.',
   'it_baseline', 2),

  ('patching',
   'Updates & Patching',
   'Close known holes that attackers actively scan for.',
   'it_baseline', 3),

  ('backups',
   'Backups & Recovery',
   'If ransomware hits, backups are your business insurance.',
   'it_baseline', 4),

  ('access',
   'Least Privilege',
   'Reduce damage if an account is compromised.',
   'it_baseline', 5),

  ('human',
   'Human Security',
   'Org-level security habits and policies set by the IT person.',
   'it_baseline', 6),

  ('network',
   'Network Basics',
   'Easy router and Wi-Fi hygiene that prevents common exposure.',
   'it_baseline', 7),

  -- Awareness track group
  ('awareness',
   'Employee Security Awareness',
   'Behaviour and recognition skills for all staff. No technical knowledge required.',
   'awareness', 8)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. Seed — IT Baseline items
-- =============================================================================

INSERT INTO public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
VALUES

  -- -------------------------------------------------------------------------
  -- Accounts
  -- -------------------------------------------------------------------------

  ('acct-password-manager',
   'accounts', 'it_baseline',
   'Use a password manager',
   'Stronger passwords everywhere without memorising them.',
   'Most breaches start with reused or weak passwords. A password manager makes strong unique passwords practical.',
   '["Pick one (Bitwarden, 1Password, KeePass).",
     "Install it on your computer and phone.",
     "Move your email and admin passwords into it first."]',
   '10–20 minutes',
   'high', 'hour',
   ARRAY['passwords'],
   1),

  ('acct-enable-mfa-email',
   'accounts', 'it_baseline',
   'Turn on MFA for email accounts',
   'Stops most account takeovers even if a password leaks.',
   'Email is the #1 entry point for attackers. MFA blocks login with only a stolen password.',
   '["In Google Workspace or Microsoft 365 admin settings, enable MFA.",
     "Require MFA for all users, especially admins.",
     "Prefer authenticator app or security key over SMS if possible."]',
   '5–15 minutes',
   'high', 'minutes',
   ARRAY['mfa', 'email'],
   2),

  ('acct-separate-admin-accounts',
   'accounts', 'it_baseline',
   'Separate admin accounts from daily accounts',
   'If a user gets phished, attackers don''t automatically get admin control.',
   'Using admin accounts for daily work makes compromises much worse. Separate accounts reduce blast radius.',
   '["Create dedicated admin accounts for admins.",
     "Use daily accounts for email and normal work.",
     "Use admin accounts only when needed."]',
   '15–30 minutes',
   'high', 'hour',
   ARRAY['admins'],
   3),

  ('acct-remove-shared-accounts',
   'accounts', 'it_baseline',
   'Remove or lock down shared accounts',
   'Clear accountability and fewer easy targets.',
   'Shared accounts make it hard to track incidents and often have weak controls. They are also common attacker targets.',
   '["List shared accounts (e.g., shared mailbox logins).",
     "Replace with individual accounts and shared mailbox access.",
     "If a shared account must exist: strong password and MFA and limited access."]',
   '15–45 minutes',
   'medium', 'hour',
   ARRAY['identity'],
   4),

  -- -------------------------------------------------------------------------
  -- Email Security
  -- -------------------------------------------------------------------------

  ('email-phishing-filters',
   'email', 'it_baseline',
   'Enable anti-phishing and spam filters',
   'Fewer dangerous emails reach your team.',
   'Most attacks start in email. Filtering reduces the number of threats people must handle.',
   '["Check your email admin settings (Google Workspace or Microsoft 365).",
     "Turn on recommended anti-phishing and spam protection.",
     "Verify quarantine and alerts are configured."]',
   '10–20 minutes',
   'high', 'minutes',
   ARRAY['email', 'phishing'],
   1),

  ('email-disable-macros',
   'email', 'it_baseline',
   'Disable Office macros by default',
   'Blocks a common malware delivery method.',
   'Malicious macros are a common way to run malware on a computer from a document attachment.',
   '["If you use Microsoft Office, set macros to be blocked by default.",
     "Allow only signed or trusted macros if needed."]',
   '10–30 minutes',
   'medium', 'hour',
   ARRAY['office', 'macros'],
   2),

  ('email-phish-reporting',
   'email', 'it_baseline',
   'Add an easy ''Report Phishing'' method',
   'Staff can report suspicious emails quickly.',
   'Reporting helps you spot campaigns early and prevents multiple people being tricked.',
   '["Enable a ''Report phishing'' add-on or button if available.",
     "Or define a simple process: forward to a security inbox (e.g., security@company).",
     "Tell employees what to do when in doubt."]',
   '10–20 minutes',
   'medium', 'minutes',
   ARRAY['process'],
   3),

  -- -------------------------------------------------------------------------
  -- Patching
  -- -------------------------------------------------------------------------

  ('patch-auto-updates-os',
   'patching', 'it_baseline',
   'Turn on automatic OS updates',
   'Closes known security holes automatically.',
   'Attackers exploit known vulnerabilities. Updates are one of the highest ROI security actions.',
   '["Enable automatic updates on Windows or macOS.",
     "Ensure updates install regularly (not postponed indefinitely)."]',
   '5–10 minutes',
   'high', 'minutes',
   ARRAY['patching'],
   1),

  ('patch-update-key-systems',
   'patching', 'it_baseline',
   'Update routers, firewalls, VPNs and website plugins',
   'Removes easy-to-scan attack paths.',
   'Internet-facing systems are actively scanned. Keeping them updated reduces risk quickly.',
   '["Check router and firewall firmware and update if needed.",
     "Update VPN software if used.",
     "If you use WordPress: update core and plugins and themes."]',
   '30–90 minutes',
   'high', 'day',
   ARRAY['router', 'vpn', 'wordpress'],
   2),

  -- -------------------------------------------------------------------------
  -- Backups
  -- -------------------------------------------------------------------------

  ('backup-3-2-1',
   'backups', 'it_baseline',
   'Set up 3-2-1 backups',
   'You can recover from ransomware or accidents.',
   'Backups are only useful if they exist in multiple places and one copy is offline or off-site.',
   '["3 copies of important data.",
     "2 different media (e.g., cloud and external drive).",
     "1 off-site or offline copy (not always connected)."]',
   '60–180 minutes',
   'high', 'day',
   ARRAY['backups'],
   1),

  ('backup-test-restore',
   'backups', 'it_baseline',
   'Test restoring backups (quarterly)',
   'Confidence that backups actually work.',
   'Many backups fail silently. If you cannot restore, the backup does not exist when it matters.',
   '["Pick one important file or folder.",
     "Restore it to a separate location.",
     "Confirm it opens and is complete.",
     "Set a calendar reminder to repeat quarterly."]',
   '15–45 minutes',
   'high', 'hour',
   ARRAY['backups', 'recovery'],
   2),

  -- -------------------------------------------------------------------------
  -- Access / Least Privilege
  -- -------------------------------------------------------------------------

  ('access-no-local-admin',
   'access', 'it_baseline',
   'Remove local admin rights from daily users',
   'Limits what malware can do on compromised machines.',
   'Admin rights make infections worse. Standard users reduce damage and prevent many installations.',
   '["Check who has local admin rights on computers.",
     "Remove admin rights from daily accounts.",
     "Keep a separate admin account for IT tasks."]',
   '30–90 minutes',
   'high', 'day',
   ARRAY['least-privilege'],
   1),

  ('access-offboarding',
   'access', 'it_baseline',
   'Create an offboarding checklist for leavers',
   'Former employees lose access immediately.',
   'Old accounts are a common weak point. Offboarding discipline reduces long-term risk.',
   '["Disable accounts on the leaving date.",
     "Remove access to shared drives and tools.",
     "Rotate shared secrets if any existed."]',
   '10–20 minutes',
   'medium', 'minutes',
   ARRAY['process'],
   2),

  -- -------------------------------------------------------------------------
  -- Human Security (IT Baseline — org-level actions by the IT person)
  -- -------------------------------------------------------------------------

  ('human-30-min-session',
   'human', 'it_baseline',
   'Run a 30-minute security awareness session',
   'Fewer clicks on scams; faster reporting.',
   'People are targeted every day. A short practical session reduces successful phishing dramatically.',
   '["Show 3 real phishing examples relevant to your business.",
     "Explain ''urgent boss email'' and fake invoice scams.",
     "Set the rule: when in doubt, report — do not click.",
     "Consider assigning the Employee Awareness Track so staff can self-serve this learning."]',
   '30 minutes',
   'high', 'hour',
   ARRAY['training'],
   1),

  ('human-1-page-rules',
   'human', 'it_baseline',
   'Write a 1–2 page ''Security Basics'' doc',
   'Clear rules people can follow.',
   'Rules only work if they exist. Short, simple guidance beats long policies.',
   '["Include password rules, what to do if something feels off, and who to contact.",
     "Share it with staff and store it somewhere easy to find."]',
   '20–40 minutes',
   'medium', 'hour',
   ARRAY['policy'],
   2),

  -- -------------------------------------------------------------------------
  -- Network Basics
  -- -------------------------------------------------------------------------

  ('net-change-default-router-passwords',
   'network', 'it_baseline',
   'Change default router and admin passwords',
   'Stops trivial takeovers of network gear.',
   'Default passwords are widely known and frequently exploited.',
   '["Log into router or firewall admin panel.",
     "Change default admin password to a strong unique one.",
     "Store it in your password manager."]',
   '10–20 minutes',
   'medium', 'minutes',
   ARRAY['router'],
   1),

  ('net-separate-guest-wifi',
   'network', 'it_baseline',
   'Separate guest Wi-Fi from internal devices',
   'Guests cannot access company devices easily.',
   'Guest devices are untrusted. Segmentation reduces risk of accidental or malicious access.',
   '["Enable guest Wi-Fi network on router.",
     "Ensure guest network cannot access internal devices.",
     "Use strong Wi-Fi password."]',
   '15–45 minutes',
   'medium', 'hour',
   ARRAY['wifi'],
   2)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. Seed — Awareness Track items
-- =============================================================================
-- These 10 items are assigned to all org members (all roles).
-- No technical knowledge required. Content defined in Round 3 product research.

INSERT INTO public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
VALUES

  -- -------------------------------------------------------------------------
  -- Sub-group: Recognise Attacks (items 1–4)
  -- -------------------------------------------------------------------------

  ('aware-spot-phishing-email',
   'awareness', 'awareness',
   'Spot a phishing email',
   'You can identify a fake email before clicking anything.',
   'Phishing is the #1 way attackers get in. Recognition is your first line of defence.',
   '["Check the sender address — display name and actual email often differ (e.g. ''Your Bank'' vs. randomdomain.xyz).",
     "Urgency and pressure are red flags (e.g. ''Act now or your account is closed'').",
     "Hover over links before clicking — does the URL match what they claim?",
     "Real companies never ask for your password by email.",
     "Action: look at the last 5 emails in your spam folder and see if you can spot what made them suspicious."]',
   '5 minutes',
   'high', 'minutes',
   ARRAY['phishing', 'awareness'],
   1),

  ('aware-fake-login-page',
   'awareness', 'awareness',
   'Recognise a fake login page',
   'You do not hand your password to an attacker''s copy of a real site.',
   'Fake login pages look identical to real ones. The URL is the only reliable signal.',
   '["Before entering any password, check the browser address bar — is it the real domain?",
     "Attackers use tricks: g00gle.com, paypa1.com, login-microsoft.com.",
     "A padlock (HTTPS) does NOT mean the site is safe — it only means the connection is encrypted.",
     "Action: next time you log in anywhere, consciously check the address bar before typing."]',
   '3 minutes',
   'high', 'minutes',
   ARRAY['phishing', 'awareness'],
   2),

  ('aware-voice-scam',
   'awareness', 'awareness',
   'Spot a phone or voice scam',
   'You do not hand over access or payment under pressure from a caller.',
   'Attackers call pretending to be IT support, the bank, or a supplier. Urgency is the weapon.',
   '["Legitimate IT support will never cold-call and ask for your password.",
     "Banks never ask you to move money for safety.",
     "If in doubt: hang up, look up the official number, and call back independently.",
     "A ''CEO'' calling from an unknown number asking for an urgent wire transfer is social engineering.",
     "Action: agree with your team on a simple verbal code word for urgent out-of-band requests."]',
   '5 minutes',
   'high', 'minutes',
   ARRAY['social-engineering', 'awareness'],
   3),

  ('aware-fake-invoice',
   'awareness', 'awareness',
   'Spot a fake invoice or supplier email',
   'You do not pay money to an attacker''s bank account.',
   'Business Email Compromise (fake invoice fraud) causes the highest financial losses of any attack type.',
   '["Email from a known supplier but bank details have changed? Call them on their known number to verify — never reply to that email.",
     "Watch for subtle sender spoofs: supplier@acme-corp.com vs. supplier@acme-c0rp.com.",
     "If an invoice is unexpected or the amount is unusual, verify before paying.",
     "Action: create a rule with your finance or admin person — any new bank details must be verified by phone before payment."]',
   '5 minutes',
   'high', 'minutes',
   ARRAY['social-engineering', 'fraud', 'awareness'],
   4),

  -- -------------------------------------------------------------------------
  -- Sub-group: Safe Habits (items 5–8)
  -- -------------------------------------------------------------------------

  ('aware-strong-password',
   'awareness', 'awareness',
   'Use a strong, unique password for your work accounts',
   'If one of your accounts leaks, attackers cannot use that password anywhere else.',
   'Password reuse is how one breach becomes ten.',
   '["Use a different password for every work account.",
     "Use a password manager (Bitwarden is free) — you only remember one master password.",
     "Avoid: name and birth year, company name, ''Password1''.",
     "Action: check if you reuse any password across work accounts. If yes, change the most important one today."]',
   '10 minutes',
   'high', 'hour',
   ARRAY['passwords', 'awareness'],
   5),

  ('aware-mfa-personal',
   'awareness', 'awareness',
   'Turn on two-step login for your work accounts',
   'Even if your password is stolen, attackers still cannot log in.',
   'MFA blocks the vast majority of automated account takeover attempts.',
   '["Go to your email account security settings.",
     "Enable two-factor authentication or two-step verification.",
     "Use an authenticator app (Google Authenticator, Authy) rather than SMS if available.",
     "Action: enable MFA on your work email today."]',
   '5–10 minutes',
   'high', 'minutes',
   ARRAY['mfa', 'awareness'],
   6),

  ('aware-lock-screen',
   'awareness', 'awareness',
   'Lock your screen when you step away',
   'No one can access your computer when you are away from your desk.',
   'Physical access is an overlooked risk, especially in shared offices, cafés, or open-plan spaces.',
   '["Windows: press Win + L.",
     "Mac: press Ctrl + Cmd + Q, or set auto-lock after 1–2 minutes.",
     "Phone: enable automatic screen lock after 30–60 seconds.",
     "Action: set auto-lock on your computer right now if it is longer than 2 minutes."]',
   '2 minutes',
   'medium', 'minutes',
   ARRAY['physical', 'awareness'],
   7),

  ('aware-usb-drives',
   'awareness', 'awareness',
   'Do not plug in unknown USB drives or cables',
   'You do not accidentally install malware.',
   'USB drives found in car parks or sent as free gifts are a real attack method. Malicious cables exist.',
   '["Never plug in a USB drive you did not buy yourself.",
     "If you receive a USB drive as a promotional item, do not use it on a work computer.",
     "Charging cables from unknown sources carry the same risk.",
     "No action required — awareness only. Pass this on to your team."]',
   '2 minutes',
   'medium', 'minutes',
   ARRAY['physical', 'malware', 'awareness'],
   8),

  -- -------------------------------------------------------------------------
  -- Sub-group: When Something Feels Wrong (items 9–10)
  -- -------------------------------------------------------------------------

  ('aware-clicked-something',
   'awareness', 'awareness',
   'Know what to do if you think you clicked something bad',
   'You act quickly and correctly, reducing damage.',
   'The response in the first minutes after a suspicious click matters enormously. Panic or silence makes it worse.',
   '["Disconnect from the internet immediately (disable Wi-Fi or unplug cable) — this stops malware calling home.",
     "Do NOT turn the computer off — this may destroy forensic evidence.",
     "Tell your IT contact or manager immediately — do not wait or try to fix it yourself.",
     "Change passwords for any accounts accessed on that device — from a different device.",
     "Action: make sure you know who to call right now. Save that person''s number."]',
   '3 minutes',
   'high', 'minutes',
   ARRAY['incident', 'awareness'],
   9),

  ('aware-report-dont-hide',
   'awareness', 'awareness',
   'Know the one rule: report, don''t hide',
   'Incidents get contained faster because people report instead of hoping the problem goes away.',
   'Most successful attacks are discovered weeks or months late because people were embarrassed to report. Early reporting saves the business.',
   '["If something feels off — an email, a login prompt, a call, a pop-up — report it.",
     "There is no such thing as a stupid security question.",
     "You will not get in trouble for clicking something accidentally — you will get in trouble if you hide it.",
     "Action: find out right now who your ''report security concerns to'' contact is. If you do not know, ask today."]',
   '2 minutes',
   'high', 'minutes',
   ARRAY['process', 'incident', 'awareness'],
   10)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- NOTES
-- =============================================================================
--
-- items.ts (frontend/lib/checklist/items.ts) should now be reduced to:
--   - TypeScript type definitions (ChecklistGroup, ChecklistItem, ChecklistDefinition)
--   - Display/helper functions that read from the DB via API
--   - No hardcoded CHECKLIST data object
--   This change is made in Step D (backend routes) when the API is built.
--
-- Adding new checklist items in future:
--   1. Write a new numbered migration (007_*.sql, 008_*.sql, etc.)
--   2. INSERT new rows — never edit existing seed rows in place
--   3. To retire an item: UPDATE checklist_items SET active = false WHERE id = '...'
--   4. Active assessments keep their snapshot unchanged (decoupled by design)
--
-- Platform-specific step content (Google Workspace vs M365 etc.) is handled
-- at the API/frontend layer using the org's email_platform setting, not stored
-- as separate rows here. The steps column contains the generic version.
-- The API or frontend injects the correct platform steps at render time.
