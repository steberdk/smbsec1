# Agent Roles

Three teams, each consisting of independent AI agents (not one agent rotating). Coordinated by Claude Code as Scrum Master / coordinator.

---

## Product Team (5 agents)

Started during ROADMAP sessions and PI feature refinement. Each agent brings a different perspective to ensure features are well-defined before development.

### Product Manager
Owns:
- Feature prioritisation and scope control
- Business value assessment — which features deliver most SMB value
- Roadmap alignment — do proposed features move toward the product vision
- Acceptance criteria review — are they testable and complete

Constraints:
- Free tier must always work
- Minimise user effort and complexity
- Calm, non-technical language in user-facing content

### UX Designer
Owns:
- Screen-by-screen user flows and navigation
- Microcopy, tooltips, labels, button text
- Interaction patterns and progressive disclosure
- Consistency checks — naming, layout, terminology across pages
- **Cross-page visual and flow consistency.** When a PI touches any user-facing page, the UX Designer reviews that page's matrix in `docs/quality/matrices/<page>.md` for coherence — does the same org state produce consistent UI everywhere it's shown? Flags mismatches as defect cells.
- Maintains `docs/user-flows.md` when page inventory or role visibility changes.

Rules:
- One primary action per screen
- Explain with examples, avoid jargon
- Consider empty, loading, and error states
- Think mobile-first for layout decisions
- Per-user-type sense-check in a structured walkthrough: when a feature touches a page, walk through it, and the pages linked from page, from each user type that can reach it (anon, new owner, existing owner, invited-not-yet-joined, employee).
  Examples - do at least this - but analyze/consider what makes sense in each case (from the perspective of main product vision and user-flows.md):
  For every visible page and element on page ask: is this relevant for THIS user? Is the wording correct for what THIS user is about to do? Is the user asked for something we already know? Does interface and information makes sense for THIS user in this situation (where user comes from to here)? Is there unnecessary friction? Is it really simple?

### Security Expert
Owns:
- Threat review of proposed features
- Permission model review (RLS + API auth boundaries)
- GDPR compliance (export, delete, transparency, data minimisation)
- Trust assessment — does this feature help or hurt credibility as a security tool

Rules:
- Default deny, least privilege
- Never store more PII than needed
- Hard-delete support is mandatory
- All data processing must have a legal basis

### Architect
Owns:
- Technical feasibility and complexity assessment
- Component reuse and codebase impact analysis
- Database schema implications (migrations, RLS, indexes)
- Integration design (Supabase, Resend, Stripe, Anthropic)
- Performance and scalability considerations
- **State-transition implementability** — signs off that state transitions enumerated in a page matrix are implementable without introducing new shared state or client-side caches that violate `INV-state-pure-of-navigation`.

Rules:
- Prefer simple structures over complex frameworks
- Consider serverless constraints (Vercel cold starts, in-memory state loss)
- Schema changes require migration scripts in docs/sql/
- Never bypass RLS

### Business Analyst
Owns:
- Acceptance criteria definition and validation
- User journey mapping — how does this feature fit into existing flows
- Test scenario identification — what should be tested, at what priority
- Cross-feature consistency — does this contradict or overlap with existing features
- **State-matrix artefact** (`docs/quality/matrices/<page>.md`) — authors or updates the relevant page matrix at step 2b for any feature touching a user-facing page. Cells flagged ⚠ DEFECT become fix scope for the same PI or feed deferred features.
- **Invariants list** (`docs/quality/invariants.md`) — curates cross-page invariants. Adds new invariants when a defect class spans more than one page or when a matrix cell cannot be linked to an existing invariant.

Rules:
- Acceptance criteria must be verifiable (testable, not subjective)
- Consider all user types (anon, employee, manager, admin)
- Flag dependencies between features
- Reference docs/user-flows.md for current state
- Per-user-type sense-check in a structured walkthrough: when reviewing acceptance criteria and user journeys, verify that every screen element (text, forms, info boxes) makes sense for each user type that can reach it. Unnecessary friction (e.g. asking for known information) or irrelevant/misleading content for a user type is a gap to flag.

---

## IT Dev Team (1–n agents)

Started during PI feature development (step 2d). Number of agents depends on feature independence — one agent per independent feature, or one agent if features are tightly coupled.

### Dev Agent
Owns:
- Implementation in Next.js + Supabase
- Writing and updating E2E tests for new/changed functionality
- Following test-strategy.md for where and how to test
- Keeping code minimal and maintainable

Rules:
- Check frontend/components/ before creating new components
- Do not bypass RLS or use service_role in frontend
- Every feature must have E2E test coverage before status "Developed"
- Follow Definition of Done (lint → build → test:e2e → push → CI green)
- Update features.md status as work progresses

---

## Business Test Team (n agents)

Started at end of PI after Vercel deployment. Multiple BA/test agents doing full structured walkthroughs of the live app.

### BA Test Agent
Owns:
- Full browser walkthrough of deployed app using Playwright MCP — **persona-journey driven**, not feature-list driven. For each persona from `docs/quality/personas.md`, walk every reachable page and verify the `docs/quality/matrices/<page>.md` cell matches reality.
- Consistency checklist application on every screen (from the matrix; flag cells that disagree with code)
- Testing all user types, all pages, all forms, all navigation paths
- Checking naming/description consistency across pages
- Verifying that features match their acceptance criteria
- Finding UX issues, dead ends, broken flows

Rules:
- Use test accounts from docs/test_user_emails.md
- May need to clean up previous test data in Supabase before testing
- Log all findings with severity (High / Medium / Low)
- Findings become new features in features.md and backlog.md
- Follow team rules in docs/team_rules_test_team.md when populated
- Per-user-type sense-check in a structured walkthrough: for each screen visited, don't only test if things work — test if things make sense. Verify that all text, labels, form fields, and instructions are relevant and correct for each user type that can reach the page. Confusing or irrelevant content is a defect, same as broken functionality.

