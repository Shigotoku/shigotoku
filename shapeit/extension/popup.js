const noteEl = document.getElementById("note");
const metaEl = document.getElementById("pageMeta");
const previewEl = document.getElementById("preview");
const statusEl = document.getElementById("status");
const submitEl = document.getElementById("submit");
const submitOnlyEl = document.getElementById("submitOnly");

let cap = { pageUrl: "", pageTitle: "", screenshotDataUrl: undefined };

function setBusy(busy) {
  submitEl.disabled = busy;
  submitOnlyEl.disabled = busy;
}

async function init() {
  statusEl.textContent = "画面をキャプチャ中…";
  const res = await chrome.runtime.sendMessage({ type: "SHAPEIT_CAPTURE_NOW" });
  if (!res?.ok || !res.cap) {
    statusEl.textContent = "このページはキャプチャできません（chrome:// など）";
    return;
  }
  cap = res.cap;
  metaEl.textContent = `${cap.pageTitle || "(無題)"}\n${cap.pageUrl || ""}`;
  if (cap.screenshotDataUrl) {
    previewEl.src = cap.screenshotDataUrl;
    previewEl.style.display = "block";
  }
  statusEl.textContent = "内容を書いて報告してください（必須はコメントのみ）";
  noteEl.focus();
}

async function getAppBase() {
  const stored = await chrome.storage.sync.get("shapeitAppBase");
  if (stored.shapeitAppBase) return String(stored.shapeitAppBase).replace(/\/$/, "");
  // 本番 Hosting（カスタムドメイン前）→ ローカル
  return "https://shigotoku-shapeit-app.web.app";
}

async function submit(openApp) {
  const rawText = (noteEl.value || "").trim();
  if (!rawText) {
    statusEl.textContent = "気づきの内容を入力してください";
    noteEl.focus();
    return;
  }
  setBusy(true);
  statusEl.textContent = "送信中…";
  const report = {
    id: crypto.randomUUID(),
    rawText,
    pageUrl: cap.pageUrl || "",
    pageTitle: cap.pageTitle || "",
    screenshotDataUrl: cap.screenshotDataUrl,
    createdAt: new Date().toISOString(),
    source: "chrome_extension",
  };
  await chrome.runtime.sendMessage({ type: "SHAPEIT_ENQUEUE", report });
  if (openApp) {
    const base = await getAppBase();
    await chrome.tabs.create({ url: `${base}/capture?ext=1` });
  }
  statusEl.textContent = openApp ? "ShapeIt を開きました" : "報告キューに追加しました";
  noteEl.value = "";
  setBusy(false);
  if (openApp) window.close();
}

submitEl.addEventListener("click", () => void submit(true));
submitOnlyEl.addEventListener("click", () => void submit(false));
noteEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    void submit(true);
  }
});

void init();
