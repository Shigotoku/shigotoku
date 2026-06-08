import { auth } from './firebase';

/** Webアプリ → Chrome拡張へ manualId / トークンを渡す */
export async function syncExtensionSession(
  manualId: string,
  options?: { polishVoiceWithAi?: boolean },
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
    },
    window.location.origin,
  );
  return true;
}

export function extensionInstallUrl(): string {
  return 'https://chrome.google.com/webstore/category/extensions';
}

/** 記録中の音声メモを拡張へ渡す（ingest 時に voiceTranscript として送信） */
export function syncVoiceTranscript(transcript: string): void {
  window.postMessage({ type: 'CLIPIT_VOICE', transcript }, window.location.origin);
}
