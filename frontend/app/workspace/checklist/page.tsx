"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type AssessmentItem = {
  id: string;
  title: string;
  description: string | null;
  track: string;
  group_id: string;
  impact: string | null;
  effort: string | null;
  order_index: number;
  why_it_matters: string | null;
  steps: string[];
};

type ChecklistGroup = {
  id: string;
  title: string;
  track: string;
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

// Template downloads for content-creation items (matched by title substring)
const ITEM_TEMPLATES: { match: string; label: string; href: string }[] = [
  { match: "security awareness session", label: "Download session outline", href: "/templates/security-awareness-session.md" },
  { match: "security rules", label: "Download policy template", href: "/templates/security-rules.md" },
  { match: "security basics", label: "Download policy template", href: "/templates/security-rules.md" },
  { match: "incident response plan", label: "Download plan template", href: "/templates/incident-response-plan.md" },
  { match: "offboarding checklist", label: "Download checklist template", href: "/templates/offboarding-checklist.md" },
  { match: "list of all saas", label: "Download inventory spreadsheet", href: "/templates/saas-inventory.csv" },
];

function getTemplate(title: string): { label: string; href: string } | null {
  const lower = title.toLowerCase();
  for (const t of ITEM_TEMPLATES) {
    if (lower.includes(t.match)) return { label: t.label, href: t.href };
  }
  return null;
}

const RESPONSE_TOOLTIPS: Record<string, Record<ResponseStatus, string>> = {
  it_baseline: {
    done: "We have completed this control or it is already in place.",
    unsure: "We are not sure if this is done — needs investigation.",
    skipped: "Not applicable to our organisation or deferred for now.",
  },
  awareness: {
    done: "I understand this and have completed the action step.",
    unsure: "I need to learn more about this or haven't done it yet.",
    skipped: "Not applicable to my role right now.",
  },
};

const RESPONSE_LABELS: Record<string, Record<ResponseStatus, string>> = {
  it_baseline: {
    done: "Done",
    unsure: "Unsure",
    skipped: "Skipped",
  },
  awareness: {
    done: "I've done this",
    unsure: "Not yet",
    skipped: "Not applicable",
  },
};

export default function WorkspaceChecklistPage() {
  const { token, orgData } = useWorkspace();
  const userRole = orgData.membership.role;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [groups, setGroups] = useState<ChecklistGroup[]>([]);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noAssessment, setNoAssessment] = useState(false);
  const [isItExecutor, setIsItExecutor] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [showExecutorBanner, setShowExecutorBanner] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => { document.title = "My Checklist | SMB Security Quick-Check"; }, []);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      apiFetch<{ assessments: Assessment[] }>("/api/assessments", token),
      apiFetch<{ org: { name: string }; membership: { is_it_executor: boolean } }>("/api/orgs/me", token),
    ])
      .then(async ([{ assessments }, { org, membership }]) => {
        setIsItExecutor(membership.is_it_executor);
        setOrgName(org.name);
        if (membership.is_it_executor && !localStorage.getItem("smbsec:executor-banner-dismissed")) {
          setShowExecutorBanner(true);
        }
        const active = assessments.find((a) => a.status === "active");
        if (!active) {
          setNoAssessment(true);
          return;
        }
        setAssessment(active);

        const [{ items: itemList, groups: groupList }, { responses: myResponses }] =
          await Promise.all([
            apiFetch<{ items: AssessmentItem[]; groups: ChecklistGroup[] }>(
              `/api/assessments/${active.id}`,
              token
            ),
            apiFetch<{ responses: { assessment_item_id: string; status: ResponseStatus }[] }>(
              `/api/assessments/${active.id}/responses/me`,
              token
            ),
          ]);

        setItems(itemList);
        setGroups(groupList ?? []);
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

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">{loadError}</p>
      </div>
    );
  }

  if (noAssessment) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5">
        <p className="text-sm font-medium text-gray-800">No active assessment yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Your checklist will appear here once an assessment is started.
        </p>
      </div>
    );
  }

  if (!assessment || items.length === 0) {
    return <p className="text-sm text-gray-600">Loading...</p>;
  }

  const visibleItems = isItExecutor ? items : items.filter((i) => i.track === "awareness");
  const answered = visibleItems.filter((i) => responses[i.id] !== undefined).length;
  const total = visibleItems.length;
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  const allAnswered = total > 0 && answered >= total;

  const doneCount = visibleItems.filter((i) => responses[i.id] === "done").length;
  const unsureCount = visibleItems.filter((i) => responses[i.id] === "unsure").length;
  const skippedCount = visibleItems.filter((i) => responses[i.id] === "skipped").length;

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

  if (allAnswered) {
    return (
      <>
        <h1 className="text-xl font-bold mb-6">My checklist</h1>
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-6">
          <p className="text-lg font-semibold text-green-800 text-center">
            All items answered — great work!
          </p>

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

          <div className="mt-5 border-t border-green-200 pt-4">
            <button
              onClick={() => setShowChecklist((v) => !v)}
              className="text-sm text-green-700 font-medium hover:underline"
            >
              {showChecklist ? "Hide checklist \u25B4" : "Show checklist \u25BE"}
            </button>
          </div>
        </div>

        {showChecklist && (
          <div className="mt-6">
            {itItems.length > 0 && (
              <ItemGroup title="IT Baseline" track="it_baseline" items={itItems} responses={responses} saving={saving} onResponse={setResponse} onClear={clearResponse} />
            )}
            {awarenessItems.length > 0 && (
              <ItemGroup title="Security Awareness" track="awareness" items={awarenessItems} responses={responses} saving={saving} onResponse={setResponse} onClear={clearResponse} />
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-6">My checklist</h1>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{answered} / {total} answered</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-gray-800 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        {answered > 0 && answered < total && (
          <button
            onClick={() => {
              const firstUnanswered = visibleItems.find((i) => responses[i.id] === undefined);
              if (firstUnanswered) {
                document.getElementById(`item-${firstUnanswered.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
            className="mt-2 text-xs text-gray-500 underline hover:text-gray-700"
          >
            Resume where you left off
          </button>
        )}
      </div>

      {/* Welcome message for employees */}
      {userRole === "employee" && answered === 0 && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">Welcome to your security checklist</p>
          <p className="mt-1 text-xs text-blue-700">
            Your organisation is reviewing its security practices. Go through each item below —
            tap any item to see guidance, then mark your response. This should take about 15 minutes.
          </p>
        </div>
      )}

      {/* Risk prioritization: high-impact items still open */}
      {(() => {
        const highImpactOpen = visibleItems.filter(
          (i) => i.impact === "high" && responses[i.id] !== "done"
        );
        if (highImpactOpen.length > 0 && answered > 0) {
          return (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                <strong>{highImpactOpen.length} high-impact item{highImpactOpen.length !== 1 ? "s" : ""}</strong> still need attention.
              </p>
            </div>
          );
        }
        return null;
      })()}

      {showExecutorBanner && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-800">
            Your admin has assigned you the IT Baseline track — these are the technical controls for <strong>{orgName}</strong>.
          </p>
          <button
            onClick={() => {
              setShowExecutorBanner(false);
              localStorage.setItem("smbsec:executor-banner-dismissed", "1");
            }}
            className="text-blue-400 hover:text-blue-600 text-lg leading-none flex-shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {itItems.length > 0 && (() => {
        const itGroups = groups
          .filter((g) => g.track === "it_baseline")
          .sort((a, b) => a.order_index - b.order_index);
        // Group items by their group_id; fallback to flat list if no groups
        if (itGroups.length > 0) {
          return (
            <>
              <h2 className="text-base font-semibold mb-3">IT Baseline</h2>
              {itGroups.map((g) => {
                const groupItems = itItems.filter((i) => i.group_id === g.id);
                if (groupItems.length === 0) return null;
                return (
                  <ItemGroup key={g.id} title={g.title} track="it_baseline" items={groupItems} responses={responses} saving={saving} onResponse={setResponse} onClear={clearResponse} />
                );
              })}
              {/* Items without a matching group */}
              {(() => {
                const groupIds = new Set(itGroups.map((g) => g.id));
                const ungrouped = itItems.filter((i) => !groupIds.has(i.group_id));
                return ungrouped.length > 0 ? (
                  <ItemGroup title="Other" track="it_baseline" items={ungrouped} responses={responses} saving={saving} onResponse={setResponse} onClear={clearResponse} />
                ) : null;
              })()}
            </>
          );
        }
        return <ItemGroup title="IT Baseline" track="it_baseline" items={itItems} responses={responses} saving={saving} onResponse={setResponse} onClear={clearResponse} />;
      })()}
      {awarenessItems.length > 0 && (
        <ItemGroup title="Security Awareness" track="awareness" items={awarenessItems} responses={responses} saving={saving} onResponse={setResponse} onClear={clearResponse} />
      )}
    </>
  );
}

function ItemGroup({
  title,
  track,
  items,
  responses,
  saving,
  onResponse,
  onClear,
}: {
  title: string;
  track: string;
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
            track={track}
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
  track,
  response,
  isSaving,
  onResponse,
  onClear,
}: {
  item: AssessmentItem;
  track: string;
  response: ResponseStatus | null;
  isSaving: boolean;
  onResponse: (itemId: string, status: ResponseStatus) => void;
  onClear: (itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      id={`item-${item.id}`}
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
          className="text-left text-sm font-medium flex-1 group"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="flex items-start gap-1.5">
            <span className="text-gray-400 text-xs mt-0.5 transition-transform group-hover:text-gray-600" style={{ display: "inline-block", transform: expanded ? "rotate(90deg)" : "none" }}>
              &#9656;
            </span>
            <span>
              {item.title}
              {item.impact && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {item.impact} impact
                </span>
              )}
              {!expanded && (item.why_it_matters || (item.steps && item.steps.length > 0)) && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  — tap for guidance
                </span>
              )}
            </span>
          </span>
        </button>
        {isSaving && <span className="text-xs text-gray-400">saving...</span>}
      </div>

      {expanded && (() => {
        const template = getTemplate(item.title);
        return (
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
            {template && (
              <a
                href={template.href}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors"
              >
                &#8595; {template.label}
              </a>
            )}
          </div>
        );
      })()}

      <div className="mt-3 flex flex-wrap gap-2">
        {(["done", "unsure", "skipped"] as ResponseStatus[]).map((s) => {
          const labels = RESPONSE_LABELS[track] ?? RESPONSE_LABELS.it_baseline;
          const tooltips = RESPONSE_TOOLTIPS[track] ?? RESPONSE_TOOLTIPS.it_baseline;
          return (
            <button
              key={s}
              onClick={() => response === s ? onClear(item.id) : onResponse(item.id, s)}
              title={tooltips[s]}
              className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${
                response === s
                  ? s === "done"
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-gray-700 text-white border-gray-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
