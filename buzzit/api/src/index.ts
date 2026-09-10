import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { createSignedUploadUrl, uploadBufferToGcp } from './services/storage';
import {
  ACCEPTED_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  checkBrandSafety,
} from './services/repurpose';
import {
  generateRepurposeWithGemini,
  generateXSeriesBatchWithGemini,
  voiceDraftWithGemini,
} from './services/gemini';
import { getAyrshareProfiles } from './services/ayrshare';
import {
  ensureUser,
  getUserSettings,
  updateUserSettings,
  getXApiPostsThisMonth,
  type UserSettings,
  getMetrics,
  getPosts,
  addPost,
  addSlackIdea,
  getSlackIdeas,
  approveSlackIdea,
  createScheduledJob,
  getScheduledJobs,
  approveScheduledJob,
  retryScheduledJob,
  revertScheduledJobToDraft,
  updateScheduledJob,
  trackMetricEvent,
  createTrackingLink,
  getTrackingLink,
  recordTrackingClick,
  findUserByLineDestination,
  listPostInsights,
  createSharedInsightsReport,
  getSharedInsightsReport,
} from './services/firestore';
import { buildWeeklyReportForUser } from './services/weeklyReport';
import { buildInsightsSummary, syncInsightsForUser } from './services/insightsSync';
import {
  buildInsightsDashboard,
  recordInsightsDailySnapshot,
  type InsightsPlatformFilter,
} from './services/insightsDashboard';
import { buildInsightsHtmlReport } from './services/insightsReport';
import { buildInsightsPptxBuffer, reportFileBaseName } from './services/insightsReportPptx';
import { buildInsightsPdfBuffer } from './services/insightsReportPdf';
import { randomUUID } from 'crypto';
import {
  listLineFriends,
  setFriendTags,
  fetchProfileAndUpsert,
  markLineFriendUnfollowed,
  enrollInFollowSteps,
  handlePostbackTag,
  touchFriendMessage,
  sendSegmentMessage,
  estimateSegmentReach,
  recordSourceClick,
  listDeliveries,
} from './services/lineCrm';
import {
  addIdeaInbox,
  listIdeaInbox,
  markIdeaUsed,
  listWinningPatterns,
  addWinningPattern,
  listCoupons,
  createCoupon,
  redeemCoupon,
  listChatQueue,
  enqueueChatNeedReply,
  resolveChatQueue,
  buildConnectionHealth,
  notifyApprovalNeeded,
  listHpbConversions,
  upsertHpbConversion,
  draftGbpReviewReply,
  regionalWatchIdeas,
  buildExportBundle,
  toCsv,
  listAuditLogs,
  writeAuditLog,
  listStoreProgress,
} from './services/productExtras';
import {
  verifySlackSignature,
  formatSlackIdeaReply,
  postToSlackWebhook,
} from './services/slack';
import {
  runAutoModeForUser,
  canUseSlack,
} from './services/autoMode';
import {
  computeMonthlyTotal,
  MAX_STAFF_BY_PLAN,
  MAX_STORES_BY_PLAN,
  PLAN_BASE_MONTHLY,
  staffLimitLabel,
  storeLimitLabel,
  ADDITIONAL_STORE_DISCOUNT,
  EXTRA_SNS_ACCOUNT_MONTHLY,
} from './services/billing';
import {
  listStoresForUser,
  createStore,
  setActiveStore,
  listStoreMembers,
  createStoreInvitation,
  listStoreInvitations,
  revokeStoreInvitation,
  removeStoreMember,
  updateStoreMemberRole,
  transferStoreOwnership,
  acceptStoreInvitation,
  getInvitationByToken,
  getUserRoleInStore,
  countPendingInvites,
} from './services/stores';
import {
  generateTrackingToken,
  trackingClickUrl,
  lineWebhookUrl,
  verifyLineSignature,
} from './services/tracking';
import { getTrends, refreshTrends, markTrendUsed } from './services/trends';
import {
  exchangeMetaCode,
  getMetaOAuthUrl,
  resolveMetaAccounts,
} from './services/meta';
import {
  credentialsFromSettings,
  verifyXCredentials,
  X_FREE_MONTHLY_SOFT_LIMIT,
} from './services/xApi';
import {
  listXSeries,
  createXSeries,
  updateXSeries,
  deleteXSeries,
  listXSeriesItems,
  addXSeriesItems,
  updateXSeriesItem,
  deleteXSeriesItem,
  listXScheduleRules,
  createXScheduleRule,
  updateXScheduleRule,
  deleteXScheduleRule,
  parseSeriesCsv,
  parseBulkPasteText,
  approveAllPendingItems,
  seedDefaultXSeriesPack,
  processXSeriesSchedules,
  publishSeriesNow,
  composeTweetText,
} from './services/xSeries';
import { xSeriesCapabilities, assertXSeriesFeature } from './services/xSeriesFeatures';
import {
  buildXSeriesInsights,
  computeNextScheduledPosts,
  exportSeriesToCsv,
  enrichUrlForXPost,
  reorderXSeriesItems,
  moveXSeriesItems,
  retryFailedXSeriesItem,
  voiceToXSeriesBatch,
} from './services/xSeriesExtras';
import { saveOAuthState, consumeOAuthState } from './services/schedulerWorker';
import { assertPostQuota, incrementPostQuota, getPostsThisMonth, freePostLimitForPlan } from './services/planLimits';
import {
  getGoogleOAuthUrl,
  exchangeGoogleCode,
  listGbpAccounts,
  listGbpLocations,
  listGbpReviews,
  fetchGbpInsights,
} from './services/gbp';
import { createCheckoutSession, isStripeConfigured, verifyStripeWebhookSignature } from './services/stripeBilling';
import {
  buildCrossStoreKpis,
  bulkDistributeTemplate,
  listTamperAlerts,
  recordGbpSnapshot,
  saveEnterpriseInquiry,
} from './services/enterprise';
import { importLstepCsv } from './services/lstepMigration';
import { runStrategyAgent } from './services/geminiAgent';
import { resolveTrackingDestination } from './services/tracking';
import type { PublishMode } from './types/schedule';
import {
  createAbTest,
  getAbTests,
  evaluateAbTest,
  evaluateAllRunningAbTests,
} from './services/abTest';
import {
  calcCostComparison,
  calcSegmentComparison,
  calcLineAccountCost,
  MESSAGE_PRESETS,
  LINE_PRICE_PER_MSG,
} from './services/lineCostEstimate.js';
import { requireAuth, type AuthedRequest } from './middleware/auth';
import { requireAdmin, isAdminUid } from './middleware/admin';
import {
  setupAccount,
  getAccountForUser,
  resolveEntitlements,
  listAccountMembers,
  listAllAccounts,
  adminUpdateAccount,
  accountSummaryForSettings,
  userHasAccount,
  inviteAccountMemberByEmail,
  removeAccountMember,
  getAccountMemberRole,
  listAccountInvitations,
  revokeAccountInvitation,
  getAccountInvitationByToken,
  acceptAccountInvitation,
} from './services/accounts';
import { isMailConfigured } from './services/mail';
import { isPaymentConfigured, getActivePaymentProvider } from './services/paymentProvider';
import {
  ACCOUNT_TYPE_LABELS,
  BILLING_STATUS_LABELS,
  EXTRA_ACCOUNT_SEAT_MONTHLY,
} from './services/billing';
import { functionSecrets } from './config/secrets';
import { checkLoginHintRateLimit, getLoginHint } from './services/loginHint';

if (!getApps().length) initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      (req as AuthedRequest).rawBody = buf;
    },
  }),
);

const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'buzzit-api',
    features: ['gemini', 'firestore', 'slack', 'meta-oauth', 'publish-worker', 'auto-mode', 'utm-tracking', 'line-webhook', 'trends', 'ab-tests', 'insights'],
  });
});

// --- Upload ---
const rawUpload = express.raw({ type: '*/*', limit: `${MAX_VIDEO_BYTES}b` });

api.post('/v1/upload', requireAuth, rawUpload, async (req: AuthedRequest, res) => {
  try {
    const fileName = decodeURIComponent(req.header('x-file-name') ?? 'upload.bin');
    const contentType = req.header('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? '');

    if (!buffer.length) {
      res.status(400).json({ error: 'ファイルが空です' });
      return;
    }
    if (!ACCEPTED_TYPES.has(contentType)) {
      res.status(400).json({ error: '対応していないファイル形式です' });
      return;
    }

    const isVideo = contentType.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (buffer.length > maxSize) {
      res.status(400).json({ error: 'ファイルサイズが上限を超えています' });
      return;
    }

    const result = await uploadBufferToGcp(buffer, fileName, contentType);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'アップロードに失敗しました' });
  }
});

api.post('/v1/upload/signed-url', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { fileName, contentType, size } = req.body as {
      fileName?: string;
      contentType?: string;
      size?: number;
    };
    if (!fileName || !contentType || typeof size !== 'number') {
      res.status(400).json({ error: 'fileName, contentType, size が必要です' });
      return;
    }
    if (!ACCEPTED_TYPES.has(contentType)) {
      res.status(400).json({ error: '対応していないファイル形式です' });
      return;
    }
    const isVideo = contentType.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (size > maxSize) {
      res.status(400).json({ error: 'ファイルサイズが上限を超えています' });
      return;
    }
    const result = await createSignedUploadUrl(fileName, contentType);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '署名付きURLの生成に失敗しました' });
  }
});

// --- Repurpose (Gemini) ---
api.post('/v1/repurpose', requireAuth, async (req: AuthedRequest, res) => {
  const { idea, plan, mediaUrls } = req.body as {
    idea?: string;
    plan?: string;
    mediaUrls?: string[];
  };

  if (!idea?.trim()) {
    res.status(400).json({ error: 'idea が必要です' });
    return;
  }

  try {
    const settings = await assertPostQuota(req.uid!);
    const effectivePlan = plan ?? settings.plan;
    const safety = checkBrandSafety(idea);
    const { results, usedGemini } = await generateRepurposeWithGemini(idea, effectivePlan, mediaUrls);
    await incrementPostQuota(req.uid!);

    res.json({
      results,
      usedGemini,
      safetyViolations: safety.safe ? undefined : safety.violations,
      postsThisMonth: await getPostsThisMonth(req.uid!),
      postsLimit: freePostLimitForPlan(effectivePlan),
    });
  } catch (err) {
    res.status(403).json({ error: err instanceof Error ? err.message : '投稿上限に達しています' });
  }
});

// --- Schedule (Firestore + Worker / Meta / LINE / Notify) ---
api.post('/v1/schedule', requireAuth, async (req: AuthedRequest, res) => {
  const { contents, scheduledAt, destinationUrl, publishMode, mediaUrls, asDraft } = req.body as {
    contents?: Array<{ platform: string; label: string; content: string; carouselSlides?: string[] }>;
    scheduledAt?: string;
    destinationUrl?: string;
    publishMode?: PublishMode;
    mediaUrls?: string[];
    asDraft?: boolean;
  };

  if (!contents?.length || !scheduledAt) {
    res.status(400).json({ error: 'contents と scheduledAt が必要です' });
    return;
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    res.status(400).json({ error: '投稿日時の形式が正しくありません' });
    return;
  }
  if (scheduledDate.getTime() <= Date.now()) {
    res.status(400).json({ error: '過去の日時には予約できません。未来の日時を指定してください' });
    return;
  }

  try {
    const settings = await assertPostQuota(req.uid!);
    if (!asDraft) await incrementPostQuota(req.uid!);
    const dest = resolveTrackingDestination(settings, destinationUrl);
    const mode: PublishMode = publishMode ?? settings.defaultPublishMode ?? 'notify';
    const trackingLinks: Array<{ platform: string; trackingUrl: string; postId: string }> = [];

    if (dest) {
      for (const item of contents) {
        const postId = await addPost(req.uid!, {
          title: item.label,
          platform: item.platform,
          content: item.content,
          reach: 0,
          revenue: 0,
        });
        const token = generateTrackingToken();
        const utmCampaign = `buzzit_${item.platform}_${Date.now()}`;
        await createTrackingLink(req.uid!, {
          token,
          postId,
          destinationUrl: dest,
          utmCampaign,
          platform: item.platform,
          title: item.label,
        });
        trackingLinks.push({ platform: item.platform, trackingUrl: trackingClickUrl(token), postId });
      }
    }

    const jobId = await createScheduledJob(req.uid!, {
      contents,
      scheduledAt: scheduledDate.toISOString(),
      publishMode: mode,
      status: asDraft ? 'draft' : undefined,
      mediaUrls,
      destinationUrl: dest,
      trackingLinks,
    });

    if (!asDraft && mode === 'approval') {
      await notifyApprovalNeeded(
        req.uid!,
        jobId,
        contents.map((c) => c.label).join(' / '),
      );
    }
    await writeAuditLog(req.uid!, 'schedule.create', `${asDraft ? 'draft' : mode} ${contents.length}件`, { jobId });

    const when = new Date(scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const modeLabel: Record<PublishMode, string> = {
      notify: '通知リマインダー',
      approval: '承認待ちキュー',
      meta: 'Meta 自動投稿',
      line: 'LINE 配信',
      gbp: 'Googleマップ投稿',
      ayrshare: 'Ayrshare 予約',
      x_free: 'X API 自動投稿',
      auto: '自動（接続に応じて）',
    };

    res.json({
      success: true,
      jobId,
      message: asDraft
        ? `${contents.length}件を下書き保存しました。カレンダーから整えて予約できます`
        : `${contents.length}件を ${when} に登録しました（${modeLabel[mode]}）`,
      trackingLinks,
      publishMode: mode,
      status: asDraft ? 'draft' : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '予約投稿に失敗しました' });
  }
});

api.get('/v1/scheduled', requireAuth, async (req: AuthedRequest, res) => {
  const statusParam = req.query.status;
  const status =
    typeof statusParam === 'string' && statusParam.includes(',')
      ? (statusParam.split(',') as import('./types/schedule').ScheduledJobStatus[])
      : typeof statusParam === 'string'
        ? (statusParam as import('./types/schedule').ScheduledJobStatus)
        : undefined;

  const jobs = await getScheduledJobs(req.uid!, status);
  res.json({ jobs });
});

api.post('/v1/scheduled/:id/approve', requireAuth, async (req: AuthedRequest, res) => {
  const job = await approveScheduledJob(req.uid!, String(req.params.id));
  if (!job) {
    res.status(404).json({ error: '承認待ちジョブが見つかりません' });
    return;
  }
  res.json({ success: true, job });
});

api.post('/v1/scheduled/:id/retry', requireAuth, async (req: AuthedRequest, res) => {
  const job = await retryScheduledJob(req.uid!, String(req.params.id));
  if (!job) {
    res.status(404).json({ error: '再試行できる失敗ジョブが見つかりません' });
    return;
  }
  await writeAuditLog(req.uid!, 'schedule.retry', job.id);
  res.json({ success: true, job });
});

api.post('/v1/scheduled/:id/draft', requireAuth, async (req: AuthedRequest, res) => {
  const job = await revertScheduledJobToDraft(req.uid!, String(req.params.id));
  if (!job) {
    res.status(404).json({ error: '下書きに戻せるジョブが見つかりません' });
    return;
  }
  await writeAuditLog(req.uid!, 'schedule.draft', job.id);
  res.json({ success: true, job });
});

api.patch('/v1/scheduled/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { scheduledAt, contents, publishMode } = req.body as {
    scheduledAt?: string;
    contents?: Array<{ platform: string; label: string; content: string; carouselSlides?: string[] }>;
    publishMode?: PublishMode;
  };

  if (scheduledAt === undefined && contents === undefined && publishMode === undefined) {
    res.status(400).json({ error: '更新する項目がありません' });
    return;
  }

  let normalizedScheduledAt: string | undefined;
  if (scheduledAt !== undefined) {
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      res.status(400).json({ error: '投稿日時の形式が正しくありません' });
      return;
    }
    if (when.getTime() <= Date.now()) {
      res.status(400).json({ error: '過去の日時には予約できません。未来の日時を指定してください' });
      return;
    }
    normalizedScheduledAt = when.toISOString();
  }

  if (contents !== undefined && (!Array.isArray(contents) || contents.length === 0)) {
    res.status(400).json({ error: 'contents が空です' });
    return;
  }

  const job = await updateScheduledJob(req.uid!, String(req.params.id), {
    scheduledAt: normalizedScheduledAt,
    contents,
    publishMode,
  });
  if (!job) {
    res.status(404).json({ error: '編集できる予約が見つかりません（処理中・完了済みは編集不可）' });
    return;
  }
  await writeAuditLog(req.uid!, 'schedule.update', job.id);
  res.json({ success: true, job });
});

api.get('/v1/reports/weekly', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const report = await buildWeeklyReportForUser(req.uid!);
    res.json({ report });
  } catch (err) {
    console.error('weekly report failed', err);
    res.status(500).json({ error: '週次レポートの生成に失敗しました' });
  }
});

// --- SNS Insights（インプレッション自動取得の土台） ---
api.get('/v1/insights/summary', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const summary = await buildInsightsSummary(req.uid!, platform);
    res.json({ summary });
  } catch (err) {
    console.error('insights summary failed', err);
    res.status(500).json({ error: 'インサイト集計に失敗しました' });
  }
});

api.get('/v1/insights/posts', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    let posts = await listPostInsights(req.uid!, { limit: 200 });
    if (platform) {
      const want = platform.toLowerCase();
      posts = posts.filter((p) => {
        if (want === 'instagram') return p.platform === 'instagram';
        if (want === 'x') return p.platform === 'x';
        return p.platform === want;
      });
    }
    res.json({ posts: posts.slice(0, limit) });
  } catch (err) {
    console.error('insights posts failed', err);
    res.status(500).json({ error: 'インサイト一覧の取得に失敗しました' });
  }
});

function parseInsightsPlatform(raw: string | undefined): InsightsPlatformFilter {
  if (raw === 'x' || raw === 'instagram' || raw === 'line' || raw === 'facebook') return raw;
  return 'all';
}

api.get('/v1/insights/dashboard', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const platform = parseInsightsPlatform(
      typeof req.query.platform === 'string' ? req.query.platform : undefined,
    );
    const days = Number(req.query.days) || 30;
    const dashboard = await buildInsightsDashboard(req.uid!, { platform, days });
    res.json({ dashboard });
  } catch (err) {
    console.error('insights dashboard failed', err);
    res.status(500).json({ error: '解析ダッシュボードの生成に失敗しました' });
  }
});

api.get('/v1/insights/report', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const platform = parseInsightsPlatform(
      typeof req.query.platform === 'string' ? req.query.platform : undefined,
    );
    const days = Number(req.query.days) || 30;
    const dashboard = await buildInsightsDashboard(req.uid!, { platform, days, useAi: true });
    const settings = await getUserSettings(req.uid!);
    const html = buildInsightsHtmlReport(dashboard, {
      businessName: settings.displayName ?? settings.brandProfile?.slice(0, 30),
    });
    res.json({ html, dashboard });
  } catch (err) {
    console.error('insights report failed', err);
    res.status(500).json({ error: 'レポート生成に失敗しました' });
  }
});

api.get('/v1/insights/report/download', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const platform = parseInsightsPlatform(
      typeof req.query.platform === 'string' ? req.query.platform : undefined,
    );
    const days = Number(req.query.days) || 30;
    const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'html';
    const dashboard = await buildInsightsDashboard(req.uid!, { platform, days, useAi: true });
    const settings = await getUserSettings(req.uid!);
    const businessName = settings.displayName ?? settings.brandProfile?.slice(0, 30);
    const base = reportFileBaseName(platform);

    if (format === 'pptx') {
      const buffer = await buildInsightsPptxBuffer(dashboard, { businessName });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.pptx"`);
      res.send(buffer);
      return;
    }
    if (format === 'pdf') {
      const buffer = await buildInsightsPdfBuffer(dashboard, { businessName });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);
      res.send(buffer);
      return;
    }
    const html = buildInsightsHtmlReport(dashboard, { businessName });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.html"`);
    res.send(html);
  } catch (err) {
    console.error('insights report download failed', err);
    res.status(500).json({ error: 'レポートのダウンロードに失敗しました' });
  }
});

api.post('/v1/insights/report/share', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const platform = parseInsightsPlatform(
      typeof req.body?.platform === 'string' ? req.body.platform : undefined,
    );
    const days = Number(req.body?.days) || 30;
    const dashboard = await buildInsightsDashboard(req.uid!, { platform, days, useAi: true });
    const settings = await getUserSettings(req.uid!);
    const businessName = settings.displayName ?? settings.brandProfile?.slice(0, 30);
    const html = buildInsightsHtmlReport(dashboard, { businessName });

    const token = randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await createSharedInsightsReport(req.uid!, {
      token,
      html,
      businessName,
      platform,
      expiresAt: expiresAt.toISOString(),
    });

    const appOrigin = process.env.BUZZIT_APP_ORIGIN ?? 'https://app.buzzit.shigotoku.com';
    const shareUrl = `${appOrigin}/api/v1/insights/report/view/${token}`;

    res.json({
      shareUrl,
      token,
      expiresAt: expiresAt.toISOString(),
      platform,
    });
  } catch (err) {
    console.error('insights report share failed', err);
    res.status(500).json({ error: '共有URLの作成に失敗しました' });
  }
});

api.post('/v1/insights/analyze', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const force = req.body?.force !== false;
    const platform = parseInsightsPlatform(
      typeof req.body?.platform === 'string' ? req.body.platform : undefined,
    );
    const days = Number(req.body?.days) || 30;
    const useAi = req.body?.useAi !== false;

    const result = await syncInsightsForUser(req.uid!, { force });
    const dashboard = await buildInsightsDashboard(req.uid!, { platform, days, useAi });
    await recordInsightsDailySnapshot(req.uid!, dashboard);
    await writeAuditLog(req.uid!, 'insights.analyze', JSON.stringify({
      fetched: result.fetched,
      errors: result.errors,
      platform,
      ai: dashboard.aiPowered,
    }));
    res.json({ success: true, result, dashboard });
  } catch (err) {
    console.error('insights analyze failed', err);
    res.status(500).json({ error: '解析の更新に失敗しました' });
  }
});

api.post('/v1/insights/sync', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const force = req.body?.force === true;
    const result = await syncInsightsForUser(req.uid!, { force });
    const summary = await buildInsightsSummary(req.uid!);
    await writeAuditLog(req.uid!, 'insights.sync', JSON.stringify({
      fetched: result.fetched,
      errors: result.errors,
      force,
    }));
    res.json({ success: true, result, summary });
  } catch (err) {
    console.error('insights sync failed', err);
    res.status(500).json({ error: 'インサイト同期に失敗しました' });
  }
});

// --- Meta OAuth ---
const META_APP_ORIGIN = process.env.BUZZIT_APP_ORIGIN ?? 'https://app.buzzit.shigotoku.com';

function metaOAuthRedirectUri(): string {
  return `${META_APP_ORIGIN}/api/v1/oauth/meta/callback`;
}

api.get('/v1/oauth/meta/start', requireAuth, async (req: AuthedRequest, res) => {
  const state = await saveOAuthState(req.uid!);
  const url = getMetaOAuthUrl(state, metaOAuthRedirectUri());
  if (!url) {
    res.status(503).json({ error: 'Meta OAuth が未設定です（META_APP_ID / META_APP_SECRET）' });
    return;
  }
  res.json({ url });
});

api.get('/v1/oauth/meta/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;

  if (!code || !state) {
    res.redirect(302, `${META_APP_ORIGIN}/settings?meta=error`);
    return;
  }

  const uid = await consumeOAuthState(state);
  if (!uid) {
    res.redirect(302, `${META_APP_ORIGIN}/settings?meta=expired`);
    return;
  }

  const exchanged = await exchangeMetaCode(code, metaOAuthRedirectUri());
  if (!exchanged) {
    res.redirect(302, `${META_APP_ORIGIN}/settings?meta=error`);
    return;
  }

  const accounts = await resolveMetaAccounts(exchanged.accessToken);
  const expiresAt = exchanged.expiresIn
    ? new Date(Date.now() + exchanged.expiresIn * 1000).toISOString()
    : undefined;

  await updateUserSettings(uid, {
    metaAccessToken: exchanged.accessToken,
    metaPageAccessToken: accounts.pageAccessToken,
    metaIgUserId: accounts.igUserId,
    metaPageId: accounts.pageId,
    metaTokenExpiresAt: expiresAt,
  });

  res.redirect(302, `${META_APP_ORIGIN}/settings?meta=connected`);
});

// --- Dashboard ---
api.get('/v1/dashboard', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await ensureUser(req.uid!);
    const [metrics, settings] = await Promise.all([
      getMetrics(req.uid!),
      getUserSettings(req.uid!),
    ]);
    res.json({ metrics, plan: settings.plan });
  } catch (err) {
    console.error('dashboard failed', err);
    res.status(500).json({ error: 'ダッシュボードの取得に失敗しました' });
  }
});

// --- Analytics ---
api.get('/v1/analytics', requireAuth, async (req: AuthedRequest, res) => {
  const [metrics, posts] = await Promise.all([
    getMetrics(req.uid!),
    getPosts(req.uid!),
  ]);
  res.json({ metrics, topPosts: posts });
});

const DEFAULT_SNS_CONNECTIONS = [
  { name: 'Instagram', connected: false },
  { name: 'X (Twitter)', connected: false },
  { name: 'TikTok', connected: false },
  { name: 'LINE Official', connected: false },
];

// --- Settings ---
api.get('/v1/settings', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  const account = await getAccountForUser(req.uid!);
  const entitlements = await resolveEntitlements(req.uid!);
  const metaConnected = !!(settings.metaAccessToken && settings.metaIgUserId);
  const xConnected = !!credentialsFromSettings(settings);
  // 秘密鍵はクライアントに返さない
  const {
    xApiKey: _xk,
    xApiSecret: _xs,
    xAccessToken: _xt,
    xAccessSecret: _xas,
    metaAccessToken: _mt,
    metaPageAccessToken: _mpt,
    ...safeSettings
  } = settings as UserSettings & Record<string, unknown>;
  // Ayrshare 外部 API は別エンドポイントへ分離（設定画面の初期表示を高速化）
  res.json({
    ...safeSettings,
    snsConnections: DEFAULT_SNS_CONNECTIONS,
    metaConnected,
    xConnected,
    xUsername: settings.xUsername,
    xApiPostsThisMonth: getXApiPostsThisMonth(settings),
    xApiMonthlyLimit: X_FREE_MONTHLY_SOFT_LIMIT,
    canUseSlack: canUseSlack(settings),
    canUseAutoMode: settings.plan === 'growth',
    lineWebhookUrl: lineWebhookUrl(req.uid!),
    hpbTrackingEnabled: settings.hpbTrackingEnabled ?? false,
    postsThisMonth: await getPostsThisMonth(req.uid!, settings),
    postsLimit: freePostLimitForPlan(settings.plan),
    autoModeGoal: settings.autoModeGoal ?? 'reach',
    stripeConfigured: isStripeConfigured(),
    paymentConfigured: isPaymentConfigured(),
    paymentProvider: getActivePaymentProvider(),
    referralCode: settings.referralCode,
    xSeriesCapabilities: xSeriesCapabilities(entitlements?.plan ?? settings.plan),
    account: accountSummaryForSettings(account, entitlements, settings),
  });
});

api.get('/v1/x/capabilities', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  res.json({ capabilities: xSeriesCapabilities(settings.plan) });
});

api.get('/v1/sns-connections', requireAuth, async (_req: AuthedRequest, res) => {
  try {
    const snsConnections = await getAyrshareProfiles();
    res.json({ snsConnections });
  } catch {
    res.json({ snsConnections: DEFAULT_SNS_CONNECTIONS });
  }
});

api.put('/v1/settings', requireAuth, async (req: AuthedRequest, res) => {
  const allowed = [
    'plan', 'slackWebhookUrl', 'ayrshareProfileKey', 'autoModeEnabled', 'slackTeamId',
    'displayName', 'lineChannelSecret', 'lineChannelAccessToken', 'lineAdminUserId',
    'lineDestinationId', 'defaultDestinationUrl', 'defaultPublishMode',
    'metaAccessToken', 'metaPageAccessToken', 'metaIgUserId', 'metaPageId', 'metaTokenExpiresAt',
    'hpbStoreUrl', 'hpbTrackingEnabled', 'autoModeGoal', 'gbpConnected', 'gbpLocationName', 'notifyEmail', 'industry',
    'brandProfile',
    'extraSnsAccounts',
    'insightsEnabled',
    'xInsightsEnabled',
    'xApiKey', 'xApiSecret', 'xAccessToken', 'xAccessSecret', 'xUsername',
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) patch[key] = req.body[key];
  }
  // 空文字の X 鍵は「未変更」扱い（誤上書き防止）。切断は xDisconnect
  for (const key of ['xApiKey', 'xApiSecret', 'xAccessToken', 'xAccessSecret'] as const) {
    if (key in patch && String(patch[key] ?? '').trim() === '') {
      delete patch[key];
    }
  }
  if (req.body?.xDisconnect === true) {
    patch.xApiKey = '';
    patch.xApiSecret = '';
    patch.xAccessToken = '';
    patch.xAccessSecret = '';
    patch.xUsername = '';
  }
  if ('extraSnsAccounts' in patch) {
    const n = Number(patch.extraSnsAccounts);
    patch.extraSnsAccounts = Number.isFinite(n) ? Math.max(0, Math.min(20, Math.floor(n))) : 0;
  }
  if ('plan' in patch) {
    const current = await getUserSettings(req.uid!);
    const nextPlan = patch.plan as string;
    const storeIds = current.storeIds ?? [];
    if (storeIds.length > MAX_STORES_BY_PLAN[nextPlan as keyof typeof MAX_STORES_BY_PLAN]) {
      res.status(400).json({
        error: `${nextPlan} プランは最大 ${MAX_STORES_BY_PLAN[nextPlan as keyof typeof MAX_STORES_BY_PLAN]} 店舗です。先に店舗数を減らしてください`,
      });
      return;
    }
  }
  const settings = await updateUserSettings(req.uid!, patch as Partial<UserSettings>);
  if ('gbpLocationName' in patch || 'gbpConnected' in patch) {
    await recordGbpSnapshot(req.uid!, settings);
  }
  const {
    xApiKey: _xk,
    xApiSecret: _xs,
    xAccessToken: _xt,
    xAccessSecret: _xas,
    metaAccessToken: _mt,
    metaPageAccessToken: _mpt,
    ...safe
  } = settings;
  res.json({
    ...safe,
    xConnected: !!credentialsFromSettings(settings),
    xApiPostsThisMonth: getXApiPostsThisMonth(settings),
    xApiMonthlyLimit: X_FREE_MONTHLY_SOFT_LIMIT,
  });
});

api.post('/v1/x/selftest', requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body as {
    xApiKey?: string;
    xApiSecret?: string;
    xAccessToken?: string;
    xAccessSecret?: string;
  };
  const stored = await getUserSettings(req.uid!);
  const creds = credentialsFromSettings({
    xApiKey: body.xApiKey?.trim() || stored.xApiKey,
    xApiSecret: body.xApiSecret?.trim() || stored.xApiSecret,
    xAccessToken: body.xAccessToken?.trim() || stored.xAccessToken,
    xAccessSecret: body.xAccessSecret?.trim() || stored.xAccessSecret,
  });
  if (!creds) {
    res.status(400).json({ error: 'X API の4つのキーをすべて入力してください' });
    return;
  }
  const result = await verifyXCredentials(creds);
  if (result.ok && result.username) {
    await updateUserSettings(req.uid!, {
      xApiKey: creds.apiKey,
      xApiSecret: creds.apiSecret,
      xAccessToken: creds.accessToken,
      xAccessSecret: creds.accessSecret,
      xUsername: result.username,
    });
  }
  res.status(result.ok ? 200 : 400).json(result);
});

// --- X シリーズ（キュー＋曜日スケジュール） ---
api.get('/v1/x/series', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ series: await listXSeries(req.uid!) });
});

api.post('/v1/x/series', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    const caps = xSeriesCapabilities(settings.plan);
    const existing = await listXSeries(req.uid!);
    if (existing.length >= caps.maxSeries) {
      res.status(403).json({
        error: `シリーズは最大 ${caps.maxSeries} 件まで（${settings.plan}）。${caps.upgradeHint ?? ''}`,
      });
      return;
    }
    const { name, description } = req.body as { name?: string; description?: string };
    const series = await createXSeries(req.uid!, { name: name ?? '', description });
    res.json({ series });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '作成に失敗しました' });
  }
});

api.post('/v1/x/series/seed-defaults', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const pack = await seedDefaultXSeriesPack(req.uid!);
    res.json(pack);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'テンプレ作成に失敗しました' });
  }
});

api.patch('/v1/x/series/:id', requireAuth, async (req: AuthedRequest, res) => {
  const series = await updateXSeries(req.uid!, String(req.params.id), req.body ?? {});
  if (!series) {
    res.status(404).json({ error: 'シリーズが見つかりません' });
    return;
  }
  res.json({ series });
});

api.delete('/v1/x/series/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ok = await deleteXSeries(req.uid!, String(req.params.id));
  if (!ok) {
    res.status(404).json({ error: 'シリーズが見つかりません' });
    return;
  }
  res.json({ success: true });
});

api.get('/v1/x/series/:id/items', requireAuth, async (req: AuthedRequest, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const items = await listXSeriesItems(req.uid!, String(req.params.id), {
    status: status as 'pending' | 'published' | 'failed' | undefined,
  });
  res.json({ items });
});

api.post('/v1/x/series/:id/items', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { items, text, tags, title, linkUrl, imageUrl, imageAlt, approved } = req.body as {
      items?: Array<{
        text: string;
        tags?: string;
        title?: string;
        linkUrl?: string;
        imageUrl?: string;
        imageAlt?: string;
        approved?: boolean;
      }>;
      text?: string;
      tags?: string;
      title?: string;
      linkUrl?: string;
      imageUrl?: string;
      imageAlt?: string;
      approved?: boolean;
    };
    const list =
      items ??
      (text
        ? [{ text, tags, title, linkUrl, imageUrl, imageAlt, approved }]
        : []);
    const created = await addXSeriesItems(req.uid!, String(req.params.id), list);
    res.json({ items: created });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '追加に失敗しました' });
  }
});

api.post('/v1/x/series/:id/import-csv', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv?.trim()) {
      res.status(400).json({ error: 'csv が必要です' });
      return;
    }
    const parsed = parseSeriesCsv(csv);
    const created = await addXSeriesItems(req.uid!, String(req.params.id), parsed);
    res.json({ imported: created.length, items: created });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'インポートに失敗しました' });
  }
});

api.post('/v1/x/series/:id/import-paste', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { text, approved } = req.body as { text?: string; approved?: boolean };
    if (!text?.trim()) {
      res.status(400).json({ error: 'text が必要です' });
      return;
    }
    const settings = await getUserSettings(req.uid!);
    const parsed = parseBulkPasteText(text).map((row) => ({
      ...row,
      approved: approved === true,
    }));
    if (!parsed.length) {
      res.status(400).json({ error: '分割できる投稿がありません（空行または --- で区切ってください）' });
      return;
    }
    assertXSeriesFeature(settings.plan, 'pasteBatchMax', parsed.length);
    const created = await addXSeriesItems(
      req.uid!,
      String(req.params.id),
      parsed.slice(0, xSeriesCapabilities(settings.plan).pasteBatchMax),
    );
    res.json({ imported: created.length, items: created });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '貼り付け取り込みに失敗しました' });
  }
});

api.post('/v1/x/series/:id/generate-batch', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { source, approved, seriesHint, dryRun } = req.body as {
      source?: string;
      approved?: boolean;
      seriesHint?: string;
      dryRun?: boolean;
    };
    const lines = (source ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      res.status(400).json({ error: '1行以上のテーマ・URLを入力してください' });
      return;
    }
    const settings = await getUserSettings(req.uid!);
    assertXSeriesFeature(settings.plan, 'aiBatchMax', lines.length);
    const capped = lines.slice(0, xSeriesCapabilities(settings.plan).aiBatchMax);
    const { items, usedGemini } = await generateXSeriesBatchWithGemini(
      capped,
      settings.plan ?? 'starter',
      seriesHint,
    );
    if (dryRun) {
      res.json({
        generated: items.length,
        usedGemini,
        items: items.map((it) => ({ ...it, approved: approved === true })),
      });
      return;
    }
    const created = await addXSeriesItems(
      req.uid!,
      String(req.params.id),
      items.map((it) => ({ ...it, approved: approved === true })),
    );
    res.json({ generated: created.length, usedGemini, items: created });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI一括生成に失敗しました' });
  }
});

api.post('/v1/x/series/:id/approve-all', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    const caps = xSeriesCapabilities(settings.plan);
    if (caps.staffCannotApprove && settings.activeStoreId) {
      const role = await getUserRoleInStore(settings.activeStoreId, req.uid!);
      if (role === 'staff') {
        res.status(403).json({ error: '投稿OKの一括承認はマネージャー以上のみ（Proプラン）' });
        return;
      }
    }
    const count = await approveAllPendingItems(req.uid!, String(req.params.id));
    res.json({ approved: count });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '一括承認に失敗しました' });
  }
});

api.patch('/v1/x/series/:seriesId/items/:itemId', requireAuth, async (req: AuthedRequest, res) => {
  const patch = req.body ?? {};
  if (patch.approved === true) {
    const settings = await getUserSettings(req.uid!);
    const caps = xSeriesCapabilities(settings.plan);
    if (caps.staffCannotApprove && settings.activeStoreId) {
      const role = await getUserRoleInStore(settings.activeStoreId, req.uid!);
      if (role === 'staff') {
        res.status(403).json({ error: '投稿OKはマネージャー以上のみ設定できます（Proプラン）' });
        return;
      }
    }
  }
  const item = await updateXSeriesItem(
    req.uid!,
    String(req.params.seriesId),
    String(req.params.itemId),
    patch,
  );
  if (!item) {
    res.status(404).json({ error: 'ネタが見つかりません' });
    return;
  }
  res.json({ item });
});

api.delete('/v1/x/series/:seriesId/items/:itemId', requireAuth, async (req: AuthedRequest, res) => {
  const ok = await deleteXSeriesItem(req.uid!, String(req.params.seriesId), String(req.params.itemId));
  if (!ok) {
    res.status(404).json({ error: 'ネタが見つかりません' });
    return;
  }
  res.json({ success: true });
});

api.get('/v1/x/schedule-rules', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ rules: await listXScheduleRules(req.uid!) });
});

api.post('/v1/x/schedule-rules', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    const caps = xSeriesCapabilities(settings.plan);
    const rules = await listXScheduleRules(req.uid!);
    if (rules.length >= caps.maxRulesTotal) {
      res.status(403).json({
        error: `スケジュールルールは最大 ${caps.maxRulesTotal} 件まで。${caps.upgradeHint ?? ''}`,
      });
      return;
    }
    const rule = await createXScheduleRule(req.uid!, req.body ?? {});
    res.json({ rule });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '作成に失敗しました' });
  }
});

api.patch('/v1/x/schedule-rules/:id', requireAuth, async (req: AuthedRequest, res) => {
  const rule = await updateXScheduleRule(req.uid!, String(req.params.id), req.body ?? {});
  if (!rule) {
    res.status(404).json({ error: 'ルールが見つかりません' });
    return;
  }
  res.json({ rule });
});

api.delete('/v1/x/schedule-rules/:id', requireAuth, async (req: AuthedRequest, res) => {
  const ok = await deleteXScheduleRule(req.uid!, String(req.params.id));
  if (!ok) {
    res.status(404).json({ error: 'ルールが見つかりません' });
    return;
  }
  res.json({ success: true });
});

api.get('/v1/x/series/:id/insights', requireAuth, async (req: AuthedRequest, res) => {
  const seriesId = String(req.params.id);
  const settings = await getUserSettings(req.uid!);
  const [insights, nextPosts] = await Promise.all([
    buildXSeriesInsights(req.uid!, seriesId, settings),
    computeNextScheduledPosts(req.uid!, seriesId, xSeriesCapabilities(settings.plan).nextPostsPreview),
  ]);
  res.json({ insights, nextPosts });
});

api.get('/v1/x/series/:id/export-csv', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  assertXSeriesFeature(settings.plan, 'csvExport');
  const items = await listXSeriesItems(req.uid!, String(req.params.id), { limit: 400 });
  const csv = exportSeriesToCsv(items);
  res.json({ csv, count: items.length });
});

api.post('/v1/x/series/enrich-url', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    assertXSeriesFeature(settings.plan, 'urlEnrich');
    const { url } = req.body as { url?: string };
    if (!url?.trim()) {
      res.status(400).json({ error: 'url が必要です' });
      return;
    }
    const enriched = await enrichUrlForXPost(url.trim());
    res.json(enriched);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'URL取得に失敗しました' });
  }
});

api.post('/v1/x/series/:id/reorder', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    if (!xSeriesCapabilities(settings.plan).dragReorder) {
      res.status(403).json({ error: '並び替えは Starter 以上の機能です' });
      return;
    }
    const { orderedIds } = req.body as { orderedIds?: string[] };
    if (!orderedIds?.length) {
      res.status(400).json({ error: 'orderedIds が必要です' });
      return;
    }
    await reorderXSeriesItems(req.uid!, String(req.params.id), orderedIds);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '並び替えに失敗しました' });
  }
});

api.post('/v1/x/series/:id/move-items', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    assertXSeriesFeature(settings.plan, 'moveBetweenSeries');
    const { toSeriesId, itemIds } = req.body as { toSeriesId?: string; itemIds?: string[] };
    if (!toSeriesId || !itemIds?.length) {
      res.status(400).json({ error: 'toSeriesId と itemIds が必要です' });
      return;
    }
    const moved = await moveXSeriesItems(req.uid!, String(req.params.id), toSeriesId, itemIds);
    res.json({ moved });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '移動に失敗しました' });
  }
});

api.post('/v1/x/series/:seriesId/items/:itemId/retry', requireAuth, async (req: AuthedRequest, res) => {
  const ok = await retryFailedXSeriesItem(
    req.uid!,
    String(req.params.seriesId),
    String(req.params.itemId),
  );
  if (!ok) {
    res.status(404).json({ error: '失敗した投稿が見つかりません' });
    return;
  }
  res.json({ success: true });
});

api.post('/v1/x/series/:id/voice-batch', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    assertXSeriesFeature(settings.plan, 'voiceBatch');
    const { transcript, approved } = req.body as { transcript?: string; approved?: boolean };
    if (!transcript?.trim()) {
      res.status(400).json({ error: 'transcript が必要です' });
      return;
    }
    const result = await voiceToXSeriesBatch(
      req.uid!,
      String(req.params.id),
      transcript.trim(),
      settings.plan,
      approved === true,
    );
    res.json({ generated: result.items.length, usedGemini: result.usedGemini, items: result.items });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '音声バッチに失敗しました' });
  }
});

api.post('/v1/x/preview-text', requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body as {
    text?: string;
    tags?: string;
    title?: string;
    linkUrl?: string;
  };
  const composed = composeTweetText({
    text: body.text ?? '',
    tags: body.tags,
    title: body.title,
    linkUrl: body.linkUrl,
  });
  const charCount = [...composed].length;
  res.json({
    composed,
    charCount,
    overLimit: charCount > 280,
    remaining: 280 - charCount,
  });
});

/** 手動でシリーズ在庫を即時消化 / 全ルール強制実行 */
api.post('/v1/x/series/run-now', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { seriesId, take, mode, forceAllRules } = req.body as {
      seriesId?: string;
      take?: number;
      mode?: 'x_free' | 'notify';
      forceAllRules?: boolean;
    };
    if (seriesId) {
      const result = await publishSeriesNow(
        req.uid!,
        seriesId,
        Math.max(1, Math.min(5, take ?? 1)),
        mode === 'notify' ? 'notify' : 'x_free',
      );
      res.json({ success: true, ...result });
      return;
    }
    if (forceAllRules) {
      const result = await processXSeriesSchedules({ onlyUid: req.uid!, force: true });
      res.json({ success: true, ...result });
      return;
    }
    res.status(400).json({ error: 'seriesId または forceAllRules が必要です' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '実行に失敗しました' });
  }
});

// --- Metrics tracking ---
api.post('/v1/metrics/event', requireAuth, async (req: AuthedRequest, res) => {
  const { event, value } = req.body as { event?: string; value?: number };
  if (!event || typeof value !== 'number') {
    res.status(400).json({ error: 'event と value が必要です' });
    return;
  }
  const valid = ['reach', 'click', 'line_signup', 'revenue'];
  if (!valid.includes(event)) {
    res.status(400).json({ error: '無効な event です' });
    return;
  }
  await trackMetricEvent(req.uid!, event as 'reach' | 'click' | 'line_signup' | 'revenue', value);
  const metrics = await getMetrics(req.uid!);
  res.json({ success: true, metrics });
});

// --- UTM click tracking (public redirect) ---
/** 共有レポート閲覧（認証不要・30日有効） */
api.get('/v1/insights/report/view/:token', async (req, res) => {
  try {
    const token = String(req.params.token);
    const report = await getSharedInsightsReport(token);
    if (!report) {
      res.status(404).send('レポートが見つからないか、有効期限が切れています');
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(report.html);
  } catch (err) {
    console.error('insights report view failed', err);
    res.status(500).send('レポートの表示に失敗しました');
  }
});

api.get('/v1/track/click/:token', async (req, res) => {
  try {
    const token = String(req.params.token);
    const link = await getTrackingLink(token);
    if (!link) {
      res.status(404).send('リンクが見つかりません');
      return;
    }
    const redirectUrl = await recordTrackingClick(link.uid, token, link.postId);
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('track/click failed', err);
    res.status(500).send('計測に失敗しました');
  }
});

// --- Tracking link creation ---
api.post('/v1/tracking/link', requireAuth, async (req: AuthedRequest, res) => {
  const { destinationUrl, title, platform, postId } = req.body as {
    destinationUrl?: string;
    title?: string;
    platform?: string;
    postId?: string;
  };

  const settings = await getUserSettings(req.uid!);
  const dest = resolveTrackingDestination(settings, destinationUrl);
  if (!dest) {
    res.status(400).json({ error: 'destinationUrl または設定のリダイレクト先 URL が必要です' });
    return;
  }

  let effectivePostId = postId;
  if (!effectivePostId && title) {
    effectivePostId = await addPost(req.uid!, {
      title,
      platform: platform ?? 'link',
      content: title,
      reach: 0,
      revenue: 0,
    });
  }

  const token = generateTrackingToken();
  const utmCampaign = settings.hpbTrackingEnabled
    ? `buzzit_hpb_${effectivePostId ?? platform ?? 'link'}_${Date.now()}`
    : `buzzit_${platform ?? 'link'}_${Date.now()}`;
  await createTrackingLink(req.uid!, {
    token,
    postId: effectivePostId,
    destinationUrl: dest,
    utmCampaign,
    platform,
    title,
  });

  res.json({
    token,
    trackingUrl: trackingClickUrl(token),
    postId: effectivePostId,
    utmCampaign,
  });
});

// --- LINE Messaging API Webhook ---
api.post('/v1/webhooks/line', async (req: AuthedRequest, res) => {
  const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
  const signature = req.header('x-line-signature') ?? '';
  const queryUid = typeof req.query.uid === 'string' ? req.query.uid : undefined;

  const body = req.body as {
    destination?: string;
    events?: Array<{
      type?: string;
      source?: { userId?: string; type?: string };
      postback?: { data?: string };
      message?: { type?: string; text?: string };
    }>;
  };

  let uid = queryUid ?? null;
  if (!uid && body.destination) {
    uid = await findUserByLineDestination(body.destination);
  }

  if (!uid) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const settings = await getUserSettings(uid);
  if (settings.lineChannelSecret) {
    if (!verifyLineSignature(rawBody, signature, settings.lineChannelSecret)) {
      res.status(401).json({ error: 'Invalid LINE signature' });
      return;
    }
  }

  for (const event of body.events ?? []) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    if (event.type === 'follow') {
      await fetchProfileAndUpsert(uid, lineUserId);
      await enrollInFollowSteps(uid, lineUserId);
      await trackMetricEvent(uid, 'line_signup', 1);
    } else if (event.type === 'unfollow') {
      await markLineFriendUnfollowed(uid, lineUserId);
    } else if (event.type === 'postback' && event.postback?.data) {
      await handlePostbackTag(uid, lineUserId, event.postback.data);
      if (event.postback.data.startsWith('post=')) {
        await trackMetricEvent(uid, 'line_signup', 1, event.postback.data.slice(5));
      }
    } else if (event.type === 'message') {
      await touchFriendMessage(uid, lineUserId);
      const text = event.message?.text ?? '';
      if (text) {
        await enqueueChatNeedReply(uid, lineUserId, text);
      }
    }
  }

  res.status(200).json({ ok: true });
});

// --- Trend Riding Engine ---
api.get('/v1/trends', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const trends = await getTrends(req.uid!);
    res.json({ trends });
  } catch (err) {
    console.error('trends get failed', err);
    res.status(500).json({ error: 'トレンドの取得に失敗しました' });
  }
});

api.post('/v1/trends/refresh', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    if (!['pro', 'team', 'growth'].includes(settings.plan)) {
      res.status(403).json({ error: 'Pro プラン以上が必要です' });
      return;
    }
    const trends = await refreshTrends(req.uid!, settings.industry);
    res.json({ trends });
  } catch (err) {
    console.error('trends refresh failed', err);
    res.status(500).json({ error: 'トレンド更新に失敗しました' });
  }
});

api.post('/v1/trends/:id/use', requireAuth, async (req: AuthedRequest, res) => {
  const trend = await markTrendUsed(req.uid!, String(req.params.id));
  if (!trend) {
    res.status(404).json({ error: 'トレンドが見つかりません' });
    return;
  }
  res.json({
    idea: `${trend.topic} — ${trend.hook}`,
    platform: trend.platform,
    trend,
  });
});

// --- AB Test Automation ---
api.get('/v1/ab-tests', requireAuth, async (req: AuthedRequest, res) => {
  const tests = await getAbTests(req.uid!);
  res.json({ tests });
});

api.post('/v1/ab-tests', requireAuth, async (req: AuthedRequest, res) => {
  const { idea, platform } = req.body as { idea?: string; platform?: string };
  if (!idea?.trim() || !platform?.trim()) {
    res.status(400).json({ error: 'idea と platform が必要です' });
    return;
  }
  const settings = await getUserSettings(req.uid!);
  if (!['pro', 'team', 'growth'].includes(settings.plan)) {
    res.status(403).json({ error: 'Pro プラン以上が必要です' });
    return;
  }
  try {
    const test = await createAbTest(req.uid!, idea.trim(), platform.trim());
    res.json(test);
  } catch (err) {
    console.error('ab-test create failed', err);
    res.status(500).json({ error: 'A/Bテストの作成に失敗しました' });
  }
});

api.post('/v1/ab-tests/:id/evaluate', requireAuth, async (req: AuthedRequest, res) => {
  const result = await evaluateAbTest(req.uid!, String(req.params.id));
  if (!result) {
    res.status(404).json({ error: 'テストが見つかりません' });
    return;
  }
  res.json(result);
});

api.post('/v1/ab-tests/evaluate-all', requireAuth, async (req: AuthedRequest, res) => {
  const count = await evaluateAllRunningAbTests(req.uid!);
  const tests = await getAbTests(req.uid!);
  res.json({ evaluated: count, tests });
});

// --- Slack ---
api.get('/v1/slack/ideas', requireAuth, async (req: AuthedRequest, res) => {
  const ideas = await getSlackIdeas(req.uid!);
  res.json({ ideas });
});

api.post('/v1/slack/ideas/:id/approve', requireAuth, async (req: AuthedRequest, res) => {
  const ideaId = String(req.params.id);
  const idea = await approveSlackIdea(req.uid!, ideaId);
  if (!idea) {
    res.status(404).json({ error: 'ネタが見つかりません' });
    return;
  }
  res.json({
    success: true,
    idea,
    magicCreatorPath: `/magic-creator?idea=${encodeURIComponent(idea.text)}&from=slack`,
  });
});

api.post('/v1/slack/ideas', requireAuth, async (req: AuthedRequest, res) => {
  const { text, author = '手動入力' } = req.body as { text?: string; author?: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'text が必要です' });
    return;
  }
  const settings = await getUserSettings(req.uid!);
  const preview = await formatSlackIdeaReply(text, settings.plan);
  const id = await addSlackIdea(req.uid!, text, author, preview);

  if (settings.slackWebhookUrl && canUseSlack(settings)) {
    await postToSlackWebhook(
      settings.slackWebhookUrl,
      `💡 *新しいネタ*\n${text}\n\n📝 AI台本プレビュー:\n${preview.slice(0, 500)}`,
    );
  }

  res.json({ id, scriptPreview: preview });
});

api.post('/v1/slack/events', async (req: AuthedRequest, res) => {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);

  if (signingSecret) {
    const ts = req.header('x-slack-request-timestamp') ?? '';
    const sig = req.header('x-slack-signature') ?? '';
    if (!verifySlackSignature(signingSecret, ts, rawBody, sig)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  const body = req.body as {
    type?: string;
    challenge?: string;
    event?: { type?: string; text?: string; user?: string; team?: string };
  };

  if (body.type === 'url_verification') {
    res.json({ challenge: body.challenge });
    return;
  }

  if (body.event?.type === 'message' && body.event.text && !body.event.text.startsWith('bot_')) {
    const { getFirestore } = await import('firebase-admin/firestore');
    const teamId = body.event.team ?? body.event.user;
    const usersSnap = await getFirestore()
      .collection('users')
      .where('slackTeamId', '==', teamId)
      .limit(1)
      .get();

    if (!usersSnap.empty) {
      const uid = usersSnap.docs[0].id;
      const settings = usersSnap.docs[0].data();
      const preview = await formatSlackIdeaReply(body.event.text, settings.plan ?? 'team');
      await addSlackIdea(uid, body.event.text, body.event.user ?? 'slack', preview);

      if (settings.slackWebhookUrl) {
        await postToSlackWebhook(
          settings.slackWebhookUrl,
          `🔥 *ネタをAIが台本化しました*\n${preview.slice(0, 800)}`,
        );
      }
    }
  }

  res.status(200).send('');
});

// --- Auto Mode ---
api.post('/v1/auto-mode/run', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  if (settings.plan !== 'growth') {
    res.status(403).json({ error: 'Growth OS プランが必要です' });
    return;
  }
  const result = await runAutoModeForUser(req.uid!);
  res.json(result);
});

// --- Voice Draft（Gemini マルチモーダル文字起こし + 4媒体下書き） ---
api.post('/v1/voice-draft', requireAuth, async (req: AuthedRequest, res) => {
  const { audioBase64, mimeType, hint } = req.body as {
    audioBase64?: string;
    mimeType?: string;
    hint?: string;
  };
  if (!audioBase64) {
    res.status(400).json({ error: 'audioBase64 が必要です' });
    return;
  }
  // 約 12MB base64 上限（Gemini 実用サイズ）
  if (audioBase64.length > 16_000_000) {
    res.status(413).json({ error: '音声が大きすぎます。2分以内の録音にしてください' });
    return;
  }
  try {
    const settings = await assertPostQuota(req.uid!);
    const { transcript, results, usedGemini } = await voiceDraftWithGemini(
      audioBase64,
      mimeType || 'audio/webm',
      settings.plan,
      hint,
    );
    await incrementPostQuota(req.uid!);
    res.json({
      transcript,
      drafts: results.map((r) => ({
        kind: r.platform,
      platform: r.platform,
      label: r.label,
      content: r.content,
      carouselSlides: r.carouselSlides,
    })),
      usedGemini,
      postsThisMonth: await getPostsThisMonth(req.uid!),
      postsLimit: freePostLimitForPlan(settings.plan),
    });
  } catch (err) {
    res.status(403).json({ error: err instanceof Error ? err.message : '投稿上限に達しています' });
  }
});

// --- LINE Cost Estimate (Phase 5) ---
api.get('/v1/line/cost-estimate', requireAuth, async (req: AuthedRequest, res) => {
  const pricePerMessage = Number(process.env.LINE_PRICE_PER_MSG ?? String(LINE_PRICE_PER_MSG));
  const metrics = await getMetrics(req.uid!);
  const lineFriends = metrics.funnel.lineSignups || 200;
  const monthlyMessagesPerFriend = 4;
  const queryMessages = Number(req.query.monthlyMessages);
  const estimatedRecipients = Number.isFinite(queryMessages) && queryMessages > 0
    ? Math.round(queryMessages)
    : lineFriends * monthlyMessagesPerFriend;
  const lineAccount = calcLineAccountCost(estimatedRecipients, pricePerMessage);
  const estimatedCost = lineAccount.lineTotal;
  const estimatedSegmentReach = Math.round(estimatedRecipients * 0.4);
  const segmentLineAccount = calcLineAccountCost(estimatedSegmentReach, pricePerMessage);
  const estimatedSegmentCost = segmentLineAccount.lineTotal;
  const savedPercent =
    estimatedCost > 0 ? Math.round(((estimatedCost - estimatedSegmentCost) / estimatedCost) * 100) : 0;
  const comparison = calcCostComparison(estimatedRecipients, pricePerMessage);
  const segmentComparison = calcSegmentComparison(estimatedRecipients, 0.4, pricePerMessage);
  const presetComparisons = MESSAGE_PRESETS.map((n) => calcCostComparison(n, pricePerMessage));
  res.json({
    pricePerMessage,
    friendCount: lineFriends,
    monthlyMessages: estimatedRecipients,
    estimatedRecipients,
    estimatedCost,
    estimatedSegmentReach,
    estimatedSegmentCost,
    savedPercent,
    lineAccount,
    comparison: {
      lstepStandard: comparison.lstepStandard,
      lineCrmPro: comparison.lineCrmPro,
      buzzitPro: comparison.buzzitPro,
      buzzitGrowth: comparison.buzzitGrowth,
      savingsLineCrmVsLstepStandard: comparison.savingsLineCrmVsLstepStandard,
      savingsGrowthVsLstepPro: comparison.savingsGrowthVsLstepPro,
    },
    segmentComparison: {
      segmentMessages: segmentComparison.segmentMessages,
      lstepStandardTotal: segmentComparison.segment.lstepStandard.total,
      lineCrmProTotal: segmentComparison.segment.lineCrmPro.total,
    },
    presetComparisons: presetComparisons.map((row) => ({
      monthlyMessages: row.monthlyMessages,
      lineTotal: row.line.lineTotal,
      lstepCrmFee: row.lstepStandard.toolFee,
      lineCrmFee: row.lineCrmPro.toolFee,
      lstepTotal: row.lstepStandard.total,
      lineCrmProTotal: row.lineCrmPro.total,
      savings: row.savingsLineCrmVsLstepStandard,
    })),
  });
});

// --- LINE CRM (Lstep Replacement / Phase 5) ---

import {
  getLineFollowerInsight,
  getLineDemographicInsight,
  createLineRichMenu,
} from './services/lineMessaging';

const lineCrmDocPath = (uid: string, sub: string, id?: string) =>
  id ? `users/${uid}/${sub}/${id}` : `users/${uid}/${sub}`;

async function lineCrmCollection<T>(uid: string, sub: string): Promise<Array<T & { id: string }>> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const snap = await getFirestore().collection(lineCrmDocPath(uid, sub)).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

// 顧客タグ
api.get('/v1/line/tags', requireAuth, async (req: AuthedRequest, res) => {
  const tags = await lineCrmCollection<{ name: string; color: string; friendCount: number; ruleType: string }>(
    req.uid!,
    'lineTags',
  );
  res.json({ tags });
});

api.post('/v1/line/tags', requireAuth, async (req: AuthedRequest, res) => {
  const { name, color = '#525252', ruleType = 'manual', autoRule } = req.body as {
    name?: string; color?: string; ruleType?: 'manual' | 'auto'; autoRule?: unknown;
  };
  if (!name?.trim()) {
    res.status(400).json({ error: 'name が必要です' });
    return;
  }
  const { getFirestore } = await import('firebase-admin/firestore');
  const ref = await getFirestore().collection(lineCrmDocPath(req.uid!, 'lineTags')).add({
    name: name.trim(), color, ruleType, autoRule: autoRule ?? null, friendCount: 0,
    createdAt: new Date().toISOString(),
  });
  res.json({ id: ref.id });
});

api.delete('/v1/line/tags/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { getFirestore } = await import('firebase-admin/firestore');
  await getFirestore().doc(lineCrmDocPath(req.uid!, 'lineTags', String(req.params.id))).delete();
  res.json({ success: true });
});

// 流入経路（短縮URL発行）
api.get('/v1/line/sources', requireAuth, async (req: AuthedRequest, res) => {
  const sources = await lineCrmCollection<{ label: string; addFriendUrl: string; followsCount: number; blocksCount: number }>(
    req.uid!,
    'lineSources',
  );
  res.json({ sources });
});

api.post('/v1/line/sources', requireAuth, async (req: AuthedRequest, res) => {
  const { label, addFriendUrl } = req.body as { label?: string; addFriendUrl?: string };
  if (!label?.trim() || !addFriendUrl?.trim()) {
    res.status(400).json({ error: 'label と addFriendUrl が必要です' });
    return;
  }
  const { getFirestore } = await import('firebase-admin/firestore');
  const ref = await getFirestore().collection(lineCrmDocPath(req.uid!, 'lineSources')).add({
    label: label.trim(),
    addFriendUrl: addFriendUrl.trim(),
    followsCount: 0,
    blocksCount: 0,
    createdAt: new Date().toISOString(),
  });
  const origin = process.env.BUZZIT_APP_ORIGIN ?? 'https://app.buzzit.shigotoku.com';
  res.json({
    id: ref.id,
    shortUrl: `${origin}/api/r/line/${ref.id}`,
  });
});

// 流入経路リダイレクト（公開・クッキー設定）
api.get('/r/line/:sourceId', async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const sourceId = String(req.params.sourceId);
    // 全ユーザーから sourceId 一致を検索（小規模想定。Index 化推奨）
    const snap = await getFirestore().collectionGroup('lineSources').get();
    const doc = snap.docs.find((d) => d.id === sourceId);
    if (!doc) {
      res.status(404).send('リンクが見つかりません');
      return;
    }
    const data = doc.data() as { addFriendUrl: string };
    const ownerUid = doc.ref.parent.parent?.id;
    if (ownerUid) {
      await recordSourceClick(ownerUid, sourceId).catch(() => {});
    }
    res.cookie('buzz_line_src', sourceId, { maxAge: 60 * 60 * 24 * 1000, httpOnly: false, sameSite: 'lax' });
    res.redirect(302, data.addFriendUrl);
  } catch (err) {
    console.error('line source redirect failed', err);
    res.status(500).send('リダイレクトに失敗しました');
  }
});

// 友だち台帳
api.get('/v1/line/friends', requireAuth, async (req: AuthedRequest, res) => {
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const friends = await listLineFriends(req.uid!, { tag, sourceId, q, status: 'followed' });
  res.json({ friends });
});

api.patch('/v1/line/friends/:lineUserId/tags', requireAuth, async (req: AuthedRequest, res) => {
  const { tags } = req.body as { tags?: string[] };
  if (!Array.isArray(tags)) {
    res.status(400).json({ error: 'tags 配列が必要です' });
    return;
  }
  const friend = await setFriendTags(req.uid!, String(req.params.lineUserId), tags);
  if (!friend) {
    res.status(404).json({ error: '友だちが見つかりません' });
    return;
  }
  res.json({ friend });
});

api.get('/v1/line/deliveries', requireAuth, async (req: AuthedRequest, res) => {
  const deliveries = await listDeliveries(req.uid!);
  res.json({ deliveries });
});

api.post('/v1/line/segments/:id/estimate', requireAuth, async (req: AuthedRequest, res) => {
  const { getFirestore } = await import('firebase-admin/firestore');
  const snap = await getFirestore().doc(lineCrmDocPath(req.uid!, 'lineSegments', String(req.params.id))).get();
  if (!snap.exists) {
    res.status(404).json({ error: 'セグメントが見つかりません' });
    return;
  }
  const conditions = (snap.data()?.conditions ?? []) as import('./services/lineCrm').SegmentCondition[];
  const reach = await estimateSegmentReach(req.uid!, conditions);
  await snap.ref.update({ estimatedReach: reach });
  res.json({ estimatedReach: reach });
});

// セグメント
api.get('/v1/line/segments', requireAuth, async (req: AuthedRequest, res) => {
  const segments = await lineCrmCollection<{ name: string; estimatedReach: number; conditions: unknown[] }>(
    req.uid!,
    'lineSegments',
  );
  res.json({ segments });
});

api.post('/v1/line/segments', requireAuth, async (req: AuthedRequest, res) => {
  const { name, conditions = [] } = req.body as { name?: string; conditions?: unknown[] };
  if (!name?.trim()) {
    res.status(400).json({ error: 'name が必要です' });
    return;
  }
  const { getFirestore } = await import('firebase-admin/firestore');
  const ref = await getFirestore().collection(lineCrmDocPath(req.uid!, 'lineSegments')).add({
    name: name.trim(), conditions, estimatedReach: 0,
    createdAt: new Date().toISOString(),
  });
  res.json({ id: ref.id });
});

api.patch('/v1/line/segments/:id', requireAuth, async (req: AuthedRequest, res) => {
  const { name, conditions } = req.body as { name?: string; conditions?: unknown[] };
  const { getFirestore } = await import('firebase-admin/firestore');
  const ref = getFirestore().doc(lineCrmDocPath(req.uid!, 'lineSegments', String(req.params.id)));
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: 'セグメントが見つかりません' });
    return;
  }
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name?.trim()) patch.name = name.trim();
  if (conditions) patch.conditions = conditions;
  await ref.update(patch);
  res.json({ success: true });
});

// セグメント配信（multicast / narrowcast 自動切替）
api.post('/v1/line/narrowcast', requireAuth, async (req: AuthedRequest, res) => {
  const { segmentId, text, conditions } = req.body as {
    segmentId?: string;
    text?: string;
    conditions?: import('./services/lineCrm').SegmentCondition[];
  };
  if (!text?.trim()) {
    res.status(400).json({ error: 'text が必要です' });
    return;
  }
  if (!segmentId && !conditions?.length) {
    res.status(400).json({ error: 'segmentId または conditions が必要です' });
    return;
  }
  const settings = await getUserSettings(req.uid!);
  if (!['pro', 'team', 'growth', 'enterprise'].includes(settings.plan)) {
    res.status(403).json({ error: 'Pro プラン以上が必要です' });
    return;
  }
  const result = await sendSegmentMessage(req.uid!, {
    segmentId,
    conditions,
    text: text.trim(),
  });
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// ステップ配信シナリオ
api.get('/v1/line/steps', requireAuth, async (req: AuthedRequest, res) => {
  const steps = await lineCrmCollection<{ name: string; status: string; messages: unknown[]; segmentId?: string }>(
    req.uid!,
    'lineSteps',
  );
  res.json({ steps });
});

api.post('/v1/line/steps', requireAuth, async (req: AuthedRequest, res) => {
  const { name, segmentId, messages = [], triggers = [{ kind: 'follow' }] } = req.body as {
    name?: string; segmentId?: string; messages?: unknown[]; triggers?: unknown[];
  };
  if (!name?.trim()) {
    res.status(400).json({ error: 'name が必要です' });
    return;
  }
  const settings = await getUserSettings(req.uid!);
  if (!['pro', 'team', 'growth', 'enterprise'].includes(settings.plan)) {
    res.status(403).json({ error: 'Pro プラン以上が必要です' });
    return;
  }
  // UI の { delayMinutes, message: { text } } と { delayMinutes, text } の両方を正規化
  const normalizedMessages = (messages as Array<{
    delayMinutes?: number;
    text?: string;
    message?: { text?: string };
  }>).map((m) => ({
    delayMinutes: Number(m.delayMinutes ?? 0),
    text: String(m.text ?? m.message?.text ?? '').trim(),
  })).filter((m) => m.text);

  const { getFirestore } = await import('firebase-admin/firestore');
  const ref = await getFirestore().collection(lineCrmDocPath(req.uid!, 'lineSteps')).add({
    name: name.trim(),
    segmentId: segmentId ?? null,
    messages: normalizedMessages.length
      ? normalizedMessages
      : [{ delayMinutes: 0, text: 'ご登録ありがとうございます！' }],
    triggers,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
  res.json({ id: ref.id });
});

// リッチメニュー
api.get('/v1/line/richmenu', requireAuth, async (req: AuthedRequest, res) => {
  const menus = await lineCrmCollection<{ name: string; lineRichMenuId?: string }>(req.uid!, 'lineRichMenus');
  res.json({ menus });
});

api.post('/v1/line/richmenu', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  if (!['pro', 'team', 'growth', 'enterprise'].includes(settings.plan)) {
    res.status(403).json({ error: 'Pro プラン以上が必要です' });
    return;
  }
  if (!settings.lineChannelAccessToken) {
    res.status(400).json({ error: 'LINE Channel Access Token 未設定' });
    return;
  }
  const { name, chatBarText, size, areas, segmentId } = req.body as {
    name?: string; chatBarText?: string; size?: { width: number; height: number }; segmentId?: string;
    areas?: Array<{ bounds: { x: number; y: number; width: number; height: number }; action: { type: string; uri?: string; data?: string; label?: string } }>;
  };
  if (!name || !chatBarText || !size || !areas?.length) {
    res.status(400).json({ error: 'name, chatBarText, size, areas が必要です' });
    return;
  }
  const result = await createLineRichMenu(settings.lineChannelAccessToken, { name, chatBarText, size, areas });
  if (!result.success) {
    res.status(500).json({ error: result.message });
    return;
  }
  const { getFirestore } = await import('firebase-admin/firestore');
  const ref = await getFirestore().collection(lineCrmDocPath(req.uid!, 'lineRichMenus')).add({
    name, lineRichMenuId: result.richMenuId, segmentId: segmentId ?? null, createdAt: new Date().toISOString(),
  });
  res.json({ id: ref.id, lineRichMenuId: result.richMenuId });
});

// インサイト
api.get('/v1/line/insights', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  if (!settings.lineChannelAccessToken) {
    res.json({ followers: null, demographic: null });
    return;
  }
  const today = new Date();
  const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate() - 1).padStart(2, '0')}`;
  const [followers, demographic] = await Promise.all([
    getLineFollowerInsight(settings.lineChannelAccessToken, date),
    getLineDemographicInsight(settings.lineChannelAccessToken),
  ]);
  res.json({
    followers: followers.success ? { count: followers.followers, targetedReaches: followers.targetedReaches } : null,
    demographic: demographic.success ? demographic.data : null,
  });
});

// --- HPB Conversions ---
api.get('/v1/hpb/conversions', requireAuth, async (req: AuthedRequest, res) => {
  const conversions = await listHpbConversions(req.uid!);
  res.json({ conversions });
});

api.post('/v1/hpb/conversions', requireAuth, async (req: AuthedRequest, res) => {
  const { postId, title, reservations, estimatedRevenue } = req.body as {
    postId?: string; title?: string; reservations?: number; estimatedRevenue?: number;
  };
  if (!postId || !title) {
    res.status(400).json({ error: 'postId と title が必要です' });
    return;
  }
  await upsertHpbConversion(req.uid!, {
    postId,
    title,
    reservations: Number(reservations ?? 1),
    estimatedRevenue: Number(estimatedRevenue ?? 0),
  });
  res.json({ success: true });
});

// --- GBP ---
function googleOAuthRedirectUri(): string {
  return `${META_APP_ORIGIN}/api/v1/oauth/google/callback`;
}

api.get('/v1/oauth/google/start', requireAuth, async (req: AuthedRequest, res) => {
  const state = await saveOAuthState(req.uid!, 'google');
  const url = getGoogleOAuthUrl(state, googleOAuthRedirectUri());
  if (!url) {
    res.json({
      mode: 'manual',
      message: 'GOOGLE_OAUTH_CLIENT_ID が未設定です。設定画面で店舗名を手動保存できます',
      settingsPath: '/settings?tab=sns',
    });
    return;
  }
  res.json({ url, mode: 'oauth' });
});

api.get('/v1/oauth/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  if (!code || !state) {
    res.redirect(302, `${META_APP_ORIGIN}/settings?tab=sns&gbp=error`);
    return;
  }
  const uid = await consumeOAuthState(state);
  if (!uid) {
    res.redirect(302, `${META_APP_ORIGIN}/settings?tab=sns&gbp=expired`);
    return;
  }
  const exchanged = await exchangeGoogleCode(code, googleOAuthRedirectUri());
  if (!exchanged) {
    res.redirect(302, `${META_APP_ORIGIN}/settings?tab=sns&gbp=error`);
    return;
  }
  const accounts = await listGbpAccounts(exchanged.accessToken);
  const account = accounts[0];
  let locationTitle = '';
  let locationId = '';
  let locationResourceName = '';
  if (account) {
    const locations = await listGbpLocations(exchanged.accessToken, account.name);
    const loc = locations[0];
    if (loc) {
      locationTitle = loc.title;
      locationId = loc.locationId;
      locationResourceName = loc.name;
    }
  }
  const expiresAt = exchanged.expiresIn
    ? new Date(Date.now() + exchanged.expiresIn * 1000).toISOString()
    : undefined;
  await updateUserSettings(uid, {
    gbpAccessToken: exchanged.accessToken,
    gbpRefreshToken: exchanged.refreshToken,
    gbpTokenExpiresAt: expiresAt,
    gbpAccountName: account?.name,
    gbpLocationId: locationId || undefined,
    gbpLocationResourceName: locationResourceName || undefined,
    gbpLocationName: locationTitle || undefined,
    gbpConnected: true,
  });
  res.redirect(302, `${META_APP_ORIGIN}/settings?tab=sns&gbp=connected`);
});

api.get('/v1/gbp/insights', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  const insights = await fetchGbpInsights(settings);
  const reviews = await listGbpReviews(settings);
  res.json({ insights, reviews });
});

api.post('/v1/gbp/review-reply', requireAuth, async (req: AuthedRequest, res) => {
  const { reviewText } = req.body as { reviewText?: string };
  if (!reviewText?.trim()) {
    res.status(400).json({ error: 'reviewText が必要です' });
    return;
  }
  const settings = await getUserSettings(req.uid!);
  const result = await draftGbpReviewReply(reviewText.trim(), settings.plan);
  res.json(result);
});

// --- Stripe Billing ---
api.post('/v1/billing/checkout', requireAuth, async (req: AuthedRequest, res) => {
  const { plan, interval = 'monthly', referralCode, startupDiscount } = req.body as {
    plan?: string; interval?: 'monthly' | 'annual'; referralCode?: string; startupDiscount?: boolean;
  };
  if (!plan || !['line_lite', 'line_pro', 'starter', 'pro', 'growth'].includes(plan)) {
    res.status(400).json({ error: '有効なプランを指定してください' });
    return;
  }
  const settings = await getUserSettings(req.uid!);
  const session = await createCheckoutSession({
    uid: req.uid!,
    email: settings.email,
    plan: plan as import('./services/firestore').PlanTier,
    interval,
    successUrl: `${META_APP_ORIGIN}/settings?tab=plan&checkout=success`,
    cancelUrl: `${META_APP_ORIGIN}/settings?tab=plan&checkout=cancel`,
    referralCode,
    startupDiscount: !!startupDiscount,
  });
  if (!session) {
    res.status(503).json({ error: '決済が未設定です（STRIPE_SECRET_KEY）' });
    return;
  }
  res.json(session);
});

// --- Lステップ移行 ---
api.post('/v1/line/import/lstep', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  if (!['pro', 'team', 'growth', 'enterprise'].includes(settings.plan)) {
    res.status(403).json({ error: 'Pro プラン以上が必要です' });
    return;
  }
  const { csv } = req.body as { csv?: string };
  if (!csv?.trim()) {
    res.status(400).json({ error: 'csv が必要です' });
    return;
  }
  const result = await importLstepCsv(req.uid!, csv);
  res.json(result);
});

// --- Gemini 戦略エージェント ---
api.post('/v1/agent/chat', requireAuth, async (req: AuthedRequest, res) => {
  const { messages } = req.body as {
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
  if (!messages?.length) {
    res.status(400).json({ error: 'messages が必要です' });
    return;
  }
  const result = await runStrategyAgent(req.uid!, messages);
  res.json(result);
});

api.post('/v1/billing/webhook', async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.header('stripe-signature') ?? '';
  const raw = (req as AuthedRequest).rawBody?.toString() ?? JSON.stringify(req.body);
  if (secret && !verifyStripeWebhookSignature(raw, sig, secret)) {
    res.status(400).send('Invalid signature');
    return;
  }
  const event = (raw ? JSON.parse(raw) : req.body) as { type?: string; data?: { object?: Record<string, unknown> } };
  if (event.type === 'checkout.session.completed') {
    const session = (event.data?.object ?? {}) as {
      metadata?: { uid?: string; plan?: string; interval?: string };
      customer?: string;
    };
    const meta = session.metadata ?? {};
    if (meta.uid && meta.plan) {
      await updateUserSettings(meta.uid, {
        plan: meta.plan as import('./services/firestore').PlanTier,
        billingInterval: (meta.interval as 'monthly' | 'annual') ?? 'monthly',
        stripeCustomerId: session.customer,
      });
    }
  }
  res.json({ received: true });
});

api.post('/v1/billing/referral/apply', requireAuth, async (req: AuthedRequest, res) => {
  const { code } = req.body as { code?: string };
  if (!code?.trim()) {
    res.status(400).json({ error: '紹介コードが必要です' });
    return;
  }
  const { getFirestore } = await import('firebase-admin/firestore');
  const snap = await getFirestore().collection('users').where('referralCode', '==', code.trim()).limit(1).get();
  if (snap.empty) {
    res.status(404).json({ error: '紹介コードが見つかりません' });
    return;
  }
  await updateUserSettings(req.uid!, { referredBy: snap.docs[0].id });
  res.json({ success: true, message: '紹介コードを適用しました（初月無料は決済時に反映）' });
});

// --- Enterprise ---
api.get('/v1/enterprise/kpis', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  if (!['growth', 'enterprise'].includes(settings.plan)) {
    res.status(403).json({ error: 'Growth OS / Enterprise プランが必要です' });
    return;
  }
  const kpis = await buildCrossStoreKpis(req.uid!);
  const tamperAlerts = await listTamperAlerts(req.uid!);
  res.json({ kpis, tamperAlerts });
});

api.post('/v1/enterprise/bulk-distribute', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  if (!['enterprise'].includes(settings.plan)) {
    res.status(403).json({ error: 'Enterprise プランが必要です' });
    return;
  }
  const { storeIds, templateTitle, templateBody, publishMode } = req.body as {
    storeIds?: string[]; templateTitle?: string; templateBody?: string; publishMode?: string;
  };
  if (!storeIds?.length || !templateTitle?.trim() || !templateBody?.trim()) {
    res.status(400).json({ error: 'storeIds, templateTitle, templateBody が必要です' });
    return;
  }
  const result = await bulkDistributeTemplate(req.uid!, {
    storeIds,
    templateTitle: templateTitle.trim(),
    templateBody: templateBody.trim(),
    publishMode: publishMode ?? 'approval',
  });
  res.json(result);
});

api.post('/v1/enterprise/inquiry', async (req, res) => {
  const { company, email, storeCount, message, uid } = req.body as {
    company?: string; email?: string; storeCount?: number; message?: string; uid?: string;
  };
  if (!company?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'company, email, message が必要です' });
    return;
  }
  const id = await saveEnterpriseInquiry({
    uid,
    company: company.trim(),
    email: email.trim(),
    storeCount: Number(storeCount ?? 1),
    message: message.trim(),
  });
  res.json({ success: true, id });
});

// --- Product extras: inbox / patterns / coupons / chat / health / export / watch ---
api.get('/v1/inbox', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ ideas: await listIdeaInbox(req.uid!) });
});

api.post('/v1/inbox', requireAuth, async (req: AuthedRequest, res) => {
  const { text, author, authorRole, photoDataUrl } = req.body as {
    text?: string; author?: string; authorRole?: string; photoDataUrl?: string;
  };
  if (!text?.trim()) {
    res.status(400).json({ error: 'text が必要です' });
    return;
  }
  const idea = await addIdeaInbox(req.uid!, { text, author, authorRole, photoDataUrl });
  res.json({ idea });
});

api.post('/v1/inbox/:id/use', requireAuth, async (req: AuthedRequest, res) => {
  const idea = await markIdeaUsed(req.uid!, String(req.params.id));
  if (!idea) {
    res.status(404).json({ error: 'ネタが見つかりません' });
    return;
  }
  const params = new URLSearchParams({
    idea: idea.text,
    from: 'inbox',
    inboxId: idea.id,
  });
  res.json({
    idea,
    magicCreatorPath: `/magic-creator?${params.toString()}`,
  });
});

api.get('/v1/winning-patterns', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ patterns: await listWinningPatterns(req.uid!) });
});

api.post('/v1/winning-patterns', requireAuth, async (req: AuthedRequest, res) => {
  const { title, hook, platform, notes, sourcePostId } = req.body as {
    title?: string; hook?: string; platform?: string; notes?: string; sourcePostId?: string;
  };
  if (!title?.trim() || !hook?.trim()) {
    res.status(400).json({ error: 'title と hook が必要です' });
    return;
  }
  const pattern = await addWinningPattern(req.uid!, { title, hook, platform, notes, sourcePostId });
  res.json({ pattern });
});

api.get('/v1/coupons', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ coupons: await listCoupons(req.uid!) });
});

api.post('/v1/coupons', requireAuth, async (req: AuthedRequest, res) => {
  const { name, code, benefit, maxUses } = req.body as {
    name?: string; code?: string; benefit?: string; maxUses?: number;
  };
  if (!name?.trim() || !benefit?.trim()) {
    res.status(400).json({ error: 'name と benefit が必要です' });
    return;
  }
  res.json({ coupon: await createCoupon(req.uid!, { name, code, benefit, maxUses }) });
});

api.post('/v1/coupons/:id/redeem', requireAuth, async (req: AuthedRequest, res) => {
  const { note } = req.body as { note?: string };
  const result = await redeemCoupon(req.uid!, String(req.params.id), note);
  res.status(result.success ? 200 : 400).json(result);
});

api.get('/v1/line/chat-queue', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ items: await listChatQueue(req.uid!) });
});

api.post('/v1/line/chat-queue/:id/resolve', requireAuth, async (req: AuthedRequest, res) => {
  await resolveChatQueue(req.uid!, String(req.params.id));
  res.json({ success: true });
});

api.get('/v1/line/friends/:lineUserId', requireAuth, async (req: AuthedRequest, res) => {
  const friends = await listLineFriends(req.uid!, { limit: 5000 });
  const friend = friends.find((f) => f.lineUserId === String(req.params.lineUserId));
  if (!friend) {
    res.status(404).json({ error: '友だちが見つかりません' });
    return;
  }
  const deliveries = await listDeliveries(req.uid!, 20);
  res.json({ friend, recentDeliveries: deliveries.slice(0, 10) });
});

api.get('/v1/health', requireAuth, async (req: AuthedRequest, res) => {
  res.json(await buildConnectionHealth(req.uid!));
});

api.get('/v1/audit-logs', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ logs: await listAuditLogs(req.uid!) });
});

api.get('/v1/export', requireAuth, async (req: AuthedRequest, res) => {
  const format = String(req.query.format ?? 'json');
  const bundle = await buildExportBundle(req.uid!);
  await writeAuditLog(req.uid!, 'export.download', format);
  if (format === 'csv') {
    const friendsCsv = toCsv(
      (bundle.friends as Array<Record<string, unknown>>).map((f) => ({
        lineUserId: f.lineUserId,
        displayName: f.displayName,
        tags: Array.isArray(f.tags) ? (f.tags as string[]).join('|') : '',
        sourceId: f.sourceId,
        score: f.score,
        status: f.status,
      })),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="buzzit-friends.csv"');
    res.send(friendsCsv);
    return;
  }
  res.json(bundle);
});

api.get('/v1/regional-watch', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  res.json({ ideas: regionalWatchIdeas(settings.industry) });
});

api.get('/v1/stores/progress', requireAuth, async (req: AuthedRequest, res) => {
  const stores = await listStoresForUser(req.uid!);
  const progress = await listStoreProgress(
    req.uid!,
    stores.map((s) => s.id),
  );
  res.json({
    stores: stores.map((s) => ({
      ...s,
      progress: progress.find((p) => p.storeId === s.id),
    })),
  });
});

api.post('/v1/line/flex-preview', requireAuth, async (req: AuthedRequest, res) => {
  const { title, body, ctaLabel, ctaUri } = req.body as {
    title?: string; body?: string; ctaLabel?: string; ctaUri?: string;
  };
  const flex = {
    type: 'flex',
    altText: title?.slice(0, 40) || 'BuzzIt お知らせ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: title || 'お知らせ', weight: 'bold', size: 'lg', wrap: true },
          { type: 'text', text: body || '', size: 'sm', wrap: true, margin: 'md' },
        ],
      },
      footer: ctaUri
        ? {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                action: { type: 'uri', label: ctaLabel || '詳しく見る', uri: ctaUri },
              },
            ],
          }
        : undefined,
    },
  };
  res.json({
    flex,
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '予約したい', text: '予約したい' } },
        { type: 'action', action: { type: 'message', label: 'クーポンを見る', text: 'クーポンを見る' } },
        { type: 'action', action: { type: 'message', label: '営業時間', text: '営業時間を教えて' } },
      ],
    },
  });
});

// --- Stores & billing ---
api.get('/v1/stores', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const stores = await listStoresForUser(req.uid!);
    const settings = await getUserSettings(req.uid!);
    const activeStoreId = settings.activeStoreId ?? stores[0]?.id ?? null;
    const role = activeStoreId ? await getUserRoleInStore(activeStoreId, req.uid!) : null;
    res.json({ stores, activeStoreId, role });
  } catch (err) {
    console.error('stores list failed', err);
    res.status(500).json({ error: '店舗一覧の取得に失敗しました' });
  }
});

api.post('/v1/stores', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { name, industry } = req.body as { name?: string; industry?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: '店舗名が必要です' });
      return;
    }
    const store = await createStore(req.uid!, name.trim(), industry);
    res.json(store);
  } catch (err) {
    const message = err instanceof Error ? err.message : '店舗の作成に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.put('/v1/stores/active', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { storeId } = req.body as { storeId?: string };
    if (!storeId) {
      res.status(400).json({ error: 'storeId が必要です' });
      return;
    }
    await setActiveStore(req.uid!, storeId);
    res.json({ success: true, activeStoreId: storeId });
  } catch (err) {
    const message = err instanceof Error ? err.message : '店舗の切替に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.get('/v1/billing', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    const plan = settings.plan;
    const extraSnsAccounts = Math.max(0, Number(settings.extraSnsAccounts) || 0);
    const stores = await listStoresForUser(req.uid!, settings);
    const activeStoreId = settings.activeStoreId ?? stores[0]?.id ?? null;
    const [members, pendingInviteCount] = activeStoreId
      ? await Promise.all([listStoreMembers(activeStoreId), countPendingInvites(activeStoreId)])
      : [[], 0];
    const memberCount = members.length || 1;
    res.json({
      plan,
      storeCount: stores.length,
      memberCount,
      pendingInviteCount,
      extraSnsAccounts,
      extraSnsAccountPrice: EXTRA_SNS_ACCOUNT_MONTHLY,
      monthlyTotal: computeMonthlyTotal(plan, stores.length, extraSnsAccounts),
      baseMonthly: PLAN_BASE_MONTHLY[plan],
      additionalStoreDiscount: ADDITIONAL_STORE_DISCOUNT,
      maxStores: MAX_STORES_BY_PLAN[plan],
      maxStaff: MAX_STAFF_BY_PLAN[plan],
      staffLimitLabel: staffLimitLabel(plan),
      storeLimitLabel: storeLimitLabel(plan),
      stores: stores.map((s) => ({ id: s.id, name: s.name })),
      activeStoreId,
    });
  } catch (err) {
    console.error('billing failed', err);
    res.status(500).json({ error: '請求情報の取得に失敗しました' });
  }
});

api.get('/v1/stores/:storeId/members', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const storeId = String(req.params.storeId);
    const role = await getUserRoleInStore(storeId, req.uid!);
    if (!role) {
      res.status(403).json({ error: 'アクセス権がありません' });
      return;
    }
    const members = await listStoreMembers(storeId);
    const invitations = await listStoreInvitations(storeId);
    res.json({ members, invitations: invitations.filter((i) => !i.acceptedAt) });
  } catch (err) {
    res.status(500).json({ error: 'メンバー一覧の取得に失敗しました' });
  }
});

api.post('/v1/stores/:storeId/invitations', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const storeId = String(req.params.storeId);
    const { email, role } = req.body as { email?: string; role?: 'manager' | 'staff' };
    if (!email?.trim()) {
      res.status(400).json({ error: 'メールアドレスが必要です' });
      return;
    }
    const result = await createStoreInvitation({
      storeId,
      invitedBy: req.uid!,
      email: email.trim(),
      role: role ?? 'staff',
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '招待に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.delete('/v1/stores/:storeId/invitations/:invitationId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const storeId = String(req.params.storeId);
    const invitationId = String(req.params.invitationId);
    const { token } = req.body as { token?: string };
    const role = await getUserRoleInStore(storeId, req.uid!);
    if (role !== 'owner' && role !== 'manager') {
      res.status(403).json({ error: '権限がありません' });
      return;
    }
    await revokeStoreInvitation(storeId, invitationId, token);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: '招待の取消に失敗しました' });
  }
});

api.delete('/v1/stores/:storeId/members/:userId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await removeStoreMember(String(req.params.storeId), String(req.params.userId), req.uid!);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '削除に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.patch('/v1/stores/:storeId/members/:userId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { role } = req.body as { role?: 'manager' | 'staff' };
    if (!role) {
      res.status(400).json({ error: 'role が必要です' });
      return;
    }
    await updateStoreMemberRole(String(req.params.storeId), String(req.params.userId), role, req.uid!);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ロール変更に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.post('/v1/stores/:storeId/transfer-ownership', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { newOwnerId } = req.body as { newOwnerId?: string };
    if (!newOwnerId) {
      res.status(400).json({ error: 'newOwnerId が必要です' });
      return;
    }
    const storeId = String(req.params.storeId);
    const role = await getUserRoleInStore(storeId, req.uid!);
    if (role !== 'owner') {
      res.status(403).json({ error: 'オーナーのみ移譲できます' });
      return;
    }
    await transferStoreOwnership(storeId, req.uid!, newOwnerId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '移譲に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.get('/v1/invitations/:token', async (req, res) => {
  const info = await getInvitationByToken(String(req.params.token));
  if (!info) {
    res.status(404).json({ error: '招待が見つかりません' });
    return;
  }
  res.json(info);
});

api.post('/v1/invitations/:token/accept', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    const result = await acceptStoreInvitation(String(req.params.token), req.uid!, settings.email);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '招待の承認に失敗しました';
    res.status(400).json({ error: message });
  }
});

// --- Account (課金主体) ---
api.get('/v1/account', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const account = await getAccountForUser(req.uid!);
    if (!account) {
      res.json({ account: null, entitlements: null, accountSetupRequired: true });
      return;
    }
    const entitlements = await resolveEntitlements(req.uid!);
    const members = await listAccountMembers(account.id);
    res.json({ account, entitlements, members, accountSetupRequired: false });
  } catch (err) {
    console.error('account get failed', err);
    res.status(500).json({ error: 'アカウント情報の取得に失敗しました' });
  }
});

api.post('/v1/account/setup', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { accountType, companyName, companyTaxId } = req.body as {
      accountType: 'individual' | 'business';
      companyName?: string;
      companyTaxId?: string;
    };
    if (!accountType || !['individual', 'business'].includes(accountType)) {
      res.status(400).json({ error: 'accountType は individual または business を指定してください' });
      return;
    }
    const settings = await getUserSettings(req.uid!);
    const result = await setupAccount(req.uid!, {
      accountType,
      companyName,
      companyTaxId,
    }, settings.email, settings.displayName);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'アカウントの作成に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.get('/v1/account/members', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const account = await getAccountForUser(req.uid!);
    if (!account) {
      res.status(404).json({ error: 'アカウントが見つかりません' });
      return;
    }
    const [members, invitations] = await Promise.all([
      listAccountMembers(account.id),
      listAccountInvitations(account.id),
    ]);
    const myRole = await getAccountMemberRole(account.id, req.uid!);
    const extraSeats = Math.max(0, account.seatCount - account.includedSeats);
    res.json({
      members,
      invitations: invitations.filter((i) => !i.acceptedAt),
      mailConfigured: isMailConfigured(),
      seatCount: account.seatCount,
      includedSeats: account.includedSeats,
      extraSeats,
      extraSeatMonthly: EXTRA_ACCOUNT_SEAT_MONTHLY,
      extraSeatsCost: extraSeats * EXTRA_ACCOUNT_SEAT_MONTHLY,
      accountType: account.accountType,
      companyName: account.companyName,
      myRole,
      canManage: myRole === 'owner' || myRole === 'admin',
    });
  } catch (err) {
    res.status(500).json({ error: 'メンバー一覧の取得に失敗しました' });
  }
});

api.post('/v1/account/members', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { email, role } = req.body as { email?: string; role?: 'admin' | 'member' };
    const account = await getAccountForUser(req.uid!);
    if (!account) {
      res.status(404).json({ error: 'アカウントが見つかりません' });
      return;
    }
    const result = await inviteAccountMemberByEmail(
      account.id,
      email ?? '',
      req.uid!,
      role === 'admin' ? 'admin' : 'member',
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'メンバー招待に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.delete('/v1/account/invitations/:invitationId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const account = await getAccountForUser(req.uid!);
    if (!account) {
      res.status(404).json({ error: 'アカウントが見つかりません' });
      return;
    }
    const { token } = req.body as { token?: string };
    await revokeAccountInvitation(account.id, String(req.params.invitationId), req.uid!, token);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '招待の取り消しに失敗しました';
    res.status(400).json({ error: message });
  }
});

api.get('/v1/account/invitations/:token', async (req, res) => {
  const info = await getAccountInvitationByToken(String(req.params.token));
  if (!info) {
    res.status(404).json({ error: '招待が見つかりません' });
    return;
  }
  res.json(info);
});

api.post('/v1/account/invitations/:token/accept', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const settings = await getUserSettings(req.uid!);
    const result = await acceptAccountInvitation(
      String(req.params.token),
      req.uid!,
      settings.email,
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '招待の承認に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.delete('/v1/account/members/:userId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const account = await getAccountForUser(req.uid!);
    if (!account) {
      res.status(404).json({ error: 'アカウントが見つかりません' });
      return;
    }
    await removeAccountMember(account.id, String(req.params.userId), req.uid!);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'メンバー削除に失敗しました';
    res.status(400).json({ error: message });
  }
});

// --- Admin (アカウント管理) ---
api.get('/v1/admin/me', requireAuth, async (req: AuthedRequest, res) => {
  const admin = await isAdminUid(req.uid!);
  res.json({ admin });
});

api.get('/v1/admin/accounts', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const accounts = await listAllAccounts(200);
    const enriched = await Promise.all(
      accounts.map(async (a) => {
        const members = await listAccountMembers(a.id);
        return {
          ...a,
          entitlements: {
            billingExempt: a.billingExempt || a.billingStatus === 'monitor',
            extraSeats: Math.max(0, a.seatCount - a.includedSeats),
          },
          memberCount: members.length,
          accountTypeLabel: ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType,
          billingStatusLabel: BILLING_STATUS_LABELS[a.billingStatus] ?? a.billingStatus,
        };
      }),
    );
    res.json({ accounts: enriched });
  } catch (err) {
    console.error('admin accounts list failed', err);
    res.status(500).json({ error: 'アカウント一覧の取得に失敗しました' });
  }
});

api.patch('/v1/admin/accounts/:accountId', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const auth = await import('firebase-admin/auth');
    const user = await auth.getAuth().getUser(req.uid!);
    const updated = await adminUpdateAccount(
      String(req.params.accountId),
      req.body,
      { uid: req.uid!, email: user.email },
    );
    res.json({ account: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新に失敗しました';
    res.status(400).json({ error: message });
  }
});

api.get('/v1/admin/accounts/:accountId/members', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const members = await listAccountMembers(String(req.params.accountId));
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'メンバー一覧の取得に失敗しました' });
  }
});

api.get('/v1/admin/audit-log', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const snap = await import('firebase-admin/firestore').then((m) =>
      m.getFirestore().collection('admin_audit_log').orderBy('createdAt', 'desc').limit(50).get(),
    );
    const logs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? d.data().createdAt,
    }));
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: '監査ログの取得に失敗しました' });
  }
});

// --- Auth login hint (公開・認証不要) ---
api.post('/v1/auth/login-hint', async (req, res) => {
  const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkLoginHintRateLimit(clientKey)) {
    res.status(429).json({ error: 'リクエストが多すぎます。しばらく待ってから再度お試しください。' });
    return;
  }

  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      res.status(400).json({ error: 'メールアドレスを入力してください' });
      return;
    }
    const hint = await getLoginHint(email);
    res.json(hint);
  } catch (err) {
    console.error('auth/login-hint failed', err);
    res.status(500).json({ error: 'ログイン方法の確認に失敗しました' });
  }
});

// --- Auth bootstrap ---
api.post('/v1/auth/bootstrap', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { email, displayName } = req.body as { email?: string; displayName?: string };
    const settings = await ensureUser(req.uid!, email, displayName);
    const hasAccount = await userHasAccount(req.uid!);
    res.json({
      ...settings,
      accountSetupRequired: !hasAccount && !settings.accountSetupComplete,
    });
  } catch (err) {
    console.error('auth/bootstrap failed', err);
    res.status(500).json({ error: 'ユーザープロファイルの作成に失敗しました' });
  }
});

app.use('/api', api);
app.use(api);

const functionOptions = {
  region: 'asia-northeast1' as const,
  memory: '512MiB' as const,
  timeoutSeconds: 120,
  cors: true,
  serviceAccount: 'firebase-adminsdk-fbsvc@shigotoku-prod.iam.gserviceaccount.com',
};

export const buzzitApi = onRequest({ ...functionOptions, secrets: [...functionSecrets] }, app);

export {
  buzzitScheduler,
  buzzitPublishWorker,
  buzzitLineStepWorker,
  buzzitWeeklyReport,
} from './scheduler';
