/** ShapeIt アプリページ上で拡張 ↔ Web を橋渡し */
import {
  extensionAlive,
  getExtensionVersion,
  safeStorageLocalSet,
  safeStorageSyncSet,
  sendRuntimeMessage,
} from "./extensionContext";
import { redactSensitiveDomHints } from "./privacyHints";

function requestAuthFromApp() {
  if (!extensionAlive()) return;
  window.postMessage({ type: "SHAPEIT_REQUEST_AUTH" }, window.location.origin);
}

function announceReady() {
  const version = getExtensionVersion();
  if (!version) return;
  window.postMessage({ type: "SHAPEIT_EXT_READY", version }, window.location.origin);
}

if (extensionAlive()) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!extensionAlive()) return false;
    if (msg?.type === "SHAPEIT_REFRESH_AUTH") {
      requestAuthFromApp();
      globalThis.setTimeout(requestAuthFromApp, 400);
      globalThis.setTimeout(requestAuthFromApp, 1200);
      try {
        sendResponse({ ok: true });
      } catch {
        /* ignore */
      }
      return true;
    }
    return false;
  });

  requestAuthFromApp();
  globalThis.setTimeout(requestAuthFromApp, 800);
  announceReady();
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHAPEIT_PING" || data.type === "SHAPEIT_EXT_PING") {
    const version = getExtensionVersion();
    if (!version) return;
    window.postMessage({ type: "SHAPEIT_PONG", version }, window.location.origin);
    window.postMessage({ type: "SHAPEIT_EXT_PONG", version }, window.location.origin);
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
    void sendRuntimeMessage<{ reports?: unknown[] }>({ type: "SHAPEIT_GET_PENDING" }).then((res) => {
      const reports = res?.reports ?? [];
      window.postMessage({ type: "SHAPEIT_PENDING_RESULT", reports }, window.location.origin);
      window.postMessage({ type: "SHAPEIT_PENDING_REPORTS", reports }, window.location.origin);
    });
    return;
  }

  if (data.type === "SHAPEIT_ACK_PENDING" || data.type === "SHAPEIT_ACK_REPORTS") {
    void sendRuntimeMessage({ type: "SHAPEIT_CLEAR_PENDING", ids: data.ids ?? [] }).then(() => {
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
    if (Object.keys(patch).length) safeStorageSyncSet(patch);
    return;
  }

  if (data.type === "SHAPEIT_AUTH") {
    const token = typeof data.token === "string" ? data.token : "";
    const email = typeof data.email === "string" ? data.email : "";
    const displayName = typeof data.displayName === "string" ? data.displayName : "";
    const origin = String(data.origin ?? "").replace(/\/$/, "");
    const apiUrl = String(data.apiUrl ?? "").replace(/\/$/, "");
    safeStorageLocalSet({
      shapeitIdToken: token,
      shapeitEmail: email,
      shapeitDisplayName: displayName,
      shapeitTokenAt: Date.now(),
    });
    const patch: Record<string, string> = {};
    if (origin) patch.shapeitAppBase = origin;
    if (apiUrl) patch.shapeitApiUrl = apiUrl;
    if (Object.keys(patch).length) safeStorageSyncSet(patch);
  }
});
