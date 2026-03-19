"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type CampaignDetail = {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  template: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
  } | null;
};

type Recipient = {
  id: string;
  user_id: string;
  email: string;
  status: string;
  sent_at: string | null;
  acted_at: string | null;
};

export default function CampaignDetailPage() {
  const { token, isAdmin } = useWorkspace();
  const params = useParams();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    document.title = "Campaign Details | SMB Security Quick-Check";
  }, []);

  const loadCampaign = useCallback(() => {
    if (!token || !id) return;

    apiFetch<{ campaign: CampaignDetail; recipients: Recipient[] }>(
      `/api/campaigns/${id}`,
      token
    )
      .then((data) => {
        setCampaign(data.campaign);
        setRecipients(data.recipients);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load campaign.");
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Auto-refresh when campaign is active (every 15 seconds)
  useEffect(() => {
    if (!campaign || campaign.status !== "active") return;
    const interval = setInterval(loadCampaign, 15_000);
    return () => clearInterval(interval);
  }, [campaign, loadCampaign]);

  async function handleSend() {
    if (!token || !id || sending) return;

    const confirmed = window.confirm(
      "Are you sure you want to send this campaign? Emails will be sent to all recipients."
    );
    if (!confirmed) return;

    setSending(true);
    setSendResult(null);

    try {
      const result = await apiFetch<{
        ok: boolean;
        sent: number;
        failed: number;
      }>(`/api/campaigns/${id}/send`, token, { method: "POST" });

      setSendResult({ sent: result.sent, failed: result.failed });
      // Reload campaign data to reflect new statuses
      loadCampaign();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to send campaign."
      );
    } finally {
      setSending(false);
    }
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800",
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-blue-100 text-blue-800",
      clicked: "bg-red-100 text-red-800",
      reported: "bg-green-100 text-green-800",
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

  if (loading) {
    return <p className="text-sm text-gray-600">Loading campaign...</p>;
  }

  if (error || !campaign) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">{error ?? "Campaign not found."}</p>
        <Link
          href="/workspace/campaigns"
          className="text-xs text-teal-700 underline mt-2 inline-block"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  const canSend =
    isAdmin &&
    (campaign.status === "draft" || campaign.status === "pending");

  const totalRecipients = recipients.length;
  const clickedCount = recipients.filter((r) => r.status === "clicked").length;
  const reportedCount = recipients.filter(
    (r) => r.status === "reported"
  ).length;
  const sentCount = recipients.filter(
    (r) => r.status !== "pending"
  ).length;
  const passRate =
    totalRecipients > 0
      ? Math.round(
          ((totalRecipients - clickedCount) / totalRecipients) * 100
        )
      : 0;

  return (
    <>
      <Link
        href="/workspace/campaigns"
        className="text-xs text-teal-700 hover:underline mb-4 inline-block"
      >
        &larr; Back to campaigns
      </Link>

      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {campaign.template?.title ?? "Campaign"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(campaign.created_at).toLocaleDateString()}
            {campaign.template && (
              <>
                {" "}
                &middot; {campaign.template.type} &middot;{" "}
                {campaign.template.difficulty}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(campaign.status)}
        </div>
      </div>

      {/* Send button for draft campaigns */}
      {canSend && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-900">
                Ready to send
              </p>
              <p className="text-xs text-teal-700 mt-0.5">
                {totalRecipients} recipient{totalRecipients !== 1 ? "s" : ""}{" "}
                will receive the simulated phishing email.
              </p>
            </div>
            <button
              onClick={handleSend}
              disabled={sending}
              className="shrink-0 bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send campaign"}
            </button>
          </div>
        </div>
      )}

      {/* Send result notification */}
      {sendResult && (
        <div
          className={`rounded-xl border px-4 py-3 mb-6 ${
            sendResult.failed > 0
              ? "border-amber-200 bg-amber-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              sendResult.failed > 0 ? "text-amber-800" : "text-green-800"
            }`}
          >
            {sendResult.sent} email{sendResult.sent !== 1 ? "s" : ""} sent
            successfully.
            {sendResult.failed > 0 && (
              <span className="text-amber-800">
                {" "}
                {sendResult.failed} failed to send.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Recipients", value: totalRecipients },
          { label: "Sent", value: sentCount },
          { label: "Clicked", value: clickedCount },
          { label: "Reported", value: reportedCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-center"
          >
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pass rate bar */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Pass rate</p>
          <p className="text-sm font-bold text-gray-900">{passRate}%</p>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
            style={{ width: `${passRate}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {totalRecipients - clickedCount} of {totalRecipients} recipients did
          not click the simulated phishing link.
        </p>
      </div>

      {/* Auto-refresh indicator */}
      {campaign.status === "active" && (
        <p className="text-xs text-gray-400 mb-4">
          Results update automatically every 15 seconds.
        </p>
      )}

      {/* Recipients table */}
      <section>
        <h2 className="text-base font-semibold mb-3">Recipients</h2>
        <div className="space-y-2">
          {recipients.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {r.email || r.user_id.slice(0, 8)}
                </p>
                {r.sent_at && (
                  <p className="text-xs text-gray-400">
                    Sent {new Date(r.sent_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {r.acted_at && (
                  <p className="text-xs text-gray-400">
                    {new Date(r.acted_at).toLocaleString()}
                  </p>
                )}
                {statusBadge(r.status)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
