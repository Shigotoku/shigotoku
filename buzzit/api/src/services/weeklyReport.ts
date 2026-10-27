import { getMetrics, getPosts, getScheduledJobs, getUserSettings } from './firestore';
import { getTrends } from './trends';
import { postToSlackWebhook } from './slack';
import { getXSeriesWeeklyStats } from './xSeriesExtras';

export interface WeeklyReport {
  periodLabel: string;
  healthScore: number;
  funnel: {
    posts: number;
    reach: number;
    clicks: number;
    lineSignups: number;
    revenue: number;
  };
  scheduled: {
    published: number;
    notified: number;
    failed: number;
    pendingApproval: number;
  };
  topPosts: Array<{ title: string; reach: number; revenue: number }>;
  topTrend: { topic: string; hook: string; score: number } | null;
  xSeries: {
    publishedThisWeek: number;
    failedThisWeek: number;
    approvedStockTotal: number;
  };
  recommendations: string[];
  nextWeekActions: string[];
}

function weekBounds(now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return { start, end };
}

export async function buildWeeklyReport(uid: string): Promise<WeeklyReport> {
  const { start, end } = weekBounds();
  const [metrics, posts, jobs, trends, xSeries] = await Promise.all([
    getMetrics(uid),
    getPosts(uid),
    getScheduledJobs(uid),
    getTrends(uid).catch(() => []),
    getXSeriesWeeklyStats(uid).catch(() => ({
      publishedThisWeek: 0,
      failedThisWeek: 0,
      approvedStockTotal: 0,
    })),
  ]);

  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t <= end.getTime();
  };

  const weekJobs = jobs.filter((j) => inWeek(j.scheduledAt) || inWeek(j.createdAt));
  const scheduled = {
    published: weekJobs.filter((j) => j.status === 'published').length,
    notified: weekJobs.filter((j) => j.status === 'notified').length,
    failed: weekJobs.filter((j) => j.status === 'failed').length,
    pendingApproval: jobs.filter((j) => j.status === 'pending_approval').length,
  };

  const topPosts = [...posts]
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))
    .slice(0, 3)
    .map((p) => ({ title: p.title, reach: p.reach ?? 0, revenue: p.revenue ?? 0 }));

  const activeTrends = trends.filter((t) => t.status === 'active' || !t.status);
  const topTrend = activeTrends[0]
    ? { topic: activeTrends[0].topic, hook: activeTrends[0].hook, score: activeTrends[0].score }
    : null;

  const recommendations: string[] = [];
  if (scheduled.failed > 0) {
    recommendations.push(`失敗した投稿が ${scheduled.failed} 件あります。カレンダーから再試行してください。`);
  }
  if (xSeries.failedThisWeek > 0) {
    recommendations.push(`Xシリーズの投稿失敗が ${xSeries.failedThisWeek} 件。リスト画面で再試行できます。`);
  }
  if (xSeries.approvedStockTotal < 7) {
    recommendations.push(`Xシリーズ在庫が ${xSeries.approvedStockTotal} 本です。AI一括生成で補充しましょう。`);
  }
  if (scheduled.pendingApproval > 0) {
    recommendations.push(`承認待ちが ${scheduled.pendingApproval} 件。コクピットで承認すると運用が回り続けます。`);
  }
  if (metrics.funnel.lineSignups < 5) {
    recommendations.push('LINE導線を強化：プロフィールリンクと投稿CTAを揃えましょう。');
  }
  if (topTrend) {
    recommendations.push(`トレンド「${topTrend.topic}」に乗った1本を今週のバズ枠にしましょう。`);
  }
  if (!recommendations.length) {
    recommendations.push('順調です。来週も「今日の1本」を朝に承認するルーティンを続けてください。');
  }

  // 「来週やる3こと」を先頭に固定（最大3）
  const nextWeekActions = [
    scheduled.pendingApproval > 0
      ? '承認待ちを朝イチで処理する'
      : '火・木の空き枠に投稿を1本ずつ予約する',
    topTrend
      ? `トレンド「${topTrend.topic}」でバズ枠を1本作る`
      : 'ボイスドラフトで現場の一言から1本作る',
    metrics.funnel.lineSignups < 10
      ? 'プロフィール導線とLINE特典を見直す'
      : '伸びた投稿を勝ちパターンに保存する',
  ].slice(0, 3);

  const periodLabel = `${start.toLocaleDateString('ja-JP')} 〜 ${end.toLocaleDateString('ja-JP')}`;

  return {
    periodLabel,
    healthScore: metrics.healthScore,
    funnel: metrics.funnel,
    scheduled,
    topPosts,
    topTrend,
    xSeries,
    recommendations: [...nextWeekActions.map((a) => `来週: ${a}`), ...recommendations].slice(0, 6),
    nextWeekActions,
  };
}

export function formatWeeklyReportSlack(report: WeeklyReport): string {
  const top = report.topPosts[0]
    ? `トップ投稿: ${report.topPosts[0].title}（リーチ ${report.topPosts[0].reach.toLocaleString()}）`
    : 'トップ投稿: まだありません';
  const trend = report.topTrend
    ? `注目トレンド: ${report.topTrend.topic} — ${report.topTrend.hook}`
    : '注目トレンド: 更新待ち';

  return [
    `📊 *【週次レポート】* ${report.periodLabel}`,
    `健康スコア: ${report.healthScore}`,
    `リーチ ${report.funnel.reach.toLocaleString()} / LINE追加 ${report.funnel.lineSignups} / 推計売上 ¥${report.funnel.revenue.toLocaleString()}`,
    `投稿結果: 公開 ${report.scheduled.published} / 通知 ${report.scheduled.notified} / 失敗 ${report.scheduled.failed}`,
    `Xシリーズ: 今週 ${report.xSeries.publishedThisWeek} 本投稿 / 在庫 ${report.xSeries.approvedStockTotal} 本`,
    top,
    trend,
    '',
    ...report.recommendations.map((r) => `• ${r}`),
    '',
    '👉 https://app.buzzit.shigotoku.com/analytics',
  ].join('\n');
}

export async function sendWeeklyReportsToSlack(): Promise<number> {
  const { getAllUsersWithSlack } = await import('./firestore');
  const users = await getAllUsersWithSlack();
  let sent = 0;
  for (const user of users) {
    if (!user.slackWebhookUrl) continue;
    if (!['pro', 'team', 'growth', 'enterprise'].includes(user.plan)) continue;
    try {
      const report = await buildWeeklyReport(user.uid);
      const ok = await postToSlackWebhook(user.slackWebhookUrl, formatWeeklyReportSlack(report));
      if (ok) sent++;
    } catch (err) {
      console.error(`weekly report failed for ${user.uid}`, err);
    }
  }
  return sent;
}

export async function buildWeeklyReportForUser(uid: string): Promise<WeeklyReport> {
  await getUserSettings(uid);
  return buildWeeklyReport(uid);
}
