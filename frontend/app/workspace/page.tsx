"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

export default function WorkspacePage() {
  const { token, orgData, isAdmin } = useWorkspace();
  const { membership } = orgData;

  const [hasActiveAssessment, setHasActiveAssessment] = useState<boolean | null>(null);
  const [hasItExecutor, setHasItExecutor] = useState(false);
  const [cadence, setCadence] = useState<{ status: string; last_completed_at: string | null } | null>(null);
  const [checklistPercent, setChecklistPercent] = useState<number | null>(null);
  const [checklistDenominator, setChecklistDenominator] = useState<number | null>(null);
  const [checklistResolved, setChecklistResolved] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Workspace | SMB Security Quick-Check";
  }, []);

  // Load assessment + invite status + dashboard summary
  useEffect(() => {
    if (!token) return;
    const fetches: Promise<void>[] = [
      apiFetch<{ assessments: { status: string }[] }>("/api/assessments", token)
        .then(({ assessments }) => {
          setHasActiveAssessment(assessments.some((a) => a.status === "active"));
        }),
      // F-039 — "My checklist" card binds to stats.me.percent (caller-only),
      // not stats.percent (org-wide). Cross-user isolation test in
      // tests/dashboard-math.spec.ts proves the fix.
      apiFetch<{
        stats: { percent: number; me?: { percent: number; denominator?: number; resolved?: number } };
        cadence: { status: string; last_completed_at: string | null };
      }>("/api/dashboard", token)
        .then(({ stats, cadence: c }) => {
          setCadence(c);
          setChecklistPercent(stats.me?.percent ?? stats.percent);
          if (stats.me?.denominator != null) {
            setChecklistDenominator(stats.me.denominator);
            setChecklistResolved(stats.me.resolved ?? 0);
          }
        })
        .catch(() => {}),
    ];
    if (isAdmin) {
      fetches.push(
        apiFetch<{ members: { is_it_executor: boolean }[] }>("/api/orgs/members", token)
          .then(({ members }) => setHasItExecutor(members.some((m) => m.is_it_executor)))
          .catch(() => {}),
      );
    }
    Promise.all(fetches).catch(() => {});
  }, [token, isAdmin]);

  // Guided first-run: show step-by-step when admin has no assessment yet
  const showGuidedSetup = isAdmin && hasActiveAssessment === false;

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">{orgData.org.name}</h1>
      <p className="mt-1 text-sm text-gray-500 capitalize mb-6">
        {membership.role === "org_admin" ? "Owner" : membership.role.replace("_", " ")}
        {membership.is_it_executor && " · IT Executor"}
      </p>

      {/* Cadence warning banner (amber/red) */}
      {cadence && (cadence.status === "amber" || cadence.status === "red") && (
        <div className={`mb-6 rounded-xl border px-4 py-3 ${
          cadence.status === "red"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
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
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-4">
            Get started in 3 steps
          </p>
          <ol className="space-y-3">
            <GuidedStep
              number={1}
              title={membership.is_it_executor ? "IT checklist assigned to you" : "Invite your IT Executor"}
              description={membership.is_it_executor ? "You chose to handle IT yourself — the IT Baseline checklist is on your list." : "Assign someone to handle the technical security checklist."}
              href="/workspace/team"
              done={hasItExecutor}
              cta="Invite team member"
            />
            <GuidedStep
              number={2}
              title="Start your first assessment"
              description="Kick off a security review so your team can begin."
              href="/workspace/assessments"
              done={false}
              cta="Start assessment"
            />
            <GuidedStep
              number={3}
              title="Share the summary"
              description="Once your team has responded, review progress on the dashboard."
              href="/workspace/dashboard"
              done={false}
              cta="View dashboard"
            />
          </ol>
        </div>
      )}

      {/* Navigation cards (always visible) */}
      <nav className="grid gap-3 sm:grid-cols-2">
        <WorkspaceCard
          href="/workspace/checklist"
          title="My checklist"
          description="Work through your assigned security items."
          progress={checklistPercent}
          progressLabel={
            checklistDenominator != null && checklistResolved != null
              ? `${checklistResolved} / ${checklistDenominator}`
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

function GuidedStep({
  number,
  title,
  description,
  href,
  done,
  cta,
}: {
  number: number;
  title: string;
  description: string;
  href: string;
  done: boolean;
  cta: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
        }`}
      >
        {done ? "\u2713" : number}
      </span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${done ? "text-green-700 line-through" : "text-gray-800"}`}>
          {title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {!done && (
          <Link
            href={href}
            className="mt-1.5 inline-block text-xs font-medium text-gray-700 underline hover:text-gray-900"
          >
            {cta} &rarr;
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
          <div className="progress-gradient h-1.5 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Link>
  );
}
