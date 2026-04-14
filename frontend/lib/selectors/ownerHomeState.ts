/**
 * F-048 — canonical Home page state selector.
 *
 * PI 16 product team consensus (`docs/product/pi16/product_team_consensus.md` §4):
 * introduce ONE pure selector that every render on `/workspace` consumes, so
 * the Home page's "Get started" block, header subtitle, and step strikethrough
 * can never disagree with each other or with Settings/Team.
 *
 * Intent is documented in:
 *   - `docs/quality/matrices/home.md` (per-persona × per-region expected output)
 *   - `docs/quality/invariants.md` — INV-home-exec-parity,
 *     INV-home-steps-deterministic, INV-home-step-text-coherent,
 *     INV-state-pure-of-navigation
 *
 * This module is intentionally IO-free. Fetching happens in `page.tsx` (one
 * `Promise.all`), then the resolved payloads are fed here. That is the only
 * way `INV-state-pure-of-navigation` can hold: every render on the same org
 * state must yield byte-equal output regardless of navigation history.
 */

export type OrgInput = {
  id: string;
  name: string;
  email_platform?: string | null;
  locale?: string;
  ai_guidance_enabled?: boolean;
};

export type MembershipInput = {
  user_id: string;
  role: string;
  is_it_executor: boolean;
};

export type MemberInput = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  is_it_executor: boolean;
};

export type PendingInviteInput = {
  id: string;
  email: string;
  is_it_executor: boolean;
};

export type AssessmentInput = {
  id?: string;
  status: string;
};

export type HomeStep = {
  id: "invite" | "it-executor" | "assessment" | "share";
  number: number;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

export type ResolvedItExecutor = {
  /** Accepted member id, if an executor is assigned and has accepted. */
  id: string | null;
  /** Display label for the executor row: display_name, then email, then "(pending acceptance)". */
  name: string;
  /** true iff the accepted executor is the current viewer. */
  isSelf: boolean;
  /** Source of the resolution — useful for matrix verification + tests. */
  source: "self" | "member" | "pending-invite" | "none";
};

export type HomeState = {
  /** Single source of truth for R1 subtitle. */
  subtitleRole: "Owner" | "Employee";
  subtitleIsExec: boolean;
  subtitle: string;
  itExecutor: ResolvedItExecutor;
  pendingItInvite: boolean;
  memberCount: number;
  hasActiveAssessment: boolean;
  /** Canonical 4-step "Get started" list. */
  steps: HomeStep[];
};

/**
 * Resolve the org's IT Executor in a way that Settings and Home can both
 * consume. Returns a deterministic, non-null object so callers never branch
 * on `null` at the render site — they branch on `source`.
 *
 * Resolution order:
 *   1. Accepted member with `is_it_executor = true` (the canonical truth)
 *   2. Pending invite with `is_it_executor = true` (UI shows as "pending")
 *   3. "Not assigned"
 *
 * The viewer-is-self flag is *only* true when the accepted executor matches
 * the viewer. A pending invite never counts as self.
 */
export function resolveItExecutor(
  members: MemberInput[],
  pendingInvites: PendingInviteInput[],
  viewerUserId: string,
): ResolvedItExecutor {
  const acceptedExec = members.find((m) => m.is_it_executor);
  if (acceptedExec) {
    const label =
      acceptedExec.display_name?.trim() ||
      acceptedExec.email?.trim() ||
      "IT Executor";
    return {
      id: acceptedExec.user_id,
      name: label,
      isSelf: acceptedExec.user_id === viewerUserId,
      source: "member",
    };
  }

  const pendingExec = pendingInvites.find((i) => i.is_it_executor);
  if (pendingExec) {
    return {
      id: null,
      name: pendingExec.email,
      isSelf: false,
      source: "pending-invite",
    };
  }

  return { id: null, name: "", isSelf: false, source: "none" };
}

/**
 * Build the canonical Home-page state from already-fetched payloads.
 *
 * This function MUST be a pure function of its inputs so that
 * INV-home-steps-deterministic holds (same inputs → byte-equal `steps`).
 */
export function getOwnerHomeState(input: {
  org: OrgInput;
  membership: MembershipInput;
  members: MemberInput[];
  pendingInvites: PendingInviteInput[];
  assessments: AssessmentInput[];
}): HomeState {
  const { membership, members, pendingInvites, assessments } = input;

  const viewerIsOwner = membership.role === "org_admin";
  const memberCount = members.length; // accepted members, incl. owner
  const hasActiveAssessment = assessments.some((a) => a.status === "active");

  const itExecutor = resolveItExecutor(members, pendingInvites, membership.user_id);
  const pendingItInvite = itExecutor.source === "pending-invite";

  // Subtitle. Employees and IT executors (non-admin) render "Employee · IT Executor"
  // today; owners render "Owner" or "Owner · IT Executor".
  const subtitleRole: "Owner" | "Employee" = viewerIsOwner ? "Owner" : "Employee";
  const subtitleIsExec =
    itExecutor.source === "member" && itExecutor.id === membership.user_id;
  const subtitle = subtitleIsExec
    ? `${subtitleRole} \u00b7 IT Executor`
    : subtitleRole;

  // Steps — always 4, order is fixed per product team consensus §4.
  //   (1) Invite a team member        — done iff memberCount >= 2
  //   (2) Assign or confirm IT Exec   — done iff itExecutor has a resolution
  //   (3) Start your first assessment — done iff hasActiveAssessment
  //   (4) Share the summary           — done iff hasActiveAssessment
  //       (step 4's deeper "has any teammate responded" check requires a
  //       response-count fetch not currently on Home; gating on the same
  //       signal keeps the step-4 strikethrough deterministic today and
  //       can tighten in a future PI without breaking the selector API.)

  const step1Done = memberCount >= 2;
  // Step 2 is "done" only when an accepted member holds the flag (F-048 AC-5):
  // a pending invite is informative, not complete. The step-2 title still
  // reflects the pending state so the user is not asked to "assign" again.
  const step2Done = itExecutor.source === "member";
  const step3Done = hasActiveAssessment;
  const step4Done = hasActiveAssessment;

  const step2Title = (() => {
    if (itExecutor.source === "member") {
      if (itExecutor.isSelf) return "IT checklist assigned to you";
      return `IT Executor: ${itExecutor.name}`;
    }
    if (itExecutor.source === "pending-invite") {
      return `IT Executor invite sent to ${itExecutor.name}`;
    }
    return "Assign or confirm your IT Executor";
  })();

  const step2Description = (() => {
    if (itExecutor.source === "member") {
      if (itExecutor.isSelf)
        return "You handle IT yourself — the IT Baseline checklist is on your list.";
      return `${itExecutor.name} handles the IT Baseline checklist.`;
    }
    if (itExecutor.source === "pending-invite") {
      return "Waiting for the invitee to accept. You can reassign or revoke from Settings.";
    }
    return "Pick who will own the IT Baseline checklist for this organisation.";
  })();

  const steps: HomeStep[] = [
    {
      id: "invite",
      number: 1,
      title: "Invite a team member",
      description:
        "Add at least one other person so awareness training can start across your team.",
      href: "/workspace/team",
      cta: "Invite team member",
      done: step1Done,
    },
    {
      id: "it-executor",
      number: 2,
      title: step2Title,
      description: step2Description,
      href: "/workspace/settings",
      cta:
        itExecutor.source === "none"
          ? "Assign IT Executor"
          : "Review assignment",
      done: step2Done,
    },
    {
      id: "assessment",
      number: 3,
      title: "Start your first assessment",
      description: "Kick off a security review so your team can begin.",
      href: "/workspace/assessments",
      cta: "Start assessment",
      done: step3Done,
    },
    {
      id: "share",
      number: 4,
      title: "Share the summary",
      description:
        "Once your team has responded, review progress on the dashboard.",
      href: "/workspace/dashboard",
      cta: "View dashboard",
      done: step4Done,
    },
  ];

  return {
    subtitleRole,
    subtitleIsExec,
    subtitle,
    itExecutor,
    pendingItInvite,
    memberCount,
    hasActiveAssessment,
    steps,
  };
}
