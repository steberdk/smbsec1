"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

export default function WorkspacePage() {
  const { token, orgData, isManager, isAdmin } = useWorkspace();
  const { membership } = orgData;

  const [hasActiveAssessment, setHasActiveAssessment] = useState<boolean | null>(null);
  const [pendingInviteCount, setPendingInviteCount] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Workspace | SMB Security Quick-Check";
  }, []);

  // Load assessment + invite status for guided first-run
  useEffect(() => {
    if (!token) return;
    const fetches: Promise<void>[] = [
      apiFetch<{ assessments: { status: string }[] }>("/api/assessments", token)
        .then(({ assessments }) => {
          setHasActiveAssessment(assessments.some((a) => a.status === "active"));
        }),
    ];
    if (isManager) {
      fetches.push(
        apiFetch<{ invites: unknown[] }>("/api/invites", token)
          .then(({ invites }) => setPendingInviteCount(invites.length))
      );
    }
    Promise.all(fetches).catch(() => {});
  }, [token, isManager]);

  // Guided first-run: show step-by-step when admin has no assessment yet
  const showGuidedSetup = isAdmin && hasActiveAssessment === false;

  return (
    <>
      <h1 className="text-xl font-bold">{orgData.org.name}</h1>
      <p className="mt-1 text-sm text-gray-500 capitalize mb-6">
        {membership.role.replace("_", " ")}
        {membership.is_it_executor && " · IT executor"}
      </p>

      {/* Guided first-run for org_admin */}
      {showGuidedSetup && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">
            Get started in 3 steps
          </p>
          <ol className="space-y-3">
            <GuidedStep
              number={1}
              title="Invite your IT lead"
              description="Assign someone to handle the technical security checklist."
              href="/workspace/team"
              done={pendingInviteCount !== null && pendingInviteCount > 0}
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
        />
        <WorkspaceCard
          href="/workspace/dashboard"
          title="Dashboard"
          description="Progress overview and cadence indicator."
        />
        {isManager && (
          <WorkspaceCard
            href="/workspace/team"
            title="Team"
            description="Invite people and manage pending invites."
          />
        )}
        {isManager && (
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
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors"
    >
      <p className="font-medium text-sm">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </Link>
  );
}
