"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type Campaign = {
  id: string;
  template_id: string;
  template_title: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  recipient_total: number;
  recipient_acted: number;
};

export default function CampaignsPage() {
  const { token, isAdmin } = useWorkspace();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Campaigns | SMB Security Quick-Check";
  }, []);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      apiFetch<{ campaigns: Campaign[] }>("/api/campaigns", token).then(
        ({ campaigns: list }) => setCampaigns(list)
      ),
      apiFetch<{ org: { campaign_credits?: number } }>(
        "/api/orgs/me",
        token
      ).then((data) => {
        // campaign_credits may be on the org object
        const org = data.org as { campaign_credits?: number };
        setCredits(org.campaign_credits ?? 0);
      }),
    ])
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load campaigns.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const hasActiveCampaign = campaigns.some((c) =>
    ["pending", "sending", "active"].includes(c.status)
  );
  const canCreate = isAdmin && (credits ?? 0) > 0 && !hasActiveCampaign;

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      sending: "bg-blue-100 text-blue-800",
      active: "bg-teal-100 text-teal-800",
      completed: "bg-gray-100 text-gray-700",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
          styles[status] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {status}
      </span>
    );
  }

  function passRate(total: number, acted: number) {
    if (total === 0) return "---";
    const passed = total - acted;
    return `${Math.round((passed / total) * 100)}%`;
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Loading campaigns...</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        {isAdmin && (
          <Link
            href="/workspace/campaigns/new"
            className={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${
              canCreate
                ? "bg-teal-700 text-white hover:bg-teal-800 hover:shadow-md"
                : "bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none"
            }`}
            aria-disabled={!canCreate}
          >
            Create campaign
          </Link>
        )}
      </div>

      {/* Credit info / upgrade gate */}
      {isAdmin && credits !== null && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm mb-6">
          {credits > 0 ? (
            <>
              <p className="text-sm text-gray-600">
                Campaign credits remaining:{" "}
                <span className="font-semibold text-gray-900">{credits}</span>
              </p>
              {hasActiveCampaign && (
                <p className="text-xs text-amber-600 mt-1">
                  A campaign is currently active. You can create a new one after it
                  completes.
                </p>
              )}
            </>
          ) : campaigns.length > 0 ? (
            <div className="text-center py-2">
              <p className="text-sm font-medium text-gray-800">
                You&apos;ve used your free campaign.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Upgrade to continue testing your team.
              </p>
              <Link
                href="/workspace/billing"
                className="mt-3 inline-block rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all"
              >
                View plans
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              You have <span className="font-semibold text-teal-700">1 free campaign</span> to
              test your team&apos;s phishing awareness. Create your first campaign below.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 shadow-sm text-center">
          <p className="text-gray-500 text-sm">
            No campaigns yet. Send your first simulated phishing test to see how
            your team responds.
          </p>
          {isAdmin && canCreate && (
            <Link
              href="/workspace/campaigns/new"
              className="mt-4 inline-block rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all"
            >
              Create your first campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/workspace/campaigns/${c.id}`}
              className="block rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {c.template_title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(c.created_at).toLocaleDateString()} &middot;{" "}
                    {c.recipient_total} recipient
                    {c.recipient_total !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Pass rate</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {passRate(c.recipient_total, c.recipient_acted)}
                    </p>
                  </div>
                  {statusBadge(c.status)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
