"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type CadenceStatus = "green" | "amber" | "red" | "never";

type MemberStat = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  is_it_executor: boolean;
  done: number;
  unsure: number;
  skipped: number;
  total: number;
  percent: number;
};

type DrillDownItem = {
  id: string;
  title: string;
  track: string;
  impact: string | null;
  status: "done" | "unsure" | "skipped" | null;
};

type TrackStats = {
  total: number;
  done: number;
  unsure: number;
  skipped: number;
  percent: number;
};

type DashboardData = {
  assessment: { id: string; status: string; scope: string; created_at: string } | null;
  stats: {
    total: number;
    done: number;
    unsure: number;
    skipped: number;
    percent: number;
    by_track?: { it_baseline: TrackStats; awareness: TrackStats };
  };
  members: MemberStat[];
  cadence: { last_completed_at: string | null; status: CadenceStatus };
};

const CADENCE_LABEL: Record<CadenceStatus, string> = {
  green: "On track",
  amber: "Due soon",
  red: "Overdue",
  never: "No assessment completed",
};

const CADENCE_CLASSES: Record<CadenceStatus, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  never: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function WorkspaceDashboardPage() {
  const { token } = useWorkspace();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { document.title = "Dashboard | SMB Security Quick-Check"; }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<DashboardData>("/api/dashboard", token)
      .then(setData)
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load dashboard.");
      });
  }, [token]);

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 bg-gray-200/80 rounded-lg w-32" />
        <div className="h-20 bg-gray-200/40 rounded-xl border border-gray-200/60" />
        <div className="h-40 bg-gray-200/40 rounded-xl border border-gray-200/60" />
        <div className="h-24 bg-gray-200/40 rounded-xl border border-gray-200/60" />
      </div>
    );
  }

  const { stats, members, cadence, assessment } = data;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {assessment && (
          <button
            onClick={() => window.print()}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-400 transition-colors print:hidden"
          >
            Print summary
          </button>
        )}
      </div>

      {/* Cadence indicator + next review due (hide "never" when there's an active assessment) */}
      {!(cadence.status === "never" && assessment) && (
      <div className={`rounded-xl border px-4 py-3 mb-6 ${CADENCE_CLASSES[cadence.status]}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{CADENCE_LABEL[cadence.status]}</span>
          {cadence.last_completed_at && (
            <span className="text-xs">
              · Last completed {new Date(cadence.last_completed_at).toLocaleDateString()}
            </span>
          )}
        </div>
        {cadence.last_completed_at && (
          <p className="text-xs mt-1 opacity-80">
            Next review due by{" "}
            {new Date(new Date(cadence.last_completed_at).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </p>
        )}
      </div>
      )}

      {!assessment ? (
        <div className="rounded-xl border border-gray-200 px-4 py-4 mb-6">
          <p className="text-sm text-gray-600">No assessments yet.</p>
          <Link href="/workspace/assessments" className="mt-2 inline-block text-sm underline">
            Start an assessment
          </Link>
        </div>
      ) : (
        <>
          {/* Overall stats */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6 shadow-sm">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
              {assessment.scope} assessment · {assessment.status}
              {" · started "}{new Date(assessment.created_at).toLocaleDateString()}
            </p>

            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{stats.done + stats.unsure + stats.skipped} / {members.length > 0 ? members.reduce((s, m) => s + m.total, 0) : stats.total} responses</span>
              <span>{stats.percent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 shadow-inner">
              <div
                className="progress-gradient h-2.5 rounded-full"
                style={{ width: `${stats.percent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <StatPill label="Done" value={stats.done} color="text-green-700" />
              <StatPill label="Unsure" value={stats.unsure} color="text-amber-700" />
              <StatPill label="Skipped" value={stats.skipped} color="text-gray-500" />
            </div>

            {stats.by_track && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <TrackBar label="IT Baseline" track={stats.by_track.it_baseline} />
                <TrackBar label="Awareness" track={stats.by_track.awareness} />
              </div>
            )}
          </div>

          {/* Member breakdown with drill-down */}
          {members.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3">Team progress</h2>
              <p className="text-xs text-gray-400 mb-3">Click a team member to see their individual responses.</p>
              <div className="space-y-2">
                {members.map((m) => (
                  <MemberRow key={m.user_id} member={m} token={token} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function TrackBar({ label, track }: { label: string; track: TrackStats }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span>{track.percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="progress-gradient h-1.5 rounded-full"
          style={{ width: `${track.percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {track.done + track.unsure + track.skipped} / {track.total} items
      </p>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-white border border-gray-100 py-2 shadow-sm">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  done: "bg-green-100 text-green-800 border-green-200",
  unsure: "bg-amber-100 text-amber-800 border-amber-200",
  skipped: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  unsure: "Unsure",
  skipped: "Skipped",
};

function MemberRow({ member: m, token }: { member: MemberStat; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<DrillDownItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (items) return; // already loaded
    setLoading(true);
    try {
      const data = await apiFetch<{ items: DrillDownItem[] }>(
        `/api/dashboard/members/${m.user_id}`,
        token
      );
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // Count unsure items for highlight
  const unsureItems = items?.filter((i) => i.status === "unsure") ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={handleExpand}
        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 capitalize">
              {m.role.replace("_", " ")}
              {m.is_it_executor && " · IT executor"}
            </p>
            <p className="text-xs text-gray-600">
              {m.display_name ?? m.email ?? `${m.user_id.slice(0, 8)}...`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{m.percent}%</p>
              <p className="text-xs text-gray-500">{m.done}&#10003; {m.unsure}? {m.skipped}&ndash;</p>
            </div>
            <span className="text-gray-400 text-xs" style={{ transform: expanded ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>
              &#9656;
            </span>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
          <div className="progress-gradient h-1.5 rounded-full" style={{ width: `${m.percent}%` }} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-4 py-3">
          {loading && <p className="text-xs text-gray-400">Loading responses...</p>}
          {items && items.length === 0 && <p className="text-xs text-gray-400">No items to show.</p>}
          {items && items.length > 0 && (
            <>
              {unsureItems.length >= 2 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-800">
                    <strong>{unsureItems.length} items</strong> marked as unsure — consider following up.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                      item.status
                        ? STATUS_COLORS[item.status]
                        : "bg-white text-gray-400 border border-dashed border-gray-200"
                    }`}
                  >
                    <span className="flex-1">{item.title}</span>
                    <span className="ml-2 font-medium whitespace-nowrap">
                      {item.status ? STATUS_LABELS[item.status] : "Unanswered"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
