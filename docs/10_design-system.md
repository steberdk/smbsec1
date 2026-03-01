# 🎨 Design System — smbsec1 (C1)

## Design goals (product feel)
- Calm, trustworthy, non-alarming
- “Simple first, details on demand”
- One primary action per screen
- No jargon unless explained inline

## UI principles
1. One primary CTA per page (one “main button”)
2. Progressive disclosure: show details only when requested
3. Always answer on every screen:
   - What is this?
   - What should I do now?
   - What happens next?
4. Default to plain language (MFA → “2-step login”)
5. Consistent layout and spacing > visual flair
6. Accessibility baseline:
   - keyboard navigable
   - readable contrast
   - clear focus states

## Layout rules
- Max width: ~3xl/4xl centered content
- Page structure:
  - Title + short subtitle
  - Progress/status (if applicable)
  - Content cards
  - Primary CTA at bottom (and optionally top)
- Avoid dashboards until user has completed something once

## Visual tokens (implementation guidance)
### Colors
- Neutral base (gray)
- One accent color (blue or green) for primary actions
- Red is reserved ONLY for destructive actions or true errors
- Yellow/orange only for “needs attention”

### Typography
- Headings: short and informative
- Body: 14–16px equivalent, comfortable line height
- Avoid all-caps

### Components style
- Rounded corners (lg/xl)
- Light borders
- Subtle shadows only if needed
- Buttons: solid for primary, outline for secondary, link for tertiary

## States (must exist for each flow)
Every feature must implement:
- loading
- empty
- error (with recovery step)
- success

## Copy rules (content)
- Prefer verbs: “Turn on 2-step login”
- Estimate effort: “~3 minutes”
- Explain why in 1–2 lines (not a paragraph)
- Provide “how” as numbered steps

## “No chaos” rule for agents
Agents MUST:
- reuse existing components before adding new ones
- update docs if they introduce a new UI pattern
- keep pages consistent with the layout rules above
