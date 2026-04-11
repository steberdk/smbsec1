import type { NextConfig } from "next";

// Global baseline CSP (applied to all routes).
const baselineCsp = [
  "default-src 'self'",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} https://*.supabase.co`,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

// F-012 PI 14 Iter 1 — tighter CSP on /workspace/checklist.
// Removes 'unsafe-eval', narrows connect-src to Supabase + Anthropic, and
// keeps 'unsafe-inline' for Tailwind-generated utility styles.
const checklistCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co https://api.anthropic.com",
  "img-src 'self' data:",
  "font-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Tighter CSP on /workspace/checklist (F-012).
        // Must come first — Next.js matches headers in order and the global
        // rule below would otherwise override it.
        source: "/workspace/checklist",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: checklistCsp },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: baselineCsp },
        ],
      },
    ];
  },
};

export default nextConfig;
