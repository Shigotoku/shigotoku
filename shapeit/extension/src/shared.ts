export type PendingReport = {
  id: string;
  rawText: string;
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
  createdAt: string;
  source: "chrome_extension";
};

const APP_CANDIDATES = [
  "https://shigotoku-shapeit-app.web.app",
  "http://localhost:5178",
  "http://127.0.0.1:5178",
  "https://app.shapeit.shigotoku.com",
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

export async function captureActiveTab(): Promise<{
  pageUrl: string;
  pageTitle: string;
  screenshotDataUrl?: string;
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.windowId) return null;
  const pageUrl = tab.url ?? "";
  const pageTitle = tab.title ?? "";
  if (!pageUrl || pageUrl.startsWith("chrome://") || pageUrl.startsWith("chrome-extension://")) {
    return { pageUrl, pageTitle };
  }
  const screenshotDataUrl = await new Promise<string | undefined>((resolve) => {
    chrome.tabs.captureVisibleTab(tab.windowId!, { format: "jpeg", quality: 90 }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) resolve(undefined);
      else resolve(dataUrl);
    });
  });
  return { pageUrl, pageTitle, screenshotDataUrl };
}
