# PI 6 — Visual Beautification Changes

**Theme:** Warm, professional, modern design for a security product aimed at non-technical SMB owners.

## Global Changes (`globals.css`)

- **Background color**: Changed from pure white (`#ffffff`) to a subtle warm off-white (`#f8fafb`) for the page background, reducing the clinical feel.
- **Card hover effect**: Added `.card-hover` utility class providing smooth shadow lift and subtle 1px upward translate on hover.
- **Progress bar gradient**: Added `.progress-gradient` class — a teal-to-green gradient (`#0f766e` > `#14b8a6` > `#10b981`) replacing flat single-color progress bars.
- **Hero gradient**: Added `.hero-gradient` class — a subtle multi-color gradient background (teal-mint to blue-sky to green-mint) for the landing page hero section.

## Landing Page (`/`)

- **Header bar**: Added a persistent header with the "smbsec" brand wordmark, using backdrop blur and subtle border.
- **Hero section**: Wrapped in a gradient background (`hero-gradient`) with generous padding (py-16/py-20). Increased heading size to `text-3xl sm:text-4xl` with `tracking-tight`. Increased body text to `text-lg`.
- **CTA buttons**: Added `shadow-sm` and `hover:shadow-md` with smooth transitions. Increased padding for better touch targets.
- **Attack cards**: Added colored left borders (red, orange, amber, purple, blue) to visually differentiate attack types. Added `shadow-sm` and card hover effects. Increased padding to `p-5`.
- **"Why this checklist" section**: Replaced bullet list with check-mark icons in teal circles. Added white background band with border.
- **Trust signal cards**: Added icons (emoji) to each card. Added `shadow-sm` and hover effects.
- **CTA band**: Added a full-width teal-700 colored band with a "Get started free" call-to-action before the footer.
- **Footer**: Moved into a white background section with subtle border.

## Workspace Shell (`workspace/layout.tsx`)

- **Background**: Set workspace background to `bg-[#f8fafb]` (warm off-white).
- **Header**: Added `sticky top-0 z-30`, `backdrop-blur-sm`, and `shadow-sm` for a floating glass-effect nav bar.
- **Active nav items**: Added `shadow-sm` to active nav state.

## Workspace Home (`workspace/page.tsx`)

- **Heading**: Increased from `text-xl` to `text-2xl` with explicit `text-gray-900`.
- **Navigation cards**: Added `shadow-sm` and `.card-hover` effect. Progress bars use gradient.
- **Guided setup**: Changed from `bg-gray-50` to `bg-white` with `shadow-sm`.

## Workspace Checklist (`workspace/checklist/page.tsx`)

- **Progress bar**: Increased height to `h-2.5` with `shadow-inner` on track and gradient fill.
- **Checklist items**: Added `shadow-sm` to all items. Unanswered items get `hover:shadow-md`.
- **Skeleton loading**: Improved with softer colors, borders, and rounded-lg titles.
- **Completion card**: Added `shadow-sm` to the all-answered celebration card.

## Dashboard (`workspace/dashboard/page.tsx`)

- **Stats card**: Added `bg-white` and `shadow-sm`. Progress bar uses gradient with `shadow-inner`.
- **Stat pills**: Changed from `bg-gray-50` to `bg-white` with `shadow-sm`.
- **Track bars**: Changed from `bg-gray-50` to `bg-white` with `shadow-sm` and gradient progress.
- **Member rows**: Added `bg-white` and `shadow-sm`. Progress bars use gradient.
- **Skeleton loading**: Improved with softer colors and borders.

## Team Page (`workspace/team/page.tsx`)

- **Invite form input**: Added teal focus ring (`focus:ring-2 focus:ring-teal-500`) and increased padding.
- **Send invite button**: Added `shadow-sm` and `hover:shadow-md`.
- **Member and invite cards**: Added `bg-white` and `shadow-sm`.

## Assessments Page (`workspace/assessments/page.tsx`)

- **Start button**: Added `shadow-sm` and `hover:shadow-md`.
- **Assessment cards**: Added `shadow-sm` and explicit `bg-white` for inactive cards.

## Settings & GDPR Pages

- **Headings**: Increased to `text-2xl` with `text-gray-900`.
- **Data storage card**: Added `bg-white` and `shadow-sm`.
- **Member cards**: Added `bg-white` and `shadow-sm`.

## Login Page (`/login`)

- **Layout**: Centered card layout with off-white background and smbsec header.
- **Login card**: Wrapped in `bg-white rounded-2xl shadow-sm` card container with increased padding.
- **Input**: Added teal focus ring (`focus:ring-2 focus:ring-teal-500`).
- **Button**: Added `shadow-sm` and `hover:shadow-md`.
- **How-it-works card**: Added `shadow-sm`.

## Onboarding Page (`/onboarding`)

- **Layout**: Added smbsec header bar and off-white background.
- **Form inputs**: Added teal focus ring and increased padding.
- **Submit button**: Added `shadow-sm` and `hover:shadow-md`.

## Shared Components

### ProgressBar (`components/ProgressBar.tsx`)
- Progress bar fill uses `progress-gradient` (teal-to-green).
- Track has `shadow-inner` for depth.

### ChecklistItemCard (`components/ChecklistItemCard.tsx`)
- All cards have `shadow-sm` with `transition-shadow`.
- Todo items get `hover:shadow-md` on hover.
- Action buttons: Changed "Done" from `bg-gray-900` to `bg-teal-700` for brand consistency. All buttons get `shadow-sm` and `hover:shadow-md`.
- Removed emoji from button labels for cleaner look.

## Design Principles Applied

1. **Consistent shadow system**: `shadow-sm` on all cards, `shadow-inner` on progress bar tracks, `hover:shadow-md` on interactive elements.
2. **Brand gradient**: Teal-to-green gradient on all progress indicators for visual warmth.
3. **Teal focus rings**: All form inputs use `focus:ring-2 focus:ring-teal-500` for accessible, branded focus states.
4. **Warm backgrounds**: Off-white page background (`#f8fafb`) with white cards creates visual depth without harshness.
5. **Larger headings**: Page titles bumped from `text-xl` to `text-2xl` for stronger visual hierarchy.
6. **Hover feedback**: Cards lift subtly on hover with shadow and 1px translate.
