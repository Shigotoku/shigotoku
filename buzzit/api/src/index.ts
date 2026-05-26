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
import { generateRepurposeWithGemini } from './services/gemini';
import { getAyrshareProfiles } from './services/ayrshare';
import {
  ensureUser,
  getUserSettings,
  updateUserSettings,
  getMetrics,
  getPosts,
  addPost,
  addSlackIdea,
  getSlackIdeas,
  approveSlackIdea,
  createScheduledJob,
  getScheduledJobs,
  approveScheduledJob,
  trackMetricEvent,
  createTrackingLink,
  getTrackingLink,
  recordTrackingClick,
  findUserByLineDestination,
} from './services/firestore';
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
import { saveOAuthState, consumeOAuthState } from './services/schedulerWorker';
import type { PublishMode } from './types/schedule';
import {
  createAbTest,
  getAbTests,
  evaluateAbTest,
  evaluateAllRunningAbTests,
} from './services/abTest';
import { requireAuth, type AuthedRequest } from './middleware/auth';
import { functionSecrets } from './config/secrets';

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
    features: ['gemini', 'firestore', 'slack', 'meta-oauth', 'publish-worker', 'auto-mode', 'utm-tracking', 'line-webhook', 'trends', 'ab-tests'],
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

  const settings = await getUserSettings(req.uid!);
  const effectivePlan = plan ?? settings.plan;
  const safety = checkBrandSafety(idea);
  const { results, usedGemini } = await generateRepurposeWithGemini(idea, effectivePlan, mediaUrls);

  res.json({
    results,
    usedGemini,
    safetyViolations: safety.safe ? undefined : safety.violations,
  });
});

// --- Schedule (Firestore + Worker / Meta / LINE / Notify) ---
api.post('/v1/schedule', requireAuth, async (req: AuthedRequest, res) => {
  const { contents, scheduledAt, destinationUrl, publishMode, mediaUrls } = req.body as {
    contents?: Array<{ platform: string; label: string; content: string; carouselSlides?: string[] }>;
    scheduledAt?: string;
    destinationUrl?: string;
    publishMode?: PublishMode;
    mediaUrls?: string[];
  };

  if (!contents?.length || !scheduledAt) {
    res.status(400).json({ error: 'contents と scheduledAt が必要です' });
    return;
  }

  try {
    const settings = await getUserSettings(req.uid!);
    const dest = destinationUrl ?? settings.defaultDestinationUrl;
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
      scheduledAt,
      publishMode: mode,
      mediaUrls,
      destinationUrl: dest,
      trackingLinks,
    });

    const when = new Date(scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const modeLabel: Record<PublishMode, string> = {
      notify: '通知リマインダー',
      approval: '承認待ちキュー',
      meta: 'Meta 自動投稿',
      line: 'LINE 配信',
      gbp: 'Google Business Profile（準備中）',
      ayrshare: 'Ayrshare 予約',
      auto: '自動（接続に応じて）',
    };

    res.json({
      success: true,
      jobId,
      message: `${contents.length}件を ${when} に登録しました（${modeLabel[mode]}）`,
      trackingLinks,
      publishMode: mode,
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

// --- Settings ---
api.get('/v1/settings', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  const snsConnections = await getAyrshareProfiles();
  const metaConnected = !!(settings.metaAccessToken && settings.metaIgUserId);
  res.json({
    ...settings,
    snsConnections,
    metaConnected,
    canUseSlack: canUseSlack(settings),
    canUseAutoMode: settings.plan === 'growth',
    lineWebhookUrl: lineWebhookUrl(req.uid!),
  });
});

api.put('/v1/settings', requireAuth, async (req: AuthedRequest, res) => {
  const allowed = [
    'plan', 'slackWebhookUrl', 'ayrshareProfileKey', 'autoModeEnabled', 'slackTeamId',
    'displayName', 'lineChannelSecret', 'lineChannelAccessToken', 'lineAdminUserId',
    'lineDestinationId', 'defaultDestinationUrl', 'defaultPublishMode',
    'metaAccessToken', 'metaPageAccessToken', 'metaIgUserId', 'metaPageId', 'metaTokenExpiresAt',
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) patch[key] = req.body[key];
  }
  const settings = await updateUserSettings(req.uid!, patch);
  res.json(settings);
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
  const dest = destinationUrl ?? settings.defaultDestinationUrl;
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
  const utmCampaign = `buzzit_${platform ?? 'link'}_${Date.now()}`;
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
    events?: Array<{ type?: string; postback?: { data?: string } }>;
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
    if (event.type === 'follow') {
      const postId = event.postback?.data?.startsWith('post=')
        ? event.postback.data.slice(5)
        : undefined;
      await trackMetricEvent(uid, 'line_signup', 1, postId);
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
  await approveSlackIdea(req.uid!, ideaId);
  res.json({ success: true });
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

// --- Voice Draft (Phase 4 skeleton) ---
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
  const audioSizeKb = Math.round((audioBase64.length * 0.75) / 1024);
  const settings = await getUserSettings(req.uid!);
  const baseIdea = hint?.trim() || '今日の施術・接客についてのカウンセリング会話';
  const { results, usedGemini } = await generateRepurposeWithGemini(
    `（${audioSizeKb}KBのボイス素材より自動生成）\n${baseIdea}`,
    settings.plan,
    undefined,
  );
  res.json({
    transcript: `[音声 ${audioSizeKb}KB / ${mimeType ?? 'audio/webm'}] ${baseIdea}`,
    drafts: results.map((r) => ({ kind: r.platform, label: r.label, content: r.content })),
    usedGemini,
  });
});

// --- LINE Cost Estimate (Phase 5 skeleton) ---
api.get('/v1/line/cost-estimate', requireAuth, async (req: AuthedRequest, res) => {
  const pricePerMessage = Number(process.env.LINE_PRICE_PER_MSG ?? '3');
  const metrics = await getMetrics(req.uid!);
  const lineFriends = metrics.funnel.lineSignups || 200;
  const monthlyMessagesPerFriend = 4;
  const estimatedRecipients = lineFriends * monthlyMessagesPerFriend;
  const estimatedCost = Math.round(estimatedRecipients * pricePerMessage);
  const estimatedSegmentReach = Math.round(estimatedRecipients * 0.4);
  const estimatedSegmentCost = Math.round(estimatedSegmentReach * pricePerMessage);
  const savedPercent =
    estimatedCost > 0 ? Math.round(((estimatedCost - estimatedSegmentCost) / estimatedCost) * 100) : 0;
  res.json({
    pricePerMessage,
    estimatedRecipients,
    estimatedCost,
    estimatedSegmentReach,
    estimatedSegmentCost,
    savedPercent,
  });
});

// --- LINE CRM (Lstep Replacement / Phase 5) ---

import {
  sendLineNarrowcast,
  createLineAudienceGroup,
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
    res.cookie('buzz_line_src', sourceId, { maxAge: 60 * 60 * 24 * 1000, httpOnly: false, sameSite: 'lax' });
    res.redirect(302, data.addFriendUrl);
  } catch (err) {
    console.error('line source redirect failed', err);
    res.status(500).send('リダイレクトに失敗しました');
  }
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

// Narrowcast 配信
api.post('/v1/line/narrowcast', requireAuth, async (req: AuthedRequest, res) => {
  const { segmentId, text, userIds } = req.body as { segmentId?: string; text?: string; userIds?: string[] };
  if (!text?.trim()) {
    res.status(400).json({ error: 'text が必要です' });
    return;
  }
  const settings = await getUserSettings(req.uid!);
  if (!['pro', 'team', 'growth', 'enterprise'].includes(settings.plan)) {
    res.status(403).json({ error: 'Pro プラン以上が必要です' });
    return;
  }
  if (!settings.lineChannelAccessToken) {
    res.status(400).json({ error: 'LINE Channel Access Token 未設定' });
    return;
  }
  if (!userIds?.length) {
    res.status(400).json({ error: 'userIds（最小100名）が必要です' });
    return;
  }
  const ag = await createLineAudienceGroup(
    settings.lineChannelAccessToken,
    `buzzit_${segmentId ?? 'manual'}_${Date.now()}`,
    userIds,
  );
  if (!ag.success || !ag.audienceGroupId) {
    res.status(500).json({ error: ag.message });
    return;
  }
  const result = await sendLineNarrowcast(settings.lineChannelAccessToken, ag.audienceGroupId, text);
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
  const { getFirestore } = await import('firebase-admin/firestore');
  const ref = await getFirestore().collection(lineCrmDocPath(req.uid!, 'lineSteps')).add({
    name: name.trim(), segmentId: segmentId ?? null, messages, triggers,
    status: 'active', createdAt: new Date().toISOString(),
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
  const { name, chatBarText, size, areas } = req.body as {
    name?: string; chatBarText?: string; size?: { width: number; height: number };
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
    name, lineRichMenuId: result.richMenuId, createdAt: new Date().toISOString(),
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

// --- HPB Conversions (Phase 5 skeleton) ---
api.get('/v1/hpb/conversions', requireAuth, async (req: AuthedRequest, res) => {
  const settings = await getUserSettings(req.uid!);
  if (settings.plan !== 'growth' && settings.plan !== 'enterprise') {
    res.json({ conversions: [] });
    return;
  }
  res.json({ conversions: [] });
});

// --- GBP OAuth (Phase 4 skeleton) ---
api.get('/v1/oauth/google/start', requireAuth, async (_req: AuthedRequest, res) => {
  res.status(503).json({ error: 'Google Business Profile OAuth は Phase 4 で提供予定です' });
});

// --- Auth bootstrap ---
api.post('/v1/auth/bootstrap', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { email, displayName } = req.body as { email?: string; displayName?: string };
    const settings = await ensureUser(req.uid!, email, displayName);
    res.json(settings);
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

export { buzzitScheduler, buzzitPublishWorker } from './scheduler';
