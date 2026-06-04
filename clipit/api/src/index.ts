import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { requireAuth, type AuthedRequest } from './middleware/auth.js';
import { generateAllStepInstructions, generateStepInstruction } from './services/gemini.js';
import type { InstructionTone, TargetAudience, StepInput } from './services/gemini.js';
import { assertManualAccess, ingestSteps } from './services/manuals.js';
import { rateLimit } from './middleware/rateLimit.js';
import { assertAiQuota } from './services/usage.js';

const limitAi = rateLimit(30);

if (!getApps().length) initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '15mb' }));

const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'clipit-api',
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
});

api.post('/v1/ai/generate-step', requireAuth, async (req: AuthedRequest, res) => {
  if (!limitAi(req.uid)) {
    res.status(429).json({ error: 'リクエストが多すぎます。しばらく待ってください。' });
    return;
  }
  const { step, tone = 'simple', audience = 'new_staff', organizationId, useAi = false } = req.body as {
    step?: StepInput;
    tone?: InstructionTone;
    audience?: TargetAudience;
    organizationId?: string;
    useAi?: boolean;
  };
  if (!step || !organizationId) {
    res.status(400).json({ error: 'step と organizationId が必要です' });
    return;
  }
  if (useAi) {
    try {
      await assertAiQuota(organizationId, 1);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      res.status(err.status ?? 429).json({ error: err.message });
      return;
    }
  }
  const result = await generateStepInstruction(step, tone, audience, useAi);
  res.json(result);
});

api.post('/v1/ai/generate-steps', requireAuth, async (req: AuthedRequest, res) => {
  if (!limitAi(req.uid)) {
    res.status(429).json({ error: 'リクエストが多すぎます。しばらく待ってください。' });
    return;
  }
  const { steps, tone = 'simple', audience = 'new_staff', organizationId, useAi = false } = req.body as {
    steps?: StepInput[];
    tone?: InstructionTone;
    audience?: TargetAudience;
    organizationId?: string;
    useAi?: boolean;
  };
  if (!steps?.length || !organizationId) {
    res.status(400).json({ error: 'steps と organizationId が必要です' });
    return;
  }
  if (useAi) {
    try {
      await assertAiQuota(organizationId, steps.length);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      res.status(err.status ?? 429).json({ error: err.message });
      return;
    }
  }
  const result = await generateAllStepInstructions(steps, tone, audience, useAi);
  res.json(result);
});

api.post('/v1/manuals/:manualId/ingest', requireAuth, async (req: AuthedRequest, res) => {
  const manualId = String(req.params.manualId);
  const { steps } = req.body as { steps?: Parameters<typeof ingestSteps>[2] };
  if (!steps?.length) {
    res.status(400).json({ error: 'steps が必要です' });
    return;
  }
  try {
    const result = await ingestSteps(manualId, req.uid!, steps);
    res.json({ ok: true, ...result });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'ingest failed' });
  }
});

api.get('/v1/manuals/:manualId/access', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await assertManualAccess(String(req.params.manualId), req.uid!);
    res.json({ ok: true });
  } catch (e) {
    const err = e as { status?: number };
    res.status(err.status ?? 500).json({ error: 'access denied' });
  }
});

app.use('/api', api);

/** GEMINI_API_KEY は Secret 登録後に secrets: ['GEMINI_API_KEY'] を追加して再デプロイ */
export const clipitApi = onRequest(
  { region: 'asia-northeast1', memory: '1GiB', timeoutSeconds: 120 },
  app,
);
