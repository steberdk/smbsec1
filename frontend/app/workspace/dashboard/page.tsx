"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";

type CadenceStatus = "green" | "amber" | "red" | "never";

type MemberStat = {
  user_id: string;
  email: string | null;
  role: string;
  is_it_executor: boolean;
  done: number;
  unsure: number;
  skipped: number;
  total: number;
  percent: number;
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
  const router = useRouter();
  const { token, loading: sessionLoading } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<DashboardData>("/api/dashboard", token)
      .then(setData)
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load dashboard.");
      });
  }, [token]);

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

  if (!data) {
    return <PageShell><p className="text-sm text-gray-600">Loading…</p></PageShell>;
  }

  const { stats, members, cadence, assessment } = data;

  return (
    <PageShell>
      {/* Cadence indicator */}
      <div className={`rounded-xl border px-4 py-3 mb-6 inline-flex items-center gap-2 ${CADENCE_CLASSES[cadence.status]}`}>
        <span className="text-sm font-medium">{CADENCE_LABEL[cadence.status]}</span>
        {cadence.last_completed_at && (
          <span className="text-xs">
            · Last completed {new Date(cadence.last_completed_at).toLocaleDateString()}
          </span>
        )}
      </div>

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
          <div className="rounded-xl border border-gray-200 p-4 mb-6">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
              {assessment.scope} assessment · {assessment.status}
              {" · started "}{new Date(assessment.created_at).toLocaleDateString()}
            </p>

            {/* Progress bar */}
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{stats.done + stats.unsure + stats.skipped} / {stats.total * Math.max(members.length, 1)} responses</span>
              <span>{stats.percent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div
                className="bg-gray-800 h-2 rounded-full"
                style={{ width: `${stats.percent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <StatPill label="Done" value={stats.done} color="text-green-700" />
              <StatPill label="Unsure" value={stats.unsure} color="text-amber-700" />
              <StatPill label="Skipped" value={stats.skipped} color="text-gray-500" />
            </div>

            {/* Per-track breakdown (AC-TRACK-AGG-01/02/03) */}
            {stats.by_track && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <TrackBar label="IT Baseline" track={stats.by_track.it_baseline} />
                <TrackBar label="Awareness" track={stats.by_track.awareness} />
              </div>
            )}
          </div>

          {/* Member breakdown */}
          {members.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3">Team progress</h2>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.user_id} className="rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500 capitalize">
                          {m.role.replace("_", " ")}
                          {m.is_it_executor && " · IT executor"}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {m.email ?? `${m.user_id.slice(0, 8)}…`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{m.percent}%</p>
                        <p className="text-xs text-gray-500">{m.done}✓ {m.unsure}? {m.skipped}–</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gray-700 h-1.5 rounded-full"
                        style={{ width: `${m.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}

function TrackBar({ label, track }: { label: string; track: TrackStats }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span>{track.percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-gray-700 h-1.5 rounded-full"
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
    <div className="rounded-lg bg-gray-50 border border-gray-100 py-2">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link href="/workspace" className="text-sm text-gray-500 underline">
          Back
        </Link>
      </div>
      {children}
    </main>
  );
}
