# State matrix — template

A **state matrix** is one Markdown file per user-facing page under `docs/quality/matrices/` (e.g. `home.md`, `team.md`). It enumerates *every persona* (rows) against *every region* of the page (columns) and records the expected content/behaviour in each cell. Cells link back to invariants from `docs/quality/invariants.md` so a failing automated check points at a row × column × invariant.

---

## Purpose

State matrices exist to force enumeration. Stefan's PDF #42–#47 (2026-04-14) demonstrated that whenever a page's expected content depends on more than one variable (role × org state × IT-executor assignment × pending-invite-state × …), feature-scoped review misses combinations. A matrix surfaces every combination as a cell — empty cells immediately read as "I forgot to think about this".

## When to create a matrix

Create one when:
- A new user-facing page is added to the app (new entry in `docs/user-flows.md` §2).
- An existing user-facing page does not yet have one (Phase A retrofit per the F-045 plan).

Do NOT create one for backend-only or infra-only features. Those features must declare `Pages touched: N/A — backend/infra only` in their feature definition (per F-047 AC-2) with justification.

## Who owns it

- **Author / maintainer:** Business Analyst (the role; in practice: whichever BA agent is on the PI that touches this page).
- **Reviewer at step 2b:** UX Designer (consistency), Architect (state-transition implementability).
- **Updater:** any PR modifying the page must update the matrix in the same commit (matches F-047 AC-2). The PR template asks for this.

## Maintenance rule

If a PR changes a page covered by a matrix, the same PR updates the matrix. A PR that changes page behaviour without touching its matrix file fails review. If the change is purely cosmetic (CSS, no DOM/copy/persona-relevant change), the PR description must say so explicitly — reviewers may then waive the matrix update.

---

## Structure

### Header (top of file)

```
# State matrix — <Page name> (<route>)

- Persona source: docs/quality/personas.md (last reviewed: <YYYY-MM-DD>)
- Invariant source: docs/quality/invariants.md
- Last full walkthrough: <YYYY-MM-DD by author>
- Linked features: F-XXX, F-YYY (the features that wrote/updated this matrix)
```

### Page regions

Decide page regions by walking the live page once. Typical regions:
- **Header** — page title, subtitle, role badge, breadcrumb.
- **Primary CTA(s)** — top-of-fold buttons that drive the main action.
- **Body section A, B, C…** — named after their visible heading on the page (e.g. "Get started", "Team progress", "Pending invites").
- **Empty state** — what the region renders when its data is empty.
- **Error state** — what the region renders when its API failed.
- **Footer / nav return** — back-links and global-nav-related items unique to this page.

A region is the smallest meaningful unit of "if I change this, do I need to re-think every persona?". Avoid over-splitting (one cell per `<div>`) and under-splitting (one cell for the whole page).

### Rows = personas

Use the personas defined in `docs/quality/personas.md` in this fixed order:
`ANON | O1 | O2 | O3 | IT1 | E1 | E2`

If a future PI adds a persona, add it as a new column in `personas.md` AND a new row in every matrix in the same PR.

### Cells

Each cell contains:
- **Expected content / behaviour** — short, concrete (visible text in quotes, observable behaviour as a verb phrase).
- **Linked invariants:** comma-separated `INV-…` IDs.
- **Status:** `OK` (matches reality) | `DEFECT — <one-line reason>` (reality differs from intended) | `N/A — persona cannot reach this page`.

Use the `DEFECT — …` form to flag inconsistencies discovered during authoring. Defect cells become input to the next iteration's fix scope (or are deferred per CLAUDE.md §3d). They are intentionally noisy — a matrix full of defects is a successful matrix.

When a region simply does not render for a persona (e.g. "Pending invites" on Team page for an employee who can't see Team), use `N/A — persona cannot reach this page` if the persona never reaches the page at all, or `Hidden — admin only` if the persona reaches the page but not the region.

---

## Cell shorthand

```
Expected: "<visible string>" | <verb phrase>
Linked invariants: INV-foo, INV-bar
Status: OK | DEFECT — <reason> | N/A — <reason>
```

Inside a Markdown table the cell is typically rendered as:

```
"Welcome, Stefan"<br/>INV-home-exec-parity<br/>OK
```

Use `<br/>` because GitHub-flavoured Markdown does not support multi-line table cells.

---

## Worked mini-example — `/workspace` (Home), 2 personas × 3 regions

```markdown
# State matrix — Workspace Home (/workspace)

- Persona source: docs/quality/personas.md (last reviewed: 2026-04-14)
- Invariant source: docs/quality/invariants.md
- Last full walkthrough: 2026-04-14 by BA-PI16
- Linked features: F-045, F-048

## Regions

| Region | Persona O1 | Persona O3 |
|---|---|---|
| **Header — subtitle** | Expected: "Owner · IT Executor"<br/>INV-home-exec-parity, INV-no-not-set-when-derivable<br/>OK | Expected: "Owner" (NOT "Owner · IT Executor"; pending invite is not yet acceptance)<br/>INV-home-exec-parity<br/>DEFECT — today shows "Owner · IT Executor" because subtitle reads `membership.is_it_executor` not org-level resolution; covered by F-048 AC-1 |
| **Get started — Step 1 ("Invite your IT Executor")** | Expected: hidden / replaced with "IT checklist assigned to you" because owner handles IT<br/>INV-home-step-text-coherent<br/>OK | Expected: "Invitation sent — awaiting acceptance" with link to Team page<br/>INV-home-step-text-coherent, INV-home-steps-deterministic<br/>DEFECT — today shows generic "Invite your IT Executor" CTA even though invite is pending; covered by F-048 AC-3 |
| **Navigation cards — Org Settings** | Expected: visible (admin only)<br/>INV-role-page-access<br/>OK | Expected: visible (admin only)<br/>INV-role-page-access<br/>OK |
```

This 2 × 3 example shows the format. A real matrix has all 7 personas and all the regions of the page.

---

## Flagging defects

A `Status: DEFECT — …` cell is the matrix's single most valuable signal. When authoring:

1. Walk the page as the persona (Playwright MCP, fresh persona seed).
2. For each region, compare reality to intended behaviour.
3. If they differ: write the **intended** behaviour in the cell and add `Status: DEFECT — <one-line reason + which feature/AC owns the fix>`.
4. Aggregate all `DEFECT` cells into the PI fix scope (or defer per CLAUDE.md §3d).

Never edit a matrix to "match reality" when reality is wrong. Matrices describe intent; fixing reality to match intent is the job of the corresponding feature.

---

## Adding a region

If you discover an unmapped region while reviewing the page (a banner only owners with overdue cadence see, for example), add it as a new column AND fill its cell for every persona — `N/A` cells are valid and explicit. Never leave an empty cell.

## Adding a persona

See `personas.md` § "How to add a new persona". Adding a persona is a cross-cutting change: every matrix gets a new row, every row gets every cell filled, in one PR.

## Linking to tests

The `INV-…` IDs in cells are how `frontend/tests/invariants.spec.ts` (F-046) is generated/verified. A failing test names its invariant; the BA looks up the invariant in `invariants.md`, finds which matrices reference it, and reads the affected cells for context.

The persona walkthrough `frontend/tests/smoke/personas.spec.ts` (F-046) iterates personas × pages — a failure points at the row × page combination so the BA opens the relevant matrix and reads down the column.
