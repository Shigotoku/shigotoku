/** app.clipit.shigotoku.com 上で Webアプリと連携 */
const ALLOWED = ['https://app.clipit.shigotoku.com', 'http://localhost:5176', 'http://localhost:5173'];

window.addEventListener('message', (event) => {
  if (!ALLOWED.some((o) => event.origin === o || event.origin.startsWith('http://localhost:'))) return;
  if (event.data?.type === 'CLIPIT_SYNC') {
    chrome.storage.local.set({
      manualId: event.data.manualId,
      idToken: event.data.idToken,
      apiBase: event.data.apiBase,
      polishVoiceWithAi: Boolean(event.data.polishVoiceWithAi),
    });
    return;
  }
  if (event.data?.type === 'CLIPIT_VOICE' && typeof event.data.transcript === 'string') {
    chrome.storage.local.set({ voiceTranscript: event.data.transcript });
  }
});

