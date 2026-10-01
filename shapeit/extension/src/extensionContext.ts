/** Content script から chrome.* を安全に呼ぶ（再読み込み後の invalidated 対策） */
export function extensionAlive(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function getExtensionVersion(): string | undefined {
  try {
    if (!extensionAlive()) return undefined;
    return chrome.runtime.getManifest().version;
  } catch {
    return undefined;
  }
}

export function safeStorageLocalSet(items: Record<string, unknown>): void {
  if (!extensionAlive()) return;
  try {
    void chrome.storage.local.set(items);
  } catch {
    /* extension context invalidated */
  }
}

export function safeStorageSyncSet(items: Record<string, unknown>): void {
  if (!extensionAlive()) return;
  try {
    void chrome.storage.sync.set(items);
  } catch {
    /* extension context invalidated */
  }
}

export function sendRuntimeMessage<T = unknown>(
  message: Record<string, unknown>,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (!extensionAlive()) {
      resolve(undefined);
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (res) => {
        void chrome.runtime.lastError;
        resolve(res as T | undefined);
      });
    } catch {
      resolve(undefined);
    }
  });
}
