import Link from "next/link";
import type { Metadata } from "next";
import { AuthAwareCTA, AuthAwareHeaderLinks } from "@/components/AuthAwareCTA";

export const metadata: Metadata = {
  title: "Security Checklist for Small Business",
  openGraph: {
    title: "Find your biggest cyber risks in 30 minutes",
    description: "A practical security checklist for small businesses. Free, no sign-up required to browse.",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Header bar */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center">
          <span className="text-teal-700 font-bold text-sm tracking-tight">smbsec</span>
        </div>
      </header>

      {/* Hero section with gradient */}
      <section className="hero-gradient border-b border-gray-200/40">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <AuthAwareCTA />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Find your biggest cyber risks in 30 minutes
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">
            A practical checklist for small and medium-sized businesses.
            No enterprise complexity. Just the highest-impact steps.
          </p>

          <AuthAwareHeaderLinks />
        </div>
      </section>

      {/* Attack cards */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-gray-900">How SMBs actually get breached</h2>
        <p className="mt-2 text-sm text-gray-500">
          These five attacks cause the vast majority of incidents at small businesses.
          Every item on the checklist targets at least one of them.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          {[
            {
              title: "Phishing email",
              detail: "Employee clicks a fake invoice or login link. Accounts and data follow.",
              stat: "~80% of breaches start here",
              accent: "border-l-red-400",
            },
            {
              title: "Stolen or reused password",
              detail: "One leaked password opens every service that shares it.",
              stat: "#1 account takeover method",
              accent: "border-l-orange-400",
            },
            {
              title: "Unpatched software",
              detail: "Attackers scan for known holes automatically — within hours of public disclosure.",
              stat: "Exploited at internet scale",
              accent: "border-l-amber-400",
            },
            {
              title: "Ransomware",
              detail: "Encrypts your files and demands payment. Often arrives via email.",
              stat: "Avg SMB downtime: 3–5 days",
              accent: "border-l-purple-400",
            },
            {
              title: "Fake invoice / CEO fraud",
              detail: "Attacker impersonates a supplier or executive to redirect payments.",
              stat: "Highest financial loss per incident",
              accent: "border-l-blue-400",
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm border-l-4 ${item.accent} card-hover`}
            >
              <p className="font-semibold text-sm text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-600 mt-1.5">{item.detail}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium">{item.stat}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why this checklist */}
      <section className="bg-white border-y border-gray-200/60">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-gray-900">Why this checklist</h2>
          <ul className="mt-4 space-y-3">
            {[
              "Covers the fixes that block the attacks above.",
              "No enterprise tools or IT degree required.",
              "Takes 30 minutes to identify your gaps — then fix them at your own pace.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3 text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold mt-0.5">&#10003;</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-bold text-gray-900">Why trust this tool</h2>
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          {[
            { title: "EU data residency", desc: "All data stored in Ireland (AWS eu-west-1). No data leaves the EU.", icon: "\uD83C\uDDEA\uD83C\uDDFA" },
            { title: "No tracking, no ads", desc: "No analytics cookies, no third-party tracking scripts, no advertising.", icon: "\uD83D\uDEE1\uFE0F" },
            { title: "Free for small teams", desc: "The security checklist and team dashboard are completely free. No credit card required.", icon: "\uD83C\uDD93" },
            { title: "Open checklist", desc: "Browse every item before signing up. No gated content.", icon: "\uD83D\uDD13" },
            { title: "Delete anytime", desc: "One-click account deletion. Hard delete — no soft flags, no data retention.", icon: "\uD83D\uDDD1\uFE0F" },
            { title: "Magic link login", desc: "No passwords stored. Sign in via email link — one less credential to worry about.", icon: "\u2728" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm card-hover">
              <div className="text-xl mb-2">{item.icon}</div>
              <p className="font-semibold text-sm text-gray-900">{item.title}</p>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400 text-center">
          *Security checklist and team dashboard are always free. Some advanced features (e.g. phishing campaigns) require a paid plan.
        </p>
      </section>

      {/* CTA band */}
      <section className="bg-teal-700">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-lg font-semibold text-white">Ready to find your security gaps?</p>
          <p className="text-teal-100 text-sm mt-1">Free for small teams. No credit card required.</p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-white text-teal-700 font-semibold shadow-sm hover:shadow-md transition-all"
          >
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200/60 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-2 text-sm text-gray-500">
          <p>Your data stays in the EU. No tracking, no ads. Free for small teams.</p>
          <div className="flex gap-4 text-xs">
            <Link href="/privacy" className="underline hover:text-gray-700">Privacy policy</Link>
            <Link href="/checklist" className="underline hover:text-gray-700">Browse checklist</Link>
            <Link href="/login" className="underline hover:text-gray-700">Log in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
