"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";

type OrgMe = {
  org: { id: string; name: string };
  membership: { role: string; user_id?: string; has_direct_reports: boolean };
};

type OrgMember = {
  user_id: string;
  role: string;
  is_it_executor: boolean;
  manager_user_id: string | null;
};

export default function WorkspaceGdprPage() {
  const router = useRouter();
  const { token, userId, loading: sessionLoading } = useSession();

  const [orgMe, setOrgMe] = useState<OrgMe | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Delete member state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Delete org state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { document.title = "Settings & Data | SMB Security Quick-Check"; }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<OrgMe>("/api/orgs/me", token)
      .then(async (me) => {
        setOrgMe(me);
        if (me.membership.role === "org_admin") {
          const { members: list } = await apiFetch<{ members: OrgMember[] }>("/api/orgs/members", token);
          setMembers(list);
        }
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load.");
      });
  }, [token]);

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
    if (!token || !orgMe) return;
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

  if (!orgMe) {
    return <PageShell><p className="text-sm text-gray-600">Loading…</p></PageShell>;
  }

  const isAdmin = orgMe.membership.role === "org_admin";

  return (
    <PageShell>
      {/* Data residency */}
      <section className="mb-8 rounded-xl border border-gray-200 px-4 py-4">
        <h2 className="text-base font-semibold mb-1">Data storage</h2>
        <p className="text-sm text-gray-600">
          All data is stored in the <strong>EU (West EU — Ireland, AWS eu-west-1)</strong> region via Supabase.
          No personal data leaves the EU.
        </p>
      </section>

      {/* Self-deletion */}
      <SelfDeleteSection token={token!} members={members} role={orgMe.membership.role} hasDirectReports={orgMe.membership.has_direct_reports} />

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
          {exporting ? "Exporting…" : "Download JSON export"}
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
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-mono text-gray-600">{m.user_id.slice(0, 12)}…</p>
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
                      {removingId === m.user_id ? "Removing…" : "Remove"}
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
                  Type <strong>{orgMe.org.name}</strong> to confirm
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={orgMe.org.name}
                />
              </div>

              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-sm text-red-800">{deleteError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={deleting || deleteConfirm !== orgMe.org.name}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete organisation permanently"}
              </button>
            </form>
          </section>
        </>
      )}
    </PageShell>
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
        className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        {deleting ? "Deleting…" : "Delete my account permanently"}
      </button>
    </section>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Settings & data</h1>
        <Link href="/workspace" className="text-sm text-gray-500 underline">
          Back
        </Link>
      </div>
      {children}
    </main>
  );
}
