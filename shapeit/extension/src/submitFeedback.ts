export type ExtensionFeedbackPayload = {
  rawText: string;
  pageUrl?: string;
  pageTitle?: string;
  screenshotDataUrl?: string;
  captureMode?: string;
  authorEmail?: string;
  authorDisplayName?: string;
  consoleSnippet?: string;
  elementSelector?: string;
  elementTag?: string;
};

export type RecentSubmission = {
  rawText: string;
  pageUrl: string;
  pageTitle: string;
  submittedAt: string;
};

const RECENT_KEY = "shapeitRecentSubmissions";

async function getApiUrl(): Promise<string> {
  const stored = await chrome.storage.sync.get(["shapeitApiUrl", "shapeitAppBase"]);
  if (typeof stored.shapeitApiUrl === "string" && stored.shapeitApiUrl) {
    return stored.shapeitApiUrl.replace(/\/$/, "");
  }
  const base =
    typeof stored.shapeitAppBase === "string" && stored.shapeitAppBase
      ? stored.shapeitAppBase.replace(/\/$/, "")
      : "https://app.shapeit.shigotoku.com";
  return `${base}/api`;
}

async function getAppBase(): Promise<string> {
  const stored = await chrome.storage.sync.get("shapeitAppBase");
  if (typeof stored.shapeitAppBase === "string" && stored.shapeitAppBase) {
    return stored.shapeitAppBase.replace(/\/$/, "");
  }
  return "https://app.shapeit.shigotoku.com";
}

async function getSession() {
  const stored = await chrome.storage.local.get([
    "shapeitIdToken",
    "shapeitEmail",
    "shapeitDisplayName",
  ]);
  return {
    token: typeof stored.shapeitIdToken === "string" ? stored.shapeitIdToken : "",
    email: typeof stored.shapeitEmail === "string" ? stored.shapeitEmail : "",
    displayName: typeof stored.shapeitDisplayName === "string" ? stored.shapeitDisplayName : "",
  };
}

async function saveRecent(payload: ExtensionFeedbackPayload): Promise<void> {
  const cur = await chrome.storage.local.get(RECENT_KEY);
  const list = Array.isArray(cur[RECENT_KEY]) ? (cur[RECENT_KEY] as RecentSubmission[]) : [];
  list.unshift({
    rawText: payload.rawText,
    pageUrl: payload.pageUrl ?? "",
    pageTitle: payload.pageTitle ?? "",
    submittedAt: new Date().toISOString(),
  });
  await chrome.storage.local.set({ [RECENT_KEY]: list.slice(0, 8) });
}

async function notifySlack(text: string, pageUrl?: string): Promise<void> {
  const stored = await chrome.storage.sync.get("shapeitSlackWebhook");
  const url = typeof stored.shapeitSlackWebhook === "string" ? stored.shapeitSlackWebhook : "";
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `ShapeIt 新規報告: ${text.slice(0, 120)}${pageUrl ? `\n${pageUrl}` : ""}`,
      }),
    });
  } catch {
    /* ignore */
  }
}

function showNotification(title: string, message: string): void {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title,
      message,
    });
  } catch {
    /* ignore */
  }
}

export async function checkDuplicateFeedback(
  rawText: string,
): Promise<{ duplicates: Array<{ id: string; title: string; score: number }> }> {
  const session = await getSession();
  if (!session.token || !rawText.trim()) return { duplicates: [] };
  const apiUrl = await getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/v1/feedback/check-duplicates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ rawText }),
    });
    if (!res.ok) return { duplicates: [] };
    const data = await res.json();
    return { duplicates: Array.isArray(data.duplicates) ? data.duplicates : [] };
  } catch {
    return { duplicates: [] };
  }
}

export async function submitExtensionFeedback(
  payload: ExtensionFeedbackPayload,
): Promise<{ ok: boolean; error?: string; status?: number; feedbackId?: string }> {
  const session = await getSession();
  if (!session.token) {
    return { ok: false, error: "auth", status: 401 };
  }

  const apiUrl = await getApiUrl();
  const body = {
    rawText: payload.rawText,
    pageUrl: payload.pageUrl ?? "",
    pageTitle: payload.pageTitle ?? "",
    screenshotDataUrl: payload.screenshotDataUrl,
    source: "chrome_extension",
    authorEmail: payload.authorEmail || session.email || undefined,
    authorDisplayName: payload.authorDisplayName || session.displayName || undefined,
    captureMode: payload.captureMode ?? "none",
    consoleSnippet: payload.consoleSnippet,
    elementSelector: payload.elementSelector,
    elementTag: payload.elementTag,
    extensionVersion: chrome.runtime.getManifest().version,
    browser: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    os: typeof navigator !== "undefined" ? navigator.platform : undefined,
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  try {
    const res = await fetch(`${apiUrl}/v1/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: typeof errBody.error === "string" ? errBody.error : `HTTP ${res.status}`,
        status: res.status,
      };
    }

    const data = await res.json().catch(() => ({}));
    await saveRecent(payload);
    void notifySlack(payload.rawText, payload.pageUrl);
    showNotification("ShapeIt", "報告を送信しました");
    return { ok: true, feedbackId: data.id ?? data.feedback?.id };
  } catch {
    return { ok: false, error: "network", status: 0 };
  }
}

export async function openInboxTab(): Promise<void> {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/inbox` });
}

export async function getRecentSubmissions(): Promise<RecentSubmission[]> {
  const cur = await chrome.storage.local.get(RECENT_KEY);
  return Array.isArray(cur[RECENT_KEY]) ? (cur[RECENT_KEY] as RecentSubmission[]) : [];
}
