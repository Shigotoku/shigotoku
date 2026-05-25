import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { COL } from './firestore';

function dataRef(companyId: string, key: string) {
  return doc(db, COL.companies, companyId, 'data', key);
}

/** Firestore から JSON データを読み込む */
export async function loadCompanyData<T>(
  companyId: string,
  key: string,
  fallback: T,
): Promise<T> {
  if (!isFirebaseConfigured) return loadLocal(key, fallback);
  try {
    const snap = await getDoc(dataRef(companyId, key));
    if (!snap.exists()) return fallback;
    const value = snap.data().value;
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** Firestore に JSON データを保存 */
export async function saveCompanyData(
  companyId: string,
  key: string,
  value: unknown,
): Promise<void> {
  if (!isFirebaseConfigured) {
    saveLocal(key, value);
    return;
  }
  await setDoc(
    dataRef(companyId, key),
    { value, updated_at: serverTimestamp() },
    { merge: true },
  );
}

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** デモ or 未設定時は localStorage、本番は Firestore */
export async function loadStorageItem<T>(
  key: string,
  companyId: string | null | undefined,
  isDemo: boolean,
  fallback: T,
): Promise<T> {
  if (isDemo || !companyId || !isFirebaseConfigured) {
    return loadLocal(key, fallback);
  }
  return loadCompanyData(companyId, key, fallback);
}

export async function saveStorageItem(
  key: string,
  companyId: string | null | undefined,
  isDemo: boolean,
  value: unknown,
): Promise<void> {
  if (isDemo || !companyId || !isFirebaseConfigured) {
    saveLocal(key, value);
    return;
  }
  await saveCompanyData(companyId, key, value);
}

/** localStorage.getItem 互換（非同期） */
export async function getStorageJson<T>(
  key: string,
  companyId: string | null | undefined,
  isDemo: boolean,
): Promise<T | null> {
  if (isDemo || !companyId || !isFirebaseConfigured) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  const snap = await getDoc(dataRef(companyId, key));
  if (!snap.exists()) return null;
  return snap.data().value as T;
}

/** localStorage.setItem 互換（非同期） */
export async function setStorageJson(
  key: string,
  companyId: string | null | undefined,
  isDemo: boolean,
  value: unknown,
): Promise<void> {
  return saveStorageItem(key, companyId, isDemo, value);
}
