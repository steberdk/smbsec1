-- 009_new_it_baseline_items.sql
--
-- 4 new IT Baseline items for Iteration 6.
-- High-impact, practical controls that close common SMB attack paths.
--
-- Safe to re-run (ON CONFLICT DO NOTHING).

-- ---------------------------------------------------------------------------
-- 1. endpoint-defender-active — Windows Defender / AV
-- Group: patching (closest fit — endpoint protection)
-- ---------------------------------------------------------------------------

INSERT INTO public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
VALUES
  ('endpoint-defender-active',
   'patching', 'it_baseline',
   'Verify endpoint protection is active',
   'Every computer has antivirus / anti-malware running and up to date.',
   'Endpoint protection is the last line of defence when phishing or a bad download gets through. Windows Defender is free and effective — but only if it is actually running and not disabled by a user or conflicting software.',
   jsonb_build_object(
     'default', '["Open Windows Security → Virus & threat protection on each computer.", "Confirm Real-time protection is On.", "Run a Quick Scan to verify definitions are current.", "If using a third-party AV: check its dashboard for active/expired status."]'::jsonb,
     'google_workspace', '["Google does not manage endpoint AV — this is a device-level control.", "On each Windows PC: open Windows Security → confirm Real-time protection is On.", "On Macs: consider a lightweight AV (Malwarebytes, CrowdStrike Falcon Go).", "Chromebooks have built-in sandboxing — no separate AV needed."]'::jsonb,
     'microsoft_365', '["If you have Microsoft 365 Business Premium: open security.microsoft.com → Endpoints → Device inventory.", "Verify devices show No active alerts and Defender is the active AV engine.", "Without Business Premium: check Windows Security → Virus & threat protection on each PC manually.", "Enable tamper protection to prevent users from disabling Defender."]'::jsonb
   ),
   '10–15 minutes per computer',
   'high', 'hour',
   ARRAY['endpoint', 'malware'],
   3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. email-auth-spf-dkim-dmarc — Email authentication
-- Group: email
-- ---------------------------------------------------------------------------

INSERT INTO public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
VALUES
  ('email-auth-spf-dkim-dmarc',
   'email', 'it_baseline',
   'Set up SPF, DKIM, and DMARC for your domain',
   'Your domain cannot be used to send forged emails (invoice fraud, BEC).',
   'Without email authentication, anyone can send emails that appear to come from your domain. This is how business email compromise (BEC) and invoice fraud attacks work. SPF, DKIM, and DMARC are free DNS records that tell receiving mail servers how to verify your emails are legitimate.',
   jsonb_build_object(
     'default', '["Check your current status: visit mxtoolbox.com → Enter your domain → Review SPF, DKIM, DMARC results.", "Add an SPF record to your DNS: v=spf1 include:<your-email-provider> -all", "Enable DKIM signing in your email admin panel and publish the public key to DNS.", "Add a DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com"]'::jsonb,
     'google_workspace', '["Open admin.google.com → Apps → Google Workspace → Gmail → Authenticate email.", "Click Generate new record to get your DKIM key. Add the TXT record to your DNS.", "Check SPF: your DNS should have v=spf1 include:_spf.google.com ~all (or -all for strict).", "Add DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com as a TXT record at _dmarc.yourdomain.com.", "Wait 48h, then verify at mxtoolbox.com."]'::jsonb,
     'microsoft_365', '["SPF: add this TXT record to your DNS: v=spf1 include:spf.protection.outlook.com -all", "DKIM: open security.microsoft.com → Email & collaboration → Policies → DKIM. Select your domain and enable signing.", "Publish the two CNAME records Microsoft provides to your DNS.", "DMARC: add TXT record at _dmarc.yourdomain.com: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com", "Verify at mxtoolbox.com after 48h."]'::jsonb
   ),
   '30–60 minutes (mostly DNS propagation wait)',
   'high', 'hour',
   ARRAY['email', 'spoofing', 'bec'],
   4)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. network-rdp-exposure — RDP not exposed to internet
-- Group: network
-- ---------------------------------------------------------------------------

INSERT INTO public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
VALUES
  ('network-rdp-exposure',
   'network', 'it_baseline',
   'Check that RDP is not exposed to the internet',
   'No computer in the office can be accessed via Remote Desktop from the public internet.',
   'Remote Desktop Protocol (RDP) exposed to the internet is one of the top 3 initial access vectors for ransomware. Attackers scan the entire internet for open port 3389 and brute-force credentials. If RDP is needed, it must be behind a VPN or use a zero-trust remote access tool.',
   jsonb_build_object(
     'default', '["Check your router/firewall: ensure port 3389 (RDP) is NOT forwarded to any internal machine.", "On each Windows PC: Settings → System → Remote Desktop — turn it Off unless actively needed.", "If remote access is required: use a VPN (WireGuard, Tailscale) or a zero-trust tool (Cloudflare Access, Twingate) instead of exposing RDP.", "Verify externally: visit shodan.io and search for your public IP to confirm port 3389 is closed."]'::jsonb
   ),
   '10–20 minutes',
   'high', 'minutes',
   ARRAY['network', 'ransomware', 'rdp'],
   3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. gws-oauth-app-audit — OAuth app audit (Google Workspace)
-- Group: access
-- ---------------------------------------------------------------------------

INSERT INTO public.checklist_items
  (id, group_id, track, title, outcome, why_it_matters, steps, time_estimate, impact, effort, tags, order_index)
VALUES
  ('gws-oauth-app-audit',
   'access', 'it_baseline',
   'Audit third-party app access (OAuth grants)',
   'You know which third-party apps have access to company email, files, and calendar.',
   'Even after completing the entire security checklist, your org may still have 30–80 unreviewed OAuth grants giving third-party apps persistent access to email, Drive, and Calendar. This is one of the most common persistent-access attack paths — a compromised or malicious app can read all email silently.',
   jsonb_build_object(
     'default', '["Review which apps have access to your email and file storage.", "Revoke access for any apps you do not recognise or no longer use.", "Set a policy: new third-party app access requires admin approval."]'::jsonb,
     'google_workspace', '["Open admin.google.com → Security → API controls → Manage Third-Party App Access.", "Review the list: revoke any app you do not recognise or that has broad scopes (Gmail read, Drive full access).", "Click Settings → Block third-party API access unless admin-approved.", "Ask each staff member to visit myaccount.google.com → Security → Third-party apps with account access and revoke unused grants."]'::jsonb,
     'microsoft_365', '["Open entra.microsoft.com → Applications → Enterprise applications → review the list.", "Sort by Last sign-in to find inactive apps. Delete any you do not recognise.", "Go to User settings → Enterprise applications → set Users can consent to apps to No (disabled).", "This forces admin approval for new app grants, preventing shadow IT OAuth abuse."]'::jsonb
   ),
   '20–30 minutes',
   'high', 'hour',
   ARRAY['oauth', 'access', 'shadow-it'],
   3)
ON CONFLICT (id) DO NOTHING;
