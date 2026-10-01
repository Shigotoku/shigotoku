/**
 * 全ページ: フローティングボタン + 即時報告オーバーレイ（音声→確認→送信）
 */
import { extensionAlive, sendRuntimeMessage } from "./extensionContext";

const consoleBuffer: string[] = [];

function hookConsole() {
  if ((window as unknown as { __shapeitConsole?: boolean }).__shapeitConsole) return;
  (window as unknown as { __shapeitConsole?: boolean }).__shapeitConsole = true;
  const push = (level: string, args: unknown[]) => {
    const line = `[${level}] ${args
      .map((a) => {
        try {
          return typeof a === "object" ? JSON.stringify(a) : String(a);
        } catch {
          return String(a);
        }
      })
      .join(" ")
      .slice(0, 240)}`;
    consoleBuffer.push(line);
    if (consoleBuffer.length > 25) consoleBuffer.shift();
  };
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    push("error", args);
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    push("warn", args);
    origWarn(...args);
  };
  window.addEventListener("error", (e) => {
    if (e.message) consoleBuffer.push(`[error] ${e.message}`.slice(0, 240));
  });
  window.addEventListener("unhandledrejection", (e) => {
    consoleBuffer.push(`[promise] ${String(e.reason)}`.slice(0, 240));
  });
}

hookConsole();

type InstantPayload = {
  screenshotDataUrl?: string;
  pageUrl: string;
  pageTitle: string;
  captureMode: string;
  elementSelector?: string;
  elementTag?: string;
  commentOnly?: boolean;
  recentText?: string;
};

type DupCandidate = { id: string; title: string; score: number };

let fabRoot: HTMLElement | null = null;
let overlayRoot: HTMLElement | null = null;
let speechRec: SpeechRecognition | null = null;
let speechWanted = false;

function isCapturablePage(): boolean {
  const u = location.href;
  return u.startsWith("http://") || u.startsWith("https://");
}

function isShapeitAppPage(): boolean {
  try {
    const host = location.hostname;
    if (host === "app.shapeit.shigotoku.com") return true;
    if (host === "shigotoku-shapeit-app.web.app") return true;
    if ((host === "localhost" || host === "127.0.0.1") && location.port === "5178") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function injectStyles(shadow: ShadowRoot) {
  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; font-family: "Segoe UI","Noto Sans JP",system-ui,sans-serif; }
    .fab {
      position: fixed; right: 18px; bottom: 18px; z-index: 2147483640;
      width: 52px; height: 52px; border-radius: 999px; border: none; cursor: pointer;
      background: #1f9d8a; color: #fff; box-shadow: 0 8px 24px rgba(31,157,138,.45);
      display: flex; align-items: center; justify-content: center;
    }
    .fab:hover { background: #188f7d; }
    .fab svg { width: 24px; height: 24px; fill: currentColor; }
    .menu {
      position: fixed; right: 18px; bottom: 78px; z-index: 2147483640;
      background: #fff; border-radius: 12px; box-shadow: 0 12px 40px rgba(11,19,32,.2);
      padding: 6px; min-width: 200px; display: none;
    }
    .menu.open { display: block; }
    .menu button {
      display: block; width: 100%; text-align: left; border: none; background: transparent;
      padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #0b1320;
    }
    .menu button:hover { background: #f3f6f4; }
    .menu .sub { font-size: 10px; color: #5b6b7c; font-weight: 400; display: block; margin-top: 2px; }
    .overlay {
      position: fixed; inset: 0; z-index: 2147483645;
      background: rgba(11,19,32,.55); display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .card {
      background: #fff; border-radius: 16px; width: min(440px, 100%); padding: 20px;
      box-shadow: 0 24px 60px rgba(11,19,32,.25);
    }
    .card h2 { margin: 0 0 4px; font-size: 18px; }
    .card .sub { margin: 0 0 14px; font-size: 12px; color: #5b6b7c; }
    .thumb { width: 100%; max-height: 120px; object-fit: contain; border-radius: 8px; border: 1px solid #e5ebe8; background: #f3f6f4; margin-bottom: 12px; }
    textarea {
      width: 100%; min-height: 80px; border: 1px solid #c9d5ce; border-radius: 10px;
      padding: 10px 12px; font-size: 14px; resize: vertical; outline: none;
    }
    textarea:focus { border-color: #1f9d8a; }
    .row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .btn {
      border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 700; cursor: pointer; border: none;
    }
    .btn-primary { background: #1f9d8a; color: #fff; flex: 1; }
    .btn-primary:hover { background: #188f7d; }
    .btn-secondary { background: #fff; color: #0b1320; border: 1px solid #c9d5ce; }
    .btn-mic { background: #f3f6f4; color: #0b1320; border: 1px solid #c9d5ce; }
    .btn-mic.active { background: #e8f6f2; border-color: #1f9d8a; color: #1f9d8a; animation: pulse 1.2s infinite; }
    .warn { margin-top: 10px; padding: 8px 10px; background: #fffbeb; border-radius: 8px; font-size: 11px; color: #92400e; }
    .success { text-align: center; padding: 12px 0; }
    .success .check { width: 64px; height: 64px; line-height: 64px; border-radius: 999px; background: #1f9d8a; color: #fff; font-size: 32px; margin: 0 auto 12px; }
  `;
  shadow.append(style);
}

function setFabVisible(visible: boolean) {
  if (fabRoot) fabRoot.style.display = visible ? "" : "none";
}

function showFabToast(message: string) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    right: "18px",
    bottom: "84px",
    zIndex: "2147483641",
    maxWidth: "280px",
    padding: "10px 14px",
    borderRadius: "10px",
    background: "#0b1320",
    color: "#fff",
    fontSize: "12px",
    lineHeight: "1.5",
    boxShadow: "0 8px 24px rgba(11,19,32,.35)",
    fontFamily: '"Segoe UI","Noto Sans JP",system-ui,sans-serif',
  });
  document.documentElement.append(toast);
  globalThis.setTimeout(() => toast.remove(), 3200);
}

async function hideFab() {
  if (!extensionAlive()) return;
  await chrome.storage.sync.set({ shapeitFabHidden: true });
  setFabVisible(false);
  showFabToast("フローティングボタンを非表示にしました。拡張アイコン →「右下ボタンを表示」で戻せます。");
}

function createFab() {
  if (!isCapturablePage() || isShapeitAppPage() || fabRoot) return;

  fabRoot = document.createElement("div");
  fabRoot.id = "shapeit-fab-host";
  const shadow = fabRoot.attachShadow({ mode: "closed" });
  injectStyles(shadow);

  const menu = document.createElement("div");
  menu.className = "menu";
  menu.innerHTML = `
    <button type="button" data-action="full">全画面を撮って話す<span class="sub">Alt+Shift+G</span></button>
    <button type="button" data-action="instant">範囲を選んで話す<span class="sub">Alt+Shift+S</span></button>
    <button type="button" data-action="element">要素を指定して報告<span class="sub">Marker.io 型</span></button>
    <button type="button" data-action="annotate">範囲を選んで詳しく編集<span class="sub">Alt+Shift+F</span></button>
    <button type="button" data-action="comment">コメントだけ送る<span class="sub">Alt+Shift+C</span></button>
    <button type="button" data-action="hide-fab" style="color:#5b6b7c;font-weight:500">ボタンを非表示にする</button>
  `;

  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "fab";
  fab.title = "ShapeIt に報告（右クリックで非表示）";
  fab.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-6h2Zm0-8h-2V7h2Z"/></svg>';

  fab.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  fab.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.remove("open");
    void hideFab();
  });

  menu.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button[data-action]");
    if (!btn) return;
    menu.classList.remove("open");
    const action = btn.getAttribute("data-action");
    if (action === "hide-fab") {
      void hideFab();
      return;
    }
    if (action === "full") void sendRuntimeMessage({ type: "SHAPEIT_START_FULL" });
    if (action === "instant") void sendRuntimeMessage({ type: "SHAPEIT_START_INSTANT" });
    if (action === "element") void sendRuntimeMessage({ type: "SHAPEIT_START_ELEMENT" });
    if (action === "annotate") void sendRuntimeMessage({ type: "SHAPEIT_START_ANNOTATE" });
    if (action === "comment") void sendRuntimeMessage({ type: "SHAPEIT_START_COMMENT" });
  });

  document.addEventListener("click", () => menu.classList.remove("open"));

  shadow.append(menu, fab);
  document.documentElement.append(fabRoot);

  if (extensionAlive()) {
    void chrome.storage.sync.get("shapeitFabHidden").then((s) => {
      if (s.shapeitFabHidden) setFabVisible(false);
    }).catch(() => {});

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes.shapeitFabHidden) return;
      setFabVisible(!changes.shapeitFabHidden.newValue);
    });
  }
}

function stopSpeech() {
  speechWanted = false;
  if (speechRec) {
    try {
      speechRec.stop();
    } catch {
      /* ignore */
    }
    speechRec = null;
  }
}

function startSpeech(textarea: HTMLTextAreaElement, micBtn: HTMLButtonElement) {
  const Ctor = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
  if (!Ctor) return;

  if (speechRec || speechWanted) {
    stopSpeech();
    micBtn.classList.remove("active");
    return;
  }

  speechWanted = true;
  let base = textarea.value.trim();

  const beginRecognition = () => {
    if (!speechWanted) return;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let finalChunk = "";
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0]?.transcript ?? "";
        if (ev.results[i].isFinal) finalChunk += t;
        else interim += t;
      }
      if (interim) textarea.value = base ? `${base}${interim}` : interim;
      if (finalChunk) {
        base = base ? `${base}${finalChunk}` : finalChunk;
        textarea.value = base;
      }
    };
    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === "aborted" || !speechWanted) return;
      micBtn.classList.remove("active");
      speechWanted = false;
      speechRec = null;
    };
    rec.onend = () => {
      speechRec = null;
      if (speechWanted) {
        globalThis.setTimeout(() => beginRecognition(), 120);
        return;
      }
      micBtn.classList.remove("active");
    };
    try {
      rec.start();
      speechRec = rec;
      micBtn.classList.add("active");
    } catch {
      speechWanted = false;
      micBtn.classList.remove("active");
    }
  };

  beginRecognition();
}

function showInstantOverlay(payload: InstantPayload) {
  closeOverlay();
  stopSpeech();

  overlayRoot = document.createElement("div");
  overlayRoot.id = "shapeit-overlay-host";
  const shadow = overlayRoot.attachShadow({ mode: "closed" });
  injectStyles(shadow);

  const wrap = document.createElement("div");
  wrap.className = "overlay";

  const card = document.createElement("div");
  card.className = "card";

  let step: "input" | "confirm" | "success" = "input";
  let dupWarning = "";

  card.innerHTML = `
    <h2>${payload.commentOnly ? "コメントを送る" : "気づきを話す"}</h2>
    <p class="sub">${payload.commentOnly ? "音声または文字で入力 · 話し終わったら「次へ」" : "範囲選択済み · 話すと文字になります · 終わったら「次へ」"}</p>
    ${payload.screenshotDataUrl ? `<img class="thumb" src="${payload.screenshotDataUrl}" alt="" />` : ""}
    <textarea id="note" placeholder="話すか、ここに入力…">${payload.recentText ?? ""}</textarea>
    <div class="row" id="inputActions">
      <button type="button" class="btn btn-mic" id="micBtn">🎤 音声</button>
      <button type="button" class="btn btn-primary" id="nextBtn">次へ</button>
      <button type="button" class="btn btn-secondary" id="cancelBtn">キャンセル</button>
    </div>
    <div id="dupArea"></div>
  `;

  wrap.append(card);
  shadow.append(wrap);
  document.documentElement.append(overlayRoot);

  const textarea = card.querySelector("#note") as HTMLTextAreaElement;
  const micBtn = card.querySelector("#micBtn") as HTMLButtonElement;
  const nextBtn = card.querySelector("#nextBtn") as HTMLButtonElement;
  const cancelBtn = card.querySelector("#cancelBtn") as HTMLButtonElement;
  const dupArea = card.querySelector("#dupArea") as HTMLDivElement;
  const inputActions = card.querySelector("#inputActions") as HTMLDivElement;

  const goConfirm = async () => {
    const text = textarea.value.trim();
    if (!text) {
      textarea.focus();
      return;
    }
    stopSpeech();
    step = "confirm";
    const dupRes = await sendRuntimeMessage<{ duplicates?: DupCandidate[] }>({
      type: "SHAPEIT_CHECK_DUPLICATES",
      rawText: text,
    });
    if (dupRes?.duplicates?.length) {
      dupWarning = dupRes.duplicates
        .slice(0, 2)
        .map((d: DupCandidate) => `・${d.title}（類似 ${Math.round(d.score * 100)}%）`)
        .join("<br>");
      dupArea.innerHTML = `<div class="warn">似た報告があります:<br>${dupWarning}<br>このまま送信できます。</div>`;
    }
    card.querySelector("h2")!.textContent = "送信しますか？";
    card.querySelector(".sub")!.textContent = "Enter で送信 · Esc で戻る";
    inputActions.innerHTML = `
      <button type="button" class="btn btn-primary" id="sendBtn">送信する</button>
      <button type="button" class="btn btn-secondary" id="backBtn">戻る</button>
    `;
    card.querySelector("#sendBtn")!.addEventListener("click", () => void doSend());
    card.querySelector("#backBtn")!.addEventListener("click", () => location.reload());
  };

  const doSend = async () => {
    const text = textarea.value.trim();
    if (!text) return;
    stopSpeech();
    card.querySelector("h2")!.textContent = "送信中…";
    inputActions.innerHTML = "";

    const res = await sendRuntimeMessage<{
      ok?: boolean;
      queued?: boolean;
      error?: string;
    }>({
      type: "SHAPEIT_SUBMIT_FEEDBACK",
      rawText: text,
      pageUrl: payload.pageUrl || location.href,
      pageTitle: payload.pageTitle || document.title,
      screenshotDataUrl: payload.screenshotDataUrl,
      captureMode: payload.captureMode,
      consoleSnippet: consoleBuffer.slice(-8).join("\n"),
      elementSelector: payload.elementSelector,
      elementTag: payload.elementTag,
    });

    if (!res?.ok) {
      card.querySelector("h2")!.textContent = "送信できませんでした";
      card.querySelector(".sub")!.textContent = res?.error === "auth" ? "ShapeIt にログインしてください" : res?.error || "エラー";
      inputActions.innerHTML = `<button type="button" class="btn btn-secondary" id="closeBtn">閉じる</button>`;
      card.querySelector("#closeBtn")!.addEventListener("click", closeOverlay);
      return;
    }

    step = "success";
    card.innerHTML = `
      <div class="success">
        <div class="check">✓</div>
        <h2>送信しました</h2>
        <p class="sub">ShapeIt に届きました</p>
        <div class="row" style="justify-content:center">
          <button type="button" class="btn btn-primary" id="inboxBtn">受信箱を開く</button>
          <button type="button" class="btn btn-secondary" id="closeOk">閉じる</button>
        </div>
      </div>
    `;
    card.querySelector("#inboxBtn")!.addEventListener("click", () => {
      void sendRuntimeMessage({ type: "SHAPEIT_OPEN_INBOX" });
      closeOverlay();
    });
    card.querySelector("#closeOk")!.addEventListener("click", closeOverlay);
    setTimeout(closeOverlay, 1200);
  };

  micBtn.addEventListener("click", () => startSpeech(textarea, micBtn));
  nextBtn.addEventListener("click", () => void goConfirm());
  cancelBtn.addEventListener("click", closeOverlay);

  wrap.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (step === "confirm") return;
      closeOverlay();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (step === "input") void goConfirm();
      else if (step === "confirm") void doSend();
    }
  });

  textarea.focus();
  if (!payload.commentOnly) {
    globalThis.setTimeout(() => startSpeech(textarea, micBtn), 300);
  }
}

function closeOverlay() {
  stopSpeech();
  overlayRoot?.remove();
  overlayRoot = null;
}

if (extensionAlive()) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!extensionAlive()) return false;
    if (msg?.type === "SHAPEIT_SHOW_INSTANT_OVERLAY") {
      showInstantOverlay(msg.payload as InstantPayload);
      try {
        sendResponse({ ok: true });
      } catch {
        /* ignore */
      }
      return true;
    }
    if (msg?.type === "SHAPEIT_HIDE_OVERLAY") {
      closeOverlay();
      try {
        sendResponse({ ok: true });
      } catch {
        /* ignore */
      }
      return true;
    }
    return false;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createFab);
  } else {
    createFab();
  }
}
