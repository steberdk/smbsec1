export type ChecklistStatus = "todo" | "done" | "skipped" | "unsure";

export type ChecklistGroupId =
  | "accounts"
  | "email"
  | "patching"
  | "backups"
  | "access"
  | "human"
  | "network";

export type Impact = "high" | "medium" | "low";
export type Effort = "minutes" | "hour" | "day";

export type ChecklistItem = {
  id: string;                 // stable key, never change after release
  groupId: ChecklistGroupId;

  title: string;              // short: shows in list
  outcome: string;            // what the user gets by doing it
  whyItMatters: string;        // 1–2 sentences
  steps: string[];            // plain steps (MVP 0 guidance)
  timeEstimate: string;       // e.g. "3–5 minutes"
  impact: Impact;
  effort: Effort;

  tags?: string[];            // e.g. ["mfa", "google-workspace", "m365"]
};

export type ChecklistGroup = {
  id: ChecklistGroupId;
  title: string;
  description: string;
  order: number;
};

export type ChecklistProgress = Record<string, ChecklistStatus>;

export type ChecklistDefinition = {
  version: number;            // bump if you change item list in a breaking way
  groups: ChecklistGroup[];
  items: ChecklistItem[];
};
