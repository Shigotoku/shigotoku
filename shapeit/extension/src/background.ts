import { captureActiveTab, enqueueReport, getPreferredAppBase, type PendingReport } from "./shared";

chrome.runtime.onInstalled.addListener(() => {
  console.log("ShapeIt extension installed");
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-report") return;
  // ショートカット: スクショ取得 → アプリの Capture を開く（コメントはアプリ側で追記可）
  const cap = await captureActiveTab();
  if (!cap) return;
  const report: PendingReport = {
    id: crypto.randomUUID(),
    rawText: "",
    pageUrl: cap.pageUrl,
    pageTitle: cap.pageTitle,
    screenshotDataUrl: cap.screenshotDataUrl,
    createdAt: new Date().toISOString(),
    source: "chrome_extension",
  };
  await enqueueReport(report);
  const base = await getPreferredAppBase();
  await chrome.tabs.create({ url: `${base}/capture?ext=1&focus=1` });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SHAPEIT_ENQUEUE") {
    void enqueueReport(msg.report as PendingReport).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "SHAPEIT_CAPTURE_NOW") {
    void captureActiveTab().then((cap) => sendResponse({ ok: true, cap }));
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
  return false;
});
