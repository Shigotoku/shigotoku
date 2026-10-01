export interface WebhookConfig {
  enabled: boolean;
  url: string;
  secret: string;
  events: {
    feedback_created: boolean;
    issue_done: boolean;
    invite_sent: boolean;
    weekly_digest: boolean;
  };
}

export interface WebhookLog {
  id: string;
  at: string;
  event: string;
  ok: boolean;
  detail?: string;
}

const CFG = "shapeit:webhook:v1";
const LOG = "shapeit:webhook-log:v1";

const DEFAULT: WebhookConfig = {
  enabled: false,
  url: "",
  secret: "",
  events: { feedback_created: true, issue_done: true, invite_sent: true, weekly_digest: true },
};

export function loadWebhookConfig(): WebhookConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(CFG) || "{}") as Partial<WebhookConfig>;
    return {
      ...DEFAULT,
      ...raw,
      events: { ...DEFAULT.events, ...(raw.events ?? {}) },
    };
  } catch {
    return DEFAULT;
  }
}

export function saveWebhookConfig(patch: Partial<WebhookConfig>): WebhookConfig {
  const cur = loadWebhookConfig();
  const next: WebhookConfig = {
    ...cur,
    ...patch,
    events: { ...cur.events, ...(patch.events ?? {}) },
  };
  localStorage.setItem(CFG, JSON.stringify(next));
  return next;
}

export function listWebhookLogs(): WebhookLog[] {
  try {
    return JSON.parse(localStorage.getItem(LOG) || "[]") as WebhookLog[];
  } catch {
    return [];
  }
}

function pushLog(event: string, ok: boolean, detail?: string) {
  const entry: WebhookLog = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    event,
    ok,
    detail,
  };
  const list = [entry, ...listWebhookLogs()].slice(0, 40);
  localStorage.setItem(LOG, JSON.stringify(list));
}

export async function dispatchSlackWebhook(
  url: string,
  payload: { text: string; blocks?: unknown[] },
): Promise<boolean> {
  if (!url.startsWith("https://")) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    pushLog("slack", res.ok, res.ok ? undefined : `http ${res.status}`);
    return res.ok;
  } catch (err) {
    pushLog("slack", false, err instanceof Error ? err.message : "failed");
    return false;
  }
}

export async function dispatchOutboundWebhook(
  event: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const cfg = loadWebhookConfig();
  if (!cfg.enabled || !cfg.url.startsWith("https://")) {
    pushLog(event, false, "webhook disabled or url empty");
    return false;
  }
  const key = event as keyof WebhookConfig["events"];
  if (cfg.events[key] === false) {
    pushLog(event, false, "event disabled");
    return false;
  }
  const body = JSON.stringify({ event, at: new Date().toISOString(), payload });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-ShapeIt-Event": event,
  };
  if (cfg.secret) {
    const data = new TextEncoder().encode(body);
    const hash = await crypto.subtle.digest("SHA-256", data);
    headers["X-ShapeIt-Signature"] = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  try {
    const res = await fetch(cfg.url, { method: "POST", headers, body });
    pushLog(event, res.ok, res.ok ? undefined : `http ${res.status}`);
    return res.ok;
  } catch (err) {
    pushLog(event, false, err instanceof Error ? err.message : "failed");
    return false;
  }
}
