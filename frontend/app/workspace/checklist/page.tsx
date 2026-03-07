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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  // Load active assessment + items + my responses
  useEffect(() => {
    if (!token) return;

    apiFetch<{ assessments: Assessment[] }>("/api/assessments", token)
      .then(async ({ assessments }) => {
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
            If you manage your team, you can{" "}
            <Link href="/workspace/assessments" className="underline">
              start one now
            </Link>
            .
          </p>
        </div>
      </PageShell>
    );
  }

  if (!assessment || items.length === 0) {
    return <PageShell><p className="text-sm text-gray-600">Loading…</p></PageShell>;
  }

  const answered = Object.keys(responses).length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  // Group items by track
  const itItems = items.filter((i) => i.track === "it_baseline");
  const awarenessItems = items.filter((i) => i.track === "awareness");

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
        />
      )}
      {awarenessItems.length > 0 && (
        <ItemGroup
          title="Security Awareness"
          items={awarenessItems}
          responses={responses}
          saving={saving}
          onResponse={setResponse}
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
}: {
  title: string;
  items: AssessmentItem[];
  responses: ResponseMap;
  saving: Set<string>;
  onResponse: (itemId: string, status: ResponseStatus) => void;
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
}: {
  item: AssessmentItem;
  response: ResponseStatus | null;
  isSaving: boolean;
  onResponse: (itemId: string, status: ResponseStatus) => void;
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

      {expanded && item.description && (
        <p className="mt-2 text-xs text-gray-600">{item.description}</p>
      )}

      <div className="mt-3 flex gap-2">
        {(["done", "unsure", "skipped"] as ResponseStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onResponse(item.id, s)}
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
