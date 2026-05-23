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
  addSlackIdea,
  getSlackIdeas,
  approveSlackIdea,
  saveScheduledJob,
  trackMetricEvent,
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
    features: ['gemini', 'firestore', 'slack', 'ayrshare', 'auto-mode'],
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
  const { contents, scheduledAt } = req.body as {
    contents?: Array<{ platform: string; label: string; content: string }>;
    scheduledAt?: string;
  };

  if (!contents?.length || !scheduledAt) {
    res.status(400).json({ error: 'contents と scheduledAt が必要です' });
    return;
  }

  try {
    const settings = await getUserSettings(req.uid!);
    const result = await scheduleWithAyrshare(contents, scheduledAt, settings.ayrshareProfileKey);
    await saveScheduledJob(req.uid!, contents, scheduledAt, 'scheduled', result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '予約投稿に失敗しました' });
  }
});

// --- Dashboard ---
api.get('/v1/dashboard', requireAuth, async (req: AuthedRequest, res) => {
  await ensureUser(req.uid!);
  const [metrics, settings] = await Promise.all([
    getMetrics(req.uid!),
    getUserSettings(req.uid!),
  ]);
  res.json({ metrics, plan: settings.plan });
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
  });
});

api.put('/v1/settings', requireAuth, async (req: AuthedRequest, res) => {
  const allowed = ['plan', 'slackWebhookUrl', 'ayrshareProfileKey', 'autoModeEnabled', 'slackTeamId', 'displayName'];
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
  const { email, displayName } = req.body as { email?: string; displayName?: string };
  const settings = await ensureUser(req.uid!, email, displayName);
  res.json(settings);
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
