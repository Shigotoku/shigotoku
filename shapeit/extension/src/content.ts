/** ShapeIt アプリページ上で拡張 ↔ Web を橋渡し */
import { redactSensitiveDomHints } from "./privacyHints";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SHAPEIT_REFRESH_AUTH") {
    window.postMessage({ type: "SHAPEIT_REQUEST_AUTH" }, window.location.origin);
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHAPEIT_PING" || data.type === "SHAPEIT_EXT_PING") {
    window.postMessage({ type: "SHAPEIT_PONG", version: "0.3.0" }, window.location.origin);
    window.postMessage({ type: "SHAPEIT_EXT_PONG", version: "0.3.0" }, window.location.origin);
    return;
  }

  if (data.type === "SHAPEIT_PRIVACY_HINTS") {
    window.postMessage(
      { type: "SHAPEIT_PRIVACY_HINTS_RESULT", hints: redactSensitiveDomHints() },
      window.location.origin,
    );
    return;
  }

  if (data.type === "SHAPEIT_PULL_PENDING" || data.type === "SHAPEIT_PULL_REPORTS") {
    chrome.runtime.sendMessage({ type: "SHAPEIT_GET_PENDING" }, (res) => {
      window.postMessage(
        { type: "SHAPEIT_PENDING_RESULT", reports: res?.reports ?? [] },
        window.location.origin,
      );
      window.postMessage(
        { type: "SHAPEIT_PENDING_REPORTS", reports: res?.reports ?? [] },
        window.location.origin,
      );
    });
    return;
  }

  if (data.type === "SHAPEIT_ACK_PENDING" || data.type === "SHAPEIT_ACK_REPORTS") {
    chrome.runtime.sendMessage({ type: "SHAPEIT_CLEAR_PENDING", ids: data.ids ?? [] }, () => {
      window.postMessage({ type: "SHAPEIT_ACK_DONE" }, window.location.origin);
    });
    return;
  }

  if (data.type === "SHAPEIT_SET_APP_BASE" || data.type === "SHAPEIT_APP_BASE") {
    const base = String(data.base ?? data.origin ?? "").replace(/\/$/, "");
    const apiUrl = String(data.apiUrl ?? "").replace(/\/$/, "");
    const patch: Record<string, string> = {};
    if (base) patch.shapeitAppBase = base;
    if (apiUrl) patch.shapeitApiUrl = apiUrl;
    if (Object.keys(patch).length) void chrome.storage.sync.set(patch);
    return;
  }

  if (data.type === "SHAPEIT_AUTH") {
    const token = typeof data.token === "string" ? data.token : "";
    const email = typeof data.email === "string" ? data.email : "";
    const origin = String(data.origin ?? "").replace(/\/$/, "");
    const apiUrl = String(data.apiUrl ?? "").replace(/\/$/, "");
    void chrome.storage.local.set({
      shapeitIdToken: token,
      shapeitEmail: email,
      shapeitTokenAt: Date.now(),
    });
    const patch: Record<string, string> = {};
    if (origin) patch.shapeitAppBase = origin;
    if (apiUrl) patch.shapeitApiUrl = apiUrl;
    if (Object.keys(patch).length) void chrome.storage.sync.set(patch);
  }
});
