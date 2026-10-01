/** 業務画面タブに注入 — クリック記録・フローティングUI・強制キャプチャ */

let recording = false;
let paused = false;
let stepCount = 0;
let voiceListening = false;
let voiceTranscript = '';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;

const PANEL_ID = 'clipit-recorder-panel';
const TOAST_ID = 'clipit-pii-toast';

function sendBg<T extends object>(message: T, onReply?: (res: unknown) => void) {
  chrome.runtime.sendMessage(message, (res) => {
    if (chrome.runtime.lastError) return;
    onReply?.(res);
  });
}

function ensurePanel() {
  if (document.getElementById(PANEL_ID)) return;
  const el = document.createElement('div');
  el.id = PANEL_ID;
  el.innerHTML = `
    <style>
      #${PANEL_ID} {
        position: fixed !important; right: 16px !important; bottom: 16px !important;
        z-index: 2147483646 !important;
        font-family: "Noto Sans JP", system-ui, sans-serif;
        background: #0f172a; color: #f8fafc; border-radius: 14px;
        padding: 12px 14px; box-shadow: 0 8px 32px rgba(0,0,0,.35);
        min-width: 200px; font-size: 13px; border: 1px solid rgba(249,115,22,.4);
        display: none; pointer-events: auto;
      }
      #${PANEL_ID}.active { display: block !important; }
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
        position: fixed !important; left: 50% !important; top: 16px !important;
        transform: translateX(-50%); z-index: 2147483647 !important;
        background: #fef3c7; color: #92400e;
        padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 600;
        box-shadow: 0 4px 16px rgba(0,0,0,.15); display: none;
        max-width: 90vw; text-align: center;
      }
    </style>
    <div class="row"><span class="dot"></span><span id="clipit-status-text">記録中</span></div>
    <div class="row" style="font-size:11px;color:#94a3b8">ステップ <span id="clipit-step-n">0</span> · Alt+Shift+S</div>
    <div class="row" style="font-size:11px;color:#94a3b8;flex-wrap:wrap">
      <button type="button" id="clipit-voice-btn" style="flex:1;background:#1e293b;color:#e2e8f0;border-radius:8px;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;border:none">🎤 音声説明</button>
      <span id="clipit-voice-status" style="font-size:10px;color:#64748b">オフ</span>
    </div>
    <div class="row">
      <button type="button" class="pause" id="clipit-pause-btn">一時停止</button>
      <button type="button" class="stop" id="clipit-stop-btn">停止</button>
    </div>
  `;
  document.documentElement.appendChild(el);

  if (!document.getElementById(TOAST_ID)) {
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.textContent = '個人情報が映っていないか確認してください（入力値は保存しません）';
    document.documentElement.appendChild(toast);
  }

  document.getElementById('clipit-pause-btn')?.addEventListener('click', () => {
    sendBg({ type: 'CLIPIT_PAUSE' });
  });

  document.getElementById('clipit-stop-btn')?.addEventListener('click', () => {
    stopVoiceRecognition();
    sendBg({ type: 'CLIPIT_STOP' });
  });

  document.getElementById('clipit-voice-btn')?.addEventListener('click', () => {
    if (voiceListening) stopVoiceRecognition();
    else startVoiceRecognition();
  });
}

function pushVoiceToBackground() {
  sendBg({ type: 'CLIPIT_VOICE_UPDATE', transcript: voiceTranscript });
}

function startVoiceRecognition() {
  const w = window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) {
    const st = document.getElementById('clipit-voice-status');
    if (st) st.textContent = '非対応';
    return;
  }
  voiceListening = true;
  voiceTranscript = '';
  recognition = new SR();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
    let finalText = '';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    if (finalText) voiceTranscript += finalText;
    pushVoiceToBackground();
    const preview = voiceTranscript + interim;
    const st = document.getElementById('clipit-voice-status');
    if (st) st.textContent = preview.slice(-12) || '聞き取り中…';
  };
  recognition.onend = () => {
    if (voiceListening && recording && !paused) {
      try {
        recognition?.start();
      } catch {
        /* ignore */
      }
    }
  };
  recognition.onerror = () => {
    const st = document.getElementById('clipit-voice-status');
    if (st) st.textContent = 'マイク確認';
  };
  try {
    recognition.start();
    const st = document.getElementById('clipit-voice-status');
    if (st) st.textContent = '聞き取り中…';
    const btn = document.getElementById('clipit-voice-btn');
    if (btn) btn.textContent = '🎤 音声ON';
  } catch {
    voiceListening = false;
  }
}

function stopVoiceRecognition() {
  voiceListening = false;
  try {
    recognition?.stop();
  } catch {
    /* ignore */
  }
  recognition = null;
  const st = document.getElementById('clipit-voice-status');
  if (st) st.textContent = 'オフ';
  const btn = document.getElementById('clipit-voice-btn');
  if (btn) btn.textContent = '🎤 音声説明';
}

function showPanel(active: boolean) {
  ensurePanel();
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.classList.toggle('active', active);
  if (!active) {
    paused = false;
    updateStepLabel();
  }
}

function updateStepLabel() {
  const n = document.getElementById('clipit-step-n');
  if (n) n.textContent = String(stepCount);
  const st = document.getElementById('clipit-status-text');
  if (st) st.textContent = paused ? '一時停止中' : '記録中';
  const btn = document.getElementById('clipit-pause-btn');
  if (btn) btn.textContent = paused ? '再開' : '一時停止';
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

function captureStep(e?: MouseEvent, force = false) {
  const target = (e?.target as HTMLElement) || document.body;
  if (!force && (target.closest(`#${PANEL_ID}`) || target.closest(`#${TOAST_ID}`))) return;

  const clickX = e ? (e.clientX / window.innerWidth) * 100 : 50;
  const clickY = e ? (e.clientY / window.innerHeight) * 100 : 50;
  const label = force
    ? '【強制キャプチャ】'
    : (target.innerText || target.getAttribute('aria-label') || target.tagName).slice(0, 120);
  sendBg(
    {
      type: 'CLIPIT_CLICK',
      step: {
        elementText: label.slice(0, 120),
        elementRole: target.getAttribute('role') || target.tagName.toLowerCase(),
        pageTitle: document.title,
        pageUrl: location.href,
        clickX: Math.round(clickX * 10) / 10,
        clickY: Math.round(clickY * 10) / 10,
      },
    },
    (res) => {
      const r = res as { count?: number } | undefined;
      if (r?.count != null) {
        stepCount = r.count;
        updateStepLabel();
      }
    },
  );
}

function applyRecordingState(msg: { active?: boolean; paused?: boolean; stepCount?: number }) {
  const wasRecording = recording;
  recording = Boolean(msg.active);
  if (typeof msg.paused === 'boolean') paused = msg.paused;
  if (typeof msg.stepCount === 'number') stepCount = msg.stepCount;
  showPanel(recording);
  if (wasRecording && !recording) stopVoiceRecognition();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CLIPIT_RECORDING_STATE') {
    applyRecordingState(msg);
  }
  if (msg.type === 'CLIPIT_FORCE_CAPTURE' && recording && !paused) {
    captureStep(undefined, true);
  }
});

window.setInterval(() => {
  if (!recording) return;
  ensurePanel();
  const panel = document.getElementById(PANEL_ID);
  if (panel && !panel.classList.contains('active')) {
    panel.classList.add('active');
  }
  updateStepLabel();
}, 1000);

function attachListeners() {
  if ((window as Window & { __clipitListeners?: boolean }).__clipitListeners) return;
  (window as Window & { __clipitListeners?: boolean }).__clipitListeners = true;

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
}

attachListeners();

sendBg({ type: 'CLIPIT_GET_STATUS' }, (status) => {
  const s = status as { recording?: boolean; paused?: boolean; stepCount?: number } | undefined;
  if (!s?.recording) return;
  applyRecordingState({
    active: true,
    paused: s.paused,
    stepCount: s.stepCount,
  });
});
