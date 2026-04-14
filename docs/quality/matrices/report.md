# State Matrix — Security Posture Report (`/workspace/report`)

**Page file:** `frontend/app/workspace/report/page.tsx`
**Route:** `/workspace/report`
**Owner (UX cross-page consistency):** UX Designer
**Owner (artefact):** Business Analyst
**Status:** Phase A retrofit for F-045 (PI-16 Quality Baseline)
**Persona source:** `docs/quality/personas.md` (reviewed 2026-04-14)
**Invariant source:** `docs/quality/invariants.md`
**Last full walkthrough:** 2026-04-14 (source-read, no live browser)
**Linked features:** F-045 (matrices), F-040 (shared dashboard/report stats helper), F-044 (per-track resolved/denominator parity), F-035 (pending invitees omitted from printed report)

---

## Scope

The Security Posture Report is a printable per-org snapshot of the active assessment: org metadata, overall progress, per-track breakdown, per-member table, campaign summary, and recommendations. It is **owner-only** (`isAdmin` gate at line 98) and the numeric content must byte-equal the Dashboard for the same org at the same moment — this is the core invariant F-040 codified as `INV-dashboard-report-parity`.

No Stefan PDF findings land on this page directly. The defect risks this matrix guards against are:

- Silent numeric drift between Dashboard and Report if a future tweak re-forks the math. (`INV-dashboard-report-parity`)
- Ghost rows after GDPR deletion (`INV-gdpr-delete-coherent`)
- Role-page-access regression (`INV-role-page-access`)
- "Not set" leakage in org header when `email_platform` or `reassessment cadence` is null (`INV-no-not-set-when-derivable`)

---

## Page regions (columns)

Enumerated by reading `frontend/app/workspace/report/page.tsx`:

| Region ID | UI name | Code anchor |
|---|---|---|
| R1 | Access-restricted fallback (`!isAdmin`) | 98–105 |
| R2 | Loading state | 107–109 |
| R3 | Error state | 111–113 |
| R4 | Empty state (no active assessment) | 115–121 |
| R5 | Action bar (no-print) — h1 + Print/PDF button | 179–187 |
| R6 | Report header banner — title, subtitle, "Confidential", timestamp | 190–203 |
| R7 | Section 1 — Organisation info | 206–229 |
| R8 | Section 2 — Assessment overview (progress bar + legend) | 232–305 |
| R9 | Section 3 — Per-track breakdown | 308–363 |
| R10 | Section 3 — Per-member table | 365–397 |
| R11 | Section 4 — Campaign results (on page-break) | 401–434 |
| R12 | Section 5 — Recommendations | 437–482 |
| R13 | Disclaimer + footer | 484–493 |
| R14 | Print behaviour (`@media print`) | 167–175 |

## Personas (rows)

`ANON | O1 | O2 | O3 | IT1 | E1 | E2` — fixed order.

Sub-states:
- O1 / O3 default `hasActiveAssessment = false` → R4 is the main branch.
- O2 default `hasActiveAssessment = true` → main persona for R6–R13.
- O2 has 3 joined members + 1 pending (E1); `joinedMembers` filter (line 154) drops E1 per F-035.

## Matrix

### R1 — Access-restricted fallback
- ANON: N/A — redirected to /login. `INV-workspace-auth-boundary`.
- O1 / O2 / O3: Hidden — admin bypass. `INV-role-page-access`. OK.
- IT1: Rendered "Access restricted" + "Only organisation admins can view the security report." No dashboard API issued (effect gate line 82). `INV-role-page-access`, `INV-workspace-auth-boundary`. OK.
- E1: N/A.
- E2: As IT1. OK.

### R2 — Loading state
- O1 / O2 / O3: "Loading report..." between mount and first resolution. No stale flash. Pure function of `(token, isAdmin)`. `INV-state-pure-of-navigation`. OK.
- Others: N/A (R1 renders first).

### R3 — Error state
- O1 / O2 / O3: Red centred text from `apiFetch` wrapper. Must not leak raw Postgres. Campaign-summary failure is swallowed (line 86 `.catch(() => null)`). `INV-no-raw-db-errors`. OK.
- Others: N/A.

### R4 — Empty state
- O1: Rendered. `t("report.noAssessment")`. No CTA to `/workspace/assessments` — recommend add (UX follow-up). `INV-state-pure-of-navigation`. OK functionally.
- O2: Hidden (active assessment).
- O3: As O1. OK.
- Others: N/A.

### R5 — Action bar (no-print)
- O2: Localised `<h1>` + right-aligned Print/PDF button invoking `window.print()`. No network side-effect. Hidden in print via `.no-print`. `INV-state-pure-of-navigation`. OK.
- O1 / O3: Hidden when R4 shown.
- Others: N/A.

### R6 — Report header banner
- O2: Gradient banner with title, subtitle, "Confidential", "Generated on {reportDate}". `reportDate` is `en-GB` regardless of campaign locale — intentional for printed audit records. `INV-state-pure-of-navigation`. OK.
- O1 / O3: Hidden.
- Others: N/A.

### R7 — Section 1: Organisation info
- O2: Four fields:
  - Org name — `orgData.org.name`.
  - Platform — translated via `report.platformLabel.{key}` where `key = email_platform` or `unknown`. When null, `unknown` translation must be plain language (e.g. "Not specified") — never "Not set".
  - Members — `joinedMembers.length` (NOT raw `members.length`) per F-035. O2 shows 3, not 4.
  - Reassessment cadence — `cadenceLabel` from `cadence.status`. Never "Not set".
  - Invariants: `INV-no-not-set-when-derivable`, `INV-dashboard-report-parity`, `INV-gdpr-delete-coherent`.
  - Status: OK — contingent on translation value for `report.platformLabel.unknown`. If it resolves to "Not set", defect.
- O1 / O3: Hidden. Others: N/A.

### R8 — Section 2: Assessment overview (F-040 anchor)
- O2: Assessment date (en-GB), status (translated), Total items (`data-testid=report-denominator`), Completion rate (`data-testid=report-percent`), Resolved responses `{totalResolved}/{totalDenominator}` (`data-testid=report-resolved`), two-colour progress bar (teal resolved / amber unsure / gap skipped), legend. `Math.max(totalDenominator, 1)` guards div-by-zero. Numbers must equal Dashboard byte-for-byte. `INV-dashboard-report-parity` (PRIMARY). OK — locked by F-040 helper.
- O1 / O3: Hidden. Others: N/A.

### R9 — Section 3: Per-track breakdown (F-044 anchor)
- O2: Two rows (IT Baseline, Awareness). Each uses `{resolved}/{denominator}` (NOT `{done}/{total}`) per F-044. `data-testid`: `report-it-baseline-items`, `report-awareness-items`. Track numbers must match Dashboard pills exactly. `INV-dashboard-report-parity` (per-track). OK — locked by F-044.
- O1 / O3: Hidden. Others: N/A.

### R10 — Section 3: Per-member table (F-035 anchor)
- O2: Columns Member / Role / Done / Unsure / Skipped / Completion. Pending invitees (E1) excluded via `joinedMembers.filter(m => !m.pending)` (line 154). Role column renders `role.replace("_", " ")` → `"Org admin"`.
- **⚠ DEFECT (minor, cosmetic)** — Role shows "Org admin" where Team page renders `"Owner"` for the same role. Cross-page label drift (same class as PDF #42–#47). Fix: map `org_admin → "Owner"` in report render. Owner: F-054 (role label consistency) or rolled into F-049 copy hygiene.
- Invariants: `INV-dashboard-report-parity`, `INV-gdpr-delete-coherent`, `INV-state-pure-of-navigation`.
- O1 / O3: Hidden. Others: N/A.

### R11 — Section 4: Campaign results (on `page-break`)
- O2: Branches on `campaigns.total_campaigns > 0`. Grid of Total campaigns / Emails sent / Pass rate (colour ≥70 teal, ≥40 amber, else red) / Click rate (≤20% teal else red; "N/A" when `total_sent === 0`). Else italic "No campaigns run yet." Not guarded by `INV-dashboard-report-parity` — Dashboard campaign summary lives on a different widget. `INV-state-pure-of-navigation`. OK.
- O1 / O3: Hidden. Others: N/A.

### R12 — Section 5: Recommendations
- O2: `stats.percent < 100` → intro + conditional bullets on unsure/skipped/campaign-pass-rate/cadence-red. `stats.percent === 100` → `t("report.noRecommendations")`. Unsure/Skipped bullets call `.toLowerCase()` on translation — cosmetic risk for acronym-bearing translations. `INV-state-pure-of-navigation`. OK.
- O1 / O3: Hidden. Others: N/A.

### R13 — Disclaimer + footer
- O2: Italic `t("report.disclaimer")` + centred `t("report.generatedBy")` + generatedOn timestamp. Included on print. `INV-state-pure-of-navigation`. OK.
- O1 / O3: Hidden. Others: N/A.

### R14 — Print behaviour
- O2: `@media print` hides `header`, `nav`, `.no-print`. `main` padding zeroed. White background. `.page-break` before R11. Report content only. `INV-state-pure-of-navigation`. OK.
- O1 / O3: N/A (R4 shows — nothing to print). Others: N/A.

## Invariants referenced (summary)

| ID | Cells |
|---|---|
| INV-dashboard-report-parity | R7 members count, R8 total/percent/resolved, R9 per-track, R10 per-member (PRIMARY) |
| INV-no-not-set-when-derivable | R7 platform + cadence |
| INV-gdpr-delete-coherent | R7 member count, R10 per-member table |
| INV-role-page-access | R1 IT1/E2 |
| INV-workspace-auth-boundary | ANON row, all regions |
| INV-state-pure-of-navigation | R2, R4, R5, R6, R8, R9, R11, R12, R13 |
| INV-no-raw-db-errors | R3 error state |

## Defect summary

| Cell | PDF # | Summary | Fix AC |
|---|---|---|---|
| R10 × O2 | — | Role column shows "Org admin" vs Team's "Owner"; cross-page label drift. | F-054 (deferred). |
| R7 × O2 (contingent) | — | If `report.platformLabel.unknown` resolves to "Not set", violates `INV-no-not-set-when-derivable` on an external audit doc. Use "Not specified". Verify translation file. | F-049 copy-hygiene add-on. |
| R4 × O1/O3 | — | Empty state lacks CTA back to `/workspace/assessments`. | Backlog. |

## Notes / dependencies

- F-040 + F-044 are load-bearing. Matrix is primarily defensive — locks the no-drift contract so future UI tweaks cannot re-fork.
- `joinedMembers` keeps pending invitees out of R7 count AND R10 table. Team matrix R5 documents those invitees fully; Report matrix excludes them. Both correct by design (F-035).
- Role-column rendering diverges between Team (`org_admin → "Owner"` via ternary) and Report (`role.replace("_", " ")` → "Org admin"). Recommend shared `formatRoleLabel()` helper (F-054).
- Print CSS (R14) hides `header`/`nav` via tag selectors — a future layout change wrapping the page in a non-semantic element could regress silently. Consider Playwright print-snapshot test (out of scope here; flag for test-team).

## Invariant gaps

- None critical. Role-label drift (R10 × O2) could motivate `INV-role-label-consistent-across-pages`, but hold off to avoid invariant bloat.
