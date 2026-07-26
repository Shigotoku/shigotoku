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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { expandOrgContent } from '../lib/orgContent';
import { effectivePlanId } from '../lib/internalAccess';
import { PLAN_LIMITS } from '../lib/plans';
import type { FolderShareTokenDoc, PlanId } from '../types';
import { getOrganization } from './bootstrap';
import { listManuals, listSteps } from './manuals';

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function buildFolderSnapshots(folderId: string, organizationId: string) {
  const org = await getOrganization(organizationId);
  const expand = (t: string) => expandOrgContent(t, org?.orgVariables, org?.snippets);
  const all = await listManuals(organizationId);
  const inFolder = all.filter((m) => m.folderId === folderId);

  const manuals = [];
  for (const m of inFolder) {
    const steps = await listSteps(m.id);
    const snap = await getDoc(doc(db, 'clipit_manuals', m.id));
    const confirmationVersion = (snap.data()?.confirmationVersion as number | undefined) ?? 1;
    manuals.push({
      manualId: m.id,
      title: m.title,
      confirmationVersion,
      steps: steps.map((s) => ({
        order: s.order,
        type: s.type,
        title: expand(s.title),
        instruction: expand(s.instruction),
        note: expand(s.note),
        screenshotUrl: s.screenshotUrl,
        clickX: s.clickX,
        clickY: s.clickY,
      })),
    });
  }
  return manuals;
}

export async function publishFolderShareToken(input: {
  folderId: string;
  folderName: string;
  organizationId: string;
  createdBy: string;
  expiresInDays?: number;
  userEmail?: string | null;
}): Promise<string> {
  const org = await getOrganization(input.organizationId);
  const plan = effectivePlanId((org?.plan ?? 'free') as PlanId, input.userEmail);
  const watermark = PLAN_LIMITS[plan].watermark;
  const manuals = await buildFolderSnapshots(input.folderId, input.organizationId);
  const token = randomToken();
  const expiresAt =
    input.expiresInDays != null && input.expiresInDays > 0
      ? Timestamp.fromDate(new Date(Date.now() + input.expiresInDays * 86_400_000))
      : null;

  await setDoc(doc(db, 'clipit_folderShareTokens', token), {
    folderId: input.folderId,
    organizationId: input.organizationId,
    folderName: input.folderName,
    manuals,
    watermark,
    expiresAt,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });

  return token;
}

export async function refreshFolderShareSnapshot(token: string, folderId: string, organizationId: string) {
  const snap = await getDoc(doc(db, 'clipit_folderShareTokens', token));
  if (!snap.exists()) throw new Error('共有リンクが見つかりません');
  const folderName = (snap.data() as FolderShareTokenDoc).folderName;
  const manuals = await buildFolderSnapshots(folderId, organizationId);
  await updateDoc(doc(db, 'clipit_folderShareTokens', token), {
    folderName,
    manuals,
    refreshedAt: serverTimestamp(),
  });
}

export async function getFolderShareByToken(
  token: string,
): Promise<(FolderShareTokenDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, 'clipit_folderShareTokens', token));
  if (!snap.exists()) return null;
  const data = snap.data() as FolderShareTokenDoc;
  if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) return null;
  return { id: snap.id, ...data };
}

export async function getLatestFolderShareToken(folderId: string): Promise<string | null> {
  const q = query(collection(db, 'clipit_folderShareTokens'), where('folderId', '==', folderId), limit(20));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const sorted = [...snap.docs].sort((a, b) => {
    const ta = (a.data().refreshedAt ?? a.data().createdAt)?.toMillis?.() ?? 0;
    const tb = (b.data().refreshedAt ?? b.data().createdAt)?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return sorted[0]!.id;
}

export function buildFolderShareUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.clipit.shigotoku.com';
  return `${base}/f/${token}`;
}

export function buildFolderQrUrl(shareUrl: string): string {
  return `https://quickchart.io/qr?size=280&text=${encodeURIComponent(shareUrl)}`;
}
