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
import { scheduleWithAyrshare, getAyrshareProfiles } from './services/ayrshare';
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
  saveScheduledJob,
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
  createAbTest,
  getAbTests,
  evaluateAbTest,
  evaluateAllRunningAbTests,
} from './services/abTest';
import { requireAuth, type AuthedRequest } from './middleware/auth';

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
    features: ['gemini', 'firestore', 'slack', 'ayrshare', 'auto-mode', 'utm-tracking', 'line-webhook', 'trends', 'ab-tests'],
  });
});

// --- Upload ---
const rawUpload = express.raw({ type: '*/*', limit: `${MAX_VIDEO_BYTES}b` });

api.post('/v1/upload', rawUpload, async (req, res) => {
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

api.post('/v1/upload/signed-url', async (req, res) => {
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

// --- Schedule (Ayrshare) ---
api.post('/v1/schedule', requireAuth, async (req: AuthedRequest, res) => {
  const { contents, scheduledAt, destinationUrl } = req.body as {
    contents?: Array<{ platform: string; label: string; content: string }>;
    scheduledAt?: string;
    destinationUrl?: string;
  };

  if (!contents?.length || !scheduledAt) {
    res.status(400).json({ error: 'contents と scheduledAt が必要です' });
    return;
  }

  try {
    const settings = await getUserSettings(req.uid!);
    const dest = destinationUrl ?? settings.defaultDestinationUrl;
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

    const result = await scheduleWithAyrshare(contents, scheduledAt, settings.ayrshareProfileKey);
    await saveScheduledJob(req.uid!, contents, scheduledAt, 'scheduled', result);
    res.json({ ...result, trackingLinks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '予約投稿に失敗しました' });
  }
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
  res.json({
    ...settings,
    snsConnections,
    canUseSlack: canUseSlack(settings),
    canUseAutoMode: settings.plan === 'growth',
    lineWebhookUrl: lineWebhookUrl(req.uid!),
  });
});

api.put('/v1/settings', requireAuth, async (req: AuthedRequest, res) => {
  const allowed = [
    'plan', 'slackWebhookUrl', 'ayrshareProfileKey', 'autoModeEnabled', 'slackTeamId',
    'displayName', 'lineChannelSecret', 'lineDestinationId', 'defaultDestinationUrl',
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

export const buzzitApi = onRequest(functionOptions, app);

export { buzzitScheduler } from './scheduler';
