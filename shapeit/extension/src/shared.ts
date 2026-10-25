import { cropDataUrl, type CropRect } from "./captureImage";

export type { CropRect };

export type PendingReport = {
  id: string;
  rawText: string;
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  createdAt: string;
  source: "chrome_extension";
};

export type CaptureMode = "full" | "region" | "element" | "none";

const APP_CANDIDATES = [
  "https://app.shapeit.shigotoku.com",
  "https://shigotoku-shapeit-app.web.app",
  "http://localhost:5178",
  "http://127.0.0.1:5178",
];

export function isShapeitAppUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname === "app.shapeit.shigotoku.com") return true;
    if (u.hostname === "shigotoku-shapeit-app.web.app") return true;
    if ((u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.port === "5178") return true;
  } catch {
    return false;
  }
  return false;
}

export function isCapturableUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://")) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
}

export async function getPreferredAppBase(): Promise<string> {
  const stored = await chrome.storage.sync.get("shapeitAppBase");
  if (typeof stored.shapeitAppBase === "string" && stored.shapeitAppBase) {
    return stored.shapeitAppBase.replace(/\/$/, "");
  }
  return APP_CANDIDATES[0];
}

export async function enqueueReport(report: PendingReport): Promise<void> {
  const key = "shapeitPendingReports";
  const cur = await chrome.storage.local.get(key);
  const list = Array.isArray(cur[key]) ? (cur[key] as PendingReport[]) : [];
  list.unshift(report);
  await chrome.storage.local.set({ [key]: list.slice(0, 50) });
}

export async function getActiveTabMeta(): Promise<{
  tabId?: number;
  windowId?: number;
  pageUrl: string;
  pageTitle: string;
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return {
    tabId: tab?.id,
    windowId: tab?.windowId,
    pageUrl: tab?.url ?? "",
    pageTitle: tab?.title ?? "",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** キャプチャ直前に ShapeIt の UI を隠し、描画が落ち着くまで待つ */
async function prepareTabForCapture(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.getElementById("shapeit-region-overlay")?.remove();
        document.getElementById("shapeit-element-overlay")?.remove();
        const fab = document.getElementById("shapeit-fab-host");
        if (fab) fab.style.display = "none";
        const overlay = document.getElementById("shapeit-overlay-host");
        if (overlay) overlay.style.display = "none";
      },
    });
  } catch {
    /* ignore */
  }
  await sleep(150);
}

async function restoreTabAfterCapture(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const fab = document.getElementById("shapeit-fab-host");
        if (fab) fab.style.display = "";
      },
    });
  } catch {
    /* ignore */
  }
}

export async function captureVisibleTab(windowId: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 92 }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) resolve(undefined);
      else resolve(dataUrl);
    });
  });
}

export async function captureActiveTab(): Promise<{
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  captureMode: CaptureMode;
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.windowId) return null;
  const pageUrl = tab.url ?? "";
  const pageTitle = tab.title ?? "";
  if (!isCapturableUrl(pageUrl)) {
    return { pageUrl, pageTitle, captureMode: "full" };
  }
  const screenshotDataUrl = await captureVisibleTab(tab.windowId);
  return { pageUrl, pageTitle, screenshotDataUrl, captureMode: "full" };
}

export async function captureFullOnTab(tabId: number, windowId: number): Promise<{
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  captureMode: CaptureMode;
} | null> {
  const tab = await chrome.tabs.get(tabId);
  const pageUrl = tab.url ?? "";
  const pageTitle = tab.title ?? "";
  if (!isCapturableUrl(pageUrl)) {
    return { pageUrl, pageTitle, captureMode: "full" };
  }
  await prepareTabForCapture(tabId);
  let screenshotDataUrl: string | undefined;
  try {
    screenshotDataUrl = await captureVisibleTab(windowId);
  } finally {
    await restoreTabAfterCapture(tabId);
  }
  return { pageUrl, pageTitle, screenshotDataUrl, captureMode: "full" };
}

export async function captureRegionOnTab(tabId: number, windowId: number): Promise<{
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  captureMode: CaptureMode;
} | null> {
  const tab = await chrome.tabs.get(tabId);
  const pageUrl = tab.url ?? "";
  const pageTitle = tab.title ?? "";
  if (!isCapturableUrl(pageUrl)) {
    return { pageUrl, pageTitle, captureMode: "region" };
  }

  const rect = await requestRegionSelection(tabId);
  if (!rect) return { pageUrl, pageTitle, captureMode: "region" };

  await prepareTabForCapture(tabId);
  let fullShot: string | undefined;
  try {
    fullShot = await captureVisibleTab(windowId);
  } finally {
    await restoreTabAfterCapture(tabId);
  }
  if (!fullShot) return { pageUrl, pageTitle, captureMode: "region" };

  try {
    const cropped = await cropDataUrl(fullShot, rect);
    return { pageUrl, pageTitle, screenshotDataUrl: cropped, captureMode: "region" };
  } catch {
    return { pageUrl, pageTitle, screenshotDataUrl: fullShot, captureMode: "region" };
  }
}

export async function captureElementOnTab(tabId: number, windowId: number): Promise<{
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  captureMode: CaptureMode;
  elementSelector?: string;
  elementTag?: string;
} | null> {
  const tab = await chrome.tabs.get(tabId);
  const pageUrl = tab.url ?? "";
  const pageTitle = tab.title ?? "";
  if (!isCapturableUrl(pageUrl)) {
    return { pageUrl, pageTitle, captureMode: "element" };
  }

  const rect = await requestElementSelection(tabId);
  if (!rect) return { pageUrl, pageTitle, captureMode: "element" };

  await prepareTabForCapture(tabId);
  let fullShot: string | undefined;
  try {
    fullShot = await captureVisibleTab(windowId);
  } finally {
    await restoreTabAfterCapture(tabId);
  }
  if (!fullShot) return { pageUrl, pageTitle, captureMode: "element" };

  try {
    const cropped = await cropDataUrl(fullShot, rect);
    return {
      pageUrl,
      pageTitle,
      screenshotDataUrl: cropped,
      captureMode: "element",
      elementSelector: rect.selector,
      elementTag: rect.tagName,
    };
  } catch {
    return {
      pageUrl,
      pageTitle,
      screenshotDataUrl: fullShot,
      captureMode: "element",
      elementSelector: rect.selector,
      elementTag: rect.tagName,
    };
  }
}

function requestElementSelection(tabId: number): Promise<(CropRect & { selector?: string; tagName?: string }) | null> {
  return new Promise((resolve) => {
    const timeout = globalThis.setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      resolve(null);
    }, 120_000);

    const listener = (
      msg: { type?: string; rect?: CropRect & { selector?: string; tagName?: string } },
      sender: chrome.runtime.MessageSender,
    ) => {
      if (sender.tab?.id !== tabId) return;
      if (msg?.type === "SHAPEIT_ELEMENT_DONE") {
        globalThis.clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(msg.rect ?? null);
      }
      if (msg?.type === "SHAPEIT_ELEMENT_CANCEL") {
        globalThis.clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(null);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    void chrome.scripting
      .executeScript({ target: { tabId }, files: ["elementPicker.js"] })
      .catch(() => {
        globalThis.clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(null);
      });
  });
}

function requestRegionSelection(tabId: number): Promise<CropRect | null> {
  return new Promise((resolve) => {
    const timeout = globalThis.setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      resolve(null);
    }, 120_000);

    const listener = (
      msg: { type?: string; rect?: CropRect },
      sender: chrome.runtime.MessageSender,
    ) => {
      if (sender.tab?.id !== tabId) return;
      if (msg?.type === "SHAPEIT_REGION_DONE") {
        globalThis.clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(msg.rect ?? null);
      }
      if (msg?.type === "SHAPEIT_REGION_CANCEL") {
        globalThis.clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(null);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    void chrome.scripting
      .executeScript({ target: { tabId }, files: ["captureOverlay.js"] })
      .catch(() => {
        globalThis.clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(null);
      });
  });
}
