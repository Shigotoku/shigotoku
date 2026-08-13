import type { Feedback, Issue } from "./types";
import { canonicalizePageKey } from "./pageKey";

export interface FixPackItem {
  issue: Issue;
  feedbacks: Feedback[];
  reportCount: number;
}

export interface FixPack {
  id: string;
  pageKey: string;
  label: string;
  sampleUrl: string;
  categories: string[];
  maxSeverity: string;
  openIssueCount: number;
  reportCount: number;
  urgencyScore: number;
  productAreas: string[];
  items: FixPackItem[];
  issues: FixPackItem[];
}

export interface FixPackCluster {
  id: string;
  label: string;
  reason: string;
  issues: FixPackItem[];
}

const SEV: Record<string, number> = { S0: 4, S1: 3, S2: 2, S3: 1 };

export function pageKeyOfIssue(issue: Issue, linked: Feedback[]) {
  const url = linked.find((f) => f.pageUrl)?.pageUrl || "";
  return canonicalizePageKey(url);
}

export function buildFixPacks(issues: Issue[], feedback: Feedback[]): FixPack[] {
  const byId = new Map(feedback.map((f) => [f.id, f]));
  const groups = new Map<string, FixPackItem[]>();
  for (const issue of issues) {
    if (issue.status === "done" || issue.status === "archived") continue;
    const linked = issue.feedbackIds.map((id) => byId.get(id)).filter(Boolean) as Feedback[];
    const key = pageKeyOfIssue(issue, linked);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push({ issue, feedbacks: linked, reportCount: linked.length || 1 });
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([pageKey, items]) => {
    const cats = Array.from(new Set(items.map((i) => String(i.issue.category))));
    const maxSeverity = items.reduce((m, i) => (SEV[i.issue.severity] > SEV[m] ? i.issue.severity : m), "S3");
    const reportCount = items.reduce((s, i) => s + i.reportCount, 0);
    const sampleUrl = items.flatMap((i) => i.feedbacks).find((f) => f.pageUrl)?.pageUrl || pageKey;
    return {
      id: pageKey,
      pageKey,
      label: pageKey.replace(/^https?:\/\//, ""),
      sampleUrl,
      categories: cats,
      maxSeverity,
      openIssueCount: items.length,
      reportCount,
      urgencyScore: reportCount * (SEV[maxSeverity] || 1),
      productAreas: Array.from(new Set(items.map((i) => i.issue.productArea).filter(Boolean))),
      items,
      issues: items,
    };
  });
}

export function findFixPack(packs: FixPack[], id: string) {
  return packs.find((p) => p.id === id || p.pageKey === id);
}

export function splitPackIntoClusters(pack: FixPack): FixPackCluster[] {
  const byCat = new Map<string, FixPackItem[]>();
  for (const item of pack.items) {
    const k = String(item.issue.category || "OTHER");
    byCat.set(k, [...(byCat.get(k) ?? []), item]);
  }
  if (byCat.size <= 1) {
    return [{ id: "all", label: pack.label, reason: "同一画面", issues: pack.items }];
  }
  return Array.from(byCat.entries()).map(([cat, issues]) => ({
    id: cat,
    label: cat,
    reason: "カテゴリで分割",
    issues,
  }));
}

export function clusterAsPack(pack: FixPack, cluster: FixPackCluster): FixPack {
  return {
    ...pack,
    items: cluster.issues,
    issues: cluster.issues,
    openIssueCount: cluster.issues.length,
    reportCount: cluster.issues.reduce((s, i) => s + i.reportCount, 0),
    label: `${pack.label} / ${cluster.label}`,
  };
}
