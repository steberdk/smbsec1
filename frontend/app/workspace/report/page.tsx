"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";

/* ── Types ─────────────────────────────────────────────────── */

type TrackStats = {
  total: number;
  done: number;
  unsure: number;
  skipped: number;
  percent: number;
};

type DashboardData = {
  assessment: {
    id: string;
    status: string;
    scope: string;
    created_at: string;
    completed_at: string | null;
  } | null;
  stats: {
    total: number;
    done: number;
    unsure: number;
    skipped: number;
    percent: number;
    by_track?: { it_baseline: TrackStats; awareness: TrackStats };
  };
  members: {
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
  }[];
  cadence: { last_completed_at: string | null; status: string };
};

type CampaignSummary = {
  total_campaigns: number;
  total_sent: number;
  total_reported: number;
  total_clicked: number;
  total_ignored: number;
  pass_rate: number;
  last_campaign_date: string | null;
};

/* ── Component ─────────────────────────────────────────────── */

export default function SecurityReportPage() {
  const { token, orgData, isAdmin } = useWorkspace();
  const t = useTranslation();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t("nav.report")} | SMB Security Quick-Check`;
  });

  useEffect(() => {
    if (!token || !isAdmin) return;

    Promise.all([
      apiFetch<DashboardData>("/api/dashboard", token),
      apiFetch<CampaignSummary>("/api/campaigns/summary", token).catch(() => null),
    ])
      .then(([dash, camp]) => {
        setDashboard(dash);
        setCampaigns(camp);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load report data");
      })
      .finally(() => setLoading(false));
  }, [token, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">Access restricted</p>
        <p className="text-sm mt-1">Only organisation admins can view the security report.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-center py-16 text-gray-400">Loading report...</p>;
  }

  if (error) {
    return <p className="text-center py-16 text-red-500">{error}</p>;
  }

  if (!dashboard?.assessment) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">{t("report.noAssessment")}</p>
      </div>
    );
  }

  const { assessment, stats, members, cadence } = dashboard;
  const reportDate = new Date().toLocaleString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const platformKey = orgData.org.email_platform
    ? `report.platformLabel.${orgData.org.email_platform}`
    : "report.platformLabel.unknown";

  const statusKey = `report.statusLabel.${assessment.status}`;

  /* Build category-level results from member data */
  const totalDone = stats.done;
  const totalUnsure = stats.unsure;
  const totalSkipped = stats.skipped;
  const totalAnswered = totalDone + totalUnsure + totalSkipped;

  const cadenceLabel =
    cadence.status === "green"
      ? t("dashboard.onTrack")
      : cadence.status === "amber"
        ? t("dashboard.dueSoon")
        : cadence.status === "red"
          ? t("dashboard.overdue")
          : t("dashboard.noAssessment");

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-container { box-shadow: none !important; border: none !important; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="report-container">
        {/* Action bar (no-print) */}
        <div className="no-print flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">{t("report.title")}</h1>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t("report.printPdf")}
          </button>
        </div>

        {/* Report content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{t("report.title")}</h1>
                <p className="text-teal-100 text-sm mt-1">{t("report.subtitle")}</p>
              </div>
              <div className="text-right text-sm text-teal-100">
                <p>{t("report.confidential")}</p>
                <p>{t("report.generatedOn")} {reportDate}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-8">
            {/* Section 1: Organisation Info */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                {t("report.orgInfo")}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t("report.orgName")}</span>
                  <p className="font-medium text-gray-900">{orgData.org.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("report.platform")}</span>
                  <p className="font-medium text-gray-900">{t(platformKey)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("report.members")}</span>
                  <p className="font-medium text-gray-900">{members.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("report.reassessmentCadence")}</span>
                  <p className="font-medium text-gray-900">{cadenceLabel}</p>
                </div>
              </div>
            </section>

            {/* Section 2: Assessment Overview */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                {t("report.assessmentOverview")}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-500">{t("report.assessmentDate")}</span>
                  <p className="font-medium text-gray-900">
                    {new Date(assessment.created_at).toLocaleString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">{t("report.assessmentStatus")}</span>
                  <p className="font-medium text-gray-900">{t(statusKey)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("report.totalItems")}</span>
                  <p className="font-medium text-gray-900">{stats.total}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("report.completionRate")}</span>
                  <p className="font-medium text-gray-900">{stats.percent}%</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="h-full flex">
                  {totalAnswered > 0 && (
                    <>
                      <div
                        className="bg-teal-500 h-full"
                        style={{ width: `${(totalDone / Math.max(totalAnswered, 1)) * 100}%` }}
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${(totalUnsure / Math.max(totalAnswered, 1)) * 100}%` }}
                      />
                      <div
                        className="bg-gray-300 h-full"
                        style={{ width: `${(totalSkipped / Math.max(totalAnswered, 1)) * 100}%` }}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-6 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                  {t("report.itemsDone")} ({totalDone})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  {t("report.itemsUnsure")} ({totalUnsure})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                  {t("report.itemsSkipped")} ({totalSkipped})
                </span>
              </div>
            </section>

            {/* Section 3: Per-track breakdown */}
            {stats.by_track && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  {t("report.categoryResults")}
                </h2>

                <div className="space-y-3">
                  {/* IT Baseline track */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{t("dashboard.itBaseline")}</p>
                      <p className="text-xs text-gray-500">
                        {stats.by_track.it_baseline.total} {t("dashboard.items")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-teal-700 font-medium">
                        {t("report.itemsDone")}: {stats.by_track.it_baseline.done}
                      </span>
                      <span className="text-amber-600 font-medium">
                        {t("report.itemsUnsure")}: {stats.by_track.it_baseline.unsure}
                      </span>
                      <span className="text-gray-500">
                        {t("report.itemsSkipped")}: {stats.by_track.it_baseline.skipped}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 min-w-[40px] text-right">
                        {stats.by_track.it_baseline.percent}%
                      </span>
                    </div>
                  </div>

                  {/* Awareness track */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{t("dashboard.awareness")}</p>
                      <p className="text-xs text-gray-500">
                        {stats.by_track.awareness.total} {t("dashboard.items")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-teal-700 font-medium">
                        {t("report.itemsDone")}: {stats.by_track.awareness.done}
                      </span>
                      <span className="text-amber-600 font-medium">
                        {t("report.itemsUnsure")}: {stats.by_track.awareness.unsure}
                      </span>
                      <span className="text-gray-500">
                        {t("report.itemsSkipped")}: {stats.by_track.awareness.skipped}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 min-w-[40px] text-right">
                        {stats.by_track.awareness.percent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Per-member table */}
                {members.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("dashboard.teamProgress")}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                            <th className="pb-2 pr-4">{t("dashboard.member")}</th>
                            <th className="pb-2 pr-4">{t("dashboard.role")}</th>
                            <th className="pb-2 pr-4 text-right">{t("report.itemsDone")}</th>
                            <th className="pb-2 pr-4 text-right">{t("report.itemsUnsure")}</th>
                            <th className="pb-2 pr-4 text-right">{t("report.itemsSkipped")}</th>
                            <th className="pb-2 text-right">{t("report.completionRate")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m) => (
                            <tr key={m.user_id} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 pr-4 text-gray-900">
                                {m.display_name ?? m.email ?? m.user_id.slice(0, 8)}
                              </td>
                              <td className="py-2 pr-4 text-gray-500 capitalize">{m.role.replace("_", " ")}</td>
                              <td className="py-2 pr-4 text-right text-teal-700">{m.done}</td>
                              <td className="py-2 pr-4 text-right text-amber-600">{m.unsure}</td>
                              <td className="py-2 pr-4 text-right text-gray-400">{m.skipped}</td>
                              <td className="py-2 text-right font-medium text-gray-900">{m.percent}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Section 4: Campaign Results */}
            <section className="page-break">
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                {t("report.campaignResults")}
              </h2>
              {campaigns && campaigns.total_campaigns > 0 ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t("report.totalCampaigns")}</span>
                    <p className="font-medium text-gray-900">{campaigns.total_campaigns}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t("report.emailsSent")}</span>
                    <p className="font-medium text-gray-900">{campaigns.total_sent}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t("report.passRate")}</span>
                    <p className={`font-medium ${campaigns.pass_rate >= 70 ? "text-teal-700" : campaigns.pass_rate >= 40 ? "text-amber-600" : "text-red-600"}`}>
                      {campaigns.pass_rate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">{t("report.clickRate")}</span>
                    <p className={`font-medium ${campaigns.total_sent > 0 ? (Math.round((campaigns.total_clicked / campaigns.total_sent) * 100) <= 20 ? "text-teal-700" : "text-red-600") : "text-gray-900"}`}>
                      {campaigns.total_sent > 0
                        ? `${Math.round((campaigns.total_clicked / campaigns.total_sent) * 100)}%`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">{t("report.noCampaigns")}</p>
              )}
            </section>

            {/* Section 5: Recommendations */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                {t("report.recommendations")}
              </h2>
              {stats.percent < 100 ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">{t("report.recommendationsIntro")}</p>
                  <ul className="space-y-2 text-sm">
                    {totalUnsure > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span className="text-gray-700">
                          <strong>{totalUnsure}</strong> {t("report.itemsUnsure").toLowerCase()} — review these items and implement or seek guidance.
                        </span>
                      </li>
                    )}
                    {totalSkipped > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                        <span className="text-gray-700">
                          <strong>{totalSkipped}</strong> {t("report.itemsSkipped").toLowerCase()} — revisit these items in the next assessment cycle.
                        </span>
                      </li>
                    )}
                    {campaigns && campaigns.total_campaigns > 0 && campaigns.pass_rate < 70 && (
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <span className="text-gray-700">
                          Phishing campaign pass rate is below 70%. Consider running additional awareness training sessions.
                        </span>
                      </li>
                    )}
                    {cadence.status === "red" && (
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <span className="text-gray-700">
                          Security assessment is overdue for reassessment. Schedule a new assessment cycle.
                        </span>
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-gray-600">{t("report.noRecommendations")}</p>
              )}
            </section>

            {/* Disclaimer */}
            <div className="border-t border-gray-200 pt-4 mt-8">
              <p className="text-xs text-gray-400 italic">{t("report.disclaimer")}</p>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-2 pb-2">
              <p>{t("report.generatedBy")}</p>
              <p>{t("report.generatedOn")} {reportDate}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
