"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type OrgMember = {
  user_id: string;
  role: string;
  is_it_executor: boolean;
  manager_user_id: string | null;
  email: string | null;
  display_name: string | null;
};

export default function WorkspaceGdprPage() {
  const router = useRouter();
  const { token, userId, orgData, isAdmin } = useWorkspace();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { document.title = "Settings & Data | SMB Security Quick-Check"; }, []);

  useEffect(() => {
    if (!token || !isAdmin) return;
    apiFetch<{ members: OrgMember[] }>("/api/orgs/members", token)
      .then(({ members: list }) => setMembers(list))
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load.");
      });
  }, [token, isAdmin]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      const res = await fetch("/api/gdpr/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Export failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "org-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!token) return;
    if (!confirm("Remove this member from the organisation?")) return;
    setRemovingId(memberId);
    setRemoveError(null);
    try {
      await apiFetch(`/api/gdpr/members/${memberId}`, token, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleDeleteOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch("/api/gdpr/org", token, {
        method: "DELETE",
        body: JSON.stringify({ confirm_name: deleteConfirm }),
      });
      router.replace("/");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete organisation.");
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings & data</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      </>
    );
  }

  const hasDirectReports = orgData.membership.has_direct_reports;

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings & data</h1>

      {/* Data residency */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <h2 className="text-base font-semibold mb-1">Data storage</h2>
        <p className="text-sm text-gray-600">
          All data is stored in the <strong>EU (West EU — Ireland, AWS eu-west-1)</strong> region via Supabase.
          No personal data leaves the EU.
        </p>
      </section>

      {/* Self-deletion */}
      <SelfDeleteSection token={token} members={members} role={orgData.membership.role} hasDirectReports={hasDirectReports} />

      {!isAdmin && (
        <p className="mt-4 text-sm text-gray-500">
          Contact your org admin to export or manage other organisation data.
        </p>
      )}

      {isAdmin && (
        <>
          {/* Data export */}
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-1">Export data</h2>
            <p className="text-sm text-gray-500 mb-3">
              Download all organisation data as JSON (org, members, assessments, responses).
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-60"
            >
              {exporting ? "Exporting..." : "Download JSON export"}
            </button>
          </section>

          {/* Member management */}
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-3">Members</h2>

            {removeError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 mb-3">
                <p className="text-sm text-red-800">{removeError}</p>
              </div>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-gray-500">No members.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const isSelf = m.user_id === userId;
                  const isOtherAdmin = m.role === "org_admin" && !isSelf;
                  const canRemove = !isSelf && !isOtherAdmin;

                  return (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="text-xs text-gray-600">{m.display_name ?? m.email ?? `${m.user_id.slice(0, 12)}...`}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {m.role.replace("_", " ")}
                          {m.is_it_executor && " · IT executor"}
                          {isSelf && " · you"}
                        </p>
                      </div>
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id)}
                          disabled={removingId === m.user_id}
                          className="text-xs text-red-600 underline disabled:opacity-50"
                        >
                          {removingId === m.user_id ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Delete organisation */}
          <section className="rounded-xl border border-red-200 p-4">
            <h2 className="text-base font-semibold text-red-800 mb-1">Delete organisation</h2>
            <p className="text-sm text-gray-600 mb-4">
              This permanently deletes the organisation, all members, assessments, and responses.
              This cannot be undone.
            </p>

            <form onSubmit={handleDeleteOrg} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs text-gray-600">
                  Type <strong>{orgData.org.name}</strong> to confirm
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={orgData.org.name}
                />
              </div>

              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-sm text-red-800">{deleteError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={deleting || deleteConfirm !== orgData.org.name}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete organisation permanently"}
              </button>
            </form>
          </section>
        </>
      )}
    </>
  );
}

function SelfDeleteSection({
  token,
  members,
  role,
  hasDirectReports,
}: {
  token: string;
  members: OrgMember[];
  role: string;
  hasDirectReports: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === "org_admin";
  const otherMembers = members.filter((m) => m.role !== "org_admin");

  async function handleDeleteSelf() {
    if (!confirm("Permanently delete your account and all your data? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch("/api/gdpr/me", token, { method: "DELETE" });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-red-200 p-4">
      <h2 className="text-base font-semibold text-red-800 mb-1">Delete my account</h2>
      <p className="text-sm text-gray-600 mb-4">
        Permanently removes your membership, assessment responses, and login.
        This cannot be undone.
      </p>

      {isAdmin && otherMembers.length > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          You are the org admin and other members exist. Delete the organisation first.
        </p>
      )}
      {hasDirectReports && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          You have direct reports. Remove them before deleting your account.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 mb-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={handleDeleteSelf}
        disabled={deleting || (isAdmin && otherMembers.length > 0) || hasDirectReports}
        className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        title={(isAdmin && otherMembers.length > 0) || hasDirectReports ? "Resolve the warnings above before deleting" : undefined}
      >
        {deleting ? "Deleting..." : "Delete my account permanently"}
      </button>
    </section>
  );
}
