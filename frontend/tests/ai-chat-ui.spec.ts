/**
 * F-031 (PI 15 Iter 2) — AI chat UI end-to-end coverage.
 *
 * Drives the per-item chat panel inside /workspace/checklist. Every test
 * mocks `/api/guidance/chat` via `page.route` so Anthropic is never
 * called and the tests run without migrations 023/026 — the chat backend
 * is covered by `tests/ai-chat.spec.ts`. This spec is strictly UI plumbing:
 * selectors, event handlers, state transitions.
 *
 * Because the backend is mocked, these tests do NOT require migrations
 * 023 or 026. They only need the normal assessment fixture to exist so
 * the checklist page renders items.
 *
 * Locked UX decisions (pi14/round2_ux_designer.md §3):
 *   - No auto-first-message on panel expand.
 *   - "Start chat" button triggers the first call.
 *   - Chat state is client-only `useState` (no DB persistence).
 *   - Request body is strictly { item_id, history, message } — NO
 *     title/description/why/steps (Security R2 §10 fix).
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import { setupCanonicalStefanFixture } from "./helpers/multiUser";

/**
 * Open `/workspace/checklist`, wait for it to hydrate, and click "Help me
 * do this" on the first visible checklist item. Returns a locator scoped to
 * that item's chat panel.
 */
async function openFirstChatPanel(page: Page) {
  await page.goto("/workspace/checklist");
  await expect(
    page.getByRole("heading", { name: /IT baseline|Security Awareness/i }).first()
  ).toBeVisible({ timeout: 15_000 });

  // First item is expanded and "Help me do this" is revealed; the checklist
  // currently shows titles as buttons, so click the first title button to
  // expand it, then click the "Help me do this" link inside that card.
  // The item container has id="item-{uuid}"; we simply grab the first one.
  const firstItemBtn = page
    .locator('[id^="item-"] button.text-left')
    .first();
  await firstItemBtn.click();

  const helpBtn = page.getByRole("button", { name: "Help me do this" }).first();
  await helpBtn.click();

  return page;
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type ChatRequestBody = {
  item_id: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
};

/**
 * Install a `/api/guidance/chat` mock that responds with a deterministic
 * assistant reply and low-remaining counters. Also captures every request
 * body in `captured`.
 */
function installChatMock(
  page: Page,
  opts: {
    reply?: (req: ChatRequestBody) => string;
    status?: number;
    errorBody?: unknown;
    remaining?: { item: number; user: number; org: number };
  } = {},
  captured: ChatRequestBody[] = []
): ChatRequestBody[] {
  const status = opts.status ?? 200;
  const replyFn =
    opts.reply ??
    ((req) =>
      `Assistant reply #${captured.length + 1} for: ${req.message.slice(0, 40)}`);
  const remaining = opts.remaining ?? { item: 19, user: 59, org: 299 };

  void page.route("**/api/guidance/chat", async (route: Route) => {
    const body = route.request().postDataJSON() as ChatRequestBody;
    captured.push(body);
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(opts.errorBody ?? { error: "mocked_error" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: replyFn(body),
        remaining,
      }),
    });
  });

  return captured;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("F-031 — AI chat UI", () => {
  test("E2E-CHATUI-01 (F-031): panel opens with Start chat card and no AI call fires", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    const fixture = await setupCanonicalStefanFixture(browser);
    try {
      const page = fixture.owner.page;
      const captured = installChatMock(page);

      await openFirstChatPanel(page);

      // Start card visible.
      await expect(
        page.getByTestId("ai-chat-start-card").first()
      ).toBeVisible();
      await expect(
        page.getByTestId("ai-chat-start").first()
      ).toBeVisible();

      // No chat POST has fired yet — clicking "Help me do this" must NOT
      // auto-call Anthropic (UX R2 §4 LOCKED fold).
      expect(captured.length).toBe(0);

      // No chat history rendered yet.
      await expect(page.getByTestId("ai-chat-history")).toHaveCount(0);
    } finally {
      await fixture.cleanup();
    }
  });

  test("E2E-CHATUI-02 (F-031): Start chat fires first AI call and shows assistant reply", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    const fixture = await setupCanonicalStefanFixture(browser);
    try {
      const page = fixture.owner.page;
      const captured = installChatMock(page);

      await openFirstChatPanel(page);
      await page.getByTestId("ai-chat-start").first().click();

      // The first assistant reply must render.
      await expect(
        page.getByTestId("ai-chat-msg-assistant").first()
      ).toBeVisible({ timeout: 10_000 });

      expect(captured.length).toBeGreaterThanOrEqual(1);
      // First call must carry an empty history (it's the first turn).
      expect(captured[0].history).toEqual([]);
    } finally {
      await fixture.cleanup();
    }
  });

  test("E2E-CHATUI-03 (F-031): follow-up message grows chat history", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    const fixture = await setupCanonicalStefanFixture(browser);
    try {
      const page = fixture.owner.page;
      const captured = installChatMock(page);

      await openFirstChatPanel(page);
      await page.getByTestId("ai-chat-start").first().click();
      await expect(
        page.getByTestId("ai-chat-msg-assistant").first()
      ).toBeVisible({ timeout: 10_000 });

      // Type a follow-up and send.
      const input = page.getByTestId("ai-chat-input").first();
      await input.fill("How does this work for Microsoft 365?");
      await page.getByTestId("ai-chat-send").first().click();

      // Wait until 2 assistant replies are visible.
      await expect(page.getByTestId("ai-chat-msg-assistant")).toHaveCount(2, {
        timeout: 10_000,
      });
      await expect(page.getByTestId("ai-chat-msg-user")).toHaveCount(2);

      // The second POST must have carried the previous exchange in history.
      expect(captured.length).toBe(2);
      expect(captured[1].history.length).toBe(2);
      expect(captured[1].history[0].role).toBe("user");
      expect(captured[1].history[1].role).toBe("assistant");
    } finally {
      await fixture.cleanup();
    }
  });

  test("E2E-CHATUI-04 (F-031): Clear chat wipes history and re-shows Start card", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    const fixture = await setupCanonicalStefanFixture(browser);
    try {
      const page = fixture.owner.page;
      installChatMock(page);

      await openFirstChatPanel(page);
      await page.getByTestId("ai-chat-start").first().click();
      await expect(
        page.getByTestId("ai-chat-msg-assistant").first()
      ).toBeVisible({ timeout: 10_000 });

      // Clear chat.
      await page.getByTestId("ai-chat-clear").first().click();

      // History gone, Start card back.
      await expect(page.getByTestId("ai-chat-history")).toHaveCount(0);
      await expect(
        page.getByTestId("ai-chat-start-card").first()
      ).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });

  test("E2E-CHATUI-05 (F-031): 429 rate-limit renders friendly error", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    const fixture = await setupCanonicalStefanFixture(browser);
    try {
      const page = fixture.owner.page;
      const resetAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      installChatMock(page, {
        status: 429,
        errorBody: {
          error: "rate_limited",
          scope: "guidance:item:whatever",
          reset_at: resetAt,
          remaining_today: 0,
        },
      });

      await openFirstChatPanel(page);
      await page.getByTestId("ai-chat-start").first().click();

      const errEl = page.getByTestId("ai-chat-error").first();
      await expect(errEl).toBeVisible({ timeout: 10_000 });
      await expect(errEl).toContainText(/rate limit/i);
    } finally {
      await fixture.cleanup();
    }
  });

  test("E2E-CHATUI-06 (F-031): client body only carries item_id, history, message", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    const fixture = await setupCanonicalStefanFixture(browser);
    try {
      const page = fixture.owner.page;
      const captured = installChatMock(page);

      await openFirstChatPanel(page);
      await page.getByTestId("ai-chat-start").first().click();
      await expect(
        page.getByTestId("ai-chat-msg-assistant").first()
      ).toBeVisible({ timeout: 10_000 });

      expect(captured.length).toBeGreaterThanOrEqual(1);
      const body = captured[0] as Record<string, unknown>;
      const keys = Object.keys(body).sort();
      expect(keys).toEqual(["history", "item_id", "message"]);
      // Explicit belt-and-braces: fields the client is no longer allowed to
      // send (Security R2 §10 — server looks these up by item_id).
      expect(body).not.toHaveProperty("item_title");
      expect(body).not.toHaveProperty("item_description");
      expect(body).not.toHaveProperty("item_why");
      expect(body).not.toHaveProperty("item_steps");
    } finally {
      await fixture.cleanup();
    }
  });

  test("E2E-CHATUI-07 (F-031): chat panel fits 360×640 mobile viewport", async ({
    browser,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    const fixture = await setupCanonicalStefanFixture(browser);
    try {
      const page = fixture.owner.page;
      installChatMock(page);

      // Re-size to smallest supported mobile viewport.
      await page.setViewportSize({ width: 360, height: 640 });

      await openFirstChatPanel(page);
      await page.getByTestId("ai-chat-start").first().click();

      const input = page.getByTestId("ai-chat-input").first();
      await expect(input).toBeVisible({ timeout: 10_000 });

      // The input must sit inside the viewport horizontally.
      const box = await input.boundingBox();
      expect(box, "input should have a bounding box").not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(360 + 1);
      }

      // No horizontal scroll on the page either.
      const noHScroll = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      );
      expect(noHScroll).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });
});
