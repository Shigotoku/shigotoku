import {
  captureElementOnTab,
  captureFullOnTab,
  captureRegionOnTab,
  enqueueReport,
  getActiveTabMeta,
  getPreferredAppBase,
  type PendingReport,
} from "./shared";
import { saveEditorDraft } from "./editorDraft";
import {
  checkDuplicateFeedback,
  openInboxTab,
  submitExtensionFeedback,
  type ExtensionFeedbackPayload,
} from "./submitFeedback";
import { enqueueOffline, listOfflineQueue, removeFromOfflineQueue } from "./offlineQueue";

const SHAPEIT_TAB_URLS = [
  "https://app.shapeit.shigotoku.com/*",
  "https://shigotoku-shapeit-app.web.app/*",
  "http://localhost:5178/*",
  "http://127.0.0.1:5178/*",
];

const EDITOR_URL = chrome.runtime.getURL("editor.html");
const ONBOARDING_URL = chrome.runtime.getURL("onboarding.html");
const TOKEN_STALE_MS = 45 * 60 * 1000;
const AUTH_WAIT_MS = 12_000;
const INSTANT_DRAFT_KEY = "shapeitInstantDraft";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function hasStoredToken(): Promise<boolean> {
  const stored = await chrome.storage.local.get("shapeitIdToken");
  const token = stored.shapeitIdToken;
  return typeof token === "string" && token.length > 0;
}

async function hasFreshToken(): Promise<boolean> {
  const stored = await chrome.storage.local.get(["shapeitIdToken", "shapeitTokenAt"]);
  const token = stored.shapeitIdToken;
  const at = Number(stored.shapeitTokenAt || 0);
  return typeof token === "string" && token.length > 0 && Date.now() - at < TOKEN_STALE_MS;
}

async function waitForStoredToken(maxMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await hasStoredToken()) return true;
    await sleep(250);
  }
  return false;
}

async function pingShapeitTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: SHAPEIT_TAB_URLS });
  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "SHAPEIT_REFRESH_AUTH" });
    } catch {
      /* ignore */
    }
  }
}

async function ensureAuthFromApp(): Promise<boolean> {
  if (await hasFreshToken()) return true;
  await pingShapeitTabs();
  if (await waitForStoredToken(3000)) return true;

  const base = await getPreferredAppBase();
  let createdTabId: number | undefined;
  try {
    const tab = await chrome.tabs.create({ url: `${base}/capture?ext=1`, active: false });
    createdTabId = tab.id;
  } catch {
    return false;
  }

  const deadline = Date.now() + AUTH_WAIT_MS;
  while (Date.now() < deadline) {
    if (createdTabId) {
      try {
        await chrome.tabs.sendMessage(createdTabId, { type: "SHAPEIT_REFRESH_AUTH" });
      } catch {
        /* ignore */
      }
    }
    if (await hasStoredToken()) break;
    await sleep(400);
  }

  const ok = await hasStoredToken();
  if (createdTabId) {
    try {
      await chrome.tabs.remove(createdTabId);
    } catch {
      /* ignore */
    }
  }
  return ok;
}

async function resolveTab(tabHint?: { tabId?: number; windowId?: number }) {
  let tabId = tabHint?.tabId;
  let windowId = tabHint?.windowId;
  if (!tabId || !windowId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabId) tabId = tab?.id;
    if (!windowId) windowId = tab?.windowId;
  }
  if (tabId && !windowId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      windowId = tab.windowId;
    } catch {
      /* ignore */
    }
  }
  return { tabId, windowId };
}

async function focusTab(tabId: number, windowId: number) {
  try {
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(windowId, { focused: true });
  } catch {
    /* ignore */
  }
}

async function showInstantOverlayOnTab(
  tabId: number,
  payload: Record<string, unknown>,
): Promise<boolean> {
  await chrome.storage.session.set({ [INSTANT_DRAFT_KEY]: payload });
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHAPEIT_SHOW_INSTANT_OVERLAY",
      payload,
    });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["pageReporter.js"] });
      await sleep(200);
      await chrome.tabs.sendMessage(tabId, {
        type: "SHAPEIT_SHOW_INSTANT_OVERLAY",
        payload,
      });
      return true;
    } catch {
      return false;
    }
  }
}

async function startFullReport(tabHint?: { tabId?: number; windowId?: number }) {
  const auth = await ensureAuthFromApp();
  if (!auth) return { ok: false, error: "auth" };

  const { tabId, windowId } = await resolveTab(tabHint);
  if (!tabId || !windowId) return { ok: false, error: "active tab not found" };

  await focusTab(tabId, windowId);
  const cap = await captureFullOnTab(tabId, windowId);
  if (!cap?.screenshotDataUrl) return { ok: false, error: "capture failed" };

  const shown = await showInstantOverlayOnTab(tabId, {
    screenshotDataUrl: cap.screenshotDataUrl,
    pageUrl: cap.pageUrl,
    pageTitle: cap.pageTitle,
    captureMode: "full",
  });
  return shown ? { ok: true } : { ok: false, error: "overlay failed" };
}

async function startInstantReport(tabHint?: { tabId?: number; windowId?: number }) {
  const auth = await ensureAuthFromApp();
  if (!auth) return { ok: false, error: "auth" };

  const { tabId, windowId } = await resolveTab(tabHint);
  if (!tabId || !windowId) return { ok: false, error: "active tab not found" };

  await focusTab(tabId, windowId);
  const cap = await captureRegionOnTab(tabId, windowId);
  if (!cap?.screenshotDataUrl) return { ok: false, error: "cancelled" };

  const shown = await showInstantOverlayOnTab(tabId, {
    screenshotDataUrl: cap.screenshotDataUrl,
    pageUrl: cap.pageUrl,
    pageTitle: cap.pageTitle,
    captureMode: "region",
  });
  return shown ? { ok: true } : { ok: false, error: "overlay failed" };
}

async function startCommentOnly(tabHint?: { tabId?: number; windowId?: number }) {
  const auth = await ensureAuthFromApp();
  if (!auth) return { ok: false, error: "auth" };

  const { tabId } = await resolveTab(tabHint);
  if (!tabId) return { ok: false, error: "active tab not found" };

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const shown = await showInstantOverlayOnTab(tabId, {
    commentOnly: true,
    pageUrl: tab?.url ?? "",
    pageTitle: tab?.title ?? "",
    captureMode: "none",
  });
  return shown ? { ok: true } : { ok: false, error: "overlay failed" };
}

async function startElementReport(tabHint?: { tabId?: number; windowId?: number }) {
  const auth = await ensureAuthFromApp();
  if (!auth) return { ok: false, error: "auth" };

  const { tabId, windowId } = await resolveTab(tabHint);
  if (!tabId || !windowId) return { ok: false, error: "active tab not found" };

  await focusTab(tabId, windowId);
  const cap = await captureElementOnTab(tabId, windowId);
  if (!cap?.screenshotDataUrl) return { ok: false, error: "cancelled" };

  const shown = await showInstantOverlayOnTab(tabId, {
    screenshotDataUrl: cap.screenshotDataUrl,
    pageUrl: cap.pageUrl,
    pageTitle: cap.pageTitle,
    captureMode: "element",
    elementSelector: cap.elementSelector,
    elementTag: cap.elementTag,
  });
  return shown ? { ok: true } : { ok: false, error: "overlay failed" };
}

async function captureForEditor(
  mode: "full" | "region",
  tabHint?: { tabId?: number; windowId?: number },
) {
  const auth = await ensureAuthFromApp();
  if (!auth) return { ok: false, error: "auth" };

  const { tabId, windowId } = await resolveTab(tabHint);
  if (!tabId || !windowId) return { ok: false, error: "active tab not found" };

  await focusTab(tabId, windowId);
  const cap = mode === "full" ? await captureFullOnTab(tabId, windowId) : await captureRegionOnTab(tabId, windowId);
  if (!cap) return { ok: false, error: "cancelled" };
  if (mode === "region" && !cap.screenshotDataUrl) return { ok: false, error: "cancelled" };

  await saveEditorDraft({
    pageUrl: cap.pageUrl,
    pageTitle: cap.pageTitle,
    screenshotDataUrl: cap.screenshotDataUrl,
    captureMode: cap.captureMode === "element" ? "region" : cap.captureMode,
    sourceTabId: tabId,
    sourceWindowId: windowId,
    createdAt: new Date().toISOString(),
  });
  return { ok: true };
}

async function openEditorWindow(): Promise<void> {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["popup"] });
  const existing = windows.find((w) => w.tabs?.some((t) => t.url === EDITOR_URL));
  if (existing?.id) {
    await chrome.windows.update(existing.id, { focused: true });
    return;
  }
  await chrome.windows.create({
    url: EDITOR_URL,
    type: "popup",
    width: 860,
    height: 780,
    focused: true,
  });
}

async function startAnnotateReport(tabHint?: { tabId?: number; windowId?: number }) {
  const auth = await ensureAuthFromApp();
  if (!auth) return { ok: false, error: "auth" };

  const { tabId, windowId } = await resolveTab(tabHint);
  if (!tabId || !windowId) return { ok: false, error: "active tab not found" };

  await focusTab(tabId, windowId);
  const cap = await captureRegionOnTab(tabId, windowId);
  if (!cap) return { ok: false, error: "cancelled" };

  await saveEditorDraft({
    pageUrl: cap.pageUrl,
    pageTitle: cap.pageTitle,
    screenshotDataUrl: cap.screenshotDataUrl,
    captureMode: "region",
    sourceTabId: tabId,
    sourceWindowId: windowId,
    createdAt: new Date().toISOString(),
  });
  await openEditorWindow();
  return { ok: true };
}

async function openNoteEditor(tabHint?: { tabId?: number; windowId?: number }) {
  const { tabId, windowId } = await resolveTab(tabHint);
  const tab = tabId ? await chrome.tabs.get(tabId).catch(() => null) : null;
  await saveEditorDraft({
    pageUrl: tab?.url ?? "",
    pageTitle: tab?.title ?? "",
    captureMode: "none",
    sourceTabId: tabId,
    sourceWindowId: windowId,
    createdAt: new Date().toISOString(),
  });
  await openEditorWindow();
  return { ok: true };
}

async function submitWithOfflineFallback(payload: ExtensionFeedbackPayload) {
  const res = await submitExtensionFeedback(payload);
  if (res.ok) return res;
  if (res.status === 0 || res.status === 503) {
    await enqueueOffline(payload);
    return { ok: true, queued: true };
  }
  return res;
}

async function flushOfflineQueue() {
  const queue = await listOfflineQueue();
  for (const item of queue) {
    const { id, queuedAt: _q, retries: _r, ...payload } = item;
    const res = await submitExtensionFeedback(payload);
    if (res.ok) await removeFromOfflineQueue(id);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void chrome.tabs.create({ url: ONBOARDING_URL });
    return;
  }
  if (details.reason === "update") {
    void chrome.tabs.query({ url: SHAPEIT_TAB_URLS }).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id) void chrome.tabs.reload(tab.id).catch(() => {});
      }
    });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "shapeit-flush-queue") void flushOfflineQueue();
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.alarms.create("shapeit-flush-queue", { periodInMinutes: 5 });
  void flushOfflineQueue();
});

chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === "full-report") {
      await startFullReport();
      return;
    }
    if (command === "region-report" || command === "instant-report") {
      await startInstantReport();
      return;
    }
    if (command === "comment-report") {
      await startCommentOnly();
      return;
    }
    if (command === "annotate-report") {
      await startAnnotateReport();
      return;
    }
  } catch {
    const base = await getPreferredAppBase();
    await chrome.tabs.create({ url: `${base}/capture?ext=1&focus=1` });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SHAPEIT_ENSURE_AUTH" || msg?.type === "SHAPEIT_REFRESH_AUTH") {
    void ensureAuthFromApp().then((ok) => sendResponse({ ok }));
    return true;
  }
  if (msg?.type === "SHAPEIT_START_FULL") {
    void startFullReport().then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_START_COMMENT") {
    void startCommentOnly().then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_START_INSTANT") {
    void startInstantReport().then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_START_ELEMENT") {
    void startElementReport().then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_START_ANNOTATE") {
    void startAnnotateReport().then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_ENQUEUE") {
    void enqueueReport(msg.report as PendingReport).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "SHAPEIT_START_CAPTURE") {
    const openEditor = msg.openEditor !== false;
    const mode = msg.mode === "full" ? "full" : "region";
    const tabHint =
      typeof msg.tabId === "number"
        ? { tabId: Number(msg.tabId), windowId: typeof msg.windowId === "number" ? Number(msg.windowId) : undefined }
        : undefined;
    if (openEditor) void startAnnotateReport(tabHint).then((res) => sendResponse(res));
    else void captureForEditor(mode, tabHint).then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_OPEN_EDITOR") {
    void openEditorWindow().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "SHAPEIT_OPEN_NOTE_EDITOR") {
    const tabHint =
      typeof msg.tabId === "number"
        ? { tabId: Number(msg.tabId), windowId: typeof msg.windowId === "number" ? Number(msg.windowId) : undefined }
        : undefined;
    void openNoteEditor(tabHint).then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_CHECK_DUPLICATES") {
    void checkDuplicateFeedback(String(msg.rawText ?? "")).then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_SUBMIT_FEEDBACK") {
    void submitWithOfflineFallback({
      rawText: String(msg.rawText ?? ""),
      pageUrl: typeof msg.pageUrl === "string" ? msg.pageUrl : "",
      pageTitle: typeof msg.pageTitle === "string" ? msg.pageTitle : "",
      screenshotDataUrl: typeof msg.screenshotDataUrl === "string" ? msg.screenshotDataUrl : undefined,
      captureMode: typeof msg.captureMode === "string" ? msg.captureMode : "none",
      consoleSnippet: typeof msg.consoleSnippet === "string" ? msg.consoleSnippet : undefined,
      elementSelector: typeof msg.elementSelector === "string" ? msg.elementSelector : undefined,
      elementTag: typeof msg.elementTag === "string" ? msg.elementTag : undefined,
    }).then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_OPEN_INBOX") {
    void openInboxTab().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "SHAPEIT_GET_TAB_META") {
    void getActiveTabMeta().then((meta) => sendResponse({ ok: true, meta }));
    return true;
  }
  if (msg?.type === "SHAPEIT_GET_PENDING") {
    void chrome.storage.local.get("shapeitPendingReports").then((data) => {
      sendResponse({ ok: true, reports: data.shapeitPendingReports ?? [] });
    });
    return true;
  }
  if (msg?.type === "SHAPEIT_CLEAR_PENDING") {
    const ids: string[] = Array.isArray(msg.ids) ? msg.ids : [];
    void chrome.storage.local.get("shapeitPendingReports").then(async (data) => {
      const list = Array.isArray(data.shapeitPendingReports) ? data.shapeitPendingReports : [];
      const next = list.filter((r: PendingReport) => !ids.includes(r.id));
      await chrome.storage.local.set({ shapeitPendingReports: next });
      sendResponse({ ok: true });
    });
    return true;
  }
  if (
    msg?.type === "SHAPEIT_REGION_DONE" ||
    msg?.type === "SHAPEIT_REGION_CANCEL" ||
    msg?.type === "SHAPEIT_ELEMENT_DONE" ||
    msg?.type === "SHAPEIT_ELEMENT_CANCEL"
  ) {
    return false;
  }
  return false;
});

void chrome.alarms.create("shapeit-flush-queue", { periodInMinutes: 5 });
