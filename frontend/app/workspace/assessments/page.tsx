"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type Assessment = {
  id: string;
  scope: "org" | "subtree";
  status: "active" | "completed";
  created_at: string;
  completed_at: string | null;
};

export default function WorkspaceAssessmentsPage() {
  const { token, userId, isManager, isAdmin } = useWorkspace();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { document.title = "Assessments | SMB Security Quick-Check"; }, []);

  function loadData() {
    if (!token) return;
    apiFetch<{ assessments: Assessment[] }>("/api/assessments", token)
      .then(({ assessments: list }) => setAssessments(list))
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load.");
      });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  if (!isManager) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">Access restricted</p>
        <p className="text-sm mt-1">Only managers and admins can manage assessments.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">{loadError}</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessments</h1>
      <p className="text-sm text-gray-500 mb-6">
        An assessment is a security review of your organisation. Start one to assign checklist items
        to your team. When everyone has responded, mark it complete to lock in results and track progress over time.
      </p>

      {isManager && (
        <div className="mb-6">
          <button
            onClick={handleStart}
            disabled={starting || hasActive}
            className="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60"
          >
            {starting ? "Starting..." : hasActive ? "Assessment already in progress" : "Start new assessment"}
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
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 shadow-sm ${
                a.status === "active" ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"
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

              <div className="flex items-center gap-2">
                {a.status === "active" && (
                  <Link
                    href="/workspace/checklist"
                    className="text-xs text-teal-700 border border-teal-200 rounded-lg px-3 py-1 hover:bg-teal-50 transition-colors"
                  >
                    Go to checklist
                  </Link>
                )}
                {a.status === "active" && isManager && (
                  <button
                    onClick={() => handleComplete(a.id)}
                    disabled={completing === a.id}
                    className="text-xs text-gray-700 border border-gray-300 rounded-lg px-3 py-1 hover:border-gray-500 disabled:opacity-50"
                  >
                    {completing === a.id ? "Completing..." : "Mark complete"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
