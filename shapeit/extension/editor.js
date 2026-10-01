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
const successOverlayEl = document.getElementById("successOverlay");
const noteMicEl = document.getElementById("noteMic");
const textAnnotModalEl = document.getElementById("textAnnotModal");
const textAnnotInputEl = document.getElementById("textAnnotInput");
const textAnnotMicEl = document.getElementById("textAnnotMic");
const textAnnotOkEl = document.getElementById("textAnnotOk");
const textAnnotCancelEl = document.getElementById("textAnnotCancel");
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

const TOKEN_STALE_MS = 45 * 60 * 1000;

async function getSession() {
  const stored = await chrome.storage.local.get([
    "shapeitIdToken",
    "shapeitEmail",
    "shapeitDisplayName",
    "shapeitTokenAt",
  ]);
  const token = typeof stored.shapeitIdToken === "string" ? stored.shapeitIdToken : "";
  const email = typeof stored.shapeitEmail === "string" ? stored.shapeitEmail : "";
  const displayName =
    typeof stored.shapeitDisplayName === "string" ? stored.shapeitDisplayName : "";
  return { token, email, displayName };
}

async function isTokenStale() {
  const stored = await chrome.storage.local.get(["shapeitIdToken", "shapeitTokenAt"]);
  const token = typeof stored.shapeitIdToken === "string" ? stored.shapeitIdToken : "";
  const at = Number(stored.shapeitTokenAt || 0);
  return !token || Date.now() - at >= TOKEN_STALE_MS;
}

async function ensureAuth() {
  const session = await getSession();
  if (session.token && !(await isTokenStale())) return session;
  try {
    await chrome.runtime.sendMessage({ type: "SHAPEIT_ENSURE_AUTH" });
  } catch {
    /* ignore */
  }
  return await getSession();
}

function getCanvasContext() {
  return canvasEl.getContext("2d", { willReadFrequently: true });
}

function collectClientContext() {
  const draft = currentDraft;
  return {
    browser: navigator.userAgent,
    os: navigator.platform,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    extensionVersion: (() => {
      try {
        return chrome.runtime?.getManifest?.()?.version ?? "";
      } catch {
        return "";
      }
    })(),
    captureMode: draft?.captureMode ?? "none",
    referrer: document.referrer || undefined,
  };
}

async function refreshAuthFromApp() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "SHAPEIT_ENSURE_AUTH" });
    return Boolean(res?.ok && (await getSession()).token);
  } catch {
    return false;
  }
}

let currentDraft = null;
let pendingTextAnnot = null;
let activeSpeechRec = null;
let speechTargetKind = null;
let speechBaseText = "";
let speechUserStopped = false;

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function setMicActive(active) {
  noteMicEl?.classList.toggle("mic-btn--active", active && speechTargetKind === "note");
  textAnnotMicEl?.classList.toggle("mic-btn--active", active && speechTargetKind === "text");
  if (noteMicEl) {
    const label = noteMicEl.querySelector(".mic-label");
    if (label) label.textContent = active && speechTargetKind === "note" ? "聞き取り中…" : "音声入力";
  }
}

function stopSpeech() {
  speechUserStopped = true;
  if (activeSpeechRec) {
    try {
      activeSpeechRec.stop();
    } catch {
      /* ignore */
    }
    activeSpeechRec = null;
  }
  speechTargetKind = null;
  setMicActive(false);
}

function composeSpeechText(base, committed, interim) {
  const main = committed || base;
  if (!interim) return main;
  return main ? `${main}${interim}` : interim;
}

function startSpeechForTarget(kind, getBaseText, setText) {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    setStatus("この環境では音声認識に対応していません");
    return false;
  }

  if (activeSpeechRec && speechTargetKind === kind) {
    stopSpeech();
    setStatus("");
    return true;
  }

  stopSpeech();
  speechUserStopped = false;
  speechTargetKind = kind;
  speechBaseText = getBaseText().trim();
  let committed = speechBaseText;

  const beginRecognition = () => {
    if (speechUserStopped || speechTargetKind !== kind) return;

    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let finalChunk = "";
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0]?.transcript ?? "";
        if (ev.results[i].isFinal) finalChunk += t;
        else interim += t;
      }
      if (interim) setText(composeSpeechText(speechBaseText, committed, interim));
      if (finalChunk) {
        committed = committed ? `${committed}${finalChunk}` : finalChunk;
        setText(committed);
      }
    };
    rec.onerror = (ev) => {
      const code = ev.error || "error";
      if (code === "aborted" || speechUserStopped) return;
      stopSpeech();
      if (code === "not-allowed") setStatus("マイクの許可が必要です");
      else if (code === "network") setStatus("音声認識にネットワーク接続が必要です");
      else setStatus("音声認識に失敗しました");
    };
    rec.onend = () => {
      activeSpeechRec = null;
      if (!speechUserStopped && speechTargetKind === kind) {
        setTimeout(() => beginRecognition(), 120);
        return;
      }
      speechTargetKind = null;
      setMicActive(false);
    };

    try {
      rec.start();
    } catch {
      stopSpeech();
      setStatus("音声認識を開始できませんでした");
      return;
    }

    activeSpeechRec = rec;
    setMicActive(true);
    setStatus("聞いています…（もう一度押すと停止）");
  };

  beginRecognition();
  return true;
}

function toggleNoteMic() {
  startSpeechForTarget(
    "note",
    () => noteEl.value,
    (text) => {
      noteEl.value = text;
    },
  );
}

function toggleTextAnnotMic() {
  startSpeechForTarget(
    "text",
    () => textAnnotInputEl.value,
    (text) => {
      textAnnotInputEl.value = text;
    },
  );
}

function showTextAnnotModal(x, y, color) {
  pendingTextAnnot = { x, y, color };
  if (!textAnnotModalEl || !textAnnotInputEl) return;
  textAnnotInputEl.value = "";
  textAnnotModalEl.hidden = false;
  textAnnotInputEl.focus();
}

function hideTextAnnotModal() {
  stopSpeech();
  pendingTextAnnot = null;
  if (textAnnotModalEl) textAnnotModalEl.hidden = true;
  if (textAnnotInputEl) textAnnotInputEl.value = "";
}

function commitTextAnnot() {
  const text = (textAnnotInputEl?.value || "").trim();
  const pending = pendingTextAnnot;
  hideTextAnnotModal();
  if (!text || !pending) return;
  const ctx = getCanvasContext();
  if (!ctx) return;
  pushHistory();
  ctx.fillStyle = pending.color;
  ctx.font = "bold 18px 'Segoe UI', 'Noto Sans JP', sans-serif";
  ctx.fillText(text, pending.x, pending.y);
}

async function loadDraft() {
  const data = await chrome.storage.session.get("shapeitEditorDraft");
  currentDraft = data.shapeitEditorDraft ?? null;
  return currentDraft;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(1175, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
    window.setTimeout(() => void ctx.close(), 500);
  } catch {
    /* ignore */
  }
}

let successOverlayTimer = null;

function showSuccessOverlay() {
  if (!successOverlayEl) return;
  successOverlayEl.hidden = false;
  playSuccessChime();
  if (successOverlayTimer) window.clearTimeout(successOverlayTimer);
  successOverlayTimer = window.setTimeout(() => {
    successOverlayEl.hidden = true;
    successOverlayTimer = null;
  }, 800);
}

function setBusy(busy) {
  submitEl.disabled = busy;
  capRegionEl.disabled = busy;
  if (capFullEl) capFullEl.disabled = busy;
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
  const ctx = getCanvasContext();
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
      const ctx = getCanvasContext();
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

  let authSession = await ensureAuth();
  if (!authSession?.token) {
    setStatus("初回のみ Google で ShapeIt に接続してください");
    openLoginEl.style.display = "inline-block";
    return;
  }

  setBusy(true);
  setStatus("送信中…");
  try {
    const apiUrl = await getApiUrl();
    const screenshotDataUrl = getAnnotatedDataUrl();
    const body = {
      rawText,
      pageUrl: pageUrlEl.value || "",
      pageTitle: pageTitleEl.value || "",
      screenshotDataUrl,
      source: "chrome_extension",
      authorEmail: authSession.email || undefined,
      authorDisplayName: authSession.displayName || undefined,
      ...collectClientContext(),
    };

    async function postWithToken(token) {
      return fetch(`${apiUrl}/v1/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    }

    let res = await postWithToken(authSession.token);
    if (res.status === 401) {
      await refreshAuthFromApp();
      authSession = await getSession();
      if (authSession.token) res = await postWithToken(authSession.token);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `送信に失敗しました (${res.status})`);
    }
    showSuccessOverlay();
    setStatus("ShapeIt に投稿しました");
    stopSpeech();
    noteEl.value = "";
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "送信に失敗しました");
  } finally {
    setBusy(false);
  }
}

canvasEl.addEventListener("pointerdown", (e) => {
  if (canvasEl.style.display === "none") return;
  const ctx = getCanvasContext();
  if (!ctx) return;
  canvasEl.setPointerCapture(e.pointerId);
  const p = canvasPos(e);
  drawing = true;
  start = p;
  snapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
  const color = strokeColorEl.value;

  if (tool === "text") {
    drawing = false;
    start = null;
    try {
      canvasEl.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    showTextAnnotModal(p.x, p.y, color);
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
  const ctx = getCanvasContext();
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
  const ctx = getCanvasContext();
  if (!ctx || !prev) return;
  ctx.putImageData(prev, 0, 0);
});

capRegionEl.addEventListener("click", () => void startCapture("region"));
if (capFullEl) capFullEl.addEventListener("click", () => void startCapture("full"));
submitEl.addEventListener("click", () => void submitReport());
openAppEl.addEventListener("click", async () => {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/capture?ext=1` });
});
openLoginEl.addEventListener("click", async () => {
  const base = await getAppBase();
  await chrome.tabs.create({ url: `${base}/login?ext=1` });
});

noteEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    void submitReport();
  }
});

noteMicEl?.addEventListener("click", () => toggleNoteMic());
textAnnotMicEl?.addEventListener("click", () => toggleTextAnnotMic());
textAnnotOkEl?.addEventListener("click", () => commitTextAnnot());
textAnnotCancelEl?.addEventListener("click", () => hideTextAnnotModal());
textAnnotInputEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    commitTextAnnot();
  } else if (e.key === "Escape") {
    hideTextAnnotModal();
  }
});

async function init() {
  const authSession = await ensureAuth();
  if (authSession?.token) {
    authEl.textContent = authSession.email ? `${authSession.email} で投稿します` : "ShapeIt に接続済み";
    openLoginEl.style.display = "none";
  } else {
    authEl.textContent = "初回のみ Google で ShapeIt に接続してください";
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
