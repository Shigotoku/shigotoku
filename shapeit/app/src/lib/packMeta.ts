export type PackWorkStatus = "open" | "in_progress" | "shipped";

export interface FixPackMeta {
  id: string;
  pageKey: string;
  organizationId?: string;
  uid?: string;
  assignee?: string;
  prUrl?: string;
  workStatus?: PackWorkStatus;
  branchName?: string;
  note?: string;
}
