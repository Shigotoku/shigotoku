import { initializeApp } from "firebase/app";
import { browserSessionPersistence, initializeAuth } from "firebase/auth";

// Firebase Web の設定値は公開前提(秘密ではない)。権限判定はサーバー側 members で行う。
export const app = initializeApp({
  apiKey: "AIzaSyCiIrJyq4rpcW_0clA5MNZ_FLWWf-oHfY4",
  authDomain: "shigotoku-raiseit-prod.firebaseapp.com",
  projectId: "shigotoku-raiseit-prod",
  appId: "1:973742525375:web:6598a25b2e2e3ee9476f0a",
});
// ログイン状態はブラウザのタブ/ウィンドウを閉じると消える(次回は必ずログイン画面が出る)。
export const auth = initializeAuth(app, { persistence: browserSessionPersistence });

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch(`/api${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
  return r.json();
}

export type Impact = { kind: string; low?: number; mid?: number; high?: number; basis: string; label: string };
export type Action = {
  id: string; rule: string; category: string; title: string; why: string[]; how: string[]; impact: Impact;
  confidence: number; confidenceLabel: string; effortMin: number; risk: "low" | "mid" | "high"; approval: string;
  priority: number; url?: string;
  evidence?: { sections?: GapSection[] };
  /** そのまま貼れる依頼文。ai=ChatGPT/Cursor 等への指示、vendor=制作会社・担当者への依頼 */
  instructions?: { ai: string; vendor: string };
};
/** 計測乖離(trk-gap)のページ群別の内訳 */
export type GapSection = { section: string; clicks: number; orgSessions: number; ratioPct: number | null; audited: number; noTag: number };
export type Summary = {
  generatedAt: string;
  site: { id: string; name: string };
  period: { from: string; to: string; days: number; latest: string };
  northStar: { label: string; event: string; cur: number; prev: number; deltaPct: number | null; weekly: { from: string; to: string; leads: number }[]; note: string };
  funnel: { sessions: number; sessionsPrev: number; engaged: number; formStart: number; leads: number; sessionToLeadPct: number; formAbandonPct: number | null; note: string };
  channels: { channel: string; sessions: number; prevSessions: number; leads: number; prevLeads: number; cvrPct: number }[];
  ai: { sessions: number; prev: number; sources: { source: string; sessions: number }[] };
  seo: { clicks: number; impressions: number; ctrPct: number; position: number; prev: { clicks: number; impressions: number; ctrPct: number; position: number }; queryCoveragePct: number };
  conversion: { leadsPer100Clicks: number; note: string };
  landing: { path: string; sessions: number; orgSessions: number; sessionPerClick: number; leads: number; cvrPct: number }[];
  competitors?: Competitor[];
  audit?: { date: string | null; checked: number; clean: number };
  actions: Action[];
  thisWeek: string[];
  skipList: { id: string; title: string; reason: string }[];
  effects: { date: string; note: string; url: string | null; days: number; afterDays: number; before: Record<string, number>; after: Record<string, number> | null; caveat: string; verdict: string }[];  freshness: { id: string; label: string; latest: string | null; lagDays: number | null; status: string; note: string }[];
  limits: string[];
  pagesTop: { path: string; clicks: number; impressions: number; ctrPct: number; position: number; prevClicks: number }[];
};
export type ActionState = Record<string, { status: string; note: string; by?: string; updatedAt?: string }>;
export type Finding = { rule: string; severity: string; label: string; line: number; match: string; advice: string };
export const pct = (n: number | null | undefined) => (n == null ? "-" : `${n > 0 ? "+" : ""}${n}%`);
export const yen = (n: number) => n.toLocaleString("ja-JP");


export type Detail = {
  period: { from: string; to: string; prevFrom: string; prevTo: string; days: number };
  notes: { queries: string; devices: string };
  daily: { date: string; clicks: number; impressions: number; position: number; sessions: number; engaged: number; leads: number; formStart: number }[];
  intents: { intent: string; queries: number; clicks: number; impressions: number; prevClicks: number }[];
  queries: { query: string; intent: string; clicks: number; impressions: number; ctrPct: number; position: number; prevClicks: number; prevImpressions: number; prevPosition: number; topPage: string }[];
  pages: { path: string; clicks: number; impressions: number; ctrPct: number; position: number; prevClicks: number; prevImpressions: number; prevPosition: number; sessions: number; orgSessions: number; sessionPerClick: number; leads: number; cvrPct: number }[];
  sources: { name: string; channel: string; sessions: number; prevSessions: number; engaged: number; engagedPct: number }[];
  devices: { device: string; clicks: number; impressions: number; ctrPct: number; position: number; prevClicks: number }[];
  views: { path: string; views: number; prevViews: number; sessions: number; avgEngageSec: number; engagedPct: number }[];
  weekdays: { dow: string; sessions: number; leads: number; clicks: number }[];
};

export type Competitor = { id: string; name: string; url: string; ok: boolean; note: string; lastDate: string; home: { title: string; desc: string; h1Count: number; jsonldTypes: string[] } | null; sitemapCount: number | null; sitemapTrend: { date: string; count: number | null }[]; newCount: number; newPages: { url: string; title?: string; desc?: string; date: string }[]; removedCount: number; weeks: number };
