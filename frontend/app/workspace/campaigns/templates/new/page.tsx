"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

const TYPE_OPTIONS = [
  { value: "phishing_email", label: "Phishing email" },
  { value: "fake_invoice", label: "Fake invoice" },
  { value: "credential_harvest", label: "Credential harvest" },
  { value: "ceo_fraud", label: "CEO / authority fraud" },
  { value: "knowledge_test", label: "Knowledge test" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const LOCALE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "da", label: "Dansk" },
];

export default function CreateCustomTemplatePage() {
  const { token, isAdmin } = useWorkspace();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [type, setType] = useState("phishing_email");
  const [difficulty, setDifficulty] = useState("medium");
  const [locale, setLocale] = useState("en");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    document.title = "Create Custom Template | SMB Security Quick-Check";
  }, []);

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">Only organisation admins can create templates.</p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!token || submitting) return;

    if (!title.trim()) { setError("Template name is required."); return; }
    if (!subject.trim()) { setError("Subject line is required."); return; }
    if (!bodyHtml.trim()) { setError("Email body is required."); return; }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/api/campaigns/templates/custom", token, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          preview_text: previewText.trim(),
          body_html: bodyHtml.trim(),
          type,
          difficulty,
          locale,
        }),
      });
      router.push("/workspace/campaigns/templates");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create template.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Render preview with placeholder values */
  function renderPreview(): string {
    return bodyHtml
      .replace(/\{\{tracking_url\}\}/g, "#")
      .replace(/\{\{CLICK_URL\}\}/g, "#")
      .replace(/\{\{REPORT_URL\}\}/g, "#")
      .replace(/\{\{RECIPIENT_NAME\}\}/g, "Employee")
      .replace(/\{\{SENDER_NAME\}\}/g, "Manager");
  }

  return (
    <>
      <Link
        href="/workspace/campaigns/templates"
        className="text-xs text-teal-700 hover:underline mb-4 inline-block"
      >
        &larr; Back to templates
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create Custom Template
      </h1>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        {/* Template name */}
        <div>
          <label className="block text-sm font-medium mb-1">Template name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fake IT Support Request"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
          />
        </div>

        {/* Subject line */}
        <div>
          <label className="block text-sm font-medium mb-1">Email subject line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Urgent: IT Security Update Required"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
          />
        </div>

        {/* Preview text */}
        <div>
          <label className="block text-sm font-medium mb-1">Preview text (optional)</label>
          <p className="text-xs text-gray-500 mb-1">
            Shows in email clients next to the subject line.
          </p>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="e.g. Action needed before end of day"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
          />
        </div>

        {/* Email body */}
        <div>
          <label className="block text-sm font-medium mb-1">Email body (HTML)</label>
          <p className="text-xs text-gray-500 mb-1">
            Use these placeholders: <code className="bg-gray-100 px-1 rounded text-xs">{"{{RECIPIENT_NAME}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">{"{{CLICK_URL}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">{"{{REPORT_URL}}"}</code>,{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">{"{{SENDER_NAME}}"}</code>
          </p>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={12}
            placeholder={'<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">\n  <p>Hi {{RECIPIENT_NAME}},</p>\n  <p>Your message here...</p>\n  <p><a href="{{CLICK_URL}}">Click here</a></p>\n  <p style="font-size: 12px;">Report suspicious: <a href="{{REPORT_URL}}">Report</a></p>\n</div>'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
          />
        </div>

        {/* Type, difficulty, locale */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
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
        </div>

        {/* Preview toggle */}
        {bodyHtml.trim() && (
          <div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-teal-700 hover:underline"
            >
              {showPreview ? "Hide preview" : "Show email preview"}
            </button>

            {showPreview && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Subject:</span> {subject || "(no subject)"}
                  </p>
                </div>
                <div
                  className="px-4 py-4 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: renderPreview() }}
                />
              </div>
            )}
          </div>
        )}

        {/* Hint box */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> Make the email look realistic but include subtle red flags
            (misspelled sender domain, urgency, unusual request). The goal is to test
            whether employees recognise social engineering patterns.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Link
            href="/workspace/campaigns/templates"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-teal-700 text-white px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create template"}
          </button>
        </div>
      </div>
    </>
  );
}
