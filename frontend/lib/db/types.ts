/**
 * TypeScript shapes for Supabase database rows.
 * These mirror the table schemas defined in docs/sql/.
 * Used by API routes — never import into browser/client components.
 */

export type EmailPlatform =
  | "google_workspace"
  | "microsoft_365"
  | "gmail_personal"
  | "other";

export type PrimaryOs = "windows" | "mac" | "mixed";

export type CompanySize = "1-5" | "6-20" | "21-50" | "50+";

export type OrgRole = "org_admin" | "employee";

export type AssessmentScope = "org";

export type AssessmentStatus = "active" | "completed";

export type ResponseStatus = "done" | "unsure" | "skipped";

export type ItemTrack = "it_baseline" | "awareness";

export type Impact = "high" | "medium" | "low";

export type Effort = "minutes" | "hour" | "day";

// ---------------------------------------------------------------------------

export type OrgRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  email_platform: EmailPlatform | null;
  primary_os: PrimaryOs | null;
  company_size: CompanySize | null;
};

export type OrgMemberRow = {
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_it_executor: boolean;
  email: string | null;
  display_name?: string | null;
  created_at: string;
};

export type AssessmentRow = {
  id: string;
  org_id: string;
  created_by: string;
  scope: AssessmentScope;
  root_user_id: string | null;
  status: AssessmentStatus;
  created_at: string;
  completed_at: string | null;
};

export type AssessmentItemRow = {
  id: string;
  assessment_id: string;
  checklist_item_id: string;
  group_id: string;
  title: string;
  description: string | null;
  order_index: number;
  track: ItemTrack;
  impact: Impact | null;
  effort: Effort | null;
  why_it_matters: string | null;
  steps: string[];
  created_at: string;
};

export type AssessmentResponseRow = {
  assessment_id: string;
  assessment_item_id: string;
  user_id: string;
  status: ResponseStatus;
  updated_at: string;
};

export type InviteRow = {
  id: string;
  org_id: string;
  invited_by: string;
  email: string;
  role: "employee";
  is_it_executor: boolean;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  updated_at: string;
};

export type ChecklistGroupRow = {
  id: string;
  title: string;
  description: string | null;
  track: ItemTrack;
  order_index: number;
  active: boolean;
  created_at: string;
};

export type StepsMap = Record<string, string[]>;

export type ChecklistItemRow = {
  id: string;
  group_id: string;
  track: ItemTrack;
  title: string;
  outcome: string | null;
  why_it_matters: string | null;
  steps: StepsMap;
  time_estimate: string | null;
  impact: Impact | null;
  effort: Effort | null;
  tags: string[];
  order_index: number;
  active: boolean;
  created_at: string;
};
