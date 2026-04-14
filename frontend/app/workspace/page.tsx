"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";
import {
  getOwnerHomeState,
  type AssessmentInput,
  type HomeState,
  type HomeStep,
  type MemberInput,
  type PendingInviteInput,
} from "@/lib/selectors/ownerHomeState";

type FetchedPayload = {
  assessments: AssessmentInput[];
  members: MemberInput[];
  pendingInvites: PendingInviteInput[];
  cadence: { status: string; last_completed_at: string | null } | null;
  checklist: {
    percent: number | null;
    denominator: number | null;
    resolved: number | null;
  };
};

const EMPTY_PAYLOAD: FetchedPayload = {
  assessments: [],
  members: [],
  pendingInvites: [],
  cadence: null,
  checklist: { percent: null, denominator: null, resolved: null },
};

export default function WorkspacePage() {
  const { token, orgData, isAdmin } = useWorkspace();
  const { membership } = orgData;

  const [payload, setPayload] = useState<FetchedPayload>(EMPTY_PAYLOAD);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.title = "Workspace | SMB Security Quick-Check";
  }, []);

  // F-048: fetch every dependency in ONE effect via Promise.all, then hand the
  // full payload to the canonical selector. This is what makes
  // INV-state-pure-of-navigation and INV-home-steps-deterministic hold — no
  // per-component re-derivation, no split-fetch ordering races.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const assessmentsFetch = apiFetch<{ assessments: { status: string }[] }>(
      "/api/assessments",
      token,
    )
      .then(({ assessments }) => assessments)
      .catch(() => [] as { status: string }[]);

    const dashboardFetch = apiFetch<{
      stats: {
        percent: number;
        me?: { percent: number; denominator?: number; resolved?: number };
      };
      cadence: { status: string; last_completed_at: string | null };
    }>("/api/dashboard", token).catch(() => null);

    const membersFetch = isAdmin
      ? apiFetch<{ members: MemberInput[] }>("/api/orgs/members", token)
          .then(({ members }) => members)
          .catch(() => [] as MemberInput[])
      : Promise.resolve<MemberInput[]>([]);

    const invitesFetch = isAdmin
      ? apiFetch<{ invites: PendingInviteInput[] }>("/api/invites", token)
          .then(({ invites }) => invites)
          .catch(() => [] as PendingInviteInput[])
      : Promise.resolve<PendingInviteInput[]>([]);

    Promise.all([assessmentsFetch, dashboardFetch, membersFetch, invitesFetch])
      .then(([assessments, dashboard, members, invites]) => {
        if (cancelled) return;

        // If the viewer is an admin but the members API returned nothing,
        // fall back to at least the viewer's own membership row so the
        // selector's memberCount is never 0 for a valid org. This matters
        // for INV-home-steps-deterministic: identical org state must
        // produce identical step states regardless of transient API gaps.
        const adminMembers: MemberInput[] =
          members.length > 0
            ? members
            : [
                {
                  user_id: membership.user_id,
                  email: null,
                  display_name: null,
                  role: membership.role,
                  is_it_executor: membership.is_it_executor,
                },
              ];

        const viewerMembers: MemberInput[] = isAdmin
          ? adminMembers
          : [
              {
                user_id: membership.user_id,
                email: null,
                display_name: null,
                role: membership.role,
                is_it_executor: membership.is_it_executor,
              },
            ];

        const nextPayload: FetchedPayload = {
          assessments,
          members: viewerMembers,
          pendingInvites: invites,
          cadence: dashboard?.cadence ?? null,
          checklist: {
            percent: dashboard?.stats.me?.percent ?? dashboard?.stats.percent ?? null,
            denominator: dashboard?.stats.me?.denominator ?? null,
            resolved: dashboard?.stats.me?.resolved ?? null,
          },
        };
        setPayload(nextPayload);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token, isAdmin, membership.user_id, membership.role, membership.is_it_executor]);

  // Canonical state — ONE source of truth for header subtitle + Get-started steps.
  const home: HomeState = useMemo(
    () =>
      getOwnerHomeState({
        org: orgData.org,
        membership,
        members: payload.members,
        pendingInvites: payload.pendingInvites,
        assessments: payload.assessments,
      }),
    [orgData.org, membership, payload.members, payload.pendingInvites, payload.assessments],
  );

  const { cadence, checklist } = payload;

  // Guided first-run block: only for owners who have not yet kicked off an
  // assessment. Employees / IT1 never see this block. Do not render until
  // the first load resolves so INV-home-steps-deterministic holds on
  // direct URL vs. nav-and-back.
  const showGuidedSetup = isAdmin && loaded && !home.hasActiveAssessment;

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">{orgData.org.name}</h1>
      <p className="mt-1 text-sm text-gray-500 mb-6" data-testid="home-subtitle">
        {home.subtitle}
      </p>

      {/* Cadence warning banner (amber/red) */}
      {cadence && (cadence.status === "amber" || cadence.status === "red") && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 ${
            cadence.status === "red"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="text-sm font-medium">
            {cadence.status === "red" ? "Security review overdue" : "Security review due soon"}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {cadence.last_completed_at
              ? `Last completed ${new Date(cadence.last_completed_at).toLocaleDateString()}. `
              : ""}
            <Link href="/workspace/assessments" className="underline">
              Start a reassessment
            </Link>
          </p>
        </div>
      )}

      {/* Guided first-run for org_admin */}
      {showGuidedSetup && (
        <div
          className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          data-testid="home-get-started"
        >
          <p className="text-sm font-semibold text-gray-800 mb-4">
            Get started in {home.steps.length} steps
          </p>
          <ol className="space-y-3">
            {home.steps.map((step) => (
              <GuidedStep key={step.id} step={step} />
            ))}
          </ol>
        </div>
      )}

      {/* Navigation cards (always visible) */}
      <nav className="grid gap-3 sm:grid-cols-2">
        <WorkspaceCard
          href="/workspace/checklist"
          title="My checklist"
          description="Work through your assigned security items."
          progress={checklist.percent}
          progressLabel={
            checklist.denominator != null && checklist.resolved != null
              ? `${checklist.resolved} / ${checklist.denominator}`
              : null
          }
        />
        <WorkspaceCard
          href="/workspace/dashboard"
          title="Dashboard"
          description="Progress overview and cadence indicator."
        />
        {isAdmin && (
          <WorkspaceCard
            href="/workspace/team"
            title="Team"
            description="Invite people and manage pending invites."
          />
        )}
        {isAdmin && (
          <WorkspaceCard
            href="/workspace/assessments"
            title="Assessments"
            description="Start, view, and complete security assessments."
          />
        )}
        {isAdmin && (
          <WorkspaceCard
            href="/workspace/settings"
            title="Org Settings"
            description="Email platform, IT executor assignment."
          />
        )}
        <WorkspaceCard
          href="/workspace/settings/gdpr"
          title="Settings & data"
          description={
            isAdmin
              ? "Export org data, manage members, or delete the organisation."
              : "View data storage info or delete your account."
          }
        />
      </nav>
    </>
  );
}

function GuidedStep({ step }: { step: HomeStep }) {
  return (
    <li className="flex items-start gap-3" data-testid={`home-step-${step.id}`}>
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          step.done ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
        }`}
      >
        {step.done ? "\u2713" : step.number}
      </span>
      <div className="flex-1">
        <p
          className={`text-sm font-medium ${
            step.done ? "text-green-700 line-through" : "text-gray-800"
          }`}
          data-testid={`home-step-${step.id}-title`}
        >
          {step.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
        {!step.done && (
          <Link
            href={step.href}
            className="mt-1.5 inline-block text-xs font-medium text-gray-700 underline hover:text-gray-900"
          >
            {step.cta} &rarr;
          </Link>
        )}
      </div>
    </li>
  );
}

function WorkspaceCard({
  href,
  title,
  description,
  progress,
  progressLabel,
}: {
  href: string;
  title: string;
  description: string;
  progress?: number | null;
  progressLabel?: string | null;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm card-hover"
    >
      <p className="font-medium text-sm text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      {progressLabel && (
        <p className="mt-2 text-xs text-gray-600" data-testid="my-checklist-progress">
          {progressLabel}
        </p>
      )}
      {progress != null && progress > 0 && (
        <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="progress-gradient h-1.5 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Link>
  );
}
