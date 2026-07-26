import { auth } from './firebase';

const PING_TIMEOUT_MS = 1200;

/** Webアプリ → Chrome拡張へ manualId / トークンを渡す */
export async function syncExtensionSession(
  manualId: string,
  options?: { polishVoiceWithAi?: boolean; generateAllWithAi?: boolean },
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdToken();
  window.postMessage(
    {
      type: 'CLIPIT_SYNC',
      manualId,
      idToken: token,
      apiBase: import.meta.env.VITE_API_URL ?? 'https://app.clipit.shigotoku.com/api',
      polishVoiceWithAi: options?.polishVoiceWithAi ?? false,
      generateAllWithAi: options?.generateAllWithAi ?? false,
    },
    window.location.origin,
  );
  return true;
}

/** 拡張がインストール・有効かを検出 */
export function pingExtension(): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'CLIPIT_PONG') {
        done = true;
        window.removeEventListener('message', onMessage);
        resolve(true);
      }
    };
    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'CLIPIT_PING' }, window.location.origin);
    setTimeout(() => {
      if (!done) {
        window.removeEventListener('message', onMessage);
        resolve(false);
      }
    }, PING_TIMEOUT_MS);
  });
}

/** 拡張インストール手順ページ（ストア未公開時もここから案内） */
export function extensionInstallPagePath(): string {
  return '/extension/install';
}

export function extensionInstallUrl(): string {
  const storeId = import.meta.env.VITE_CHROME_EXTENSION_ID;
  if (storeId) {
    return `https://chrome.google.com/webstore/detail/${storeId}`;
  }
  return extensionInstallPagePath();
}

/** 記録中の音声メモを拡張へ渡す（ingest 時に voiceTranscript として送信） */
export function syncVoiceTranscript(transcript: string): void {
  window.postMessage({ type: 'CLIPIT_VOICE', transcript }, window.location.origin);
}
