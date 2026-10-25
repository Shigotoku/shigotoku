import type { IssueCategory, Severity } from "./types";

export interface IssueTemplateDefaults {
  priorityScore?: number;
  severity?: Severity;
  assignee?: string | null;
}

const TEMPLATES: Partial<Record<IssueCategory, IssueTemplateDefaults>> = {
  BUG: { priorityScore: 65, severity: "S1" },
  SECURITY: { priorityScore: 95, severity: "S0" },
  PERFORMANCE: { priorityScore: 60, severity: "S2" },
  UX: { priorityScore: 50, severity: "S2" },
  UI: { priorityScore: 45, severity: "S3" },
  FEATURE: { priorityScore: 35, severity: "S3", assignee: null },
  COPY: { priorityScore: 30, severity: "S3" },
  IDEA: { priorityScore: 30, severity: "S3", assignee: null },
  OTHER: { priorityScore: 35, severity: "S3" },
};

export function applyIssueTemplate(
  category: string,
  base: { priorityScore: number; severity: Severity | string; assignee?: string | null },
) {
  const t = TEMPLATES[category as IssueCategory];
  return {
    priorityScore: Math.max(base.priorityScore, t?.priorityScore ?? base.priorityScore),
    severity: (t?.severity ?? base.severity) as Severity,
    assignee: t?.assignee !== undefined ? t.assignee : base.assignee ?? null,
  };
}
