import { auth } from './firebase';

/** Webアプリ → Chrome拡張へ manualId / トークンを渡す */
export async function syncExtensionSession(manualId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdToken();
  window.postMessage(
    {
      type: 'CLIPIT_SYNC',
      manualId,
      idToken: token,
      apiBase: import.meta.env.VITE_API_URL ?? 'https://app.clipit.shigotoku.com/api',
    },
    window.location.origin,
  );
  return true;
}

export function extensionInstallUrl(): string {
  return 'https://chrome.google.com/webstore/category/extensions';
}
