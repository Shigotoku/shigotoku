import {
  captureActiveTab,
  captureRegionOnTab,
  captureVisibleTab,
  enqueueReport,
  getActiveTabMeta,
  getPreferredAppBase,
  isCapturableUrl,
  type PendingReport,
} from "./shared";
import { saveEditorDraft } from "./editorDraft";

const SHAPEIT_TAB_URLS = [
  "https://app.shapeit.shigotoku.com/*",
  "https://shigotoku-shapeit-app.web.app/*",
  "http://localhost:5178/*",
  "http://127.0.0.1:5178/*",
];

const EDITOR_URL = chrome.runtime.getURL("editor.html");

async function refreshAuthFromAppTab(): Promise<boolean> {
  const tabs = await chrome.tabs.query({ url: SHAPEIT_TAB_URLS });
  const tab = tabs.find((t) => t.id);
  if (!tab?.id) return false;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SHAPEIT_REFRESH_AUTH" });
    return true;
  } catch {
    return false;
  }
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

async function startCapture(mode: "full" | "region", openEditor = true, tabHint?: { tabId?: number; windowId?: number }) {
  let tabId = tabHint?.tabId;
  let windowId = tabHint?.windowId;
  if (!tabId || !windowId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id;
    windowId = tab?.windowId;
  }
  if (!tabId || !windowId) return { ok: false, error: "active tab not found" };

  if (mode === "region") {
    try {
      await chrome.tabs.update(tabId, { active: true });
      await chrome.windows.update(windowId, { focused: true });
    } catch {
      /* ignore */
    }
  }

  const tab = await chrome.tabs.get(tabId);
  const cap =
    mode === "region"
      ? await captureRegionOnTab(tabId, windowId)
      : await (async () => {
          const pageUrl = tab.url ?? "";
          const pageTitle = tab.title ?? "";
          if (!isCapturableUrl(pageUrl)) {
            return { pageUrl, pageTitle, captureMode: "full" as const };
          }
          const screenshotDataUrl = await captureVisibleTab(windowId);
          return { pageUrl, pageTitle, screenshotDataUrl, captureMode: "full" as const };
        })();

  if (!cap) return { ok: false, error: "capture failed" };

  await saveEditorDraft({
    pageUrl: cap.pageUrl,
    pageTitle: cap.pageTitle,
    screenshotDataUrl: cap.screenshotDataUrl,
    captureMode: cap.captureMode,
    sourceTabId: tabId,
    sourceWindowId: windowId,
    createdAt: new Date().toISOString(),
  });

  if (openEditor) await openEditorWindow();
  return { ok: true, cap };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("ShapeIt extension installed");
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-report") return;
  try {
    await startCapture("full", true);
    return;
  } catch {
    const base = await getPreferredAppBase();
    await chrome.tabs.create({ url: `${base}/capture?ext=1&focus=1` });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SHAPEIT_REFRESH_AUTH") {
    void refreshAuthFromAppTab().then((ok) => sendResponse({ ok }));
    return true;
  }
  if (msg?.type === "SHAPEIT_ENQUEUE") {
    void enqueueReport(msg.report as PendingReport).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "SHAPEIT_CAPTURE_NOW") {
    void captureActiveTab().then((cap) => sendResponse({ ok: true, cap }));
    return true;
  }
  if (msg?.type === "SHAPEIT_START_CAPTURE") {
    const mode = msg.mode === "region" ? "region" : "full";
    const openEditor = msg.openEditor !== false;
    const tabHint =
      typeof msg.tabId === "number"
        ? {
            tabId: Number(msg.tabId),
            windowId: typeof msg.windowId === "number" ? Number(msg.windowId) : undefined,
          }
        : undefined;
    void startCapture(mode, openEditor, tabHint).then((res) => sendResponse(res));
    return true;
  }
  if (msg?.type === "SHAPEIT_OPEN_EDITOR") {
    void openEditorWindow().then(() => sendResponse({ ok: true }));
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
  if (msg?.type === "SHAPEIT_REGION_DONE" || msg?.type === "SHAPEIT_REGION_CANCEL") {
    // handled by capture listener in shared.ts
    return false;
  }
  return false;
});
