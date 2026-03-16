-- 008_platform_steps.sql
--
-- Add platform-specific step variants for Google Workspace and Microsoft 365
-- to the 4 key IT Baseline items identified in Iteration 6.
--
-- Format: { "default": [...], "google_workspace": [...], "microsoft_365": [...] }
-- resolveSteps() picks the org's platform variant or falls back to "default".
--
-- Safe to re-run (idempotent UPDATE).

-- ---------------------------------------------------------------------------
-- 1. acct-enable-mfa-email — Turn on MFA for email accounts
-- ---------------------------------------------------------------------------

UPDATE public.checklist_items
SET steps = jsonb_build_object(
  'default', '["In your email admin settings, enable MFA / 2-step verification.", "Require MFA for all users, especially admins.", "Prefer authenticator app or security key over SMS if possible."]'::jsonb,
  'google_workspace', '["Open admin.google.com → Security → 2-Step Verification.", "Click Allow users to turn on 2-Step Verification.", "Set enforcement: On — from a specific date (give staff 1 week notice).", "Recommended: allow only Security Key or Google Prompt, disable SMS."]'::jsonb,
  'microsoft_365', '["Open entra.microsoft.com → Protection → Authentication methods.", "Enable Microsoft Authenticator and FIDO2 security keys.", "Go to Protection → Conditional Access → Create policy: Require MFA for all users.", "Block legacy authentication protocols (they bypass MFA)."]'::jsonb
)
WHERE id = 'acct-enable-mfa-email';

-- ---------------------------------------------------------------------------
-- 2. email-phishing-filters — Enable anti-phishing and spam filters
-- ---------------------------------------------------------------------------

UPDATE public.checklist_items
SET steps = jsonb_build_object(
  'default', '["Check your email admin settings for anti-phishing and spam protection.", "Turn on recommended anti-phishing policies.", "Verify quarantine and alerts are configured."]'::jsonb,
  'google_workspace', '["Open admin.google.com → Apps → Google Workspace → Gmail → Safety.", "Enable Spoofing and authentication protection (move to Quarantine).", "Enable Attachments protection — block encrypted attachments from untrusted senders.", "Enable Links and external images protection — identify links behind shortened URLs."]'::jsonb,
  'microsoft_365', '["Open security.microsoft.com → Email & collaboration → Policies → Threat policies.", "Edit the Anti-phishing policy: enable Mailbox intelligence and set action to Quarantine.", "Edit the Safe Attachments policy: set action to Block.", "Edit the Safe Links policy: enable URL scanning in email and Teams messages."]'::jsonb
)
WHERE id = 'email-phishing-filters';

-- ---------------------------------------------------------------------------
-- 3. email-disable-macros — Disable Office macros by default
-- ---------------------------------------------------------------------------

UPDATE public.checklist_items
SET steps = jsonb_build_object(
  'default', '["If you use Microsoft Office, set macros to be blocked by default.", "Allow only signed or trusted macros if needed."]'::jsonb,
  'google_workspace', '["Google Workspace does not use Office macros — this item is less relevant.", "If staff use desktop Office apps: open Group Policy or Microsoft 365 admin → Block macros from the internet.", "Google Apps Script runs in a sandboxed environment and is lower risk than VBA macros."]'::jsonb,
  'microsoft_365', '["Open intune.microsoft.com → Devices → Configuration profiles → Create profile.", "Choose Settings catalog → Microsoft Office → Security: Block macros from running in Office files from the internet.", "Alternative (no Intune): deploy via Group Policy — User Config → Admin Templates → Block macros in files from the internet.", "Communicate to staff: macros from email attachments will no longer run."]'::jsonb
)
WHERE id = 'email-disable-macros';

-- ---------------------------------------------------------------------------
-- 4. backup-3-2-1 — Set up 3-2-1 backups
-- ---------------------------------------------------------------------------

UPDATE public.checklist_items
SET steps = jsonb_build_object(
  'default', '["Keep 3 copies of important data.", "Store on 2 different media (e.g. cloud + external drive).", "Keep 1 copy off-site or offline (not always connected to your network)."]'::jsonb,
  'google_workspace', '["Google Drive keeps version history (30 days) and has a Trash (25 days) — but this is not a backup.", "Use Google Vault or a third-party backup tool (Backupify, Spanning) to export Drive, Gmail, Calendar.", "Keep an offline copy: export critical shared drives weekly to an external drive or separate cloud account.", "Test a restore quarterly: can you recover a deleted file from 2 weeks ago?"]'::jsonb,
  'microsoft_365', '["OneDrive and SharePoint keep version history (30 days) and have a Recycle Bin (93 days) — but this is not a backup.", "Use a third-party M365 backup tool (Veeam, Acronis, AvePoint) to back up Exchange, OneDrive, SharePoint, Teams.", "Keep an offline copy: export critical SharePoint libraries weekly to an external drive or separate cloud.", "Test a restore quarterly: can you recover a deleted email from 2 weeks ago?"]'::jsonb
)
WHERE id = 'backup-3-2-1';
