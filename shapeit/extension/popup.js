const metaEl = document.getElementById("pageMeta");
const statusEl = document.getElementById("status");
const authEl = document.getElementById("authState");
const loginEl = document.getElementById("login");
const quickNoteEl = document.getElementById("quickNote");
const quickSubmitEl = document.getElementById("quickSubmit");
const fullBtnEl = document.getElementById("fullBtn");
const instantBtnEl = document.getElementById("instantBtn");
const commentBtnEl = document.getElementById("commentBtn");
const annotateBtnEl = document.getElementById("annotateBtn");
const openNoteEditorEl = document.getElementById("openNoteEditor");
const fabToggleEl = document.getElementById("fabToggle");

let activeTabId;
let activeWindowId;
let activePageUrl = "";
let activePageTitle = "";

function setBusy(busy) {
  quickSubmitEl.disabled = busy;
  fullBtnEl.disabled = busy;
  instantBtnEl.disabled = busy;
  commentBtnEl.disabled = busy;
  annotateBtnEl.disabled = busy;
  openNoteEditorEl.disabled = busy;
}

async function getAppBase() {
  const stored = await chrome.storage.sync.get("shapeitAppBase");
  if (stored.shapeitAppBase) return String(stored.shapeitAppBase).replace(/\/$/, "");
  return "https://app.shapeit.shigotoku.com";
}

async function ensureAuth() {
  try {
    await chrome.runtime.sendMessage({ type: "SHAPEIT_ENSURE_AUTH" });
  } catch {
    /* ignore */
  }
  const stored = await chrome.storage.local.get("shapeitIdToken");
  return Boolean(stored.shapeitIdToken);
}

async function submitQuickNote() {
  const rawText = (quickNoteEl.value || "").trim();
  if (!rawText) {
    statusEl.textContent = "コメントを入力してください";
    quickNoteEl.focus();
    return;
  }
  setBusy(true);
  statusEl.textContent = "送信中…";
  try {
    if (!(await ensureAuth())) {
      statusEl.textContent = "先に ShapeIt にログインしてください";
      loginEl.style.display = "block";
      return;
    }
    const res = await chrome.runtime.sendMessage({
      type: "SHAPEIT_SUBMIT_FEEDBACK",
      rawText,
      pageUrl: activePageUrl,
      pageTitle: activePageTitle,
      captureMode: "none",
    });
    if (!res?.ok) {
      statusEl.textContent = res?.queued ? "オフライン保存しました（後で自動送信）" : res?.error || "送信に失敗";
      return;
    }
    quickNoteEl.value = "";
    statusEl.textContent = res?.queued ? "オフライン保存しました" : "送信しました！";
  } finally {
    setBusy(false);
  }
}

function updateFabToggleLabel(hidden) {
  if (!fabToggleEl) return;
  fabToggleEl.textContent = hidden ? "右下ボタンを表示" : "右下ボタンを非表示";
}

async function init() {
  statusEl.textContent = "接続情報を更新中…";
  const fabStored = await chrome.storage.sync.get("shapeitFabHidden");
  updateFabToggleLabel(Boolean(fabStored.shapeitFabHidden));
  const stored = await chrome.storage.local.get(["shapeitIdToken", "shapeitEmail"]);
  if (stored.shapeitIdToken) {
    authEl.textContent = stored.shapeitEmail ? `${stored.shapeitEmail} で投稿します` : "ShapeIt に接続済み";
    loginEl.style.display = "none";
  } else {
    authEl.textContent = "初回のみ ShapeIt にログインしてください";
    loginEl.style.display = "block";
    await ensureAuth();
  }

  const metaRes = await chrome.runtime.sendMessage({ type: "SHAPEIT_GET_TAB_META" });
  const meta = metaRes?.meta;
  activeTabId = meta?.tabId;
  activeWindowId = meta?.windowId;
  activePageUrl = meta?.pageUrl || "";
  activePageTitle = meta?.pageTitle || "";
  if (meta?.pageUrl) {
    metaEl.innerHTML = `<strong>${escapeHtml(meta.pageTitle || "(無題)")}</strong>${escapeHtml(meta.pageUrl)}`;
  } else {
    metaEl.textContent = "このページは URL を取得できません";
  }
  statusEl.textContent = "";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function runAction(type) {
  setBusy(true);
  window.close();
  await chrome.runtime.sendMessage({ type });
}

quickSubmitEl.addEventListener("click", () => void submitQuickNote());
fullBtnEl.addEventListener("click", () => void runAction("SHAPEIT_START_FULL"));
instantBtnEl.addEventListener("click", () => void runAction("SHAPEIT_START_INSTANT"));
commentBtnEl.addEventListener("click", () => void runAction("SHAPEIT_START_COMMENT"));
annotateBtnEl.addEventListener("click", () => void runAction("SHAPEIT_START_ANNOTATE"));
openNoteEditorEl.addEventListener("click", async () => {
  setBusy(true);
  window.close();
  await chrome.runtime.sendMessage({
    type: "SHAPEIT_OPEN_NOTE_EDITOR",
    tabId: activeTabId,
    windowId: activeWindowId,
  });
});
loginEl.addEventListener("click", async () => {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/login?ext=1` });
});

fabToggleEl?.addEventListener("click", async () => {
  const stored = await chrome.storage.sync.get("shapeitFabHidden");
  const hidden = !stored.shapeitFabHidden;
  await chrome.storage.sync.set({ shapeitFabHidden: hidden });
  updateFabToggleLabel(hidden);
  statusEl.textContent = hidden ? "右下ボタンを非表示にしました" : "右下ボタンを表示しました";
});

quickNoteEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    void submitQuickNote();
  }
});

void init();
