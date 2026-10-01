import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { assertManualAccess } from './manuals.js';
import { applyMasksToBuffer, type MaskRect } from './imageMasks.js';
import { fetchImageBuffer, saveScreenshotObject } from '../lib/storageImage.js';

export async function applyStepMasks(
  manualId: string,
  stepId: string,
  uid: string,
  masks?: MaskRect[],
): Promise<{ screenshotUrl: string }> {
  const { manualRef } = await assertManualAccess(manualId, uid);
  const stepRef = manualRef.collection('steps').doc(stepId);
  const stepSnap = await stepRef.get();
  if (!stepSnap.exists) throw Object.assign(new Error('手順が見つかりません'), { status: 404 });

  const step = stepSnap.data()!;
  const screenshotUrl = step.screenshotUrl as string | undefined;
  if (!screenshotUrl) throw Object.assign(new Error('スクショがありません'), { status: 400 });

  const maskList = masks ?? (step.masks as MaskRect[] | undefined) ?? [];
  if (!maskList.length) {
    return { screenshotUrl };
  }

  const raw = await fetchImageBuffer(screenshotUrl);
  const burned = await applyMasksToBuffer(raw, maskList);
  const bucket = getStorage().bucket();
  const newUrl = await saveScreenshotObject(
    bucket,
    `clipit/manuals/${manualId}/${stepId}-masked-${Date.now()}`,
    burned,
  );

  await stepRef.update({
    screenshotUrl: newUrl,
    masks: [],
    annotations: [],
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { screenshotUrl: newUrl };
}
