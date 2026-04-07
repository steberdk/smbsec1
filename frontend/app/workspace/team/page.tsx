"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type Invite = {
  id: string;
  token: string;
  email: string;
  role: "employee";
  is_it_executor: boolean;
  created_at: string;
  expires_at: string;
};

type OrgMember = {
  user_id: string;
  role: string;
  is_it_executor: boolean;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

type InviteForm = {
  email: string;
  is_it_executor: boolean;
};

export default function WorkspaceTeamPage() {
  const { token, isAdmin } = useWorkspace();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<InviteForm>({ email: "", is_it_executor: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { document.title = "Team | SMB Security Quick-Check"; }, []);

  function loadData() {
    if (!token) return;
    Promise.all([
      apiFetch<{ invites: Invite[] }>("/api/invites", token)
        .then(({ invites: list }) => setInvites(list)),
      apiFetch<{ members: OrgMember[] }>("/api/orgs/members", token)
        .then(({ members: list }) => setMembers(list))
        .catch(() => {}), // non-fatal if user can't access members
    ]).catch((e: unknown) => {
      setLoadError(e instanceof Error ? e.message : "Failed to load team data.");
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await apiFetch("/api/invites", token, {
        method: "POST",
        body: JSON.stringify({ ...form, role: "employee" }),
      });
      setSubmitSuccess(`Invite sent to ${form.email}.`);
      setForm({ email: "", is_it_executor: false });
      loadData();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyLink(inviteToken: string, inviteId: string) {
    const link = `${window.location.origin}/accept-invite?token=${inviteToken}`;
    await navigator.clipboard.writeText(link);
    setCopied(inviteId);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleRevoke(inviteId: string) {
    if (!token) return;
    setRevoking(inviteId);
    try {
      await apiFetch(`/api/invites/${inviteId}`, token, { method: "DELETE" });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to revoke invite.");
    } finally {
      setRevoking(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">Access restricted</p>
        <p className="text-sm mt-1">Only org admins can manage the team.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>

      {/* Invite form */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-4">Invite a team member</h2>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs text-gray-600">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="colleague@company.com"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <input type="hidden" value="employee" />

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_it_executor}
                onChange={(e) => setForm((p) => ({ ...p, is_it_executor: e.target.checked }))}
              />
              <span>IT executor (handles IT baseline checklist)</span>
            </label>
          </div>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-800">{submitError}</p>
            </div>
          )}
          {submitSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2">
              <p className="text-sm text-green-800">{submitSuccess}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send invite"}
          </button>
        </form>
      </section>

      {/* Current members */}
      {members.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Team members</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium">
                    {m.display_name ?? m.email ?? `${m.user_id.slice(0, 8)}...`}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {m.role.replace("_", " ")}
                    {m.is_it_executor && " · IT executor"}
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Joined {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending invites */}
      <section>
        <h2 className="text-base font-semibold mb-3">Pending invites</h2>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 mb-3">
            <p className="text-sm text-red-800">{loadError}</p>
          </div>
        )}

        {invites.length === 0 ? (
          <p className="text-sm text-gray-500">No pending invites.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {invite.role}
                    {invite.is_it_executor && " · IT executor"}
                    {" · expires "}
                    {new Date(invite.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCopyLink(invite.token, invite.id)}
                    className="text-xs text-gray-500 underline"
                  >
                    {copied === invite.id ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={revoking === invite.id}
                    className="text-xs text-red-600 underline disabled:opacity-50"
                  >
                    {revoking === invite.id ? "Revoking..." : "Revoke"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
