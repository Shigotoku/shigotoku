export type ShareIntakePayload = {
  imageDataUrl?: string;
  text?: string;
  title?: string;
  url?: string;
};

const DB_NAME = "shapeit-share";
const STORE = "intake";
const KEY = "latest";
const SESSION_KEY = "shapeit:share";

function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readShareIntakeFromDb(): Promise<ShareIntakePayload | null> {
  try {
    const db = await openShareDb();
    const data = await new Promise<ShareIntakePayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as ShareIntakePayload | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!data) return null;
    await clearShareIntakeFromDb();
    return data;
  } catch {
    return null;
  }
}

async function clearShareIntakeFromDb(): Promise<void> {
  try {
    const db = await openShareDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function extractImageFromClipboardEvent(e: ClipboardEvent): Promise<string | undefined> {
  const items = e.clipboardData?.items;
  if (!items) return undefined;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return fileToDataUrl(file);
    }
  }
  return undefined;
}

export async function readClipboardImage(): Promise<string | undefined> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      return fileToDataUrl(new File([blob], "clip.png", { type }));
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Android 共有ターゲット（SW IndexedDB）またはレガシー sessionStorage から取り込み */
export async function consumeShareIntake(): Promise<ShareIntakePayload | null> {
  const fromDb = await readShareIntakeFromDb();
  if (fromDb) return fromDb;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SESSION_KEY);
    return JSON.parse(raw) as ShareIntakePayload;
  } catch {
    return null;
  }
}
