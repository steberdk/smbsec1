"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type OrgMe = {
  org: { id: string; name: string };
  membership: { role: string; is_it_executor: boolean };
};

export default function WorkspacePage() {
  const router = useRouter();
  const { token, loading: sessionLoading } = useSession();
  const [orgMe, setOrgMe] = useState<OrgMe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasActiveAssessment, setHasActiveAssessment] = useState<boolean | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  // Load org membership + check for active assessment
  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<OrgMe>("/api/orgs/me", token),
      apiFetch<{ assessments: { status: string }[] }>("/api/assessments", token),
    ])
      .then(([orgData, { assessments }]) => {
        setOrgMe(orgData);
        setHasActiveAssessment(assessments.some((a) => a.status === "active"));
      })
      .catch((e: unknown) => {
        const status = (e as { status?: number }).status;
        if (status === 404) {
          router.replace("/onboarding");
        } else {
          setLoadError(e instanceof Error ? e.message : "Failed to load organisation.");
        }
      });
  }, [token, router]);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (sessionLoading || !token) {
    return <main className="max-w-2xl mx-auto px-4 py-10"><p className="text-sm text-gray-600">Loading…</p></main>;
  }

  if (loadError) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      </main>
    );
  }

  if (!orgMe) {
    return <main className="max-w-2xl mx-auto px-4 py-10"><p className="text-sm text-gray-600">Loading…</p></main>;
  }

  const { org, membership } = orgMe;
  const isManager = membership.role === "manager" || membership.role === "org_admin";
  const isAdmin = membership.role === "org_admin";

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">
            {membership.role.replace("_", " ")}
            {membership.is_it_executor && " · IT executor"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 underline"
        >
          Log out
        </button>
      </div>

      {/* First-assessment CTA for org_admin with no active assessment */}
      {isAdmin && hasActiveAssessment === false && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center">
          <p className="text-sm font-semibold text-gray-800">
            Start your first security review
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Kick off an assessment so your team can begin working through the security checklist.
          </p>
          <Link
            href="/workspace/assessments"
            className="mt-4 inline-block rounded-lg bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
          >
            Start assessment
          </Link>
        </div>
      )}

      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
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
        <WorkspaceCard
          href="/workspace/settings/gdpr"
          title="Settings & data"
          description={isAdmin ? "Export org data, manage members, or delete the organisation." : "View data storage info or delete your account."}
        />
      </nav>
    </main>
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
