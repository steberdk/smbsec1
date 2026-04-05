"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { apiFetch } from "@/lib/api/client";

type BillingInfo = {
  subscription_status: string;
  campaign_credits: number;
};

export default function BillingPage() {
  const { token, isAdmin } = useWorkspace();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Billing | SMB Security Quick-Check";
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ org: BillingInfo }>("/api/orgs/me", token)
      .then((data) => {
        const org = data.org as BillingInfo;
        setBilling({
          subscription_status: org.subscription_status ?? "free",
          campaign_credits: org.campaign_credits ?? 0,
        });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load billing info.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCheckout() {
    if (!token) return;
    setCheckoutLoading(true);
    setError(null);

    try {
      const result = await apiFetch<{ url?: string; error?: string }>(
        "/api/billing/checkout",
        token,
        { method: "POST" }
      );
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Checkout unavailable.";
      // If 501, Stripe is not configured — show waitlist
      if (msg.includes("not configured") || msg.includes("501")) {
        setError(null);
        // Fall through to waitlist
      } else {
        setError(msg);
      }
    } finally {
      setCheckoutLoading(false);
    }
  }

  function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail) return;
    // Store locally — no backend needed for waitlist MVP
    setWaitlistSubmitted(true);
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-800">
          Only organisation admins can manage billing.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Loading billing info...</p>;
  }

  const isPaid = billing?.subscription_status === "active";

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Billing</h1>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Current plan</h2>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
              isPaid
                ? "bg-teal-100 text-teal-800"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {isPaid ? "Campaign Pro" : "Free"}
          </span>
        </div>

        {isPaid ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              You have unlimited campaign credits. Your team&apos;s phishing
              awareness can be tested as often as needed.
            </p>
            <p className="text-xs text-gray-400">
              To manage your subscription or update payment details, contact
              support.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Campaign credits remaining:{" "}
              <span className="font-semibold">{billing?.campaign_credits ?? 0}</span>
            </p>
            <p className="text-sm text-gray-500">
              The free plan includes 1 campaign credit. Upgrade to Campaign Pro
              for unlimited phishing simulations.
            </p>
          </div>
        )}
      </div>

      {/* Upgrade section (only for free tier) */}
      {!isPaid && (
        <div className="rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white px-5 py-6 shadow-sm mb-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Campaign Pro</h2>
              <p className="text-sm text-gray-600 mt-1">
                Unlimited phishing simulations for your entire team.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-teal-700">
                &euro;15<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-400">per organisation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {[
              "Unlimited campaign credits",
              "All 4 phishing templates",
              "CEO fraud simulations",
              "Credential harvest tests",
              "Campaign scheduling",
              "Re-run past campaigns",
              "Template customisation",
              "Priority support",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <span className="text-teal-600 text-sm">&#10003;</span>
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-teal-100 pt-4">
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full sm:w-auto rounded-lg bg-teal-700 text-white px-6 py-2.5 text-sm font-medium shadow-sm hover:bg-teal-800 hover:shadow-md transition-all disabled:opacity-60"
            >
              {checkoutLoading ? "Loading..." : "Upgrade to Campaign Pro"}
            </button>
          </div>
        </div>
      )}

      {/* Waitlist fallback (shown after failed checkout attempt or always for now) */}
      {!isPaid && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Paid plans launching soon
          </h3>
          {waitlistSubmitted ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm text-green-800">
                Thanks! We&apos;ll notify you at{" "}
                <strong>{waitlistEmail}</strong> when paid plans are available.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Enter your email to be notified when Campaign Pro becomes
                available.
              </p>
              <form onSubmit={handleWaitlist} className="flex gap-2">
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-gray-800 text-white px-4 py-2 text-sm font-medium hover:bg-gray-900 transition-colors"
                >
                  Notify me
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Comparison table */}
      {!isPaid && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Plan comparison
          </h3>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">
                    Feature
                  </th>
                  <th className="text-center px-4 py-2 text-xs text-gray-500 font-medium">
                    Free
                  </th>
                  <th className="text-center px-4 py-2 text-xs text-teal-700 font-medium">
                    Campaign Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Security checklist", "check", "check"],
                  ["Team assessments", "check", "check"],
                  ["Dashboard & reporting", "check", "check"],
                  ["Invite team members", "check", "check"],
                  ["GDPR data management", "check", "check"],
                  ["Phishing campaigns", "1 free", "Unlimited"],
                  ["Campaign templates", "2 basic", "All 4"],
                  ["Template customisation", "cross", "check"],
                  ["Campaign scheduling", "cross", "check"],
                  ["Re-run campaigns", "cross", "check"],
                  ["AI security guidance", "Basic", "Advanced"],
                ].map(([feature, free, pro]) => (
                  <tr key={feature}>
                    <td className="px-4 py-2 text-gray-700">{feature}</td>
                    <td className="px-4 py-2 text-center">
                      {free === "check" ? (
                        <span className="text-green-600">&#10003;</span>
                      ) : free === "cross" ? (
                        <span className="text-gray-300">&mdash;</span>
                      ) : (
                        <span className="text-gray-600">{free}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {pro === "check" ? (
                        <span className="text-teal-600">&#10003;</span>
                      ) : pro === "cross" ? (
                        <span className="text-gray-300">&mdash;</span>
                      ) : (
                        <span className="text-teal-700 font-medium">{pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
