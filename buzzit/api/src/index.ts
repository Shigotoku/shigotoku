import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { createSignedUploadUrl } from './services/storage';
import {
  ACCEPTED_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  checkBrandSafety,
  repurposeFromIdea,
} from './services/repurpose';

initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'buzzit-api' });
});

app.post('/v1/upload/signed-url', async (req, res) => {
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

app.post('/v1/repurpose', (req, res) => {
  const { idea, plan = 'starter', mediaUrls } = req.body as {
    idea?: string;
    plan?: string;
    mediaUrls?: string[];
  };

  if (!idea?.trim()) {
    res.status(400).json({ error: 'idea が必要です' });
    return;
  }

  const safety = checkBrandSafety(idea);
  const results = repurposeFromIdea(idea, plan, mediaUrls);

  res.json({
    results,
    safetyViolations: safety.safe ? undefined : safety.violations,
  });
});

app.post('/v1/schedule', (req, res) => {
  const { contents, scheduledAt } = req.body as {
    contents?: Array<{ platform: string; label: string; content: string }>;
    scheduledAt?: string;
  };

  if (!contents?.length || !scheduledAt) {
    res.status(400).json({ error: 'contents と scheduledAt が必要です' });
    return;
  }

  const when = new Date(scheduledAt).toLocaleString('ja-JP');
  res.json({
    success: true,
    message: `${contents.length}件の投稿を ${when} に予約しました（Ayrshare連携）`,
  });
});

export const buzzitApi = onRequest(
  {
    region: 'asia-northeast1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  app,
);
