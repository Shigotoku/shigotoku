import type { FeedbackSource } from "./types";

export type FeedbackDeviceFilter = "all" | "pc" | "mobile";

const MOBILE_SOURCES: FeedbackSource[] = ["MOBILE_PWA", "SHARE_TARGET"];

export function isMobileFeedbackSource(source?: FeedbackSource): boolean {
  return source != null && MOBILE_SOURCES.includes(source);
}

export function isPcFeedbackSource(source?: FeedbackSource): boolean {
  if (!source) return true;
  return !isMobileFeedbackSource(source);
}

export function feedbackDeviceLabel(source?: FeedbackSource): string {
  if (isMobileFeedbackSource(source)) return "携帯";
  if (source === "CHROME_EXTENSION") return "PC・拡張";
  return "PC";
}

export function matchesDeviceFilter(source: FeedbackSource | undefined, filter: FeedbackDeviceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "mobile") return isMobileFeedbackSource(source);
  return isPcFeedbackSource(source);
}
