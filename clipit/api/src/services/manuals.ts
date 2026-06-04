import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { saveScreenshotObject } from '../lib/storageImage.js';
import { buildInstruction } from './instructionRules.js';

export interface IngestStepPayload {
  title?: string;
  instruction?: string;
  elementText?: string;
  elementRole?: string;
  pageTitle?: string;
  pageUrl?: string;
  note?: string;
  screenshotBase64?: string;
  clickX?: number;
  clickY?: number;
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

export async function ingestSteps(manualId: string, uid: string, steps: IngestStepPayload[]) {
  const { manualRef } = await assertManualAccess(manualId, uid);
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const batch = db.batch();
  const existing = await manualRef.collection('steps').get();
  existing.docs.forEach((d) => batch.delete(d.ref));

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

    const stepInput = {
      title: step.title,
      elementText: step.elementText,
      elementRole: step.elementRole,
      pageTitle: step.pageTitle,
      pageUrl: step.pageUrl,
      note: step.note,
    };

    const ref = manualRef.collection('steps').doc();
    batch.set(ref, {
      order,
      type: 'normal',
      title: step.title || `手順 ${order}`,
      instruction:
        step.instruction?.trim() ||
        buildInstruction(stepInput, 'simple'),
      note: step.note || '',
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

  batch.update(manualRef, {
    stepCount: order,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { stepCount: order };
}
