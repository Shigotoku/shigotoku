import cors from 'cors';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { requireAuth, type AuthedRequest } from './middleware/auth.js';
import { generateAllStepInstructions, generateStepInstruction } from './services/gemini.js';
import type { InstructionTone, TargetAudience, StepInput } from './services/gemini.js';
import { getFirestore } from 'firebase-admin/firestore';
import { assertManualAccess, ingestSteps } from './services/manuals.js';
import { rateLimit } from './middleware/rateLimit.js';
import { assertAiQuota } from './services/usage.js';
import { mergeTalkSteps } from './services/talkMerge.js';
import {
  applyBulkUpdate,
  listBulkBatches,
  proposeBulkUpdate,
  rollbackBulkBatch,
  scanBulkUpdate,
} from './services/bulkUpdate.js';
import { listOrgNotifications } from './services/notifications.js';
import { removeMember, updateMemberRole } from './services/team.js';
import { notifyManualShare } from './services/shareNotify.js';
import { applyStepMasks } from './services/stepMasks.js';
import { generateManualPdf } from './services/pdfExport.js';
import { parseFirebaseStorageUrl, resolveManualExportImages, storageUrlToDataUrl } from './services/storageProxy.js';

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
      await assertAiQuota(organizationId, 1, req.email);
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
      await assertAiQuota(organizationId, steps.length, req.email);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      res.status(err.status ?? 429).json({ error: err.message });
      return;
    }
  }
  const result = await generateAllStepInstructions(steps, tone, audience, useAi);
  res.json(result);
});

api.post('/v1/ai/merge-talk-steps', requireAuth, async (req: AuthedRequest, res) => {
  if (!limitAi(req.uid)) {
    res.status(429).json({ error: 'リクエストが多すぎます。しばらく待ってください。' });
    return;
  }
  const {
    organizationId,
    transcript,
    screenshots,
    tone = 'simple',
    audience = 'new_staff',
    useAi = true,
  } = req.body as {
    organizationId?: string;
    transcript?: string;
    screenshots?: Array<{ imageBase64: string; timestamp?: string; label?: string }>;
    tone?: InstructionTone;
    audience?: TargetAudience;
    useAi?: boolean;
  };
  if (!organizationId || !transcript || !screenshots?.length) {
    res.status(400).json({ error: 'organizationId, transcript, screenshots が必要です' });
    return;
  }
  const member = await getFirestore()
    .collection('clipit_organizations')
    .doc(organizationId)
    .collection('members')
    .doc(req.uid!)
    .get();
  if (!member.exists) {
    res.status(403).json({ error: '組織へのアクセスがありません' });
    return;
  }
  if (useAi) {
    try {
      await assertAiQuota(organizationId, Math.min(screenshots.length, 20), req.email);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      res.status(err.status ?? 429).json({ error: err.message });
      return;
    }
  }
  const org = await getFirestore().collection('clipit_organizations').doc(organizationId).get();
  const glossary = (org.data()?.termGlossary as string[] | undefined) ?? [];
  try {
    const result = await mergeTalkSteps({
      transcript,
      screenshots,
      tone,
      audience,
      glossary,
      useAi,
    });
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'merge failed' });
  }
});

api.post('/v1/bulk-update/scan', requireAuth, async (req: AuthedRequest, res) => {
  const { organizationId, keyword, scope } = req.body as {
    organizationId?: string;
    keyword?: string;
    scope?: import('./services/bulkUpdate.js').BulkUpdateScope;
  };
  if (!organizationId || !keyword?.trim()) {
    res.status(400).json({ error: 'organizationId と keyword が必要です' });
    return;
  }
  try {
    const matches = await scanBulkUpdate(organizationId, req.uid!, keyword.trim(), scope);
    res.json({ matches, count: matches.length });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

api.post('/v1/bulk-update/propose', requireAuth, async (req: AuthedRequest, res) => {
  if (!limitAi(req.uid)) {
    res.status(429).json({ error: 'リクエストが多すぎます。' });
    return;
  }
  const { organizationId, instruction, keyword, replaceFrom, replaceTo, useAi = false, scope } = req.body as {
    organizationId?: string;
    instruction?: string;
    keyword?: string;
    replaceFrom?: string;
    replaceTo?: string;
    useAi?: boolean;
    scope?: import('./services/bulkUpdate.js').BulkUpdateScope;
  };
  if (!organizationId || !instruction?.trim()) {
    res.status(400).json({ error: 'organizationId と instruction が必要です' });
    return;
  }
  if (useAi) {
    try {
      await assertAiQuota(organizationId, 5, req.email);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      res.status(err.status ?? 429).json({ error: err.message });
      return;
    }
  }
  try {
    const result = await proposeBulkUpdate({
      organizationId,
      uid: req.uid!,
      instruction: instruction.trim(),
      keyword,
      replaceFrom,
      replaceTo,
      useAi,
      scope,
    });
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

api.post('/v1/bulk-update/apply', requireAuth, async (req: AuthedRequest, res) => {
  const { organizationId, instruction, changes } = req.body as {
    organizationId?: string;
    instruction?: string;
    changes?: Parameters<typeof applyBulkUpdate>[0]['changes'];
  };
  if (!organizationId || !instruction?.trim() || !changes?.length) {
    res.status(400).json({ error: 'organizationId, instruction, changes が必要です' });
    return;
  }
  try {
    const result = await applyBulkUpdate({
      organizationId,
      uid: req.uid!,
      instruction: instruction.trim(),
      changes,
    });
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

api.get('/v1/bulk-update/batches', requireAuth, async (req: AuthedRequest, res) => {
  const organizationId = String(req.query.organizationId ?? '');
  if (!organizationId) {
    res.status(400).json({ error: 'organizationId が必要です' });
    return;
  }
  try {
    const batches = await listBulkBatches(organizationId, req.uid!);
    res.json({ batches });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

api.get('/v1/notifications', requireAuth, async (req: AuthedRequest, res) => {
  const organizationId = String(req.query.organizationId ?? '');
  if (!organizationId) {
    res.status(400).json({ error: 'organizationId が必要です' });
    return;
  }
  try {
    const items = await listOrgNotifications(organizationId, req.uid!);
    res.json({ notifications: items });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

api.post('/v1/bulk-update/batches/:batchId/rollback', requireAuth, async (req: AuthedRequest, res) => {
  const { organizationId } = req.body as { organizationId?: string };
  if (!organizationId) {
    res.status(400).json({ error: 'organizationId が必要です' });
    return;
  }
  try {
    const result = await rollbackBulkBatch(String(req.params.batchId), organizationId, req.uid!);
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

api.post('/v1/manuals/:manualId/ingest', requireAuth, async (req: AuthedRequest, res) => {
  const manualId = String(req.params.manualId);
  const { steps, voiceTranscript, polishWithAi, generateAllWithAi } = req.body as {
    steps?: Parameters<typeof ingestSteps>[2];
    voiceTranscript?: string;
    polishWithAi?: boolean;
    generateAllWithAi?: boolean;
  };
  if (!steps?.length) {
    res.status(400).json({ error: 'steps が必要です' });
    return;
  }
  try {
    const result = await ingestSteps(
      manualId,
      req.uid!,
      steps,
      voiceTranscript,
      Boolean(polishWithAi),
      Boolean(generateAllWithAi),
      req.email,
    );
    res.json({ ok: true, ...result });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'ingest failed' });
  }
});

api.post('/v1/steps/:stepId/apply-masks', requireAuth, async (req: AuthedRequest, res) => {
  const stepId = String(req.params.stepId);
  const { manualId, masks } = req.body as { manualId?: string; masks?: Parameters<typeof applyStepMasks>[3] };
  if (!manualId) {
    res.status(400).json({ error: 'manualId が必要です' });
    return;
  }
  try {
    const result = await applyStepMasks(manualId, stepId, req.uid!, masks);
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'apply-masks failed' });
  }
});

api.post('/v1/manuals/:manualId/pdf', requireAuth, async (req: AuthedRequest, res) => {
  const manualId = String(req.params.manualId);
  try {
    const result = await generateManualPdf(manualId, req.uid!);
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'pdf failed' });
  }
});

api.post('/v1/storage/data-url', requireAuth, async (req: AuthedRequest, res) => {
  const url = (req.body as { url?: string }).url?.trim();
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  try {
    const parsed = parseFirebaseStorageUrl(url);
    const manualMatch = parsed?.path.match(/^clipit\/manuals\/([^/]+)\//);
    if (manualMatch) {
      await assertManualAccess(manualMatch[1]!, req.uid!);
    }
    const dataUrl = await storageUrlToDataUrl(url);
    res.json({ dataUrl });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'storage data-url failed' });
  }
});

api.post('/v1/manuals/:manualId/export-images', requireAuth, async (req: AuthedRequest, res) => {
  const manualId = String(req.params.manualId);
  try {
    const { manualRef } = await assertManualAccess(manualId, req.uid!);
    const stepsSnap = await manualRef.collection('steps').orderBy('order').get();
    const urls = stepsSnap.docs
      .map((d) => d.data().screenshotUrl as string | undefined)
      .filter((u): u is string => Boolean(u?.trim()));
    const images = await resolveManualExportImages(urls);
    res.json({ images });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'export-images failed' });
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

api.post('/v1/manuals/:manualId/share-notify', requireAuth, async (req: AuthedRequest, res) => {
  const manualId = String(req.params.manualId);
  const { shareUrl, emails, message } = req.body as {
    shareUrl?: string;
    emails?: string[];
    message?: string;
  };
  if (!shareUrl?.trim()) {
    res.status(400).json({ error: 'shareUrl が必要です' });
    return;
  }
  try {
    const result = await notifyManualShare(manualId, req.uid!, {
      shareUrl: shareUrl.trim(),
      emails,
      message,
    });
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'notify failed' });
  }
});

api.patch('/v1/orgs/:orgId/members/:memberId', requireAuth, async (req: AuthedRequest, res) => {
  const orgId = String(req.params.orgId);
  const memberId = String(req.params.memberId);
  const { role } = req.body as { role?: string };
  if (!role) {
    res.status(400).json({ error: 'role が必要です' });
    return;
  }
  try {
    const result = await updateMemberRole(orgId, req.uid!, memberId, role as 'admin' | 'editor' | 'viewer');
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'update failed' });
  }
});

api.delete('/v1/orgs/:orgId/members/:memberId', requireAuth, async (req: AuthedRequest, res) => {
  const orgId = String(req.params.orgId);
  const memberId = String(req.params.memberId);
  try {
    const result = await removeMember(orgId, req.uid!, memberId);
    res.json(result);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    res.status(err.status ?? 500).json({ error: err.message ?? 'remove failed' });
  }
});

app.use('/api', api);

/** GEMINI_API_KEY は Secret 登録後に secrets: ['GEMINI_API_KEY'] を追加して再デプロイ */
export const clipitApi = onRequest(
  { region: 'asia-northeast1', memory: '2GiB', timeoutSeconds: 180 },
  app,
);

export { clipitExpiryWorker } from './scheduler.js';
