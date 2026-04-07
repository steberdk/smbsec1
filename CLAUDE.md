# CLAUDE.md
Guidance for Claude Code when working in this repository.
smbsec1 - SMB Security Quick-Check — guided, repeatable security baseline for small businesses.
Production: https://smbsec1.vercel.app

## Initial Product Vision
Goal: Help SMB owners address top security risks in 30 minutes - without creating account (user/password) and without payment, but with guidance. If owner logs in and creates organisation then it will provide more guidance, learn organisation, and collect/document about security topics.
Primary user: Business Owner.
Core loop: Assess → Fix → Track → Reassess
MVP (already provided): Guided checklist + progress + company workspace
Constraints: Free tier must work. Simple and cool UX. GDPR native/transparent.
Acceptance criteria:
- For non-logged in users:
   - Explanation why and how.
   - Checklist.
   - Account creation (no payment).
   - GDPR and data
- For logged in users:
   - Explanation and checklist available as for non-logged in.
   - Can set himself as owner, define who is IT responsible, and add employees to all be included in security assessment, learning and improvement.
   - User can see progress of his team.
   - GDPR and data
   - Guided checklist

## Mission
Help small business owners reduce 80% of common cyber risk easily — without needing enterprise tools or IT expertise.

## What this product is
A guided, repeatable security baseline tool for SMBs:
Assess → Fix → Track → Reassess
It starts as a checklist with proof and progress tracking, and later grows into delegation, reassessments, and simulated phishing campaigns.

## Development Process
### No 1 rule over them all
Don't ask Stefan unless at dialogue point in PI-START (1b below) or something profound causes a halt.
### Features
All development must be maintained in a Feature (in \docs\product\features.md) after every work related to feature, from idea to finished accept tested delivery, according to \docs\product\feature_rules.md
Read \docs\product\feature_rules.md before maintaining features.
### Feature Backlog
In \docs\product\backlog.md
All development must be maintained in Backlog (after every work related to feature, from idea to finished accept tested delivery), according to \docs\product\backlog_rules.md
Read \docs\product\backlog_rules.md before maintaining features in backlog to do it right.

### PI's and iterations
To be followed for all development.
Work is conducted partially inspired by SAFe (Scaled Agile), but also so a team os Product Team specialists can come up with product vison implementation, and Business testers can make sure it all is tested and works.
A PI has a number of iterations. After one PI the next starts.
The process of a PI:

Development process consists of ROADMAP Session, Feature Development PI's, and Business Test, and possible re-iterations (Business Test -> new PI(s)).
You are the main coordinator following this process. You must also have overview, main product vision focus, development flow towards it, be crips and clear on CLAUDE.md and related documents (with process and delivery requirements to keep this project clear):
1. ROADMAP Session
1a. Motivation: This project risks drifting.
1b: You start the Product Team, coordinate, make team align on finished result, and keep Product team alive for Stefan dialogue (1e below). Do at least 3 team-internal iterations so every agent can consider everyone else's ideas and consider at least one round of responses to ideas. Agreement mainly based on exchange of ideas and alignment, not only vote majority.
1c: Brief to Product Team: With Product Vision in mind, perform a new high level and thorough walk-through of what next steps prepares/delivers most business value. I.e. re-assess product state (browser usage - e.g. playwright) compared to end goal and decide what deliverables delivers most SMB value (for the dev team to deliver next PI's). Assess, create and adjust features, what PI's (feature groups) to expect. Make sure they do it by their own rule in team_rules_product_team.md (when something has been put in there).
1d: When ROADMAP session is done, features placed in PI's have changed status to Funnel (ready for Product Team PI refinement (2b)).
1e: Stefan dialogue. You present summary for me and let me comment and adjust. And you go back to Product Team to let Product Team start new limited scope 1c state to consider more or adjust based on Stefan-input. And come back to me for new 1e dialogue.
Invariant: Agreed roadmap exist in backlog.md and features.md (including agreed scope of PI's and also deferred features)
1f: (Intent: Retrospective for retrospective for continous improvement of team process) Coordinate teams suggestions for and agree to one process thing from this ROADMAP session Product team wants to do differently from now on, and put it into C:\Users\AI1\smbsec3\docs\team_rules_product_team.md. It may not contradict development process in CLAUDE.md and referenced documents. If team thinks otherwise, you cannot allow it, because process should not be interrupted, but collect it in C:\Users\AI1\smbsec3\docs\team_rules_suggestions_for_Stefan.md with timestamp+proposer+why for next Stefan conversation in 1e or when next dialogue happens.
1-deliverables:
 - C:\Users\AI1\smbsec3\docs\product\pi[nn] folder contains teams discussion in new file.
 - Updated in sync backlog.md and features.md
 - New entry in C:\Users\AI1\smbsec3\docs\team_rules_product_team.md to be used by Product Team itself.
2. Feature development PI's
Iterate as many PI's as agreed in 1d above. In each PI:
  2a. Motivation: Do features in PI.
  2b. You start the Product Team, coordinate, make team align on finished result, and keep Product team alive for IT Dev Team refinement (2e below). Do at least 3 team-internal iterations so every agent can consider everyone else's ideas and consider at least one round of responses to ideas. Agreement mainly based on exchange of ideas and alignment, not only vote majority.
  2c. Brief to Product Team: With Product Vision in mind and using learnings (in team_rules_product_team.md), refine (analyze and clarify) features in scope for this PI. Maintained in features.md and possibly backlog.md. Features analyzed/clarified change status to Backlog (because they are ready for IT Dev Team refinement). Keep Product Team alive for IT Dev team refinement of features.
  2d: You start IT Dev Team of 1..n dev agents (not you rotating) depending on what makes sense to you (e.g. one per feature depending on how coupled features are - if they are fully independent technically then a independent agent can solve it).
  2e: Let IT Dev Team do refinement of features for PI (is it all clear to them considering project documentation, or what needs to be asked to Product Team for clarification, or maybe reassessment/re-definition). Update features.md where needed, and set features state to Ready.
  2f: Retrospective / Coordinate Product Teams suggestions for and agree to one process ting from this PI Product team wants to do differently from now on, and put it into C:\Users\AI1\smbsec3\docs\team_rules_product_team.md. It may not contradict development process in CLAUDE.md and referenced documents. If team thinks otherwise, you cannot allow it, because process should not be interrupted, but collect it in C:\Users\AI1\smbsec3\docs\team_rules_suggestions_for_Stefan.md with timestamp+proposer+why for next Stefan conversation in 1e or when next dialogue happens. Close down Product Team for now when refinement and team rule update is all done.
  2g: Do development including test definition and test execution according to test_strategy.md. Make sure they do it by their own rule in team_rules_it_dev_team.md (when something has been put in there).
  2h: During start/dev/test/.. you keep backlog and feature status updated (and feature updated in case something more than expected pops up. The Feature definition is the place for information about the feature.
  2i: When iteration 1 is done, you start iteration 2, and then iteration 3. In each iteration and for each feature, the feature cannot be set to status Developed unless all tests according to feature Risk and amount of Test has been covered.
      In each iteration included features go from status Ready to Developed IF tests in local environment succeed. All tests that can be done in local environment should be done here also, because finding defects in DEV is much cheaper than finding them in PROD.
  2j: All testing in iterations is done by IT Dev Team according to test-strategy.md. (Apart from Business testing done after Vercel deploy (see below)). All tests are documented, so they can be read and re-executed any time. Defining what tests are to be done is high level a Product Team responsibility (see section "Risk and amount of Test" in Feature), but lower level whitebox and exact test case definition e.g. in browser must wait until after exact implementation, and is a IT Dev responsibility. No feature is set into Develped state before all tests are documented and ready for execution - and test IT Dev team can do in lower env are done. Also all defects found are handled (and all planned tests are redone) inside iteration before feature is set to Developed.
  2k: Push to GitHub per iteration, deploy to Vercel at end of PI (in one go at the end to preserve resources and time) and set the features deployed to state Deployed. Make 1..n BA agent(s) do Business testing - hence all features in PI will not go into state/status Done before successfull BA test after Vercel/PROD deploy.
  2l: All tests must succeed. Defects are handled within PI with same PI test and regression test.
  2m: If a defect isn't solved after 2 attempts, then put it in feature and in next PI, and Product Team will consider it together with next PI's scope.
  2n: (Intent: Retrospective for continous improvement of team process) Coordinate teams suggestions for and agree to one process thing IT Dev team wants to do differently from now on, and put it into C:\Users\AI1\smbsec3\docs\team_rules_it_dev_team.md. It may not contradict development process in CLAUDE.md and referenced documents. If team thinks otherwise, you cannot allow it, because process should not be interrupted, but collect it in C:\Users\AI1\smbsec3\docs\team_rules_suggestions_for_Stefan.md with timestamp+proposer+why for next Stefan conversation in 1e or when next dialogue happens.
  2-deliverable:
    - Features according to acceptance criteria
    - updated documentation (go through all and consider what is to be updated - tech doc, functionality/product doc, features.md, backlog.md, tests and test results.
    - Simple list of what tests have been done in C:\Users\AI1\smbsec3\docs\product\pi[nn] folder. Feature related tests and regression.
    - New entry in C:\Users\AI1\smbsec3\docs\team_rules_it_dev_team.md to be used by IT Dev Team itself.
3. Business Test
3a: Motivation: I/Stefan should not spend days not there are not available to test every corner, and as previously find stuff that doesn't work, doesn't work reasonable/trustworthy, find text/concept/description/functionality inconsistencies in menu option, title, text, ..., simple failures in pages at different stages of user interaction in main user flow (1st visit by ANON, logon, magic email, if it is in sync will all documentation (or vice versa).
3b: Start Business Test Team with as many BA/test agents you think fit for them to make sure that 3a doesn't happen.
    In addition to functional testing, BA agents must perform a structured walkthrough per-user-type sense-check on every screen: for each user type that can reach a page, and the pages linked from page, (anon, new owner, existing owner, invited-not-yet-joined, employee):
    Examples - do at least this - but analyze/consider what makes sense in each case (from the perspective of main product vision and user-flows.md): verify that all visible text, form fields, and instructions are relevant, correct, make sense, and not asking for information the system already has - for THIS user and this user is about to do and in the situation this user is, and where user is coming from.
    Confusing or irrelevant content is a defect, same as broken functionality. Let team use email information in C:\Users\AI1\smbsec3\docs\test_user_emails.md to test everything - might need to delete previous test usage in Supabase so fresh/new usage with same emails can be done.
    All tests must succeed. Put findings into features (small stuff can be grouped into one feature), group it into High, Medium, Low priority. Put Low priority into deferred, and put High and Medium priority into a next PI. Make sure they do it by their own rule in team_rules_test_team.md (when something has been put in there).
3c: All tests must succeed. In case of defects a feature and defect goes back to IT Dev team and must be remediated, including possible new test cases to cover possible new code, before PI can be closed and features can be set to Deployed or Done. In case of defects the PI goes back into 2. PI-DEV state.
3d: Prepare for a new PI(s) based on features in High and medium priority. Push previously non-prioritized PI's to later to make room for new PI(s). And iterate for as many PI(s) defined to solve High and Medium found. I.e. go back to 2 (Feature development PI's) defined above - with full scope, starting by involving Product Team to follow process. After PI(s), eventually doing yet another Business Test. If, at that time High or Medium priority findings come up, or if some feature done is not really done or still is causing problems, then stop and escalate to me/Stefan (4 below) because it seems to be causing systemic trouble and we are close to the end of the mega-iteration anyway.
3e: (Intent: Retrospective for continous improvement of team process) Coordinate teams suggestions for and agree to one process thing Business test team wants to do differently from now on, and put it into C:\Users\AI1\smbsec3\docs\team_rules_test_team.md. It may not contradict development process in CLAUDE.md and referenced documents. If team thinks otherwise, you cannot allow it, because process should not be interrupted, but collect it in C:\Users\AI1\smbsec3\docs\team_rules_suggestions_for_Stefan.md with timestamp+proposer+why for next Stefan conversation in 1e or when next dialogue happens.
4. Hand over solution as-is
Hand over what has been done to me with a short comment. I can read the documents. Note trouble that might have caused development process ablve to stop. And if a team has noted stuff in team_rules_suggestions_for_Stefan.md. Let Stefan assess and consider if more is needed, based on your suggestion.

## Comprehensive process:
In case of non-PI work we do and e.g. small incidents, we CAN align on a simpler approach or what parts of the Development approach we can neglect. Per default the above Development Approach is always the rule.

## Brief to agents:
According to above where mentioned (e.g. to Product Team). See also \docs\agents\roles.md. Also, don't show agents this full CLAUDE.md but brief them on their (sub) process/tasks and deliverables at hand.

### Product Team
Consists of individual AI agents (not you rotating), coordinated by you. Each time Product Team is used, start 5 individual agents with roles of: Product Manager, UX designer, Security Expert, Architect, Business Analyst.

### IT Dev Team
Consists of 1..n individual AI agents (not you rotating), coordinated by you. Only 1 agent if features are very interrelated. E.g. 5 agents for each of 5 features is they are fully independent features. It depends - you know best what makes sense based on features.

### Business Test Team
You coordinate a number of individual AI agents (not you rotating) to test full solution at end of PI.
Reason: Too many times have I used half or full days to test, and find things that were not entirely according to features.
Goal:
- Walkthrough of all combinations of user types, creatings of new users, existing users, ANON and logged in, menu options, options to select, checklist usage, choices.
- Also check for inconsistencies in naming/description on menu items/links/topics.
- Also check if it all looks and functions nice/easy.
Issues found:
- To be put in new feature(s) (in features.md and backlog.md) for Product Team consider as usual the start of next PI. Based on topics, you decide to put it into 1..n feature(s).

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Playwright
All code lives in `frontend/`. No separate backend.

## Commands
Run inside `frontend/`:

```bash
npm run dev       # dev server (--webpack; Turbopack unstable on Windows)
npm run build     # production build + TypeScript check
npm run lint      # ESLint (--max-warnings=0)
npm run test:e2e  # Playwright E2E tests
```

## Push checklist
Before every git push:
1. `npm run lint` — zero warnings
2. `npm run build` — clean
3. `npm run test:e2e` — locally, for changed flows
4. `git push` → wait for CI green — never push again until green
5. Update features.md status

After final PI push (Vercel deploy):
6. Verify live deployment
7. Business Test Team runs full walkthrough

This way:
  - Process-level DoD = feature_rules.md status flow + Development Process section in CLAUDE.md (when is a feature "Done"?)
  - Technical push checklist = the 5 steps above (how to safely ship code)

## Architecture

### Auth (PKCE)
- Passwordless email auth via Supabase (magic link + OTP code fallback)
- PKCE flow (`flowType: "pkce"` in `lib/supabase/client.ts`) — tokens never appear in URLs
- Auth callback at `/auth/callback` exchanges `?code=` for session
- API routes: `supabaseForRequest(req)` in `lib/supabase/server.ts` validates caller JWT, uses service-role for DB writes
- RLS enabled on all tables as defence-in-depth
- Never use `service_role` key in frontend code

### Services
| Service | Purpose | Env vars |
|---|---|---|
| Supabase | Auth + PostgreSQL + RLS | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Vercel | Hosting, auto-deploy on push to main | — |
| Resend | Email delivery (invites + auth via Supabase custom SMTP) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Stripe | Billing (Campaign Pro plan) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Anthropic | AI checklist guidance (Claude Haiku) | `ANTROPIC_API_KEY` |

All services use free tiers. Do not introduce paid dependencies without approval.

### Database
Schema: `smbsec1`. All tables use RLS.

| Table | Purpose |
|---|---|
| `orgs` | Organisation record (name, platform, locale, billing) |
| `org_members` | Membership + role + manager tree |
| `assessments` | One active per org (partial unique index) |
| `assessment_items` | Immutable snapshot of checklist items |
| `assessment_responses` | Per-user responses (done / unsure / skipped) |
| `checklist_items` | Master checklist controls |
| `checklist_groups` | Grouping for checklist items |
| `invites` | Pending invites with token + expiry |
| `campaigns` | Phishing awareness campaigns |
| `campaign_templates` | Built-in + custom campaign templates |
| `campaign_recipients` | Per-recipient tracking (sent/clicked/reported) |
| `audit_logs` | Org lifecycle events |
| `user_checklists` | Legacy localStorage sync — do not extend |

SQL migrations: `docs/sql/` (001–020). Applied manually in Supabase SQL editor.

### Key routes
| Route | Auth | Purpose |
|---|---|---|
| `/` | Public | Landing page (auth-aware: shows "Go to workspace" if signed in) |
| `/login` | Public | Magic link + OTP code entry |
| `/auth/callback` | Public | PKCE code exchange |
| `/checklist` | Public | Browse-only checklist (read-only for anon, interactive if signed in) |
| `/summary` | Public | Progress summary (sign-in required for real data) |
| `/privacy` | Public | GDPR privacy policy |
| `/onboarding` | Protected | First-time org setup |
| `/workspace` | Protected | Hub — links to all workspace pages |
| `/workspace/checklist` | Protected | Interactive checklist with AI guidance |
| `/workspace/dashboard` | Protected | Team progress overview |
| `/workspace/report` | Protected | Printable security posture report |
| `/workspace/campaigns/*` | Protected | Campaign creation, templates, results |
| `/workspace/billing` | Protected | Plan comparison, Stripe checkout |
| `/workspace/team` | Protected | Member list, invites |
| `/workspace/settings` | Protected | Org settings + GDPR data export/deletion |

## Key Constraints
- One active assessment per org at a time (enforced by DB partial unique index)
- Assessment items are immutable once created (full snapshot on assessment start)
- Hard deletes only — no soft-delete flags
- Schema is `smbsec1`, not `public`
- localStorage pages must guard renders with a `mounted` state (hydration mismatch)
- `npm run lint` uses `--max-warnings=0` — any warning fails CI

## Documentation Map
Must comply to these .md documents when work comes agross topics covered (check if unsure to make sure no previously defined rule/process/knowledge/WoW is skipped by mistake)
| Doc | Purpose | Status |
|---|---|---|
| `docs/agents/roles.md` | Agent roles | Current |
| `docs/pi3–pi??/` | Historical PI planning + BA verification | Archive — read-only |
| `docs/product/backlog.md` | Backlog, per PI, historical and next PI's (roadmap) in sync with features.md, must be maintained according to this CLAUDE.md + backlog.rules.md + feature_rules.md | Current and Update continously |
| `docs/product/features.md` | Feature list, in sync with backlog.md, must be maintained according to this CLAUDE.md + backlog.rules.md + feature_rules.md | Current and Update continously |
| `docs/product/backlog_rules.md` | very important dev process description/requirement, together with this CLAUDE.md | Current |
| `docs/product/feature_rules.md` | very important dev process description/requirement, together with this CLAUDE.md | Current |
| `docs/sql/` | Usually not needed. Database migrations, put new SQL scripts here, mainly to preserve history because most can be deducted from Supabase | Source of truth for schema |
| `docs/10_design-system.md` | UI principles, visual tokens | Current |
| `docs/team_rules_...md` | 3 Rule files used and maintained by the specific team according to development process, and one with suggestions for me | Current and Updated continously |
| `docs/test_user_emails.md` | Test users and their emails needed for testing | Current |
| `docs/test-strategy.md` | Test strategy reflected in Development process here in CLAUDE.md. This test strategy must be followed at all times  | Current |
| `docs/user-flows.md` | This document maps every page in the application, who can access it, what they see, and how they navigate between screens | Current |
| `frontend/.env.local` | Environment variables for Supabase, Resend, Next.js, Anthropic, Playwright, ... | Current |
| `frontend/tests` | See test_strategy.md | Current |
| `frontend/test-results` | See test_strategy.md | Current |

## Components
Before creating a new component, check frontend/components/ for existing ones. Prefer composing existing components over creating new ones. Keep the component count low — three similar lines of code is better than a premature abstraction.

