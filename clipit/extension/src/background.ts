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
let recordingWindowId: number | null = null;
const steps: RecordedStep[] = [];
const injectingTabs = new Set<number>();

function isClipitAppTab(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname === 'app.clipit.shigotoku.com') return true;
    if (u.hostname === 'localhost' && (u.port === '5173' || u.port === '5176')) return true;
  } catch {
    return false;
  }
  return false;
}

function isInjectableUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
    return false;
  }
  if (url.startsWith('about:') || url.startsWith('chrome-search://')) return false;
  if (isClipitAppTab(url)) return false;
  return true;
}

function isRecordingWindow(windowId?: number): boolean {
  return recording && recordingWindowId != null && windowId === recordingWindowId;
}

const CAPTURE_OPTS = { format: 'jpeg' as const, quality: 96 };

/** タブ単位キャプチャ（対応ブラウザ）→ フォールバックでウィンドウキャプチャ。高画質 JPEG */
function captureStepScreenshot(windowId: number, tabId: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    const fallback = () => {
      chrome.tabs.captureVisibleTab(windowId, CAPTURE_OPTS, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) resolve(undefined);
        else resolve(dataUrl);
      });
    };
    const captureTab = (chrome.tabs as { captureTab?: typeof chrome.tabs.captureVisibleTab }).captureTab;
    if (typeof captureTab === 'function') {
      captureTab(tabId, CAPTURE_OPTS, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) fallback();
        else resolve(dataUrl);
      });
    } else {
      fallback();
    }
  });
}

/** SW 再起動で記録中が復元されると全ページへ注入が走りエラーが溜まるため、記録フラグは復元しない */
async function clearStaleRecordingSession() {
  try {
    await chrome.storage.session.remove('clipitRecording');
  } catch {
    /* ignore */
  }
  recording = false;
  paused = false;
  recordingWindowId = null;
}

void clearStaleRecordingSession();

chrome.runtime.onInstalled.addListener(() => {
  void clearStaleRecordingSession();
});

chrome.runtime.onStartup.addListener(() => {
  void clearStaleRecordingSession();
});

async function persistRecordingMeta() {
  try {
    if (!recording) {
      await chrome.storage.session.remove('clipitRecording');
      return;
    }
    await chrome.storage.session.set({
      clipitRecording: {
        recording: true,
        paused,
        recordingWindowId,
        stepCount: steps.length,
      },
    });
  } catch {
    /* ignore */
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function tabMessage(tabId: number, payload: object): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, payload, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

async function notifyRecorderTab(tabId: number, retries = 4): Promise<void> {
  const payload = {
    type: 'CLIPIT_RECORDING_STATE',
    active: true,
    paused,
    stepCount: steps.length,
  };
  for (let i = 0; i < retries; i += 1) {
    const ok = await tabMessage(tabId, payload);
    if (ok) return;
    await sleep(i < 2 ? 120 : 280);
  }
}

async function safeInjectRecorder(tabId: number): Promise<void> {
  if (injectingTabs.has(tabId)) return;
  injectingTabs.add(tabId);
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isRecordingWindow(tab.windowId) || !isInjectableUrl(tab.url)) return;

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['recorder.js'],
    });
    await notifyRecorderTab(tabId);
  } catch {
    /* 注入不可ページは無視（エラーバッジに出さない） */
  } finally {
    injectingTabs.delete(tabId);
  }
}

async function broadcastRecordingState(active: boolean) {
  if (recordingWindowId == null) return;
  try {
    const tabs = await chrome.tabs.query({ windowId: recordingWindowId });
    const msg = active
      ? { type: 'CLIPIT_RECORDING_STATE', active: true, paused, stepCount: steps.length }
      : { type: 'CLIPIT_RECORDING_STATE', active: false };
    for (const tab of tabs) {
      if (tab.id != null) void tabMessage(tab.id, msg);
    }
  } catch {
    /* ignore */
  }
}

async function scheduleReinject(tabId: number, url?: string) {
  if (!recording || !isInjectableUrl(url)) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isRecordingWindow(tab.windowId)) return;
    await safeInjectRecorder(tabId);
  } catch {
    /* ignore */
  }
}

chrome.tabs.onActivated.addListener((info) => {
  if (!isRecordingWindow(info.windowId)) return;
  void safeInjectRecorder(info.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isRecordingWindow(tab.windowId)) return;
  if (changeInfo.status === 'complete' || (changeInfo.url && isInjectableUrl(changeInfo.url))) {
    void scheduleReinject(tabId, changeInfo.url ?? tab.url);
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (!recording || details.frameId !== 0) return;
  void scheduleReinject(details.tabId, details.url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (!recording || details.frameId !== 0) return;
  void scheduleReinject(details.tabId, details.url);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CLIPIT_START') {
    recording = true;
    paused = false;
    steps.length = 0;
    chrome.tabs.query({ active: true, currentWindow: true }, (queryTabs) => {
      void (async () => {
        const tab = queryTabs[0];
        const tabId = tab?.id;
        const windowId = tab?.windowId;
        if (!tabId || windowId == null || !isInjectableUrl(tab?.url)) {
          recording = false;
          recordingWindowId = null;
          sendResponse({
            ok: false,
            message:
              '記録できないページです。業務サイトのタブを開いてから記録開始してください（クリッピット編集画面では記録できません）。',
          });
          return;
        }
        recordingWindowId = windowId;
        await persistRecordingMeta();
        try {
          await safeInjectRecorder(tabId);
          sendResponse({ ok: true });
        } catch {
          recording = false;
          recordingWindowId = null;
          await persistRecordingMeta();
          sendResponse({
            ok: false,
            message: '記録の開始に失敗しました。ページを再読み込みしてやり直してください。',
          });
        }
      })();
    });
    return true;
  }

  if (msg.type === 'CLIPIT_PAUSE') {
    paused = !paused;
    void persistRecordingMeta();
    void broadcastRecordingState(true);
    sendResponse({ ok: true, paused });
    return true;
  }

  if (msg.type === 'CLIPIT_STOP') {
    recording = false;
    paused = false;
    const windowId = recordingWindowId;
    recordingWindowId = null;
    void persistRecordingMeta();
    if (windowId != null) {
      chrome.tabs.query({ windowId }, (tabs) => {
        for (const t of tabs) {
          if (t.id != null) {
            void tabMessage(t.id, { type: 'CLIPIT_RECORDING_STATE', active: false });
          }
        }
      });
    }
    finishIngest().then((r) => sendResponse(r));
    return true;
  }

  if (
    msg.type === 'CLIPIT_CLICK' &&
    recording &&
    !paused &&
    isRecordingWindow(sender.tab?.windowId)
  ) {
    const windowId = sender.tab!.windowId;
    const tabId = sender.tab!.id!;
    captureStepScreenshot(windowId, tabId).then((dataUrl) => {
      if (!dataUrl) {
        sendResponse({ ok: false, count: steps.length });
        return;
      }
      const isForce = String(msg.step.elementText || '').startsWith('【強制キャプチャ】');
      steps.push({
        title: isForce ? `強制キャプチャ ${steps.length + 1}` : `手順 ${steps.length + 1}`,
        elementText: msg.step.elementText,
        elementRole: msg.step.elementRole,
        pageTitle: msg.step.pageTitle,
        pageUrl: msg.step.pageUrl,
        clickX: msg.step.clickX,
        clickY: msg.step.clickY,
        screenshotBase64: dataUrl,
      });
      void persistRecordingMeta();
      void tabMessage(tabId, {
        type: 'CLIPIT_RECORDING_STATE',
        active: true,
        paused,
        stepCount: steps.length,
      });
      sendResponse({ ok: true, count: steps.length });
    });
    return true;
  }

  if (msg.type === 'CLIPIT_GET_STATUS') {
    sendResponse({ recording, paused, stepCount: steps.length, windowId: recordingWindowId });
    return true;
  }

  return false;
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'force-capture' || !recording || recordingWindowId == null) return;
  chrome.tabs.query({ active: true, windowId: recordingWindowId }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId != null) {
      void tabMessage(tabId, { type: 'CLIPIT_FORCE_CAPTURE' });
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
    return {
      ok: false,
      message:
        '記録された手順がありません。記録開始したウィンドウ内の業務サイトで操作してください。',
    };
  }
  const base = (apiBase as string) || 'https://app.clipit.shigotoku.com/api';
  try {
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
    const count = (data as { stepCount?: number }).stepCount ?? steps.length;
    steps.length = 0;
    await persistRecordingMeta();
    chrome.tabs.create({ url: `https://app.clipit.shigotoku.com/manuals/${manualId}/edit` });
    return { ok: true, message: `${count} 手順を取り込みました` };
  } catch {
    return { ok: false, message: '取り込みに失敗しました（ネットワークを確認してください）' };
  }
}
