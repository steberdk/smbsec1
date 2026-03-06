Product Vision: Help SMB's (Small and Medium sized Businesses) fix most dumb and deadly IT security risks (80% of the risk). It will not take longer than 30 mins for each of the employees and business owner.

Full version 1 of product:
User roles:
- Owner: Business owner deciding to improve IT security at his company. Is also Manager and Employee.
- Manager: Company employee that manage other employees. A boss. This is a iterative structure. Is also employee.
- Employee: All company employee's.
What users do:
- Owner:
   - Initially: Start himself as user.
   - Initially: Select from security checklist, what he wants for all employees to go through. And select reassessment cycle (3 month ½ year, 1 year)
   - Subsequently: Maintain (add/remove) employees and 
- Managers:
   - Initially: Invite employees that report directly to him. And maintain (create/change/delete) subsequently.
- Employees:
   - Initially: Decide if they are manager or just create themself after email invite triggered from Manager.
   - Initially: Security checklist walkthrough.
   - Reassessments: Security checklist walkthrough.

ANON users - Main scenarios:
 - Users can go to web site and freely view a small and easy IT security checklist, for remediating 80% of their risk.
 - Users can sign up with magic link to their email (and according to logged in users, below) invite others to set up org.
 - Users (also logged in oones) can read why this is a good idea, that it is easy to do because most of it is not hard but social engineering etc etc.

Logged in users - Main scenarios:
 - Setup and subsequent maintenance of users, selection from security checklist, and reassessment cycle.
 - Initial assessement by each employee, and every manager can see summary status for his own employee's reporting to him. Managers with lower managers reporting to him can see status of his team including all sub teams. Owner can see all.
 - Reassessments when decided by Owner. (all results again summarized up in statusses through higher teams.
 - GDPR built in: a) Employees can always view information is stored about them - on normal scenario pages like above if that is most easy, otherwise on special list for GDPR reasons. b) When employee's leave organisation their boss (ultimately Owner) can delete them and their data.
 - For subsequent versions: Removing employee's from a manager (because they are not in team anymore). They are not deleted not removed from team and can potentially be picked up by other manager subsequently (in case of reorganisation). This also goes for Managers.
 - For subsequent versions: Email compaigns for testing employees in fake/spam/fraud emails/contacts.

Info:
 - owner creation also creates an org_unit
 - even owner is created in emp and references org_unit
 - checklist and descriptions of each item is the same for ANON and logged in users - i.e. both from database for consistency and maintainability.

IT security checklist (current version):
a) Fix the “Top 5 Dumb-but-Deadly” Problems (80% of the risk)
   If you do *nothing else*, focus here.
  a.1) Passwords & Accounts (biggest win, lowest effort)
     * Enforce a password manager
       (Bitwarden, 1Password, KeePass)
     * Turn on Multi Factor Authorization everywhere possible
       (email, admin panels, VPN)
     * Remove shared accounts
       (or at least lock them down)
     
     This alone stops most ransomware and email takeovers.

  a.2) Email security (where most attacks start)
     * Enable spam & phishing filters
       (often already included in Microsoft 365 / Google Workspace)
     * Disable macro execution by default in Office
     * Add a “Report Phishing” button

     Bonus: send a 1-page phishing cheat sheet to staff.

  a.3) Patch the basics
     * Turn on automatic OS updates
     * Update:
        * Routers
        * Firewalls
        * VPN software
        * WordPress / plugins (if you have a website)

     You’re closing known holes attackers actively scan for.

  a.4) Backups (ransomware insurance)
     * Follow 3-2-1 rule:
        * 3 copies
        * 2 different media
        * 1 off-site / offline
     * Test restore **once a quarter**

     If backups don’t restore → they don’t exist.

  a.5) Least privilege (grant only access needed)
     * Users are not local admins
     * Admin accounts are separate
     * Old employees? → accounts disabled immediately


b) Cheap / Free Tools That Punch Above Their Weight
   You don’t need enterprise gear.

  b.1) Endpoint protection
     * Windows Defender (properly configured) is good enough for many SMBs
     * macOS: built-in protections + Gatekeeper

  b.2) Visibility
     * Enable logging (even basic)
     * Centralize logs if possible (even a simple syslog)

  b.3) Network
     * Change default router passwords
     * Disable unused ports
     * Separate:
        * Guest Wi-Fi
        * Internal devices


c) Human Security (aka: teach people not to shoot themselves)
   This is way more important than tech.

   c.1) 30-minute security awareness session
     Including:
     * Phishing examples
     * “Urgent boss email” scams
     * Fake invoices
     * USB sticks = NO
    No fear-mongering. Just realism.

   c.2) Simple rules, written down
     * 1–2 page Security Basics doc:
        * Password rules
        * What to do if something feels “off”
        * Who to contact

     People follow rules when they exist.


d) Simple Security Checklist You Can Reuse Everywhere

  d.1) Basic SMB Security Checklist:
    * Password manager deployed
    * MFA enabled for email & admins
    * No shared admin accounts
    * spam & phishing filters enabled
    * Macro execution disabled by default
    * Phishing reporting enabled
    * 1-page phishing cheat sheet sent to staff
    * Automatic updates enabled
    * Updates performed on routers, firewalls, VPN software, WordPress/plugins, etc.
    * Backups done regularly and tested
    * Least privilege implemented
    * Offboarding checklist exists
    
    * Endpoint protection
    * Visibility
    * Network passwords, ports, separate
    
    * Periodic security awareness sessions
    * Rules are written down

    Run this once per company → instant value.


Architecture:
Supabase, Vercel and GitHub. Accounts exist. Codebase in this folder and sub folders contain basic wirering of it.
Dev/Test on this local windows machine.
But everything else is not yet, e.g. UX/UI (how a good easy web site should look like - both the tech colors etc, but also the actual interaction with user, i.e. easy Apple/Steve Jobs like vs. tech), how UX/UI is materialized into dev/operations, automatic module or end user tests (I like end user tests because they cover it all), how to plan it with initial MVP and subsequent main iterations. In short, what should be considered in total when starting a new web site for end users (Small and Medium Sized business)?

