# PI 15 Test Results

## Theme
"AI conversation and mobile"

## Iteration 1 — F-012 remainder + F-031 backend
- CI run 24295901401: 98 passed, 25 skipped (migration-gated)
- Commit: 8b1a612

## Iteration 2 — F-031 chat UI + F-009 mobile audit
- CI run 24296500724: 107 passed, 25 skipped (migration-gated)
- Commit: 9abe854

## Features delivered
- F-012 (chat hardening): server-side item lookup, hardened 4-block system prompt, output filter (5 heuristics), flag logging, 3-tier rate limits, kill switch
- F-031 (AI chat): POST /api/guidance/chat backend + per-item chat UI replacing one-shot AiGuidancePanel
- F-009 (mobile audit): 18 page/viewport combinations pass, nav breakpoint md→lg

## Tests added
- `tests/ai-chat.spec.ts` — 8 tests (backend: happy path, rate limit, prompt injection, input cap, item lookup, kill switch, history truncation, legacy compat)
- `tests/ai-chat-ui.spec.ts` — 7 tests (UI: Start card, multi-turn, clear chat, rate-limit error, strict body, mobile viewport)
- `tests/mobile-audit.spec.ts` — 2 tests (anon + protected pages × 3 viewports)

## Notes
- AI-related tests skip until Stefan applies migrations 023 + 026
- F-009 only fix needed: workspace header nav breakpoint md→lg (all other pages already mobile-safe)
- No PI 15 BA defects found requiring a PI 16
