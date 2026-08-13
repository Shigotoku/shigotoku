import { auth, getIdToken } from "./firebase";
import { API_URL } from "./urls";

export function publishAppBaseToExtension() {
  try {
    window.postMessage(
      {
        type: "SHAPEIT_APP_BASE",
        origin: window.location.origin,
        apiUrl: API_URL,
      },
      "*",
    );
  } catch {
    /* ignore */
  }
}

export async function publishAuthToExtension() {
  try {
    const token = (await getIdToken()) ?? "";
    const email = auth.currentUser?.email ?? "";
    window.postMessage(
      {
        type: "SHAPEIT_AUTH",
        token,
        email,
        origin: window.location.origin,
        apiUrl: API_URL,
      },
      "*",
    );
  } catch {
    window.postMessage(
      {
        type: "SHAPEIT_AUTH",
        token: "",
        email: "",
        origin: window.location.origin,
        apiUrl: API_URL,
      },
      "*",
    );
  }
}

export async function pingExtension(): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), 400);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "SHAPEIT_EXT_PONG" || e.data?.type === "SHAPEIT_PONG") {
        window.clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve(true);
      }
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ type: "SHAPEIT_EXT_PING" }, "*");
    window.postMessage({ type: "SHAPEIT_PING" }, "*");
  });
}

export interface PendingReport {
  id: string;
  rawText: string;
  pageUrl?: string;
  pageTitle?: string;
  screenshotDataUrl?: string;
}

export async function pullPendingReports(): Promise<PendingReport[]> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve([]), 600);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "SHAPEIT_PENDING_REPORTS" || e.data?.type === "SHAPEIT_PENDING_RESULT") {
        window.clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve((e.data.reports as PendingReport[]) ?? []);
      }
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ type: "SHAPEIT_PULL_REPORTS" }, "*");
    window.postMessage({ type: "SHAPEIT_PULL_PENDING" }, "*");
  });
}

export function ackPendingReports(ids: string[]) {
  window.postMessage({ type: "SHAPEIT_ACK_REPORTS", ids }, "*");
  window.postMessage({ type: "SHAPEIT_ACK_PENDING", ids }, "*");
}

/** 拡張から「今のトークンをください」と言われたときに応答 */
export function bindExtensionAuthRefresh() {
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (event.data?.type === "SHAPEIT_REQUEST_AUTH") {
      void publishAuthToExtension();
    }
  });
}
