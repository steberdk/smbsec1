"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { CHECKLIST } from "@/lib/checklist/items";
import { computeProgress, getStatus } from "@/lib/checklist/progress";
import { ChecklistProgress, ChecklistStatus } from "@/lib/checklist/types";
import { fetchRemoteProgress, putRemoteProgress } from "@/lib/checklist/storage";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProgressBar } from "@/components/ProgressBar";
import { ChecklistItemCard } from "@/components/ChecklistItemCard";

type SyncState = "idle" | "loading" | "saving" | "error";
type ViewMode = "loading" | "readonly" | "interactive";

export default function ChecklistPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [progress, setProgress] = useState<ChecklistProgress>({});
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const accessTokenRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedJsonRef = useRef<string>("");

  const groups = useMemo(() => {
    const sortedGroups = [...CHECKLIST.groups].sort((a, b) => a.order - b.order);
    return sortedGroups.map((g) => ({
      group: g,
      items: CHECKLIST.items.filter((i) => i.groupId === g.id),
    }));
  }, []);

  const stats = useMemo(() => computeProgress(progress), [progress]);

  // Effect 1 — Auth check on mount
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? null;

        if (cancelled) return;

        if (!token) {
          setViewMode("readonly");
          return;
        }

        accessTokenRef.current = token;

        // Keep token updated on auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
          accessTokenRef.current = session?.access_token ?? null;
        });

        setViewMode("interactive");
      } catch {
        if (!cancelled) setViewMode("readonly");
      }
    }

    void checkAuth();
    return () => { cancelled = true; };
  }, []);

  // Effect 2 — Fetch remote progress when authenticated
  useEffect(() => {
    if (viewMode !== "interactive") return;

    let cancelled = false;

    async function fetchProgress() {
      const token = accessTokenRef.current;
      if (!token) return;

      try {
        setSyncState("loading");
        setSyncError(null);
        const remote = await fetchRemoteProgress(token);

        if (cancelled) return;

        if (remote.data) {
          setProgress(remote.data);
          lastSavedJsonRef.current = JSON.stringify(remote.data);
        }

        setSyncState("idle");
      } catch (e) {
        if (cancelled) return;
        setSyncState("error");
        setSyncError(e instanceof Error ? e.message : "Unknown sync error");
      }
    }

    void fetchProgress();
    return () => { cancelled = true; };
  }, [viewMode]);

  // Effect 3 — Debounced save (only when authenticated)
  useEffect(() => {
    if (viewMode !== "interactive") return;

    const token = accessTokenRef.current;
    if (!token) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const json = JSON.stringify(progress);
        if (json === lastSavedJsonRef.current) return;

        setSyncState("saving");
        setSyncError(null);

        await putRemoteProgress(token, progress);

        lastSavedJsonRef.current = json;
        setSyncState("idle");
      } catch (e) {
        setSyncState("error");
        setSyncError(e instanceof Error ? e.message : "Unknown save error");
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [progress, viewMode]);

  function handleSet(itemId: string, status: ChecklistStatus) {
    setProgress((prev) => ({ ...prev, [itemId]: status }));
  }

  function handleReset(itemId: string) {
    setProgress((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  if (viewMode === "loading") {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Security checklist</h1>
          <Link className="text-sm underline" href="/summary">
            View summary →
          </Link>
        </div>

        <div className="mt-4">
          <ProgressBar percent={0} />
          <div className="mt-3 text-sm text-gray-700">Loading…</div>
        </div>
      </main>
    );
  }

  if (viewMode === "readonly") {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Security checklist</h1>
          <Link className="text-sm underline" href="/summary">
            View summary →
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900 font-medium">
            Sign in to save your progress and work through the checklist with your team.
          </p>
          <Link
            href="/login"
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-8 space-y-10">
          {groups.map(({ group, items }) => (
            <section key={group.id} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">{group.title}</h2>
                <p className="text-sm text-gray-600">{group.description}</p>
              </div>

              <div className="grid gap-3">
                {items.map((item) => (
                  <ChecklistItemCard
                    key={item.id}
                    item={item}
                    status={getStatus({}, item.id)}
                    onSetStatus={() => {}}
                    onReset={() => {}}
                    readOnly={true}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  // viewMode === "interactive"
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Security checklist</h1>
        <Link className="text-sm underline" href="/summary">
          View summary →
        </Link>
      </div>

      <div className="mt-4">
        <ProgressBar percent={stats.percent} />
        <div className="mt-3 text-sm text-gray-700">
          <span className="font-medium tabular-nums">{stats.decided}</span> of{" "}
          <span className="font-medium tabular-nums">{stats.total}</span> items reviewed · Done:{" "}
          <span className="tabular-nums">{stats.done}</span> · Not sure:{" "}
          <span className="tabular-nums">{stats.unsure}</span> · Skipped:{" "}
          <span className="tabular-nums">{stats.skipped}</span>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          {syncState === "loading" && "Syncing from server…"}
          {syncState === "saving" && "Saving…"}
          {syncState === "idle" && " "}
          {syncState === "error" && (
            <span className="text-red-700">
              Sync error: {syncError ?? "Unknown error"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {groups.map(({ group, items }) => (
          <section key={group.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <p className="text-sm text-gray-600">{group.description}</p>
            </div>

            <div className="grid gap-3">
              {items.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  status={getStatus(progress, item.id)}
                  onSetStatus={(s) => handleSet(item.id, s)}
                  onReset={() => handleReset(item.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/summary"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white"
        >
          Summary & next steps
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
