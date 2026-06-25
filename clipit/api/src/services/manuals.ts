import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { saveScreenshotObject } from '../lib/storageImage.js';
import { buildInstruction, buildStepTitle, suggestManualTitle, type TargetAudience } from './instructionRules.js';
import { distributeVoiceToSteps } from './voiceNotes.js';
import { generateStepInstruction } from './gemini.js';
import { effectivePlanKey } from '../lib/internalAccess.js';
import { assertAiQuota } from './usage.js';

const PLAN_MAX_STEPS: Record<string, number> = {
  free: 15,
  light: 30,
  standard: 50,
  business: 80,
  developer: 100,
  agency: 100,
};

export interface IngestStepPayload {
  title?: string;
  instruction?: string;
  voiceSegment?: string;
  elementText?: string;
  elementRole?: string;
  pageTitle?: string;
  pageUrl?: string;
  note?: string;
  screenshotBase64?: string;
  clickX?: number;
  clickY?: number;
  type?: 'normal' | 'warning' | 'ng_example' | 'check';
}

export async function assertManualAccess(manualId: string, uid: string) {
  const db = getFirestore();
  const manualRef = db.collection('clipit_manuals').doc(manualId);
  const manual = await manualRef.get();
  if (!manual.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  const orgId = manual.data()?.organizationId as string;
  const member = await db.collection('clipit_organizations').doc(orgId).collection('members').doc(uid).get();
  if (!member.exists) throw Object.assign(new Error('forbidden'), { status: 403 });
  return { manualRef, orgId, manual: manual.data()! };
}

export async function ingestSteps(
  manualId: string,
  uid: string,
  steps: IngestStepPayload[],
  voiceTranscript?: string,
  polishWithAi = false,
  generateAllWithAi = false,
  userEmail?: string | null,
) {
  const { manualRef, orgId, manual } = await assertManualAccess(manualId, uid);
  const audience = ((manual.targetAudience as TargetAudience[] | undefined)?.[0] ?? 'new_staff') as TargetAudience;
  if (generateAllWithAi) {
    await assertAiQuota(orgId, steps.length, userEmail);
  }
  const db = getFirestore();
  const orgSnap = await db.collection('clipit_organizations').doc(orgId).get();
  const plan = effectivePlanKey((orgSnap.data()?.plan as string) ?? 'free');
  const maxSteps = PLAN_MAX_STEPS[plan] ?? 15;
  if (steps.length > maxSteps) {
    throw Object.assign(
      new Error(`このプランでは1本あたり${maxSteps}手順までです（${steps.length}手順が送信されました）`),
      { status: 400 },
    );
  }
  const bucket = getStorage().bucket();
  const batch = db.batch();
  const existing = await manualRef.collection('steps').get();
  existing.docs.forEach((d) => batch.delete(d.ref));

  const voiceNotes = voiceTranscript?.trim()
    ? distributeVoiceToSteps(voiceTranscript.trim(), steps.length)
    : [];

  let order = 0;
  for (const step of steps) {
    order += 1;
    let screenshotUrl = '';
    if (step.screenshotBase64?.startsWith('data:image')) {
      const base64 = step.screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      screenshotUrl = await saveScreenshotObject(
        bucket,
        `clipit/manuals/${manualId}/step-${order}`,
        buffer,
      );
    }

    const voiceSeg = step.voiceSegment?.trim();
    const stepInput = {
      title: step.title,
      elementText: step.elementText,
      elementRole: step.elementRole,
      pageTitle: step.pageTitle,
      pageUrl: step.pageUrl,
      note: step.note?.trim() || voiceSeg || voiceNotes[order - 1] || '',
    };

    let instruction =
      step.instruction?.trim() ||
      voiceSeg ||
      buildInstruction(stepInput, 'manual', audience);

    if (polishWithAi && (voiceSeg || voiceNotes[order - 1])) {
      const polished = await generateStepInstruction(stepInput, 'manual', audience, true);
      if (polished.usedGemini) instruction = polished.instruction;
    } else if (generateAllWithAi) {
      const ai = await generateStepInstruction(stepInput, 'manual', audience, true);
      if (ai.usedGemini) instruction = ai.instruction;
    }

    const autoTitle = buildStepTitle(stepInput, order);
    const stepTitle =
      step.title?.trim() &&
      !/^手順 \d+$/.test(step.title.trim()) &&
      !/^強制キャプチャ \d+$/.test(step.title.trim())
        ? step.title.trim()
        : autoTitle;

    const ref = manualRef.collection('steps').doc();
    batch.set(ref, {
      order,
      type: step.type && ['normal', 'warning', 'ng_example', 'check'].includes(step.type) ? step.type : 'normal',
      title: stepTitle,
      instruction,
      note: step.note?.trim() || (voiceSeg ? '' : voiceNotes[order - 1] || ''),
      screenshotUrl,
      pageTitle: step.pageTitle || '',
      pageUrl: step.pageUrl || '',
      elementText: step.elementText || '',
      elementRole: step.elementRole || '',
      clickX: step.clickX ?? null,
      clickY: step.clickY ?? null,
      masks: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const manualPatch: Record<string, unknown> = {
    stepCount: order,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const currentTitle = String(manual.title ?? '').trim();
  if (!currentTitle || currentTitle === '無題のマニュアル' || currentTitle === '新しいマニュアル') {
    const suggested = suggestManualTitle(steps);
    if (suggested) manualPatch.title = suggested;
  }
  batch.update(manualRef, manualPatch);
  await batch.commit();
  return { stepCount: order, titleSuggested: Boolean(manualPatch.title), aiPolished: generateAllWithAi };
}
