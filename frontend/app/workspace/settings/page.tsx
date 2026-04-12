"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type MemberInfo = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  is_it_executor: boolean;
};

const PLATFORM_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "microsoft_365", label: "Microsoft 365 (Exchange / Outlook)" },
  { value: "gmail_personal", label: "Gmail (Personal)" },
  { value: "apple_icloud", label: "Apple iCloud Mail" },
  { value: "other", label: "Other" },
];

const LOCALE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "da", label: "Dansk (Danish)" },
];

export default function OrgSettingsPage() {
  const { token, orgData, isAdmin, refresh } = useWorkspace();

  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [platform, setPlatform] = useState(orgData.org.email_platform ?? "");
  const [locale, setLocale] = useState(orgData.org.locale ?? "en");
  const [aiGuidanceEnabled, setAiGuidanceEnabled] = useState<boolean>(
    orgData.org.ai_guidance_enabled ?? true
  );
  const [executor, setExecutor] = useState("");
  const [initialExecutor, setInitialExecutor] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // F-041 reassignment dialog state
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignAcknowledged, setReassignAcknowledged] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  useEffect(() => { document.title = "Settings | SMB Security Quick-Check"; }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ members: MemberInfo[] }>("/api/orgs/members", token)
      .then(({ members: list }) => {
        const currentExecutor = list.find((m) => m.is_it_executor);
        const initial = currentExecutor?.user_id ?? orgData.membership.user_id ?? "";
        setExecutor(initial);
        setInitialExecutor(initial);
        setMembers(list);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load settings.");
      });
  }, [token, orgData.membership.user_id]);

  const previousExec = useMemo(
    () => members.find((m) => m.user_id === initialExecutor) ?? null,
    [members, initialExecutor]
  );
  const newExec = useMemo(
    () => members.find((m) => m.user_id === executor) ?? null,
    [members, executor]
  );
  const previousName =
    previousExec?.display_name ?? previousExec?.email ?? "(current IT Executor)";
  const newName = newExec?.display_name ?? newExec?.email ?? "(selected member)";

  const executorChanged = executor !== initialExecutor;
  const hasCurrentExec = members.some((m) => m.is_it_executor);

  async function persistNonExecutorSettings() {
    await apiFetch("/api/orgs/me", token, {
      method: "PATCH",
      body: JSON.stringify({
        email_platform: platform || null,
        locale,
        ai_guidance_enabled: aiGuidanceEnabled,
      }),
    });
  }

  async function persistExecutor() {
    await apiFetch("/api/orgs/executor", token, {
      method: "PUT",
      body: JSON.stringify({ user_id: executor }),
    });
  }

  async function handleSave() {
    if (!token) return;
    setSaveMsg(null);
    setReassignError(null);

    // If executor changed AND there's an existing IT Exec, show the
    // confirmation dialog first (F-041 locked AC-9). Otherwise save directly.
    if (executorChanged && hasCurrentExec && previousExec && newExec) {
      setReassignAcknowledged(false);
      setShowReassignDialog(true);
      return;
    }

    setSaving(true);
    try {
      await persistNonExecutorSettings();
      if (executorChanged) {
        await persistExecutor();
      }
      setInitialExecutor(executor);
      setSaveMsg("Settings saved.");
      refresh();
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmReassign() {
    if (!token) return;
    setSaving(true);
    setReassignError(null);
    try {
      await persistNonExecutorSettings();
      await persistExecutor();
      setInitialExecutor(executor);
      setShowReassignDialog(false);
      setSaveMsg(`IT Baseline transferred to ${newName}.`);
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to reassign.";
      if (/migration_pending/i.test(msg)) {
        setReassignError(
          "IT Executor reassignment is not yet available — admin needs to apply migration 025."
        );
      } else {
        setReassignError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  function cancelReassign() {
    if (saving) return;
    setShowReassignDialog(false);
    setReassignAcknowledged(false);
    setReassignError(null);
    // Revert the dropdown selection so the page reflects actual state.
    setExecutor(initialExecutor);
  }

  if (!isAdmin) {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <p className="text-sm text-gray-600">Only the organisation owner can change settings.</p>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Email Platform */}
        <div>
          <label className="block text-sm font-medium mb-1">Email platform</label>
          <p className="text-xs text-gray-500 mb-2">
            Determines which step instructions are shown in the IT Baseline checklist.
          </p>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Language / Locale */}
        <div>
          <label className="block text-sm font-medium mb-1">Campaign language</label>
          <p className="text-xs text-gray-500 mb-2">
            Sets the default language for campaign email templates. You can always choose other languages when creating a campaign.
          </p>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* AI guidance (F-012) */}
        <div>
          <label className="block text-sm font-medium mb-1">AI guidance</label>
          <p className="text-xs text-gray-500 mb-2">
            When enabled, members can request AI-assisted explanations for
            checklist items. Requests are sent to Anthropic (Claude Haiku) in
            the United States under Standard Contractual Clauses. See the{" "}
            <Link href="/privacy" className="underline">privacy policy</Link>{" "}
            for details. Disable to stop all AI guidance requests for the
            organisation.
          </p>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={aiGuidanceEnabled}
              onChange={(e) => setAiGuidanceEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span>Allow AI guidance for this organisation</span>
          </label>
        </div>

        {/* IT Executor Assignment */}
        <div>
          <label className="block text-sm font-medium mb-1">IT executor</label>
          <p className="text-xs text-gray-500 mb-2">
            The person responsible for the IT Baseline checklist. Only one per organisation.
          </p>
          <select
            value={executor}
            onChange={(e) => setExecutor(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name ?? m.email ?? m.user_id.slice(0, 8) + "..."} ({m.role === "org_admin" ? "Owner" : m.role.replace("_", " ")})
              </option>
            ))}
          </select>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </div>

      {/* F-041 reassignment confirmation dialog */}
      {showReassignDialog && previousExec && newExec && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          data-testid="reassign-it-executor-dialog"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                Change IT Executor?
              </h3>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">&ldquo;{previousName}&rdquo;</span>{" "}
                currently handles your IT Baseline checklist. Reassigning will:
              </p>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                <li>
                  Transfer the IT Baseline section from{" "}
                  <span className="font-medium">{previousName}</span> to{" "}
                  <span className="font-medium">{newName}</span>
                </li>
                <li>
                  Preserve all existing answers —{" "}
                  <span className="font-medium">{newName}</span> can edit them
                </li>
                <li>
                  Remove the IT Baseline section from{" "}
                  <span className="font-medium">{previousName}</span>&rsquo;s
                  checklist (Awareness items remain)
                </li>
              </ul>
              <label className="flex items-start gap-2 text-xs text-gray-700 pt-1">
                <input
                  type="checkbox"
                  checked={reassignAcknowledged}
                  onChange={(e) => setReassignAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  data-testid="reassign-acknowledge-checkbox"
                />
                <span>
                  I understand{" "}
                  <span className="font-medium">{newName}</span> will see{" "}
                  <span className="font-medium">{previousName}</span>&rsquo;s
                  existing IT Baseline answers.
                </span>
              </label>
              {reassignError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-800">{reassignError}</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={cancelReassign}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReassign}
                disabled={!reassignAcknowledged || saving}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                data-testid="reassign-it-executor-confirm"
              >
                {saving ? "Transferring..." : "Reassign IT Executor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link to GDPR/Data page */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <Link href="/workspace/settings/gdpr" className="text-sm text-gray-500 underline">
          Data &amp; Privacy (export, deletion)
        </Link>
      </div>
    </>
  );
}
