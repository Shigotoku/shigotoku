import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ManualFolder } from '../types';

function foldersCol() {
  return collection(db, 'clipit_folders');
}

export async function listFolders(orgId: string): Promise<ManualFolder[]> {
  const q = query(foldersCol(), where('organizationId', '==', orgId), orderBy('sortOrder', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ManualFolder);
}

export async function createFolder(orgId: string, name: string): Promise<string> {
  const existing = await listFolders(orgId);
  const ref = await addDoc(foldersCol(), {
    organizationId: orgId,
    name: name.trim(),
    sortOrder: existing.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameFolder(folderId: string, name: string) {
  await updateDoc(doc(db, 'clipit_folders', folderId), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFolder(folderId: string, orgId: string) {
  const manualsQ = query(
    collection(db, 'clipit_manuals'),
    where('organizationId', '==', orgId),
    where('folderId', '==', folderId),
  );
  const snap = await getDocs(manualsQ);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { folderId: null, updatedAt: serverTimestamp() });
  });
  batch.delete(doc(db, 'clipit_folders', folderId));
  await batch.commit();
}

export async function moveManualToFolder(manualId: string, folderId: string | null) {
  await updateDoc(doc(db, 'clipit_manuals', manualId), {
    folderId: folderId ?? null,
    updatedAt: serverTimestamp(),
  });
}
