/** ShapeIt アプリページ上で拡張 ↔ Web を橋渡し */
import { redactSensitiveDomHints } from "./privacyHints";

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SHAPEIT_PING") {
    window.postMessage({ type: "SHAPEIT_PONG", version: "0.1.0" }, window.location.origin);
    return;
  }

  if (data.type === "SHAPEIT_PRIVACY_HINTS") {
    window.postMessage(
      { type: "SHAPEIT_PRIVACY_HINTS_RESULT", hints: redactSensitiveDomHints() },
      window.location.origin,
    );
    return;
  }

  if (data.type === "SHAPEIT_PULL_PENDING") {
    chrome.runtime.sendMessage({ type: "SHAPEIT_GET_PENDING" }, (res) => {
      window.postMessage(
        {
          type: "SHAPEIT_PENDING_RESULT",
          reports: res?.reports ?? [],
        },
        window.location.origin,
      );
    });
    return;
  }

  if (data.type === "SHAPEIT_ACK_PENDING") {
    chrome.runtime.sendMessage({ type: "SHAPEIT_CLEAR_PENDING", ids: data.ids ?? [] }, () => {
      window.postMessage({ type: "SHAPEIT_ACK_DONE" }, window.location.origin);
    });
  }

  if (data.type === "SHAPEIT_SET_APP_BASE") {
    const base = String(data.base ?? "").replace(/\/$/, "");
    if (base) void chrome.storage.sync.set({ shapeitAppBase: base });
  }
});
