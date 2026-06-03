import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ReadConfirmationInput, ShareTokenDoc } from '../types';
import { listSteps } from './manuals';
import { getOrganization } from './bootstrap';
import { PLAN_LIMITS } from '../lib/plans';
import type { PlanId } from '../types';

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function publishShareToken(input: {
  manualId: string;
  organizationId: string;
  title: string;
  createdBy: string;
  expiresInDays?: number;
}): Promise<string> {
  const steps = await listSteps(input.manualId);
  const org = await getOrganization(input.organizationId);
  const plan = (org?.plan ?? 'free') as PlanId;
  const watermark = PLAN_LIMITS[plan].watermark;
  const token = randomToken();
  const expiresAt =
    input.expiresInDays != null && input.expiresInDays > 0
      ? Timestamp.fromDate(new Date(Date.now() + input.expiresInDays * 86_400_000))
      : null;

  await setDoc(doc(db, 'clipit_shareTokens', token), {
    manualId: input.manualId,
    organizationId: input.organizationId,
    title: input.title,
    steps: steps.map((s) => ({
      order: s.order,
      type: s.type,
      title: s.title,
      instruction: s.instruction,
      note: s.note,
      screenshotUrl: s.screenshotUrl,
      clickX: s.clickX,
      clickY: s.clickY,
    })),
    expiresAt,
    watermark,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });

  return token;
}

export async function getShareByToken(token: string): Promise<(ShareTokenDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, 'clipit_shareTokens', token));
  if (!snap.exists()) return null;
  const data = snap.data() as ShareTokenDoc;
  if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) return null;
  return { id: snap.id, ...data };
}

export async function getLatestShareTokenForManual(manualId: string): Promise<string | null> {
  const q = query(collection(db, 'clipit_shareTokens'), where('manualId', '==', manualId), limit(5));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0]!.id;
}

export async function recordReadConfirmation(manualId: string, input: ReadConfirmationInput) {
  await addDoc(collection(db, 'clipit_manuals', manualId, 'readConfirmations'), {
    viewerName: input.viewerName.trim() || '匿名',
    viewerEmail: input.viewerEmail?.trim() ?? '',
    confirmedAt: serverTimestamp(),
  });
  const manualRef = doc(db, 'clipit_manuals', manualId);
  const manualSnap = await getDoc(manualRef);
  const count = (manualSnap.data()?.readCount as number | undefined) ?? 0;
  await updateDoc(manualRef, { readCount: count + 1 });
}

export function buildShareUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.clipit.shigotoku.com';
  return `${base}/m/${token}`;
}

export function buildQrUrl(shareUrl: string): string {
  return `https://quickchart.io/qr?size=280&text=${encodeURIComponent(shareUrl)}`;
}
