"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type RemoveTarget =
  | { kind: "member"; member: OrgMember }
  | { kind: "invite"; invite: Invite };

export default function WorkspaceTeamPage() {
  const { token, orgData, isAdmin } = useWorkspace();
  const router = useRouter();
  const currentUserId = orgData.membership.user_id;

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<InviteForm>({ email: "", is_it_executor: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // F-033 — removal dialog state
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  // --- F-033 dialog lifecycle ---------------------------------------------

  function openRemoveMember(member: OrgMember) {
    setRemoveTarget({ kind: "member", member });
    setTypedConfirm("");
    setRemoveError(null);
  }

  function openRevokeInvite(invite: Invite) {
    setRemoveTarget({ kind: "invite", invite });
    setTypedConfirm("");
    setRemoveError(null);
  }

  function closeRemoveDialog() {
    if (removing) return;
    setRemoveTarget(null);
    setTypedConfirm("");
    setRemoveError(null);
  }

  function targetEmail(t: RemoveTarget): string {
    return t.kind === "member" ? (t.member.email ?? "") : t.invite.email;
  }

  function targetIsItExec(t: RemoveTarget): boolean {
    return t.kind === "member"
      ? t.member.is_it_executor
      : t.invite.is_it_executor;
  }

  const canConfirmTyped = (() => {
    if (!removeTarget) return false;
    if (removeTarget.kind === "invite") return true; // pending invites: one-line confirm
    return typedConfirm.trim().toLowerCase() === targetEmail(removeTarget).toLowerCase();
  })();

  async function handleConfirmRemove() {
    if (!token || !removeTarget) return;
    const email = targetEmail(removeTarget);
    if (!email) {
      setRemoveError("This member has no email address on record.");
      return;
    }
    setRemoving(true);
    setRemoveError(null);

    try {
      const res = await fetch(
        `/api/orgs/members?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // F-049 AC-2: migration/extension missing → non-jargon, retry-on-fix copy.
        if (res.status === 503 && body?.error === "migration_pending") {
          throw new Error(
            removeTarget.kind === "invite"
              ? "Revoke + delete data is temporarily unavailable — an administrator must apply a pending database migration. The invite is unchanged; retry once the migration is applied."
              : "Member deletion is temporarily unavailable — an administrator must apply a pending database migration. The member is unchanged; retry once the migration is applied."
          );
        }
        // F-049 AC-5 + INV-no-raw-db-errors: map unknown / 5xx / raw PG error
        // bodies to a safe user message. Never display raw Postgres strings
        // like "function digest(text, unknown) does not exist" or SQLSTATE
        // codes. Known app error codes (400s) are passed through verbatim
        // because they are app-defined ("cannot_remove_self" etc.).
        const raw = String(body?.error ?? "");
        const looksLikeRawDbError =
          /function\s+\S+\s*\(.*\)\s*does not exist/i.test(raw) ||
          /SQLSTATE/i.test(raw) ||
          /\brelation "/.test(raw) ||
          /column ".+" does not exist/i.test(raw);
        if (res.status >= 500 || looksLikeRawDbError || !raw) {
          throw new Error(
            removeTarget.kind === "invite"
              ? "Revoke + delete data failed — please retry. If the problem persists contact support. The invite is unchanged."
              : "Member deletion failed — please retry. If the problem persists contact support. The member is unchanged."
          );
        }
        throw new Error(raw);
      }

      const wasItExec = targetIsItExec(removeTarget);
      setActionSuccess(
        removeTarget.kind === "invite"
          ? `Invitation for ${email} revoked.`
          : `${email} removed from the team.`
      );
      setRemoveTarget(null);
      setTypedConfirm("");
      loadData();

      // If the removed member was the IT Executor, send owner back to the
      // workspace home so the "Invite your IT Executor" guided step re-appears.
      if (wasItExec) {
        setTimeout(() => router.push("/workspace"), 400);
      }
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : "Failed to remove.");
    } finally {
      setRemoving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">Access restricted</p>
        <p className="text-sm mt-1">Only the organisation owner can manage the team.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>

      {actionSuccess && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-sm text-green-800">{actionSuccess}</p>
        </div>
      )}

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
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              return (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {m.display_name ?? m.email ?? `${m.user_id.slice(0, 8)}...`}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {m.role === "org_admin" ? "Owner" : m.role.replace("_", " ")}
                      {m.is_it_executor && " · IT Executor"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400">
                      Joined {new Date(m.created_at).toLocaleDateString()}
                    </p>
                    {!isSelf && m.email && (
                      <button
                        onClick={() => openRemoveMember(m)}
                        className="text-xs text-red-600 underline hover:text-red-700"
                        data-testid={`remove-member-${m.user_id}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                    {invite.is_it_executor && " · IT Executor"}
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
                    className="text-xs text-gray-500 underline disabled:opacity-50"
                  >
                    {revoking === invite.id ? "Revoking..." : "Revoke"}
                  </button>
                  <button
                    onClick={() => openRevokeInvite(invite)}
                    className="text-xs text-red-600 underline"
                    data-testid={`revoke-delete-invite-${invite.id}`}
                  >
                    Revoke + delete data
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* F-033 — Remove member / Revoke invite dialog */}
      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          data-testid="remove-member-dialog"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {removeTarget.kind === "invite"
                  ? `Revoke invitation for ${targetEmail(removeTarget)}?`
                  : `Remove ${targetEmail(removeTarget)} from the team?`}
              </h3>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-700">
              {removeTarget.kind === "invite" ? (
                <>
                  <p className="font-medium text-red-700">
                    This cannot be undone.
                  </p>
                  <p>
                    This will permanently delete the pending invite AND every
                    record the invitee&apos;s email appears in (audit log
                    entries, any partial assessment responses). The invitee
                    cannot join using the existing link.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-red-700">
                    This cannot be undone.
                  </p>
                  <p>The following will be permanently deleted:</p>
                  <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                    <li>All assessment responses this person submitted</li>
                    <li>All campaign records referencing this person</li>
                    <li>All invites sent to this email</li>
                    <li>
                      All references to this person in the audit log (name and
                      email are replaced with an anonymous identifier)
                    </li>
                  </ul>
                  {targetIsItExec(removeTarget) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-xs text-amber-800">
                        Removing the IT Executor will require you to assign a
                        new IT Executor afterwards.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Type{" "}
                      <span className="font-mono text-gray-900">
                        {targetEmail(removeTarget)}
                      </span>{" "}
                      to confirm
                    </label>
                    <input
                      type="text"
                      value={typedConfirm}
                      onChange={(e) => setTypedConfirm(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      autoComplete="off"
                      data-testid="remove-member-typed-confirm"
                    />
                  </div>
                </>
              )}

              {removeError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-800">{removeError}</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={closeRemoveDialog}
                disabled={removing}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={!canConfirmTyped || removing}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                data-testid="remove-member-confirm"
              >
                {removing
                  ? "Working..."
                  : removeTarget.kind === "invite"
                  ? "Revoke"
                  : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
