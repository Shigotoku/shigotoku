import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { COL } from './firestore';

function dataRef(companyId: string, key: string) {
  return doc(db, COL.companies, companyId, 'data', key);
}

const memoryCache = new Map<string, unknown>();

function cacheKey(companyId: string, key: string) {
  return `${companyId}::${key}`;
}

/** メモリキャッシュから同期的に参照（ページ遷移の体感速度向上） */
export function peekCompanyData<T>(companyId: string, key: string): T | undefined {
  const cached = memoryCache.get(cacheKey(companyId, key));
  return cached === undefined ? undefined : (cached as T);
}

export function invalidateCompanyDataCache(companyId?: string) {
  if (!companyId) {
    memoryCache.clear();
    return;
  }
  const prefix = `${companyId}::`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}

/** Firestore から JSON データを読み込む */
export async function loadCompanyData<T>(
  companyId: string,
  key: string,
  fallback: T,
): Promise<T> {
  if (!isFirebaseConfigured) return loadLocal(key, fallback);

  const ck = cacheKey(companyId, key);
  if (memoryCache.has(ck)) return memoryCache.get(ck) as T;

  try {
    const snap = await getDoc(dataRef(companyId, key));
    if (!snap.exists()) {
      memoryCache.set(ck, fallback);
      return fallback;
    }
    const value = snap.data().value;
    const resolved = (value ?? fallback) as T;
    memoryCache.set(ck, resolved);
    return resolved;
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
  memoryCache.set(cacheKey(companyId, key), value);
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

/** 同期的にキャッシュ済みデータを参照 */
export function peekStorageItem<T>(
  key: string,
  companyId: string | null | undefined,
  isDemo: boolean,
): T | undefined {
  if (isDemo || !companyId || !isFirebaseConfigured) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }
  return peekCompanyData<T>(companyId, key);
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
