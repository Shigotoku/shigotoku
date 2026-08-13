const metaEl = document.getElementById("pageMeta");
const statusEl = document.getElementById("status");
const authEl = document.getElementById("authState");
const loginEl = document.getElementById("login");
const openEditorEl = document.getElementById("openEditor");
const capFullEl = document.getElementById("capFull");
const capRegionEl = document.getElementById("capRegion");

function setBusy(busy) {
  openEditorEl.disabled = busy;
  capFullEl.disabled = busy;
  capRegionEl.disabled = busy;
}

async function getAppBase() {
  const stored = await chrome.storage.sync.get("shapeitAppBase");
  if (stored.shapeitAppBase) return String(stored.shapeitAppBase).replace(/\/$/, "");
  return "https://app.shapeit.shigotoku.com";
}

async function getSession() {
  const stored = await chrome.storage.local.get(["shapeitIdToken", "shapeitEmail", "shapeitTokenAt"]);
  const token = typeof stored.shapeitIdToken === "string" ? stored.shapeitIdToken : "";
  const email = typeof stored.shapeitEmail === "string" ? stored.shapeitEmail : "";
  const at = Number(stored.shapeitTokenAt || 0);
  const fresh = token && Date.now() - at < 50 * 60 * 1000;
  return { token: fresh ? token : "", email };
}

async function refreshAuthFromApp() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "SHAPEIT_REFRESH_AUTH" });
    if (!res?.ok) return false;
    await new Promise((r) => setTimeout(r, 600));
    return Boolean((await getSession()).token);
  } catch {
    return false;
  }
}

async function startCapture(mode) {
  setBusy(true);
  statusEl.textContent = mode === "region" ? "範囲を選択…" : "キャプチャ中…";
  try {
    const res = await chrome.runtime.sendMessage({ type: "SHAPEIT_START_CAPTURE", mode, openEditor: true });
    if (!res?.ok) {
      statusEl.textContent = "キャプチャできません（chrome:// などは不可）";
      return;
    }
    window.close();
  } finally {
    setBusy(false);
  }
}

async function init() {
  let session = await getSession();
  if (!session.token) {
    statusEl.textContent = "接続情報を更新中…";
    await refreshAuthFromApp();
    session = await getSession();
  }
  if (session.token) {
    authEl.textContent = session.email ? `${session.email} で投稿します` : "ShapeIt に接続済み";
    loginEl.style.display = "none";
  } else {
    authEl.textContent = "先に ShapeIt にログインしてください（登録時と同じ方法で）";
    loginEl.style.display = "block";
  }

  const metaRes = await chrome.runtime.sendMessage({ type: "SHAPEIT_GET_TAB_META" });
  const meta = metaRes?.meta;
  if (meta?.pageUrl) {
    metaEl.innerHTML = `<strong>${escapeHtml(meta.pageTitle || "(無題)")}</strong>${escapeHtml(meta.pageUrl)}`;
  } else {
    metaEl.textContent = "このページは URL を取得できません";
  }
  statusEl.textContent = "キャプチャ方法を選ぶか、編集画面を開いてください";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

openEditorEl.addEventListener("click", () => void startCapture("full"));
capFullEl.addEventListener("click", () => void startCapture("full"));
capRegionEl.addEventListener("click", () => void startCapture("region"));
loginEl.addEventListener("click", async () => {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/login` });
});

void init();
