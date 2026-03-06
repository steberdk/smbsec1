"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";

type Assessment = {
  id: string;
  scope: "org" | "subtree";
  status: "active" | "completed";
  created_at: string;
  completed_at: string | null;
};

type OrgMe = {
  membership: { role: string };
};

export default function WorkspaceAssessmentsPage() {
  const router = useRouter();
  const { token, userId, loading: sessionLoading } = useSession();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  function loadData() {
    if (!token) return;
    Promise.all([
      apiFetch<{ assessments: Assessment[] }>("/api/assessments", token),
      apiFetch<OrgMe>("/api/orgs/me", token),
    ])
      .then(([{ assessments: list }, { membership }]) => {
        setAssessments(list);
        setRole(membership.role);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load.");
      });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isAdmin = role === "org_admin";
  const isManager = role === "manager" || role === "org_admin";
  const hasActive = assessments.some((a) => a.status === "active");

  async function handleStart() {
    if (!token || !isManager) return;
    setStarting(true);
    setActionError(null);

    try {
      const body = isAdmin
        ? { scope: "org" }
        : { scope: "subtree", root_user_id: userId };

      await apiFetch("/api/assessments", token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      loadData();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to start assessment.");
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete(assessmentId: string) {
    if (!token) return;
    setCompleting(assessmentId);
    setActionError(null);

    try {
      await apiFetch(`/api/assessments/${assessmentId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });
      loadData();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to complete assessment.");
    } finally {
      setCompleting(null);
    }
  }

  if (sessionLoading || !token) {
    return <PageShell><p className="text-sm text-gray-600">Loading…</p></PageShell>;
  }

  if (loadError) {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {isManager && (
        <div className="mb-6">
          <button
            onClick={handleStart}
            disabled={starting || hasActive}
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {starting ? "Starting…" : hasActive ? "Assessment already in progress" : "Start new assessment"}
          </button>
          {!isAdmin && (
            <p className="mt-1 text-xs text-gray-500">Managers start a subtree assessment covering their own team.</p>
          )}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-4">
          <p className="text-sm text-red-800">{actionError}</p>
        </div>
      )}

      {assessments.length === 0 ? (
        <p className="text-sm text-gray-500">No assessments yet.</p>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
                a.status === "active" ? "border-blue-200 bg-blue-50" : "border-gray-200"
              }`}
            >
              <div>
                <p className="text-sm font-medium capitalize">
                  {a.scope} assessment
                  <span
                    className={`ml-2 text-xs font-normal ${
                      a.status === "active" ? "text-blue-700" : "text-gray-400"
                    }`}
                  >
                    {a.status}
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  Started {new Date(a.created_at).toLocaleDateString()}
                  {a.completed_at && ` · Completed ${new Date(a.completed_at).toLocaleDateString()}`}
                </p>
              </div>

              {a.status === "active" && isManager && (
                <button
                  onClick={() => handleComplete(a.id)}
                  disabled={completing === a.id}
                  className="text-xs text-gray-700 border border-gray-300 rounded-lg px-3 py-1 hover:border-gray-500 disabled:opacity-50"
                >
                  {completing === a.id ? "Completing…" : "Mark complete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Assessments</h1>
        <Link href="/workspace" className="text-sm text-gray-500 underline">
          Back
        </Link>
      </div>
      {children}
    </main>
  );
}
