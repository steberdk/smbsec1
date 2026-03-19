"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type Template = {
  id: string;
  title: string;
  type: string;
  subject: string;
  preview_text: string;
  difficulty: string;
  checklist_item_id: string | null;
};

type OrgMember = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  campaign_opt_out?: boolean;
};

export default function CreateCampaignPage() {
  const { token, isAdmin, userId } = useWorkspace();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Create Campaign | SMB Security Quick-Check";
  }, []);

  useEffect(() => {
    if (!token) return;

    // Check campaign credits first
    apiFetch<{ org: { campaign_credits?: number } }>("/api/orgs/me", token)
      .then((data) => {
        const credits = (data.org as { campaign_credits?: number }).campaign_credits ?? 0;
        if (credits <= 0) {
          router.replace("/workspace/campaigns");
          return;
        }
      })
      .catch(() => {});

    Promise.all([
      apiFetch<{ templates: Template[] }>(
        "/api/campaigns/templates",
        token
      ).then(({ templates: list }) => setTemplates(list)),
      apiFetch<{ members: OrgMember[] }>("/api/orgs/members", token).then(
        ({ members: list }) => {
          setMembers(list);
          // Pre-select all non-opted-out members except the current user
          const preSelected = new Set(
            list
              .filter((m) => !m.campaign_opt_out && m.user_id !== userId)
              .map((m) => m.user_id)
          );
          setSelectedRecipients(preSelected);
        }
      ),
    ])
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load data.");
      })
      .finally(() => setLoading(false));
  }, [token, userId, router]);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">
          Only organisation admins can create campaigns.
        </p>
      </div>
    );
  }

  function toggleRecipient(uid: string) {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedRecipients.size === members.filter((m) => m.user_id !== userId).length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(
        new Set(members.filter((m) => m.user_id !== userId).map((m) => m.user_id))
      );
    }
  }

  async function handleSubmit() {
    if (!token || !selectedTemplate || selectedRecipients.size === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/api/campaigns", token, {
        method: "POST",
        body: JSON.stringify({
          template_id: selectedTemplate,
          recipient_user_ids: Array.from(selectedRecipients),
        }),
      });
      router.push("/workspace/campaigns");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  const chosenTemplate = templates.find((t) => t.id === selectedTemplate);

  function difficultyBadge(difficulty: string) {
    const styles: Record<string, string> = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
          styles[difficulty] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {difficulty}
      </span>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Loading...</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create Campaign
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === s
                  ? "bg-teal-700 text-white"
                  : step > s
                  ? "bg-teal-100 text-teal-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s}
            </div>
            <span
              className={`text-xs font-medium ${
                step === s ? "text-teal-800" : "text-gray-400"
              }`}
            >
              {s === 1 ? "Template" : s === 2 ? "Recipients" : "Review"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step 1: Select template */}
      {step === 1 && (
        <section>
          <h2 className="text-base font-semibold mb-4">
            Select a phishing template
          </h2>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500">
              No templates available. Contact support.
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 shadow-sm transition-all ${
                    selectedTemplate === t.id
                      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200"
                      : "border-gray-200 bg-white hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Subject: {t.subject}
                      </p>
                      {t.preview_text && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {t.preview_text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500 capitalize">
                        {t.type}
                      </span>
                      {difficultyBadge(t.difficulty)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedTemplate}
              className="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next: Select recipients
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Select recipients */}
      {step === 2 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Select recipients</h2>
            <button
              onClick={toggleAll}
              className="text-xs text-teal-700 underline"
            >
              {selectedRecipients.size ===
              members.filter((m) => m.user_id !== userId).length
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>

          {members.filter((m) => m.user_id !== userId).length === 0 ? (
            <p className="text-sm text-gray-500">
              No team members found. Invite team members first.
            </p>
          ) : (
            <div className="space-y-2">
              {members
                .filter((m) => m.user_id !== userId)
                .map((m) => (
                  <label
                    key={m.user_id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm cursor-pointer transition-all ${
                      selectedRecipients.has(m.user_id)
                        ? "border-teal-400 bg-teal-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    } ${m.campaign_opt_out ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.has(m.user_id)}
                      onChange={() => toggleRecipient(m.user_id)}
                      disabled={m.campaign_opt_out}
                      className="accent-teal-700"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.display_name ?? m.email ?? m.user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {m.role.replace("_", " ")}
                        {m.campaign_opt_out ? " (opted out)" : ""}
                      </p>
                    </div>
                  </label>
                ))}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedRecipients.size === 0}
              className="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next: Review
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Review & send */}
      {step === 3 && (
        <section>
          <h2 className="text-base font-semibold mb-4">Review & send</h2>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm space-y-3 mb-6">
            <div>
              <p className="text-xs text-gray-500">Template</p>
              <p className="text-sm font-medium text-gray-900">
                {chosenTemplate?.title ?? "—"}
              </p>
              {chosenTemplate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Subject: {chosenTemplate.subject}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Recipients</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedRecipients.size} team member
                {selectedRecipients.size !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Difficulty</p>
              {chosenTemplate && difficultyBadge(chosenTemplate.difficulty)}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6">
            <p className="text-sm text-amber-800">
              This will use 1 campaign credit. The simulated phishing email will
              be queued for delivery to the selected recipients.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-teal-700 text-white px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Send campaign"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
