import { type Locale, t } from "./i18n";

export function issueStatusLabel(status: string, locale: Locale): string {
  const key = `issue_status_${status}`;
  const label = t(key, locale);
  return label === key ? status : label;
}

export function issueCategoryLabel(category: string, locale: Locale): string {
  const key = `issue_category_${category}`;
  const label = t(key, locale);
  return label === key ? category : label;
}

export const ISSUE_CATEGORIES = [
  "BUG",
  "UX",
  "UI",
  "FEATURE",
  "COPY",
  "PERFORMANCE",
  "SECURITY",
  "OTHER",
] as const;

export const ISSUE_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "verify",
  "done",
  "archived",
] as const;
