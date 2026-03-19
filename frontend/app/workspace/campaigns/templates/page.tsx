"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type CustomTemplate = {
  id: string;
  title: string;
  type: string;
  subject: string;
  difficulty: string;
  locale: string;
  created_at: string;
};

export default function TemplateManagementPage() {
  const { token, isAdmin } = useWorkspace();
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Campaign Templates | SMB Security Quick-Check";
  }, []);

  useEffect(() => {
    if (!token) return;
    loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function loadTemplates() {
    if (!token) return;
    apiFetch<{ templates: CustomTemplate[] }>("/api/campaigns/templates/custom", token)
      .then(({ templates: list }) => setTemplates(list))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load templates."))
      .finally(() => setLoading(false));
  }

  async function handleDelete(id: string) {
    if (!token || deleting) return;
    const confirmed = window.confirm("Delete this custom template? This cannot be undone.");
    if (!confirmed) return;

    setDeleting(id);
    try {
      await apiFetch(`/api/campaigns/templates/custom/${id}`, token, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete template.");
    } finally {
      setDeleting(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">Only organisation admins can manage templates.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Loading templates...</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create your own campaign email templates. System templates are always available.
          </p>
        </div>
        <Link
          href="/workspace/campaigns/templates/new"
          className="rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all"
        >
          Create template
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 shadow-sm text-center">
          <p className="text-gray-500 text-sm">
            No custom templates yet. Create one to design your own security test emails.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Subject: {t.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 capitalize">
                      {t.type.replace("_", " ")}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      t.difficulty === "easy" ? "bg-green-100 text-green-800" :
                      t.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {t.difficulty}
                    </span>
                    {t.locale !== "en" && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">
                        {t.locale}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                >
                  {deleting === t.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/workspace/campaigns"
          className="text-sm text-teal-700 hover:underline"
        >
          Back to campaigns
        </Link>
      </div>
    </>
  );
}
