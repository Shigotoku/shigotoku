import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildInstructionFromStep } from '../lib/instructionRules';
import type { Manual, ManualCreationSource, ManualStep, ManualStatus, TargetAudience } from '../types';
import { assertCanCreateManual, assertCanAddSteps } from './usage';
import { getUiLayoutTemplate, stepFieldsFromLayout, type UiLayoutId } from '../lib/uiLayoutTemplates';

function manualsCol() {
  return collection(db, 'clipit_manuals');
}

export async function listManuals(orgId: string): Promise<Manual[]> {
  const q = query(manualsCol(), where('organizationId', '==', orgId), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Manual);
}

export async function getManual(manualId: string): Promise<Manual | null> {
  const snap = await getDoc(doc(db, 'clipit_manuals', manualId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Manual;
}

export async function createManual(input: {
  organizationId: string;
  title: string;
  targetAudience: TargetAudience[];
  createdBy: string;
  description?: string;
  category?: string;
  creationSource?: ManualCreationSource;
  contentType?: 'manual' | 'material';
  editionLabel?: string;
  folderId?: string | null;
  uiLayoutId?: UiLayoutId;
  tocEnabled?: boolean;
}): Promise<string> {
  await assertCanCreateManual(input.organizationId);
  const layout = getUiLayoutTemplate(input.uiLayoutId);
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 180 * 86_400_000));
  const ref = await addDoc(manualsCol(), {
    organizationId: input.organizationId,
    title: input.title.trim(),
    description: input.description?.trim() || layout.manualDescription || '',
    category: input.category ?? 'general',
    targetAudience: input.targetAudience,
    status: 'draft' satisfies ManualStatus,
    workStatus: 'in_progress',
    version: 1,
    createdBy: input.createdBy,
    stepCount: 0,
    readCount: 0,
    expiresAt,
    creationSource: input.creationSource ?? 'extension',
    contentType: input.contentType ?? 'manual',
    editionLabel: input.editionLabel ?? '',
    confirmationVersion: 1,
    folderId: input.folderId ?? null,
    uiLayoutId: layout.id,
    tocEnabled: input.tocEnabled ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateManual(
  manualId: string,
  patch: Partial<Pick<Manual, 'title' | 'description' | 'status' | 'workStatus' | 'targetAudience' | 'folderId' | 'uiLayoutId' | 'tocEnabled'>>,
) {
  await updateDoc(doc(db, 'clipit_manuals', manualId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteManual(manualId: string) {
  const stepsSnap = await getDocs(collection(db, 'clipit_manuals', manualId, 'steps'));
  const batch = writeBatch(db);
  stepsSnap.docs.forEach((s) => batch.delete(s.ref));
  batch.delete(doc(db, 'clipit_manuals', manualId));
  await batch.commit();
}

export async function deleteManuals(manualIds: string[]): Promise<void> {
  for (const manualId of manualIds) {
    await deleteManual(manualId);
  }
}

/** 既存手順すべてに UI ひな型の配置を適用 */
export async function applyUiLayoutToSteps(
  manualId: string,
  layoutId?: UiLayoutId | string,
  options?: { forceLayout?: boolean },
): Promise<void> {
  const manual = await getManual(manualId);
  const layout = getUiLayoutTemplate(layoutId ?? manual?.uiLayoutId);
  const steps = await listSteps(manualId);
  for (const s of steps) {
    const fields = stepFieldsFromLayout(layout.id, s, { forceLayout: options?.forceLayout });
    await updateStep(manualId, s.id, fields);
  }
  if (layout.manualDescription && manual && !manual.description?.trim()) {
    await updateManual(manualId, { description: layout.manualDescription, uiLayoutId: layout.id });
  } else if (manual?.uiLayoutId !== layout.id) {
    await updateManual(manualId, { uiLayoutId: layout.id });
  }
}

function stepsCol(manualId: string) {
  return collection(db, 'clipit_manuals', manualId, 'steps');
}

export async function listSteps(manualId: string): Promise<ManualStep[]> {
  const q = query(stepsCol(manualId), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ManualStep);
}

export async function addStep(
  manualId: string,
  step: Omit<ManualStep, 'id'>,
): Promise<string> {
  const manual = await getManual(manualId);
  if (manual) await assertCanAddSteps(manual.organizationId, manual.stepCount ?? 0, 1);
  const ref = await addDoc(stepsCol(manualId), {
    ...step,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const steps = await listSteps(manualId);
  await updateDoc(doc(db, 'clipit_manuals', manualId), {
    stepCount: steps.length,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** 指定位置（1始まり）に手順を挿入し、以降の order をずらす */
export async function insertStepAt(
  manualId: string,
  position: number,
  step: Omit<ManualStep, 'id' | 'order'>,
): Promise<string> {
  const manual = await getManual(manualId);
  const steps = await listSteps(manualId);
  if (manual) await assertCanAddSteps(manual.organizationId, steps.length, 1);
  const insertOrder = Math.max(1, Math.min(position, steps.length + 1));
  const batch = writeBatch(db);
  for (const s of steps) {
    if (s.order >= insertOrder) {
      batch.update(doc(db, 'clipit_manuals', manualId, 'steps', s.id), {
        order: s.order + 1,
        updatedAt: serverTimestamp(),
      });
    }
  }
  const newRef = doc(stepsCol(manualId));
  batch.set(newRef, {
    ...step,
    order: insertOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  const all = await listSteps(manualId);
  await updateDoc(doc(db, 'clipit_manuals', manualId), {
    stepCount: all.length,
    updatedAt: serverTimestamp(),
  });
  return newRef.id;
}

export async function updateStep(manualId: string, stepId: string, patch: Partial<ManualStep>) {
  await updateDoc(doc(db, 'clipit_manuals', manualId, 'steps', stepId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'clipit_manuals', manualId), { updatedAt: serverTimestamp() });
}

export async function deleteStep(manualId: string, stepId: string) {
  await deleteDoc(doc(db, 'clipit_manuals', manualId, 'steps', stepId));
  const steps = await listSteps(manualId);
  await updateDoc(doc(db, 'clipit_manuals', manualId), {
    stepCount: steps.length,
    updatedAt: serverTimestamp(),
  });
}

export async function reorderSteps(manualId: string, orderedIds: string[]) {
  const steps = await listSteps(manualId);
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    const step = steps.find((s) => s.id === id);
    if (step) {
      batch.update(doc(db, 'clipit_manuals', manualId, 'steps', id), {
        order: index + 1,
        updatedAt: serverTimestamp(),
      });
    }
  });
  await batch.commit();
  await updateDoc(doc(db, 'clipit_manuals', manualId), { updatedAt: serverTimestamp() });
}

export async function addDemoSteps(manualId: string, title: string) {
  const demos: Omit<ManualStep, 'id'>[] = [
    {
      order: 1,
      type: 'normal',
      title: '画面を開く',
      instruction: `「${title}」の作業を始めます。まず対象の業務画面を開いてください。`,
      note: '',
      screenshotUrl: '',
      pageTitle: '業務画面',
      pageUrl: '',
      elementText: 'メニュー',
      clickX: 35,
      clickY: 28,
    },
    {
      order: 2,
      type: 'normal',
      title: '必要項目を入力',
      instruction: '画面上の指示に従い、必要な項目を入力します。わからない場合は担当者に確認してください。',
      note: '個人情報が画面に映らないよう注意してください。',
      screenshotUrl: '',
      pageTitle: '入力画面',
      pageUrl: '',
      elementText: '入力欄',
      clickX: 52,
      clickY: 45,
    },
    {
      order: 3,
      type: 'check',
      title: '内容を確認して完了',
      instruction: '入力内容を確認し、問題なければ保存または完了ボタンを押します。',
      note: '',
      screenshotUrl: '',
      pageTitle: '確認画面',
      pageUrl: '',
      elementText: '保存',
      clickX: 68,
      clickY: 72,
    },
  ];
  for (const step of demos) {
    await addStep(manualId, step);
  }
}

/** 年度版などとしてマニュアルを複製 */
export async function duplicateManual(
  sourceId: string,
  input: { title: string; editionLabel?: string; createdBy: string },
): Promise<string> {
  const source = await getManual(sourceId);
  if (!source) throw new Error('マニュアルが見つかりません');
  const steps = await listSteps(sourceId);
  const newId = await createManual({
    organizationId: source.organizationId,
    title: input.title,
    targetAudience: source.targetAudience,
    createdBy: input.createdBy,
    description: source.description,
    category: source.category,
    creationSource: 'template',
    contentType: source.contentType ?? 'manual',
    editionLabel: input.editionLabel ?? '',
  });
  await updateDoc(doc(db, 'clipit_manuals', newId), {
    parentManualId: sourceId,
    version: (source.version ?? 1) + 1,
  });
  for (const s of steps) {
    const { id: _id, ...rest } = s;
    await addStep(newId, { ...rest });
  }
  return newId;
}

/** ルールベースで手順文を整える（AI 不使用） */
export function polishInstruction(step: ManualStep, tone: 'simple' | 'formal'): string {
  return buildInstructionFromStep(step, tone === 'formal' ? 'formal' : 'simple');
}
