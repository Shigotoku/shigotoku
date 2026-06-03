/** 業務画面タブに注入 — クリック記録・フローティングUI・強制キャプチャ */
let recording = false;
let paused = false;
let stepCount = 0;

const PANEL_ID = 'clipit-recorder-panel';
const TOAST_ID = 'clipit-pii-toast';

function ensurePanel() {
  if (document.getElementById(PANEL_ID)) return;
  const el = document.createElement('div');
  el.id = PANEL_ID;
  el.innerHTML = `
    <style>
      #${PANEL_ID} {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
        font-family: "Noto Sans JP", system-ui, sans-serif;
        background: #0f172a; color: #f8fafc; border-radius: 14px;
        padding: 12px 14px; box-shadow: 0 8px 32px rgba(0,0,0,.35);
        min-width: 200px; font-size: 13px; border: 1px solid rgba(249,115,22,.4);
        display: none;
      }
      #${PANEL_ID}.active { display: block; }
      #${PANEL_ID} .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      #${PANEL_ID} .dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; animation: clipit-pulse 1.2s infinite; }
      @keyframes clipit-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      #${PANEL_ID} button {
        flex: 1; border: none; border-radius: 8px; padding: 6px 8px;
        font-size: 12px; font-weight: 600; cursor: pointer;
      }
      #${PANEL_ID} .pause { background: #334155; color: #e2e8f0; }
      #${PANEL_ID} .stop { background: #f97316; color: white; }
      #${TOAST_ID} {
        position: fixed; left: 50%; top: 16px; transform: translateX(-50%);
        z-index: 2147483647; background: #fef3c7; color: #92400e;
        padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 600;
        box-shadow: 0 4px 16px rgba(0,0,0,.15); display: none;
        max-width: 90vw; text-align: center;
      }
    </style>
    <div class="row"><span class="dot"></span><span id="clipit-status-text">記録中</span></div>
    <div class="row" style="font-size:11px;color:#94a3b8">ステップ <span id="clipit-step-n">0</span> · Alt+Shift+S 強制</div>
    <div class="row">
      <button type="button" class="pause" id="clipit-pause-btn">一時停止</button>
      <button type="button" class="stop" id="clipit-stop-btn">停止</button>
    </div>
  `;
  document.documentElement.appendChild(el);

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = '個人情報が映っていないか確認してください（入力値は保存しません）';
  document.documentElement.appendChild(toast);

  document.getElementById('clipit-pause-btn')?.addEventListener('click', () => {
    paused = !paused;
    const btn = document.getElementById('clipit-pause-btn');
    if (btn) btn.textContent = paused ? '再開' : '一時停止';
    const st = document.getElementById('clipit-status-text');
    if (st) st.textContent = paused ? '一時停止中' : '記録中';
  });

  document.getElementById('clipit-stop-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLIPIT_STOP' });
  });
}

function showPanel(active: boolean) {
  ensurePanel();
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.classList.toggle('active', active);
  if (!active) {
    paused = false;
    stepCount = 0;
    updateStepLabel();
  }
}

function updateStepLabel() {
  const n = document.getElementById('clipit-step-n');
  if (n) n.textContent = String(stepCount);
}

function showPiiToast() {
  ensurePanel();
  const t = document.getElementById(TOAST_ID);
  if (!t) return;
  t.style.display = 'block';
  window.setTimeout(() => {
    t.style.display = 'none';
  }, 4000);
}

function captureStep(e?: MouseEvent) {
  const target = (e?.target as HTMLElement) || document.body;
  const clickX = e ? (e.clientX / window.innerWidth) * 100 : 50;
  const clickY = e ? (e.clientY / window.innerHeight) * 100 : 50;
  chrome.runtime.sendMessage({
    type: 'CLIPIT_CLICK',
    step: {
      elementText: (target.innerText || target.getAttribute('aria-label') || target.tagName).slice(0, 120),
      elementRole: target.getAttribute('role') || target.tagName.toLowerCase(),
      pageTitle: document.title,
      pageUrl: location.href,
      clickX: Math.round(clickX * 10) / 10,
      clickY: Math.round(clickY * 10) / 10,
    },
  }, (res) => {
    if (res?.count != null) {
      stepCount = res.count;
      updateStepLabel();
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CLIPIT_RECORDING_STATE') {
    recording = Boolean(msg.active);
    showPanel(recording);
  }
  if (msg.type === 'CLIPIT_FORCE_CAPTURE' && recording && !paused) {
    captureStep();
  }
});

document.addEventListener(
  'click',
  (e) => {
    if (!recording || paused) return;
    captureStep(e);
  },
  true,
);

document.addEventListener(
  'focusin',
  (e) => {
    if (!recording || paused) return;
    const el = e.target as HTMLElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
      showPiiToast();
    }
  },
  true,
);
