import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load .env.local for the Playwright test process (Next.js loads it for the
// dev server automatically, but the test runner process needs it too for the
// Supabase service-role client used in test fixtures).
const envFile = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Run test files sequentially — all tests share a single Supabase instance
  // and some spec files depend on state created by others.
  fullyParallel: false,

  // Fail fast in CI (no retries locally)
  retries: process.env.CI ? 2 : 0,
  // Single worker: tests share a live Supabase instance; parallel runs would conflict.
  workers: 1,

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Important: Start Next.js automatically for E2E tests.
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
