# feature_rules.md

## Main Rule
All development must bemaintained in a Feature (in \docs\product\features.md) during every work related to feature, from idea to finished accept tested delivery, according to \docs\product\feature_rules.md
Read this file before maintaining features.

## Feature purpose
- To have high level / business / requirements in place, and
- To be able to easily prioritize because features are described in same standard.

## Feature Definition
Each feature is defined in features.md (not historical/previous features, but existing not yet developed and new feature ideas)
Features are added to features.md at the end of file with next available Feature Number.

Each feature has these sections - create/maintain list of sections, see their description and examples below:
(sections might be very short if feasible, even N/A if a section never or not yet applies to a feature, or there is no reasonable information. Examples are unrelated to this project)
Feature Number
- Unique feature number.
Feature Status
- Valid Values: Created; Funnel; Backlog; Ready; Developed; Deployed; Done.
- Explanation:
   - Created (when someone creates feature based on idea with the few informations available);
   - Funnel (when decided by Product Team it should be analyzed/clarified by Product Team, e.g to figure out how important it is, what to do, etc);
   - Backlog (when Product Team did feature business analysis/clarification and feature is ready for IT Dev team refinement when feature is prioritized for it);
   - Ready (when refined by IT Dev team (refinement might loop back to Product Team in case of IT Dev team need) and IT Dev team agrees it's refined);
   - Developed (when feature has been tested in local environment and is ready for deployment);
   - Deployed (when feature is deployed);
   - Done (when feature is successfully E2E tested, and regression tests have been successfully done).
- A feature can go forward and back in statusses (back in case of questions, issues, etc)
Feature/Use case name
- One sentence decribing what is wanted/needed/prepared/.. to be able/etc. ..., so something profound is in place. Subset of Business Value Hypothesis.
- Example: As Corporate Finance user I want to be able to drill down to cost per product budgeted and actually sold, so it can be compared to sales turnover.
Business Value Hypothesis
- Full hypothesis sentence(s) that fully explains high level what is being done to implement something to achieve a goal.
- Example: As Corporate Finance user I want to be able to define cost details, and it executed during DW-flow execution, and in Oracle Discoverer have 2 new subject areas for matrix/visualization creation and drill down to cost per product budgeted and actually sold, so it can be compared to sales turnover, so full organization from top mgt. to individual sales mgr., can see cost of sales – i.e. be able to assess what products to sell more of and not sell product with too high discount at a loss. Estimated between …-… DKK.
Importance
- This is how important feature is, and why. Can be deducted from Business Value Hypothesis.
- This is a new section, so section can be N/A if not yet decided.
Urgency
- Is this feature urgent, and why? Can be deducted from Business Value Hypothesis
- Note: importance & Urgency come in pair. Importance can be high due to .. bla bla .., while urgency can be low because we don't need it yet. 
- This is a new section, so section can be N/A if not yet decided.
Acceptance Criteria
Scope
- Example: Design, Code, Test, Implement Gross Profit (budget) simulation and Gross Profit (actuals) calculation. In backend DW jobs based on sales budget and actuals, and based on master data owned/maintained Corporate Finance, according to data & calculation description attacted.
- Example: Code, Test, Implement in front-end self-service BI environment subject area’s for visualization according to attached design spec. In sync with existing budget/actuals/opportunity subject areas. And according to existing top-down need-to-restrict access privileges.
Not in Scope
- Example: Enforcement – done by Corp. Finance & regional sales controllers.
- Example: Production knowledge. Calculation done based on described link of sales to product category/subcategory and geographical location.
Stakeholders and their involvement
- Who team should reach out to, in which matters. (Team being either Product Team to investigate, BA's to analyze or accept test, testers, Dev Team, anyone)
- Example: Corporate Finance / Søren : System owner. Requester. Corp. Finance and division/regional controller project lead, and org. implementation.
- Example: Divisional/Regional controllers and SME’s : Super users, how need guidance on how to use standard reports and interpret information.
Dependencies
- Example: Java/front-end team : Data maintenance screen’s for master data used by corp. finance and for view by others. Agreed Q4.
Risk and amount of Test
- Explanation (Risk and amount of Test consists of): 1) Identified Risks. 2) Code and release risks assessed according to Chance and Impact. Change and Impact from 1(low) to 3(high) scale to access how much test and fallback must be planned in. I.e. medium chance with low impact is irrelevant. Low chance but high impact is serious.
- Determines exact the amount of new test cases to be created and possible migration preparations.
- Before feature is Ready, exact test cases to be created are defined, and if they should be invluded in the sub set of regression test cases. In local DEV environment, for tests done with Github push, for tests done with Vercel deploy.
Complexity estimate
- Example: Large – as budget system. Summarize detailed SP from Features.
Pages touched
- List of page matrices under `docs/quality/matrices/` that the feature modifies. The feature's PR must update every listed matrix in the same commit (matches `team_rules_product_team.md` Rule 4 and `team_rules_it_dev_team.md` Rule 2).
- Accepted values: a list like `home.md, team.md` OR the literal string `N/A — backend/infra only` with a one-line justification (e.g. "test harness; no user-visible page affected").
- Populated by Business Analyst at step 2b. If left blank, refinement is not complete.
Invariants touched
- List of invariant IDs from `docs/quality/invariants.md` that the feature must preserve or extend. Use the existing IDs; propose new ones (to be added by BA) if a defect class spans more than one page.
- Accepted values: a list like `INV-home-exec-parity, INV-state-pure-of-navigation` OR `N/A` with justification.
Description/Details
- Info PO/Team would typically include, attachments, refined information, how-to – if available or added along the way.

## Exception on previously done features
Features done in previous PI's are to be kept as-is in backlog and not comply to rules in this document, not create a feature according to this document for them - because they are already done and improving festure information provides no value for them.

## When initializing these rules
It is OK to have features with only initial/preliminary name and feature number and initial status ("Created").
Reason: Product Team can later clarify feature information when it should be analyzed/clarified.
