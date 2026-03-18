"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { apiFetch } from "@/lib/api/client";

type ItHandling = "self" | "staff_member" | "external_it" | "not_sure";

type FormState = {
  name: string;
  display_name: string;
  email_platform: string;
  primary_os: string;
  company_size: string;
  it_handling: ItHandling | "";
  it_person_email: string;
  it_person_name: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { token, loading: sessionLoading } = useSession();

  const [form, setForm] = useState<FormState>({
    name: "",
    display_name: "",
    email_platform: "",
    primary_os: "",
    company_size: "",
    it_handling: "",
    it_person_email: "",
    it_person_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !token) {
      router.replace("/login");
    }
  }, [sessionLoading, token, router]);

  // If user already has an org, skip onboarding
  useEffect(() => {
    if (!token) return;
    apiFetch("/api/orgs/me", token)
      .then(() => router.replace("/workspace"))
      .catch((e: unknown) => {
        // Only stay on onboarding for 404 (no org yet); re-throw anything else
        const status = (e as { status?: number }).status;
        if (status !== 404) throw e;
      });
  }, [token, router]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.name.trim()) { setError("Organisation name is required."); return; }
    if (!form.it_handling) { setError("Please select who handles IT."); return; }
    if (form.it_handling === "staff_member" && !form.it_person_email.trim()) {
      setError("Please enter the IT person's email."); return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/api/orgs", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          display_name: form.display_name.trim() || undefined,
          email_platform: form.email_platform || undefined,
          primary_os: form.primary_os || undefined,
          company_size: form.company_size || undefined,
          it_handling: form.it_handling,
          it_person_email: form.it_person_email.trim() || undefined,
          it_person_name: form.it_person_name.trim() || undefined,
        }),
      });
      router.replace("/workspace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (sessionLoading || !token) {
    return null;
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Set up your organisation</h1>
      <p className="mt-2 text-sm text-gray-600">
        Takes about 2 minutes. You can change everything later in Settings.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" autoComplete="off">

        {/* Org name */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Organisation name <span className="text-red-500">*</span></label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            type="text"
            required
            autoComplete="off"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Acme Ltd"
          />
        </div>

        {/* Display name */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Your name</label>
          <p className="text-xs text-gray-500">Shown to your team on the dashboard instead of your email.</p>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            type="text"
            autoComplete="off"
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            placeholder="Jane Smith"
          />
        </div>

        {/* Optional settings */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Optional — helps us show you the right instructions</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs text-gray-600">Email system</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.email_platform}
                onChange={(e) => set("email_platform", e.target.value)}
              >
                <option value="">Not sure</option>
                <option value="google_workspace">Google Workspace</option>
                <option value="microsoft_365">Microsoft 365</option>
                <option value="gmail_personal">Personal Gmail</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-600">Computers</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.primary_os}
                onChange={(e) => set("primary_os", e.target.value)}
              >
                <option value="">Not sure</option>
                <option value="windows">Windows</option>
                <option value="mac">Mac</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-600">Company size</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.company_size}
                onChange={(e) => set("company_size", e.target.value)}
              >
                <option value="">Not sure</option>
                <option value="1-5">1–5 people</option>
                <option value="6-20">6–20 people</option>
                <option value="21-50">21–50 people</option>
                <option value="50+">50+ people</option>
              </select>
            </div>
          </div>
        </div>

        {/* IT handling */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Who handles IT for your business? <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500">
            This determines who gets the IT security checklist assigned.
          </p>

          {(
            [
              { value: "self", label: "I do", sub: "You'll work through the IT checklist yourself." },
              { value: "staff_member", label: "A staff member", sub: "We'll send them an invite with the IT checklist assigned." },
              { value: "external_it", label: "An external IT company or consultant", sub: "We can send them an invite, or you can share the checklist with them." },
              { value: "not_sure", label: "Not sure yet", sub: "We'll assign it to you for now." },
            ] as { value: ItHandling; label: string; sub: string }[]
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${
                form.it_handling === opt.value ? "border-gray-800 bg-gray-50" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="it_handling"
                value={opt.value}
                checked={form.it_handling === opt.value}
                onChange={() => set("it_handling", opt.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.sub}</p>
              </div>
            </label>
          ))}
        </div>

        {/* IT person details */}
        {(form.it_handling === "staff_member" || form.it_handling === "external_it") && (
          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              {form.it_handling === "staff_member" ? "IT staff member details" : "IT company details (optional)"}
            </p>

            <div className="space-y-1">
              <label className="block text-xs text-gray-600">
                Email {form.it_handling === "staff_member" && <span className="text-red-500">*</span>}
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                type="email"
                required={form.it_handling === "staff_member"}
                value={form.it_person_email}
                onChange={(e) => set("it_person_email", e.target.value)}
                placeholder="it@company.com"
              />
            </div>

            {form.it_handling === "staff_member" && (
              <div className="space-y-1">
                <label className="block text-xs text-gray-600">Name (optional)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  type="text"
                  value={form.it_person_name}
                  onChange={(e) => set("it_person_name", e.target.value)}
                  placeholder="Alex Smith"
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-teal-700 text-white py-2.5 text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create organisation →"}
        </button>

        <p className="text-xs text-gray-400 text-center">
          We&apos;ll send occasional reminder emails when your security review is due for reassessment.
        </p>
      </form>
    </main>
  );
}
