interface RecordedStep {
  title: string;
  elementText: string;
  elementRole: string;
  pageTitle: string;
  pageUrl: string;
  clickX?: number;
  clickY?: number;
  screenshotBase64?: string;
}

let recording = false;
let paused = false;
const steps: RecordedStep[] = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CLIPIT_START') {
    recording = true;
    paused = false;
    steps.length = 0;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['recorder.js'],
        });
        await chrome.tabs.sendMessage(tabId, { type: 'CLIPIT_RECORDING_STATE', active: true });
      } catch {
        /* restricted pages */
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'CLIPIT_PAUSE') {
    paused = !paused;
    sendResponse({ ok: true, paused });
    return true;
  }

  if (msg.type === 'CLIPIT_STOP') {
    recording = false;
    paused = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'CLIPIT_RECORDING_STATE', active: false }).catch(() => undefined);
      }
    });
    finishIngest().then((r) => sendResponse(r));
    return true;
  }

  if (msg.type === 'CLIPIT_CLICK' && recording && !paused && sender.tab?.id) {
    const tabId = sender.tab.id;
    const windowId = sender.tab.windowId;
    chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 72 }, (dataUrl) => {
      steps.push({
        title: `手順 ${steps.length + 1}`,
        elementText: msg.step.elementText,
        elementRole: msg.step.elementRole,
        pageTitle: msg.step.pageTitle,
        pageUrl: msg.step.pageUrl,
        clickX: msg.step.clickX,
        clickY: msg.step.clickY,
        screenshotBase64: dataUrl,
      });
      sendResponse({ ok: true, count: steps.length });
    });
    return true;
  }

  return false;
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'force-capture') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'CLIPIT_FORCE_CAPTURE' }).catch(() => undefined);
    }
  });
});

async function finishIngest(): Promise<{ ok: boolean; message?: string }> {
  const { manualId, idToken, apiBase } = await chrome.storage.local.get([
    'manualId',
    'idToken',
    'apiBase',
  ]);
  if (!manualId || !idToken) {
    return { ok: false, message: 'アプリの編集画面で「拡張と連携」を押してください' };
  }
  if (steps.length === 0) {
    return { ok: false, message: '記録された手順がありません' };
  }
  const base = (apiBase as string) || 'https://app.clipit.shigotoku.com/api';
  const res = await fetch(`${base}/v1/manuals/${manualId}/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ steps }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: (data as { error?: string }).error ?? '取り込みに失敗しました' };
  }
  steps.length = 0;
  chrome.tabs.create({ url: `https://app.clipit.shigotoku.com/manuals/${manualId}/edit` });
  return { ok: true, message: `${(data as { stepCount?: number }).stepCount ?? 0} 手順を取り込みました` };
}
