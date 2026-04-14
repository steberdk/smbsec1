# State Matrix — Team Dashboard (`/workspace/dashboard`)

**Page file:** `frontend/app/workspace/dashboard/page.tsx`
**Route:** `/workspace/dashboard`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** PI-16 Phase A retrofit (F-045 / F-047)
**Persona source:** `docs/quality/personas.md` (last reviewed 2026-04-14)
**Invariant source:** `docs/quality/invariants.md`
**Last full walkthrough:** 2026-04-14 by UX + Architect (source-read only)
**Linked features:** F-028 (dashboard status logic), F-034 (employee empty-state), F-035 (pending invitees), F-038 (stats math + terminology), F-039 (caller-scoped stats), F-040 (denominator fix), F-044 (per-track parity), F-045, F-047

---

## Canonical source of truth

Every cell below assumes the dashboard derives its state from one API response:

```
GET /api/dashboard → {
  assessment: { id, status, scope, created_at } | null,
  stats: { total, denominator, done, unsure, skipped, resolved, percent,
           by_track?: { it_baseline, awareness },
           me?: { ... same shape ... } },
  members: MemberStat[],        // includes pending=true rows (F-035)
  cadence: { last_completed_at, status },
  caller_is_it_executor?: boolean,
}
```

And (admin only, supplementary) `GET /api/campaigns/summary` → `CampaignSummary`.

The key parity contract is `INV-dashboard-report-parity`: every number on this page must be reproducible by `/workspace/report` for the same assessment. F-044 already enforces per-track parity; F-038 enforces the `resolved = done + skipped` definition and the server-authoritative `denominator`.

---

## Page regions (columns)

Enumerated by reading `page.tsx` top-to-bottom:

| Region ID | UI name (as rendered) | Code anchor |
|---|---|---|
| R1 | **Page header** — `<h1>"Dashboard"` + "Print summary" button (hidden if no assessment) | lines 154–164 |
| R2 | **Cadence banner** — coloured pill "On track / Needs attention / Overdue / No assessment completed" + last-completed date + "Next review due by…" | lines 167–184 |
| R3 | **Empty state — no assessment** — grey card with admin/employee-specific copy (F-034) | lines 186–201 |
| R4 | **Overall stats card** — assessment meta ("{scope} assessment · {status} · started …") + overall progress bar + 4 stat pills (Resolved / Done / Not applicable / Unsure or Not yet) | lines 205–250 |
| R5 | **Per-track bars** — "IT Baseline" + "Awareness" bars (IT Baseline visibility gated by `caller_is_it_executor || isAdmin`) | lines 242–249 |
| R6 | **Team progress section header** — "{joined} joined · {pending} pending" | lines 258–264 |
| R7 | **Joined-member rows** — expandable drill-down with per-member progress bar, Done/Unsure/Skipped counts, role + IT-exec badge, click → fetch `/api/dashboard/members/{id}` → per-item status list with "≥2 unsure" callout | lines 266–268, 419–515 |
| R8 | **Pending-invitee rows (F-035)** — dashed avatar, "Invite pending — not yet joined" italic, Revoke text-link, zero-fill progress bar | lines 270–281, 522–593 |
| R9 | **Campaign summary (admin only)** — stat quartet (Campaigns / Pass rate / Reported / Clicked) + trend chart + "View all campaigns →" | lines 287–355 |
| R10 | **Error state** — red "Failed to load dashboard" banner on API reject | lines 131–137 |
| R11 | **Loading skeleton** — animated pulse bars | lines 139–148 |

---

## Matrix

Legend: `N/A` = persona cannot reach page. `⚠ DEFECT` = today's code diverges from intended. Invariant IDs from `invariants.md` in brackets.

### R1 — Page header

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A — redirected to `/login` | INV-workspace-auth-boundary | N/A |
| O1 | `"Dashboard"`. "Print summary" hidden (no active assessment). | — | OK |
| O2 | `"Dashboard"` + "Print summary" visible (active assessment). | — | OK |
| O3 | `"Dashboard"`. "Print summary" hidden (no active assessment). | — | OK |
| IT1 | `"Dashboard"` + "Print summary" visible. | — | OK |
| E1 | N/A — not a member yet | — | N/A |
| E2 | `"Dashboard"` + "Print summary" visible. | — | OK |

### R2 — Cadence banner

Rendered iff NOT (`cadence.status === "never" && assessment`). I.e. hidden when we have an active assessment but no prior completion — avoids confusing "No assessment completed" copy at the same time as an in-progress one.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Visible. `cadence.status === "never"` (no assessment). Copy: "No assessment completed". Grey pill. | INV-no-not-set-when-derivable, INV-state-pure-of-navigation | ⚠ DEFECT — new finding: "No assessment completed" is technically correct but leaves the owner without an actionable next step on the banner itself. Should add "Start one from Assessments" CTA for admins, or restructure to match Home's Step 3 phrasing for parity. Candidate coverage: an expanded INV-no-not-set-when-derivable reading that empty-state copy also implies a CTA. |
| O2 | Visible iff `cadence.last_completed_at !== null`. If this is the first assessment (no prior completion), banner is hidden by the guard on line 167. | INV-state-pure-of-navigation | OK |
| O3 | Visible. Same as O1 (no prior completion, no active). | INV-no-not-set-when-derivable | ⚠ as O1 |
| IT1 | Same as O2 — banner visibility depends on org's cadence, not on persona. | INV-state-pure-of-navigation | OK |
| E1 | N/A | — | N/A |
| E2 | Same as O2. | INV-state-pure-of-navigation | OK |

Parity: the "Next review due by …" date is computed as `last_completed_at + 90 days`. This must match the identical computation in Home's cadence banner. ⚠ POSSIBLE DEFECT — new finding: the 90-day cadence is hard-coded in two places (Home R2 and Dashboard R2). If either drifts, parity breaks silently. Candidate new invariant: **INV-cadence-single-source** (new) — the cadence window is defined in one place and consumed by both Home and Dashboard.

### R3 — Empty state (no assessment)

Rendered iff `assessment === null`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Admin branch: "No assessments yet." + "Start an assessment" link → `/workspace/assessments`. | INV-role-page-access, INV-state-pure-of-navigation | OK |
| O2 | Hidden (O2 has active assessment). | — | OK |
| O3 | Same as O1. | — | OK |
| IT1 | Hidden (O2 org has active assessment). If IT1 were in an org without one, would see the employee branch: "No assessments yet — your owner will start one." | INV-state-pure-of-navigation | OK (F-034 AC-1 already implemented) |
| E1 | N/A | — | N/A |
| E2 | Hidden (O2 org has active assessment). Employee branch applies if no assessment. | INV-state-pure-of-navigation | OK (F-034 AC-1) |

### R4 — Overall stats card

Rendered iff `assessment !== null`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden (no assessment). | — | OK (via R3) |
| O2 | Visible. Meta line: "{scope} assessment · {status} · started {date}". Progress top line: `{stats.resolved} / {stats.denominator} responses` + `{stats.percent}%`. Pill quartet: Resolved / Done / Not applicable / Unsure or Not yet. | INV-dashboard-report-parity | OK |
| O3 | Hidden (no assessment). | — | OK |
| IT1 | Same as O2. | INV-dashboard-report-parity | OK |
| E1 | N/A | — | N/A |
| E2 | Same as O2 — server returns org-scope numbers (F-034 AC-2 confirms employees see team stats, not just their own, on Dashboard R4). | INV-dashboard-report-parity | OK |

Note: the pill labels are **"Not applicable"** (F-038) — verified consistent with workspace/checklist's IT Baseline button label but NOT consistent with the Awareness track button "Not applicable" (same) and the Completion card "Skipped" label (see checklist.md R14 defect). Dashboard is on the correct side of the drift.

### R5 — Per-track bars

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden (no assessment). | — | OK |
| O2 | Visible. Admin → sees BOTH tracks (`isAdmin === true`). Grid is 2-column. | INV-dashboard-report-parity, INV-checklist-track-visibility | OK |
| O3 | Hidden (no assessment). | — | OK |
| IT1 | Visible. `caller_is_it_executor === true` → both tracks, 2-column. | INV-dashboard-report-parity, INV-checklist-track-visibility | OK |
| E1 | N/A | — | N/A |
| E2 | Visible. Not admin, not IT-exec → Awareness only, 1-column. | INV-checklist-track-visibility | OK |

Label "{track.resolved} / {track.denominator} items" — this is the F-044 per-track parity fix. Numbers must match Report page's per-track rows.

### R6 — Team progress header

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden (no assessment). | — | OK |
| O2 | Visible. "Team progress — {joined} joined · {pending} pending". Count reflects `members.filter(m => !m.pending)` vs. `m.pending`. | INV-gdpr-delete-coherent | OK |
| O3 | Hidden (no assessment). | — | OK |
| IT1 | Visible. Includes all O2-org members. IT1 sees the pending section even though IT1 is not an admin — the Revoke button on pending rows issues a DELETE that the IT1 persona is not authorised for server-side. ⚠ DEFECT — new finding: R8 Revoke button is rendered for every persona that can see Dashboard, but the underlying `DELETE /api/invites/{id}` requires admin. For IT1/E2, clicking Revoke will 403 and surface the raw error via the component's `err` state. Should hide the Revoke button for non-admins. | INV-role-page-access | ⚠ DEFECT |
| E1 | N/A | — | N/A |
| E2 | Same as IT1 — same defect for the same reason. | INV-role-page-access | ⚠ DEFECT |

### R7 — Joined-member rows

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden (no assessment). | — | OK |
| O2 | Visible. Rows: owner + IT1 + E2 (joined only). Each row: role label ("Owner" for `org_admin`, otherwise `role.replace("_", " ")`), IT-exec badge if flagged, display name / email / id-prefix fallback, percent, tri-count `{done}✓ {unsure}? {skipped}–`, progress bar, click to expand → drill-down list from `/api/dashboard/members/{id}`. ≥2-unsure callout. | INV-dashboard-report-parity, INV-gdpr-delete-coherent | OK |
| O3 | Hidden (no assessment). | — | OK |
| IT1 | Same as O2 — API returns team-wide rows. IT1 can drill into other members. ⚠ POSSIBLE DEFECT — new finding: should IT1 be allowed to see E2's individual responses? The drill-down endpoint `/api/dashboard/members/{user_id}` needs an auth check. Source-read cannot verify — action for BA: probe `/api/dashboard/members/[id]/route.ts` authorization logic. If IT1 is allowed, it's a product question (does IT-exec role imply team-response visibility?) rather than a clear defect. Cell needs an invariant that doesn't exist yet: **INV-drilldown-visibility-scoped-to-role** (new) — only admins (and the member themself) may see another member's per-item responses, unless the IT-exec role explicitly grants it. | INV-role-page-access (today only partially enforced) | ⚠ POSSIBLE DEFECT |
| E1 | N/A | — | N/A |
| E2 | Same as O2 view — but E2 should NOT be able to drill into other members. Today: same component, same API call, no role gate in this JSX. ⚠ DEFECT — new finding: E2 sees the click affordance and can open drill-downs. | INV-role-page-access | ⚠ DEFECT |

Tri-count label in the row footer is `{m.done}✓ {m.unsure}? {m.skipped}–` — ⚠ DEFECT — new finding: the use of `–` (en-dash) as the "skipped" glyph is opaque; Dashboard calls the same stat "Not applicable" in the pill above (R4) and "Not applicable" in the drill-down status labels (line 416). Three different glosses for the same concept in one region. Candidate: **INV-terminology-single-source** (new; same as checklist.md R14 finding).

Role label: the fallback `role.replace("_", " ")` would render `"org admin"` if it weren't for the `=== "org_admin" ? "Owner"` guard. Works today. But if a new role (e.g. `org_manager`) were added, the fallback would render `"org manager"` — verbose and inconsistent with the user-facing "Manager" taxonomy. Note only; no defect today because Manager is deprecated (per `personas.md` intro).

### R8 — Pending-invitee rows

Rendered iff `pending.length > 0` under the dashed-border section. Dashed-avatar design per F-035.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 | Hidden (no assessment). | — | OK |
| O2 | Visible. One row for E1 (pending). Dashed-avatar, grey italic "Invite pending — not yet joined", Revoke text-link. Zero-fill progress bar. Revoke on confirm → DELETE `/api/invites/{invite_id}`. | INV-team-pending-invite-actions-safe, INV-no-raw-db-errors | OK |
| O3 | Hidden (no assessment). | — | OK |
| IT1 | Visible. Revoke button should be hidden (non-admin action) — see R6 defect. | INV-role-page-access | ⚠ DEFECT (same as R6) |
| E1 | N/A — the persona is the subject of the row, not a viewer. | — | N/A |
| E2 | Visible with Revoke — same defect as IT1. | INV-role-page-access | ⚠ DEFECT |

Revoke confirmation uses `window.confirm(\`Revoke invitation for ${member.email}?\`)`. ⚠ POSSIBLE DEFECT — new finding: browser confirm() dialogs cannot be styled and do not meet the "plain-language, double-confirm, named categories" bar set by `INV-destructive-action-double-confirm`. Revoke is destructive (invalidates an outstanding token). Should use a modal matching Team-page Revoke-and-delete pattern. Covered by INV-destructive-action-double-confirm — Status: DEFECT.

Revoke error branch: `catch (e) { setErr(e instanceof Error ? e.message : "Revoke failed"); }` — same concern as checklist R16: `e.message` can leak raw Supabase text. INV-no-raw-db-errors holds in spirit only if the server already sanitises. Action for Architect: confirm the DELETE endpoint returns sanitised error bodies.

### R9 — Campaign summary (admin only)

Rendered iff `isAdmin && campaignSummary && campaignSummary.total_campaigns > 0`.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 | Visible when `isAdmin` AND they have ≥1 campaign. Stat quartet + trend chart (iff ≥2 points) + "View all campaigns →". | INV-role-page-access | OK |
| IT1 | Hidden (not admin). | INV-role-page-access | OK |
| E1 | N/A | — | N/A |
| E2 | Hidden (not admin). | INV-role-page-access | OK |

The `/api/campaigns/summary` fetch is silently non-fatal: `catch(() => {})`. If it fails, the section just doesn't render. OK.

### R10 — Error state

Rendered iff `/api/dashboard` rejects.

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Red banner with human copy, NOT raw PG error. Fallback: `"Failed to load dashboard."`. | INV-no-raw-db-errors | ⚠ DEFECT — new finding: same pattern as checklist.md R16 — `e instanceof Error ? e.message : "Failed to load dashboard."` allows `e.message` to include raw RPC strings. No whitelist filter. |
| E1 | N/A | — | N/A |

### R11 — Loading skeleton

| Persona | Expected | Linked invariants | Status |
|---|---|---|---|
| ANON | N/A | — | N/A |
| O1 / O2 / O3 / IT1 / E2 | Animated pulse bars until `data` resolves. | INV-state-pure-of-navigation | OK |
| E1 | N/A | — | N/A |

---

## Invariants referenced

| ID | Cells |
|---|---|
| INV-workspace-auth-boundary | R1 ANON row. |
| INV-dashboard-report-parity | R4, R5, R7. |
| INV-checklist-track-visibility | R5. |
| INV-role-page-access | R6, R7, R8, R9 — flags the Revoke-button-on-employee-view defect. |
| INV-gdpr-delete-coherent | R6, R7 (deleted members must not ghost-row this list). |
| INV-team-pending-invite-actions-safe | R8 Revoke. |
| INV-destructive-action-double-confirm | R8 Revoke confirm dialog. |
| INV-no-raw-db-errors | R8 Revoke error branch, R10. |
| INV-state-pure-of-navigation | R2, R3, R11. |
| INV-no-not-set-when-derivable | R2 ("No assessment completed" phrasing). |

## Candidate new invariants surfaced by this matrix

| Proposed ID | Trigger cell | Why |
|---|---|---|
| INV-cadence-single-source | R2 | `last_completed_at + 90 days` appears in both Home and Dashboard. Single source avoids drift. |
| INV-drilldown-visibility-scoped-to-role | R7 IT1 | Whether IT1 (non-admin IT-exec) may drill into another member's responses is a product decision that should be encoded as an invariant so it can't silently drift. |
| INV-terminology-single-source | R7 tri-count | "Skipped" / "Not applicable" / "–" glyph drift in one region. |

---

## Defect summary (feeds PI-16 fix scope)

| Cell | PDF # | One-liner |
|---|---|---|
| R2 × O1/O3 | new finding | "No assessment completed" lacks an actionable CTA for admins. |
| R6/R8 × IT1/E2 | new finding | Revoke button rendered for non-admin viewers of pending-invite rows; 403 on click; UI should hide the button. |
| R7 × E2 | new finding | Drill-down click affordance exposed to employees; either hide or confirm API enforces isolation. |
| R7 × IT1 | new finding (product question) | Should IT-exec see other members' per-item responses? No invariant encodes the decision. |
| R7 tri-count | new finding | Three different glosses ("Skipped" / "Not applicable" / "–") for the same concept in one region. |
| R8 Revoke confirm | new finding | `window.confirm()` used for destructive action — violates INV-destructive-action-double-confirm's "plain-language, visually distinct red button" spirit. |
| R8/R10 error copy | new finding | `e.message` passthrough can leak raw Supabase error text. |
| R2 cadence window | new finding | 90-day window hard-coded in two places (Home + Dashboard). |

---

## Notes / dependencies

- `members[]` contains pending invitees (F-035). The filter `members.filter(m => !m.pending)` is crucial — any future code path that iterates `members` without the filter will include pending invitees in team counts, denominator calcs, etc. This is a classic regression surface. Consider encoding in a helper (`joinedMembers(data)` / `pendingInvitees(data)`) and banning raw `data.members.filter` access in new code.
- The "≥2 unsure" callout inside drill-down (line 485) uses a heuristic count (`>= 2`). No invariant covers this threshold; it's a UX decision point but worth calling out if product ever wants to make it configurable.
- The Campaign section's fallback to silent-no-render on API failure (line 125) is inconsistent with the rest of the page, which surfaces an error banner. Product question: should admins see "Campaign data unavailable" rather than nothing? Not a defect today; noted for UX backlog.
- Print view: the `window.print()` button on R1 triggers the browser print dialog against the live DOM. No `print:` CSS tuning on the pending-invitee rows — may print oddly. Not in scope for this PI.
