const authEl = document.getElementById("authState");
const pageTitleEl = document.getElementById("pageTitle");
const pageUrlEl = document.getElementById("pageUrl");
const captureHintEl = document.getElementById("captureHint");
const noteEl = document.getElementById("note");
const statusEl = document.getElementById("status");
const submitEl = document.getElementById("submit");
const openLoginEl = document.getElementById("openLogin");
const openAppEl = document.getElementById("openApp");
const capFullEl = document.getElementById("capFull");
const capRegionEl = document.getElementById("capRegion");
const canvasEl = document.getElementById("canvas");
const emptyShotEl = document.getElementById("emptyShot");
const strokeColorEl = document.getElementById("strokeColor");
const undoStrokeEl = document.getElementById("undoStroke");
const toolButtons = Array.from(document.querySelectorAll(".tool"));

let tool = "pen";
let drawing = false;
let start = null;
let snapshot = null;
const history = [];

async function getAppBase() {
  const stored = await chrome.storage.sync.get("shapeitAppBase");
  if (stored.shapeitAppBase) return String(stored.shapeitAppBase).replace(/\/$/, "");
  return "https://app.shapeit.shigotoku.com";
}

async function getApiUrl() {
  const stored = await chrome.storage.sync.get("shapeitApiUrl");
  if (stored.shapeitApiUrl) return String(stored.shapeitApiUrl).replace(/\/$/, "");
  return `${await getAppBase()}/api`;
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

let currentDraft = null;

async function loadDraft() {
  const data = await chrome.storage.session.get("shapeitEditorDraft");
  currentDraft = data.shapeitEditorDraft ?? null;
  return currentDraft;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setBusy(busy) {
  submitEl.disabled = busy;
  capFullEl.disabled = busy;
  capRegionEl.disabled = busy;
}

function drawArrow(ctx, fromX, fromY, toX, toY, color) {
  const head = 12;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function canvasPos(e) {
  const r = canvasEl.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvasEl.width,
    y: ((e.clientY - r.top) / r.height) * canvasEl.height,
  };
}

function pushHistory() {
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  history.push(ctx.getImageData(0, 0, canvasEl.width, canvasEl.height));
  if (history.length > 30) history.shift();
}

function loadImageToCanvas(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(760, img.width);
      const scale = maxW / img.width;
      canvasEl.width = maxW;
      canvasEl.height = Math.round(img.height * scale);
      const ctx = canvasEl.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
      history.length = 0;
      pushHistory();
      canvasEl.style.display = "block";
      emptyShotEl.style.display = "none";
      resolve();
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

async function applyDraft(draft) {
  if (!draft) return;
  pageTitleEl.value = draft.pageTitle || "";
  pageUrlEl.value = draft.pageUrl || "";
  const modeLabel =
    draft.captureMode === "region" ? "範囲選択" : draft.captureMode === "full" ? "全画面" : "なし";
  captureHintEl.textContent = `キャプチャ: ${modeLabel}`;
  if (draft.screenshotDataUrl) {
    await loadImageToCanvas(draft.screenshotDataUrl);
  } else {
    canvasEl.style.display = "none";
    emptyShotEl.style.display = "block";
  }
}

async function startCapture(mode) {
  setBusy(true);
  setStatus(mode === "region" ? "範囲を選択してください（元のタブに戻ります）…" : "キャプチャ中…");
  try {
    const draft = currentDraft || (await loadDraft());
    const payload = { type: "SHAPEIT_START_CAPTURE", mode, openEditor: false };
    if (draft?.sourceTabId) {
      payload.tabId = draft.sourceTabId;
      payload.windowId = draft.sourceWindowId;
    }
    const res = await chrome.runtime.sendMessage(payload);
    if (!res?.ok) {
      setStatus(res?.error || "キャプチャに失敗しました");
      return;
    }
    const nextDraft = await loadDraft();
    await applyDraft(nextDraft);
    setStatus("キャプチャを更新しました");
  } finally {
    setBusy(false);
  }
}

function getAnnotatedDataUrl() {
  if (canvasEl.style.display === "none") return undefined;
  return canvasEl.toDataURL("image/jpeg", 0.9);
}

async function submitReport() {
  const rawText = (noteEl.value || "").trim();
  if (!rawText) {
    setStatus("気づきの内容を入力してください");
    noteEl.focus();
    return;
  }
  let session = await getSession();
  if (!session.token) {
    await refreshAuthFromApp();
    session = await getSession();
  }
  if (!session.token) {
    setStatus("ShapeIt にログインしてから、もう一度お試しください");
    openLoginEl.style.display = "inline-block";
    return;
  }

  setBusy(true);
  setStatus("送信中…");
  try {
    const apiUrl = await getApiUrl();
    const res = await fetch(`${apiUrl}/v1/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        rawText,
        pageUrl: pageUrlEl.value || "",
        pageTitle: pageTitleEl.value || "",
        screenshotDataUrl: getAnnotatedDataUrl(),
        source: "CHROME_EXTENSION",
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `送信に失敗しました (${res.status})`);
    }
    setStatus("ShapeIt に投稿しました");
    noteEl.value = "";
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "送信に失敗しました");
  } finally {
    setBusy(false);
  }
}

canvasEl.addEventListener("pointerdown", (e) => {
  if (canvasEl.style.display === "none") return;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  canvasEl.setPointerCapture(e.pointerId);
  const p = canvasPos(e);
  drawing = true;
  start = p;
  snapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
  const color = strokeColorEl.value;

  if (tool === "text") {
    const text = window.prompt("注釈テキスト");
    if (text) {
      pushHistory();
      ctx.fillStyle = color;
      ctx.font = "bold 18px 'Segoe UI', 'Noto Sans JP', sans-serif";
      ctx.fillText(text, p.x, p.y);
    }
    drawing = false;
    return;
  }
  if (tool === "pen") {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
  }
});

canvasEl.addEventListener("pointermove", (e) => {
  if (!drawing || !start) return;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  const p = canvasPos(e);
  const color = strokeColorEl.value;

  if (tool === "pen") {
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    return;
  }
  if (snapshot) ctx.putImageData(snapshot, 0, 0);
  if (tool === "rect") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
  } else if (tool === "arrow") {
    drawArrow(ctx, start.x, start.y, p.x, p.y, color);
  }
});

function endDraw() {
  if (drawing && tool !== "text") pushHistory();
  drawing = false;
  start = null;
}

canvasEl.addEventListener("pointerup", endDraw);
canvasEl.addEventListener("pointercancel", endDraw);

toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tool = btn.dataset.tool || "pen";
    toolButtons.forEach((b) => b.classList.toggle("active", b === btn));
  });
});

undoStrokeEl.addEventListener("click", () => {
  if (history.length <= 1) return;
  history.pop();
  const prev = history[history.length - 1];
  const ctx = canvasEl.getContext("2d");
  if (!ctx || !prev) return;
  ctx.putImageData(prev, 0, 0);
});

capFullEl.addEventListener("click", () => void startCapture("full"));
capRegionEl.addEventListener("click", () => void startCapture("region"));
submitEl.addEventListener("click", () => void submitReport());
openAppEl.addEventListener("click", async () => {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/capture?ext=1` });
});
openLoginEl.addEventListener("click", async () => {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/login` });
});

noteEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    void submitReport();
  }
});

async function init() {
  let session = await getSession();
  if (!session.token) await refreshAuthFromApp();
  session = await getSession();
  if (session.token) {
    authEl.textContent = session.email ? `${session.email} で投稿します` : "ShapeIt に接続済み";
    openLoginEl.style.display = "none";
  } else {
    authEl.textContent = "先に ShapeIt にログインしてください";
    openLoginEl.style.display = "inline-block";
  }

  const draft = await loadDraft();
  if (draft) {
    await applyDraft(draft);
  } else {
    const metaRes = await chrome.runtime.sendMessage({ type: "SHAPEIT_GET_TAB_META" });
    if (metaRes?.meta) {
      pageTitleEl.value = metaRes.meta.pageTitle || "";
      pageUrlEl.value = metaRes.meta.pageUrl || "";
    }
  }
}

void init();
