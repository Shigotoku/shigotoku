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
import type { Manual, ManualStep, ManualStatus, TargetAudience } from '../types';
import { assertCanCreateManual } from './usage';

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
}): Promise<string> {
  await assertCanCreateManual(input.organizationId);
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 180 * 86_400_000));
  const ref = await addDoc(manualsCol(), {
    organizationId: input.organizationId,
    title: input.title.trim(),
    description: input.description ?? '',
    category: input.category ?? 'general',
    targetAudience: input.targetAudience,
    status: 'draft' satisfies ManualStatus,
    version: 1,
    createdBy: input.createdBy,
    stepCount: 0,
    readCount: 0,
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateManual(
  manualId: string,
  patch: Partial<Pick<Manual, 'title' | 'description' | 'status' | 'targetAudience'>>,
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
  const steps = await listSteps(manualId);
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

/** ルールベースで手順文を整える（AI 不使用） */
export function polishInstruction(step: ManualStep, tone: 'simple' | 'formal'): string {
  return buildInstructionFromStep(step, tone === 'formal' ? 'formal' : 'simple');
}
