"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";

type OrgMe = {
  org: {
    id: string;
    name: string;
    email_platform: string | null;
    primary_os: string | null;
  };
  membership: {
    user_id: string;
    role: string;
    is_it_executor: boolean;
  };
};

type MemberInfo = {
  user_id: string;
  email: string | null;
  role: string;
  is_it_executor: boolean;
};

const PLATFORM_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "microsoft_365", label: "Microsoft 365" },
  { value: "gmail_personal", label: "Gmail (Personal)" },
  { value: "other", label: "Other" },
];

export default function OrgSettingsPage() {
  const router = useRouter();
  const { token, loading: sessionLoading } = useSession();
  const [orgMe, setOrgMe] = useState<OrgMe | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [platform, setPlatform] = useState("");
  const [executor, setExecutor] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { document.title = "Org Settings | SMB Security Quick-Check"; }, []);

  useEffect(() => {
    if (!sessionLoading && !token) router.replace("/login");
  }, [sessionLoading, token, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<OrgMe>("/api/orgs/me", token),
      apiFetch<{ members: MemberInfo[] }>("/api/dashboard", token),
    ])
      .then(([orgData, dashData]) => {
        setOrgMe(orgData);
        setPlatform(orgData.org.email_platform ?? "");
        const currentExecutor = dashData.members.find((m) => m.is_it_executor);
        setExecutor(currentExecutor?.user_id ?? orgData.membership.user_id);
        setMembers(dashData.members);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load settings.");
      });
  }, [token]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiFetch("/api/orgs/me", token, {
        method: "PATCH",
        body: JSON.stringify({
          email_platform: platform || null,
        }),
      });
      await apiFetch("/api/orgs/executor", token, {
        method: "PUT",
        body: JSON.stringify({ user_id: executor }),
      });
      setSaveMsg("Settings saved.");
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (sessionLoading || !token) return null;

  if (loadError) {
    return (
      <PageShell>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      </PageShell>
    );
  }

  if (!orgMe) {
    return <PageShell><p className="text-sm text-gray-600">Loading...</p></PageShell>;
  }

  const isAdmin = orgMe.membership.role === "org_admin";

  if (!isAdmin) {
    return (
      <PageShell>
        <p className="text-sm text-gray-600">Only organisation admins can change settings.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
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
                {m.email ?? m.user_id.slice(0, 8) + "..."} ({m.role.replace("_", " ")})
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

      {/* Link to GDPR/Data page */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <Link href="/workspace/settings/gdpr" className="text-sm text-gray-500 underline">
          Settings & data (export, deletion)
        </Link>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Org Settings</h1>
        <Link href="/workspace" className="text-sm text-gray-500 underline">Back</Link>
      </div>
      {children}
    </main>
  );
}
