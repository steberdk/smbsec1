import { ChecklistDefinition } from "./types";

export const CHECKLIST: ChecklistDefinition = {
  version: 1,
  groups: [
    {
      id: "accounts",
      title: "Passwords & Accounts",
      description: "Stop account takeovers and reduce ransomware risk quickly.",
      order: 1,
    },
    {
      id: "email",
      title: "Email Security",
      description: "Most attacks start in email. Make phishing less effective.",
      order: 2,
    },
    {
      id: "patching",
      title: "Updates & Patching",
      description: "Close known holes that attackers actively scan for.",
      order: 3,
    },
    {
      id: "backups",
      title: "Backups & Recovery",
      description: "If ransomware hits, backups are your business insurance.",
      order: 4,
    },
    {
      id: "access",
      title: "Least Privilege",
      description: "Reduce damage if an account is compromised.",
      order: 5,
    },
    {
      id: "human",
      title: "Human Security",
      description: "Help staff avoid common traps without fear-mongering.",
      order: 6,
    },
    {
      id: "network",
      title: "Network Basics",
      description: "Easy router and Wi-Fi hygiene that prevents common exposure.",
      order: 7,
    },
  ],
  items: [
    // Accounts
    {
      id: "acct-password-manager",
      groupId: "accounts",
      title: "Use a password manager",
      outcome: "Stronger passwords everywhere without memorizing them.",
      whyItMatters:
        "Most breaches start with reused or weak passwords. A password manager makes strong unique passwords practical.",
      steps: [
        "Pick one (Bitwarden, 1Password, KeePass).",
        "Install it on your computer and phone.",
        "Move your email + admin passwords into it first.",
      ],
      timeEstimate: "10–20 minutes",
      impact: "high",
      effort: "hour",
      tags: ["passwords"],
    },
    {
      id: "acct-enable-mfa-email",
      groupId: "accounts",
      title: "Turn on MFA for email accounts",
      outcome: "Stops most account takeovers even if a password leaks.",
      whyItMatters:
        "Email is the #1 entry point for attackers. MFA blocks login with only a stolen password.",
      steps: [
        "In Google Workspace or Microsoft 365 admin settings, enable MFA.",
        "Require MFA for all users, especially admins.",
        "Prefer authenticator app or security key over SMS if possible.",
      ],
      timeEstimate: "5–15 minutes",
      impact: "high",
      effort: "minutes",
      tags: ["mfa", "email"],
    },
    {
      id: "acct-separate-admin-accounts",
      groupId: "accounts",
      title: "Separate admin accounts from daily accounts",
      outcome: "If a user gets phished, attackers don’t automatically get admin control.",
      whyItMatters:
        "Using admin accounts for daily work makes compromises much worse. Separate accounts reduce blast radius.",
      steps: [
        "Create dedicated admin accounts for admins.",
        "Use daily accounts for email and normal work.",
        "Use admin accounts only when needed.",
      ],
      timeEstimate: "15–30 minutes",
      impact: "high",
      effort: "hour",
      tags: ["admins"],
    },
    {
      id: "acct-remove-shared-accounts",
      groupId: "accounts",
      title: "Remove or lock down shared accounts",
      outcome: "Clear accountability and fewer easy targets.",
      whyItMatters:
        "Shared accounts make it hard to track incidents and often have weak controls. They’re also common attacker targets.",
      steps: [
        "List shared accounts (e.g., shared mailbox logins).",
        "Replace with individual accounts + shared mailbox access.",
        "If a shared account must exist: strong password + MFA + limited access.",
      ],
      timeEstimate: "15–45 minutes",
      impact: "medium",
      effort: "hour",
      tags: ["identity"],
    },

    // Email security
    {
      id: "email-phishing-filters",
      groupId: "email",
      title: "Enable anti-phishing and spam filters",
      outcome: "Fewer dangerous emails reach your team.",
      whyItMatters:
        "Most attacks start in email. Filtering reduces the number of threats people must handle.",
      steps: [
        "Check your email admin settings (Google Workspace / Microsoft 365).",
        "Turn on recommended anti-phishing and spam protection.",
        "Verify quarantine/alerts are configured.",
      ],
      timeEstimate: "10–20 minutes",
      impact: "high",
      effort: "minutes",
      tags: ["email", "phishing"],
    },
    {
      id: "email-disable-macros",
      groupId: "email",
      title: "Disable Office macros by default",
      outcome: "Blocks a common malware delivery method.",
      whyItMatters:
        "Malicious macros are a common way to run malware on a computer from a document attachment.",
      steps: [
        "If you use Microsoft Office, set macros to be blocked by default.",
        "Allow only signed/trusted macros if needed.",
      ],
      timeEstimate: "10–30 minutes",
      impact: "medium",
      effort: "hour",
      tags: ["office", "macros"],
    },
    {
      id: "email-phish-reporting",
      groupId: "email",
      title: "Add an easy 'Report Phishing' method",
      outcome: "Staff can report suspicious emails quickly.",
      whyItMatters:
        "Reporting helps you spot campaigns early and prevents multiple people being tricked.",
      steps: [
        "Enable a 'Report phishing' add-on/button if available.",
        "Or define a simple process: forward to a security inbox (e.g., security@company).",
        "Tell employees what to do when in doubt.",
      ],
      timeEstimate: "10–20 minutes",
      impact: "medium",
      effort: "minutes",
      tags: ["process"],
    },

    // Patching
    {
      id: "patch-auto-updates-os",
      groupId: "patching",
      title: "Turn on automatic OS updates",
      outcome: "Closes known security holes automatically.",
      whyItMatters:
        "Attackers exploit known vulnerabilities. Updates are one of the highest ROI security actions.",
      steps: [
        "Enable automatic updates on Windows/macOS.",
        "Ensure updates install regularly (not postponed indefinitely).",
      ],
      timeEstimate: "5–10 minutes",
      impact: "high",
      effort: "minutes",
      tags: ["patching"],
    },
    {
      id: "patch-update-key-systems",
      groupId: "patching",
      title: "Update routers, firewalls, VPNs and website plugins",
      outcome: "Removes easy-to-scan attack paths.",
      whyItMatters:
        "Internet-facing systems are actively scanned. Keeping them updated reduces risk quickly.",
      steps: [
        "Check router/firewall firmware and update if needed.",
        "Update VPN software if used.",
        "If you use WordPress: update core + plugins + themes.",
      ],
      timeEstimate: "30–90 minutes",
      impact: "high",
      effort: "day",
      tags: ["router", "vpn", "wordpress"],
    },

    // Backups
    {
      id: "backup-3-2-1",
      groupId: "backups",
      title: "Set up 3-2-1 backups",
      outcome: "You can recover from ransomware or accidents.",
      whyItMatters:
        "Backups are only useful if they exist in multiple places and one copy is offline or off-site.",
      steps: [
        "3 copies of important data.",
        "2 different media (e.g., cloud + external drive).",
        "1 off-site/offline (not always connected).",
      ],
      timeEstimate: "60–180 minutes",
      impact: "high",
      effort: "day",
      tags: ["backups"],
    },
    {
      id: "backup-test-restore",
      groupId: "backups",
      title: "Test restoring backups (quarterly)",
      outcome: "Confidence that backups actually work.",
      whyItMatters:
        "Many backups fail silently. If you can’t restore, the backup doesn’t exist when it matters.",
      steps: [
        "Pick one important file/folder.",
        "Restore it to a separate location.",
        "Confirm it opens and is complete.",
        "Set a calendar reminder to repeat quarterly.",
      ],
      timeEstimate: "15–45 minutes",
      impact: "high",
      effort: "hour",
      tags: ["backups", "recovery"],
    },

    // Access / least privilege
    {
      id: "access-no-local-admin",
      groupId: "access",
      title: "Remove local admin rights from daily users",
      outcome: "Limits what malware can do on compromised machines.",
      whyItMatters:
        "Admin rights make infections worse. Standard users reduce damage and prevent many installations.",
      steps: [
        "Check who has local admin rights on computers.",
        "Remove admin rights from daily accounts.",
        "Keep a separate admin account for IT tasks.",
      ],
      timeEstimate: "30–90 minutes",
      impact: "high",
      effort: "day",
      tags: ["least-privilege"],
    },
    {
      id: "access-offboarding",
      groupId: "access",
      title: "Create an offboarding checklist for leavers",
      outcome: "Former employees lose access immediately.",
      whyItMatters:
        "Old accounts are a common weak point. Offboarding discipline reduces long-term risk.",
      steps: [
        "Disable accounts on the leaving date.",
        "Remove access to shared drives and tools.",
        "Rotate shared secrets if any existed.",
      ],
      timeEstimate: "10–20 minutes",
      impact: "medium",
      effort: "minutes",
      tags: ["process"],
    },

    // Human security
    {
      id: "human-30-min-session",
      groupId: "human",
      title: "Run a 30-minute security awareness session",
      outcome: "Fewer clicks on scams; faster reporting.",
      whyItMatters:
        "People are targeted every day. A short practical session reduces successful phishing dramatically.",
      steps: [
        "Show 3 real phishing examples relevant to your business.",
        "Explain 'urgent boss email' and fake invoice scams.",
        "Set the rule: when in doubt, report — don’t click.",
      ],
      timeEstimate: "30 minutes",
      impact: "high",
      effort: "hour",
      tags: ["training"],
    },
    {
      id: "human-1-page-rules",
      groupId: "human",
      title: "Write a 1–2 page 'Security Basics' doc",
      outcome: "Clear rules people can follow.",
      whyItMatters:
        "Rules only work if they exist. Short, simple guidance beats long policies.",
      steps: [
        "Include password rules, what to do if something feels off, and who to contact.",
        "Share it with staff and store it somewhere easy to find.",
      ],
      timeEstimate: "20–40 minutes",
      impact: "medium",
      effort: "hour",
      tags: ["policy"],
    },

    // Network basics
    {
      id: "net-change-default-router-passwords",
      groupId: "network",
      title: "Change default router/admin passwords",
      outcome: "Stops trivial takeovers of network gear.",
      whyItMatters:
        "Default passwords are widely known and frequently exploited.",
      steps: [
        "Log into router/firewall admin panel.",
        "Change default admin password to a strong unique one.",
        "Store it in your password manager.",
      ],
      timeEstimate: "10–20 minutes",
      impact: "medium",
      effort: "minutes",
      tags: ["router"],
    },
    {
      id: "net-separate-guest-wifi",
      groupId: "network",
      title: "Separate guest Wi-Fi from internal devices",
      outcome: "Guests can’t access company devices easily.",
      whyItMatters:
        "Guest devices are untrusted. Segmentation reduces risk of accidental or malicious access.",
      steps: [
        "Enable guest Wi-Fi network on router.",
        "Ensure guest network cannot access internal devices.",
        "Use strong Wi-Fi password.",
      ],
      timeEstimate: "15–45 minutes",
      impact: "medium",
      effort: "hour",
      tags: ["wifi"],
    },
  ],
};
