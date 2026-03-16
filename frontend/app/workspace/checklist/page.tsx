"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";

type AssessmentItem = {
  id: string;
  title: string;
  description: string | null;
  track: string;
  impact: string | null;
  effort: string | null;
  order_index: number;
  why_it_matters: string | null;
  steps: string[];
};

type Assessment = {
  id: string;
  status: string;
  scope: string;
  created_at: string;
};

type ResponseStatus = "done" | "unsure" | "skipped";
type ResponseMap = Record<string, ResponseStatus>;

export default function WorkspaceChecklistPage() {
  const router = useRouter();
  const { token, loading: sessionLoading } = useSession();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noAssessment, setNoAssessment] = useState(false);
  const [isItExecutor, setIsItExecutor] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  // Load active assessment + items + my responses
  useEffect(() => {
    if (!token) return;

    Promise.all([
      apiFetch<{ assessments: Assessment[] }>("/api/assessments", token),
      apiFetch<{ membership: { is_it_executor: boolean } }>("/api/orgs/me", token),
    ])
      .then(async ([{ assessments }, { membership }]) => {
        setIsItExecutor(membership.is_it_executor);
        const active = assessments.find((a) => a.status === "active");
        if (!active) {
          setNoAssessment(true);
          return;
        }
        setAssessment(active);

        const [{ items: itemList }, { responses: myResponses }] =
          await Promise.all([
            apiFetch<{ items: AssessmentItem[] }>(
              `/api/assessments/${active.id}`,
              token
            ),
            apiFetch<{ responses: { assessment_item_id: string; status: ResponseStatus }[] }>(
              `/api/assessments/${active.id}/responses/me`,
              token
            ),
          ]);

        setItems(itemList);
        const map: ResponseMap = {};
        for (const r of myResponses) map[r.assessment_item_id] = r.status;
        setResponses(map);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load checklist.");
      });
  }, [token]);

  async function setResponse(itemId: string, status: ResponseStatus) {
    if (!token || !assessment) return;
    setResponses((prev) => ({ ...prev, [itemId]: status }));
    setSaving((prev) => new Set(prev).add(itemId));

    try {
      await apiFetch(`/api/assessments/${assessment.id}/responses`, token, {
        method: "PUT",
        body: JSON.stringify({ assessment_item_id: itemId, status }),
      });
    } catch {
      // Optimistic update stays; user can retry
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function clearResponse(itemId: string) {
    if (!token || !assessment) return;
    setResponses((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setSaving((prev) => new Set(prev).add(itemId));

    try {
      await apiFetch(`/api/assessments/${assessment.id}/responses`, token, {
        method: "DELETE",
        body: JSON.stringify({ assessment_item_id: itemId }),
      });
    } catch {
      // Optimistic update stays; user can retry
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
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

  if (noAssessment) {
    return (
      <PageShell>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5">
          <p className="text-sm font-medium text-gray-800">No active assessment yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Your checklist will appear here once an assessment is started.
          </p>
        </div>
      </PageShell>
    );
  }

  if (!assessment || items.length === 0) {
    return <PageShell><p className="text-sm text-gray-600">Loading…</p></PageShell>;
  }

  // Non-IT-executors only see the awareness track
  const visibleItems = isItExecutor ? items : items.filter((i) => i.track === "awareness");
  const answered = visibleItems.filter((i) => responses[i.id] !== undefined).length;
  const total = visibleItems.length;
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  const allAnswered = total > 0 && answered >= total;

  const doneCount = visibleItems.filter((i) => responses[i.id] === "done").length;
  const unsureCount = visibleItems.filter((i) => responses[i.id] === "unsure").length;
  const skippedCount = visibleItems.filter((i) => responses[i.id] === "skipped").length;

  // Group items by track
  const itItems = visibleItems.filter((i) => i.track === "it_baseline");
  const awarenessItems = visibleItems.filter((i) => i.track === "awareness");

  function downloadIcs() {
    const now = new Date();
    const due = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const uid = `smbsec-${now.getTime()}@smbsec`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SMBsec//Review//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${fmt(due)}`,
      `SUMMARY:smbsec: Security Review Due`,
      `DESCRIPTION:Your quarterly security review is due. Log in to SMB Security Check to start your reassessment.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smbsec-review.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Post-completion screen (AC-ITER5-05 to AC-ITER5-08)
  if (allAnswered) {
    return (
      <PageShell>
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-6">
          <p className="text-lg font-semibold text-green-800 text-center">
            All items answered — great work!
          </p>

          {/* Stat grid */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white border border-green-100 py-3">
              <p className="text-2xl font-bold text-green-700">{doneCount}</p>
              <p className="text-xs text-gray-500">Done</p>
            </div>
            <div className="rounded-lg bg-white border border-green-100 py-3">
              <p className="text-2xl font-bold text-amber-700">{unsureCount}</p>
              <p className="text-xs text-gray-500">Unsure</p>
            </div>
            <div className="rounded-lg bg-white border border-green-100 py-3">
              <p className="text-2xl font-bold text-gray-500">{skippedCount}</p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
          </div>

          {/* .ics download + dashboard link */}
          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={downloadIcs}
              className="w-full rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors"
            >
              Add reminder to calendar (.ics)
            </button>
            <Link
              href="/workspace/dashboard"
              className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white text-center hover:bg-green-800 transition-colors"
            >
              View dashboard &rarr;
            </Link>
          </div>

          {/* Read-only checklist disclosure */}
          <div className="mt-5 border-t border-green-200 pt-4">
            <button
              onClick={() => setShowChecklist((v) => !v)}
              className="text-sm text-green-700 font-medium hover:underline"
            >
              {showChecklist ? "Hide checklist \u25B4" : "Show checklist \u25BE"}
            </button>
          </div>
        </div>

        {/* Read-only checklist when disclosed */}
        {showChecklist && (
          <div className="mt-6">
            {itItems.length > 0 && (
              <ItemGroup
                title="IT Baseline"
                items={itItems}
                responses={responses}
                saving={saving}
                onResponse={setResponse}
                onClear={clearResponse}
              />
            )}
            {awarenessItems.length > 0 && (
              <ItemGroup
                title="Security Awareness"
                items={awarenessItems}
                responses={responses}
                saving={saving}
                onResponse={setResponse}
                onClear={clearResponse}
              />
            )}
          </div>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{answered} / {total} answered</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-gray-800 h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {itItems.length > 0 && (
        <ItemGroup
          title="IT Baseline"
          items={itItems}
          responses={responses}
          saving={saving}
          onResponse={setResponse}
          onClear={clearResponse}
        />
      )}
      {awarenessItems.length > 0 && (
        <ItemGroup
          title="Security Awareness"
          items={awarenessItems}
          responses={responses}
          saving={saving}
          onResponse={setResponse}
          onClear={clearResponse}
        />
      )}
    </PageShell>
  );
}

function ItemGroup({
  title,
  items,
  responses,
  saving,
  onResponse,
  onClear,
}: {
  title: string;
  items: AssessmentItem[];
  responses: ResponseMap;
  saving: Set<string>;
  onResponse: (itemId: string, status: ResponseStatus) => void;
  onClear: (itemId: string) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            response={responses[item.id] ?? null}
            isSaving={saving.has(item.id)}
            onResponse={onResponse}
            onClear={onClear}
          />
        ))}
      </div>
    </section>
  );
}

function ChecklistItem({
  item,
  response,
  isSaving,
  onResponse,
  onClear,
}: {
  item: AssessmentItem;
  response: ResponseStatus | null;
  isSaving: boolean;
  onResponse: (itemId: string, status: ResponseStatus) => void;
  onClear: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border p-4 ${
        response === "done"
          ? "border-green-200 bg-green-50"
          : response
          ? "border-gray-200 bg-gray-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          className="text-left text-sm font-medium flex-1"
          onClick={() => setExpanded((v) => !v)}
        >
          {item.title}
          {item.impact && (
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {item.impact} impact
            </span>
          )}
        </button>
        {isSaving && <span className="text-xs text-gray-400">saving…</span>}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {item.description && (
            <p className="text-xs text-gray-600">{item.description}</p>
          )}
          {item.why_it_matters && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-xs font-medium text-amber-800">Why it matters</p>
              <p className="mt-0.5 text-xs text-amber-700">{item.why_it_matters}</p>
            </div>
          )}
          {item.steps && item.steps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Steps</p>
              <ol className="list-decimal list-inside space-y-1">
                {item.steps.map((step, i) => (
                  <li key={i} className="text-xs text-gray-600">{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {(["done", "unsure", "skipped"] as ResponseStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => response === s ? onClear(item.id) : onResponse(item.id, s)}
            className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${
              response === s
                ? s === "done"
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-gray-700 text-white border-gray-700"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">My checklist</h1>
        <Link href="/workspace" className="text-sm text-gray-500 underline">
          Back
        </Link>
      </div>
      {children}
    </main>
  );
}
