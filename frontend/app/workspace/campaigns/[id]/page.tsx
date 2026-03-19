"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type CampaignDetail = {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  scheduled_for: string | null;
  customisation: Record<string, string> | null;
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
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

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
      loadCampaign();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to send campaign."
      );
    } finally {
      setSending(false);
    }
  }

  async function handleRerun() {
    if (!token || !id || rerunning) return;

    const confirmed = window.confirm(
      "Re-run this campaign? A new campaign will be created with the same template and current team members."
    );
    if (!confirmed) return;

    setRerunning(true);

    try {
      const result = await apiFetch<{ campaign: { id: string } }>(
        `/api/campaigns/${id}/rerun`,
        token,
        { method: "POST" }
      );
      router.push(`/workspace/campaigns/${result.campaign.id}`);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to re-run campaign."
      );
    } finally {
      setRerunning(false);
    }
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800",
      pending: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-purple-100 text-purple-800",
      sent: "bg-blue-100 text-blue-800",
      clicked: "bg-red-100 text-red-800",
      reported: "bg-green-100 text-green-800",
      ignored: "bg-gray-100 text-gray-500",
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

  const canRerun = isAdmin && campaign.status === "completed";

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

  // Build timeline events
  const timelineEvents: { time: string; label: string; type: string }[] = [];
  for (const r of recipients) {
    if (r.sent_at) {
      timelineEvents.push({
        time: r.sent_at,
        label: `Email sent to ${r.email}`,
        type: "sent",
      });
    }
    if (r.acted_at && (r.status === "clicked" || r.status === "reported")) {
      timelineEvents.push({
        time: r.acted_at,
        label: `${r.email} ${r.status === "clicked" ? "clicked the link" : "reported the email"}`,
        type: r.status,
      });
    }
  }
  timelineEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

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
                &middot; {campaign.template.type.replace("_", " ")} &middot;{" "}
                {campaign.template.difficulty}
              </>
            )}
          </p>
          {campaign.scheduled_for && campaign.status === "scheduled" && (
            <p className="text-xs text-purple-700 mt-1">
              Scheduled for {new Date(campaign.scheduled_for).toLocaleDateString()}{" "}
              at {new Date(campaign.scheduled_for).toLocaleTimeString()}
            </p>
          )}
          {campaign.customisation && Object.keys(campaign.customisation).length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Custom subject: {campaign.customisation.subject ?? "default"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(campaign.status)}
        </div>
      </div>

      {/* Send button for draft/pending campaigns */}
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

      {/* Re-run button for completed campaigns */}
      {canRerun && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Campaign completed
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Re-run this campaign with the same template and current team
                members. Fresh tracking tokens will be generated.
              </p>
            </div>
            <button
              onClick={handleRerun}
              disabled={rerunning}
              className="shrink-0 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rerunning ? "Creating..." : "Re-run campaign"}
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
          not click the simulated link.
        </p>
      </div>

      {/* Response time metrics */}
      {(() => {
        const actedRecipients = recipients.filter(
          (r) => r.sent_at && r.acted_at && (r.status === "clicked" || r.status === "reported")
        );
        if (actedRecipients.length === 0) return null;

        const responseTimes = actedRecipients.map((r) =>
          new Date(r.acted_at!).getTime() - new Date(r.sent_at!).getTime()
        );
        const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minMs = Math.min(...responseTimes);
        const maxMs = Math.max(...responseTimes);

        function formatDuration(ms: number): string {
          if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
          if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
          return `${(ms / 3_600_000).toFixed(1)}h`;
        }

        const clickTimes = actedRecipients
          .filter((r) => r.status === "clicked")
          .map((r) => new Date(r.acted_at!).getTime() - new Date(r.sent_at!).getTime());
        const reportTimes = actedRecipients
          .filter((r) => r.status === "reported")
          .map((r) => new Date(r.acted_at!).getTime() - new Date(r.sent_at!).getTime());

        return (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Response time</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500">Average</p>
                <p className="text-sm font-bold text-gray-900">{formatDuration(avgMs)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fastest</p>
                <p className="text-sm font-bold text-gray-900">{formatDuration(minMs)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Slowest</p>
                <p className="text-sm font-bold text-gray-900">{formatDuration(maxMs)}</p>
              </div>
            </div>
            {(clickTimes.length > 0 || reportTimes.length > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-center">
                {clickTimes.length > 0 && (
                  <div>
                    <p className="text-xs text-red-500">Avg time to click</p>
                    <p className="text-sm font-semibold text-red-700">
                      {formatDuration(clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length)}
                    </p>
                  </div>
                )}
                {reportTimes.length > 0 && (
                  <div>
                    <p className="text-xs text-green-500">Avg time to report</p>
                    <p className="text-sm font-semibold text-green-700">
                      {formatDuration(reportTimes.reduce((a, b) => a + b, 0) / reportTimes.length)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Auto-refresh indicator */}
      {campaign.status === "active" && (
        <p className="text-xs text-gray-400 mb-4">
          Results update automatically every 15 seconds.
        </p>
      )}

      {/* Timeline toggle */}
      {timelineEvents.length > 0 && (
        <section className="mb-8">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="text-sm text-teal-700 hover:underline mb-3 flex items-center gap-1"
          >
            <span style={{ transform: showTimeline ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>
              &#9656;
            </span>
            {showTimeline ? "Hide timeline" : "Show timeline"} ({timelineEvents.length} events)
          </button>

          {showTimeline && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {timelineEvents.map((evt, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        evt.type === "clicked"
                          ? "bg-red-400"
                          : evt.type === "reported"
                          ? "bg-green-400"
                          : "bg-blue-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 truncate">{evt.label}</p>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">
                      {new Date(evt.time).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
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
