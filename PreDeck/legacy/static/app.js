/* ========================================================
   プレゼン練習アプリ - フロントエンドロジック
   ======================================================== */

// ============================================================
// アプリ状態
// ============================================================

const state = {
  currentScreen: 'login',   // 'login' | 'home' | 'work'
  currentStep: 1,           // 1〜5

  // セッション
  session: null,            // 現在のセッションオブジェクト
  targetType: 'general',    // 発表目的
  targetDuration: 0,        // 目標秒数（0=制限なし）

  // スライド
  slides: [],               // スライド画像ファイル名の配列
  currentSlide: 0,          // 0-indexed

  // 録音
  mediaRecorder: null,
  mediaStream: null,        // マイクストリーム（停止時に解放するため保持）
  audioChunks: [],
  isRecording: false,
  recordingStartTime: null,
  timerInterval: null,
  slideTimings: [],         // [{ slide: n, time: seconds }]

  // リアルタイム文字起こし（録音中ログ用、永続化しない）
  chunkRecorder: null,
  chunkRecorderTimer: null,
  chunkRecorderMime: '',
  chunkRecorderChunks: [],
  chunkRecorderStartElapsed: 0,
  liveTranscripts: [],      // [{ time: seconds, text: string }]
  liveTranscriptDisabled: false, // バックエンドが503を返したら以降スキップ

  // 音量メーター
  audioContext: null,
  analyser: null,
  volumeInterval: null,

  // 文字起こし
  transcriptResult: null,
  originalTranscript: '',   // フィラー解析用の元テキスト
  transcriptsBySlide: {},   // Web Speech APIで取得したスライドごとのテキスト {slideIdx: text}
  speechRecognition: null,  // Web Speech API インスタンス

  // AI改善スクリプト
  currentScript: '',
  previousTranscript: '',   // 差分表示用（生テキスト）
  improvedBySlide: {},      // スライドごとのAI改善結果 {slideIdx: text}
  transcriptBySlide: {},    // {slideIdx: text} AI完了後に比例分割で生成（旧実装用）

  // イテレーション
  iteration: 1,

  // 言語モード
  presentationLang: 'ja',    // 'ja' | 'en'
  translationStyle: 'formal', // 'formal' | 'casual' | 'academic' | 'accented'
  translatedTranscript: '',   // 英語翻訳済みテキスト
};

/** 別ウィンドウ「プレゼン画面」とのスライド同期（同一オリジン・BroadcastChannel） */
const PRESENTER_BC_BASE_NAME = 'prezdeck-presenter-v1';
const PRESENTER_BC_INSTANCE_ID = (() => {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
  } catch (_) {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
})();
const PRESENTER_BC_NAME = `${PRESENTER_BC_BASE_NAME}-${PRESENTER_BC_INSTANCE_ID}`;
let presenterBC = null;

// ============================================================
// 設定（localStorage）
// ============================================================

let cfg = {
  // Strict Local Mode を既定とし、クラウドAPIは明示opt-in必須
  transcribeMethod: 'local',
  // ② 録音中リアルタイム文字起こし用エンジン
  //   'faster'（推奨・約4倍速）/ 'openai'（公式・旧来）/ 'off'（リアルタイムを使わない）
  realtimeEngine: 'faster',
  // ③ 録音後の原稿文字起こし用エンジン
  //   'faster'（推奨・約4倍速）/ 'openai'（公式・旧来）
  finalEngine: 'faster',
  language: 'ja',
  whisperModel: 'base',
  aiMethod: 'ollama',          // 既定はローカル（Ollama）
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  ollamaModel: 'qwen3:8b',
  // クラウド送信の明示的な同意（送信先・送信データ・保存方針・課金・解除方法を表示後に true）
  cloudConsent: false,
  cloudConsentAt: '',          // 同意した日時（ISO8601）
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('prezApp_cfg');
    if (saved) cfg = { ...cfg, ...JSON.parse(saved) };
    // 旧 cfg.localEngine が残っていれば両方に移行
    if (cfg.localEngine && (!cfg.finalEngine || !cfg.realtimeEngine)) {
      if (!cfg.finalEngine) cfg.finalEngine = cfg.localEngine;
      if (!cfg.realtimeEngine) cfg.realtimeEngine = cfg.localEngine;
    }
    // フォールバック
    if (!cfg.finalEngine) cfg.finalEngine = 'faster';
    if (!cfg.realtimeEngine) cfg.realtimeEngine = 'faster';
  } catch (_) {}
}

function saveSettings() {
  const newTranscribe = document.getElementById('cfg-transcribe-method').value;
  const newAi         = document.getElementById('cfg-ai-method').value;

  // クラウドAPIを使う設定に変更しようとしている場合は同意を必須化
  const cloudUsedNow = (newTranscribe === 'api') || (newAi === 'openai');
  if (cloudUsedNow && !cfg.cloudConsent) {
    requireCloudConsent(newAi === 'openai' ? 'llm' : 'asr', () => {
      // 同意拒否時：ローカルに戻して保存
      cfg.transcribeMethod = 'local';
      cfg.aiMethod         = 'ollama';
      document.getElementById('cfg-transcribe-method').value = 'local';
      document.getElementById('cfg-ai-method').value         = 'ollama';
      _persistSettingsAndClose();
    }, () => {
      // 同意得られた→そのまま保存
      cfg.transcribeMethod = newTranscribe;
      cfg.aiMethod         = newAi;
      _persistSettingsAndClose();
    });
    return;
  }

  cfg.transcribeMethod = newTranscribe;
  cfg.aiMethod         = newAi;
  _persistSettingsAndClose();
}

function _persistSettingsAndClose() {
  cfg.language         = document.getElementById('cfg-language').value;
  cfg.whisperModel     = document.getElementById('cfg-whisper-model').value;
  const finEl = document.getElementById('cfg-final-engine');
  const rtEl  = document.getElementById('cfg-realtime-engine');
  if (finEl) cfg.finalEngine    = finEl.value;
  if (rtEl)  cfg.realtimeEngine = rtEl.value;
  cfg.openaiKey        = document.getElementById('cfg-openai-key').value;
  cfg.openaiModel      = document.getElementById('cfg-openai-model').value;
  cfg.ollamaModel      = document.getElementById('cfg-ollama-model').value;
  localStorage.setItem('prezApp_cfg', JSON.stringify(cfg));
  updateStrictLocalBadge();
  updateSettingsStrictStatus();
  closeSettings();
  showToast('設定を保存しました ✓', 'success');
}

// ============================================================
// Strict Local Mode / クラウド同意（M-002）
// ============================================================

/**
 * クラウド送信が必要な場面で呼び出す。
 * - 既に同意済みなら何もしない（onApproved を即実行）
 * - 未同意ならモーダルを開き、ユーザーの選択で onDeclined / onApproved を呼ぶ
 */
function requireCloudConsent(target /* 'asr' | 'llm' */, onDeclined, onApproved) {
  if (cfg.cloudConsent) {
    if (onApproved) onApproved();
    return true;
  }
  openCloudConsentModal(target, onDeclined, onApproved);
  return false;
}

let _consentCallbacks = { onDeclined: null, onApproved: null };

function openCloudConsentModal(target, onDeclined, onApproved) {
  _consentCallbacks.onDeclined = onDeclined || null;
  _consentCallbacks.onApproved = onApproved || null;
  const titleEl = document.getElementById('consent-target-name');
  if (titleEl) {
    titleEl.textContent = target === 'asr'
      ? 'OpenAI Whisper API（クラウド文字起こし）'
      : 'OpenAI Chat API（クラウド原稿改善）';
  }
  const dataEl = document.getElementById('consent-target-data');
  if (dataEl) {
    dataEl.textContent = target === 'asr'
      ? '録音した音声ファイル（WAV形式）'
      : '文字起こしテキスト・原稿テキスト・スライド情報の要約';
  }
  document.getElementById('modal-cloud-consent').style.display = 'flex';
}

function closeCloudConsentModal() {
  document.getElementById('modal-cloud-consent').style.display = 'none';
  _consentCallbacks = { onDeclined: null, onApproved: null };
}

function declineCloudConsent() {
  const cb = _consentCallbacks.onDeclined;
  closeCloudConsentModal();
  showToast('クラウドAPI送信は許可されませんでした。ローカル処理を継続します。', 'info');
  if (cb) cb();
}

function approveCloudConsent() {
  const checkbox = document.getElementById('consent-agree-checkbox');
  if (checkbox && !checkbox.checked) {
    showToast('同意するには上のチェックボックスをONにしてください', 'warning');
    return;
  }
  cfg.cloudConsent = true;
  cfg.cloudConsentAt = new Date().toISOString();
  localStorage.setItem('prezApp_cfg', JSON.stringify(cfg));
  const cb = _consentCallbacks.onApproved;
  closeCloudConsentModal();
  updateStrictLocalBadge();
  showToast('クラウドAPI送信を許可しました（設定画面でいつでも取り消せます）', 'success');
  if (cb) cb();
}

/** クラウド同意を取り消す（設定画面から呼び出す） */
function revokeCloudConsent() {
  cfg.cloudConsent = false;
  cfg.cloudConsentAt = '';
  // ローカルに自動で戻す
  cfg.transcribeMethod = 'local';
  cfg.aiMethod         = 'ollama';
  localStorage.setItem('prezApp_cfg', JSON.stringify(cfg));
  applySettingsToForm();
  updateStrictLocalBadge();
  showToast('クラウド送信許可を取り消しました。すべてローカル処理に戻ります。', 'success');
}

/** トップバー右側の Strict Local Mode バッジを更新 */
function updateStrictLocalBadge() {
  const badge = document.getElementById('strict-local-badge');
  if (!badge) return;
  const cloudInUse = (cfg.transcribeMethod === 'api') || (cfg.aiMethod === 'openai');
  if (cloudInUse && cfg.cloudConsent) {
    badge.textContent = '☁️ クラウド許可中';
    badge.className = 'strict-local-badge cloud-on';
    badge.title = `クラウドAPI送信が有効です（同意日時: ${cfg.cloudConsentAt}）。クリックで取り消し。`;
    badge.onclick = () => {
      if (confirm('クラウド送信許可を取り消し、ローカル処理に戻しますか？')) revokeCloudConsent();
    };
  } else {
    badge.textContent = '🔒 Strict Local';
    badge.className = 'strict-local-badge strict-on';
    badge.title = 'すべてローカル処理。外部送信なし。';
    badge.onclick = null;
  }
}

// ============================================================
// 初期化
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  applySettingsToForm();
  updateStrictLocalBadge();
  loadSessions();
  setupDragDrop();
  setupPresenterBridge();
  setupKeyboardShortcuts();
  setupPresenterScreenSelect();
  setupPresenterPrefetchOnHover();
});

/** ページ離脱時にも保存（タブを閉じる・リロード等） */
window.addEventListener('beforeunload', () => {
  // Step4 編集中ならまず現在スライドの編集内容を反映
  if (typeof commitUserScriptEditsToSlide === 'function') {
    try { commitUserScriptEditsToSlide(); } catch (_) {}
  }
  if (typeof persistScriptStateSync === 'function') persistScriptStateSync();
});
window.addEventListener('pagehide', () => {
  if (typeof commitUserScriptEditsToSlide === 'function') {
    try { commitUserScriptEditsToSlide(); } catch (_) {}
  }
  if (typeof persistScriptStateSync === 'function') persistScriptStateSync();
});

function applySettingsToForm() {
  document.getElementById('cfg-transcribe-method').value = cfg.transcribeMethod;
  document.getElementById('cfg-language').value           = cfg.language;
  document.getElementById('cfg-whisper-model').value      = cfg.whisperModel;
  const finEl = document.getElementById('cfg-final-engine');
  const rtEl  = document.getElementById('cfg-realtime-engine');
  if (finEl) finEl.value = cfg.finalEngine    || 'faster';
  if (rtEl)  rtEl.value  = cfg.realtimeEngine || 'faster';
  document.getElementById('cfg-ai-method').value          = cfg.aiMethod;
  document.getElementById('cfg-openai-key').value         = cfg.openaiKey;
  document.getElementById('cfg-openai-model').value       = cfg.openaiModel;
  document.getElementById('cfg-ollama-model').value       = cfg.ollamaModel;
  onTranscribeMethodChange();
  onAIMethodChange();
}

// ============================================================
// ログイン画面
// ============================================================

function handleLogin() {
  const idInput = document.getElementById('login-id').value.trim();
  const passInput = document.getElementById('login-pass').value.trim();
  const errorEl = document.getElementById('login-error');
  
  if (idInput === 'test' && passInput === 'test') {
    errorEl.style.display = 'none';
    showHome();
  } else {
    errorEl.style.display = 'block';
  }
}

// ============================================================
// ホーム画面
// ============================================================

function showHome() {
  // 作業中セッションの per-slide 原稿を必ず保存してから戻る
  if (state.session) {
    try { commitUserScriptEditsToSlide(); } catch (_) {}
    void persistScriptState();
  }
  switchScreen('home');
  loadSessions();
}

async function loadSessions() {
  const container = document.getElementById('session-list');
  container.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 8px"></div>読み込み中...</div>';

  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();

    if (!sessions.length) {
      container.innerHTML = '<div class="empty-state">セッションがまだありません</div>';
      return;
    }

    container.innerHTML = sessions.map(s => {
      const scoreHtml = s.latest_score != null
        ? `<span class="session-score rank-${(s.latest_rank || 'D').toLowerCase()}">${s.latest_rank}ランク ${s.latest_score}pt</span>`
        : '';
      const isAuto = isAutoTitle(s.title);
      const displayTitle = isAuto
        ? `<span class="session-title-unset">（名前未設定）</span> <span class="session-title-auto">${escHtml(s.title)}</span>`
        : escHtml(s.title || '無題');
      return `
        <div class="session-card" onclick="loadSession('${s.id}')">
          <div class="session-info">
            <div class="session-title">${displayTitle}</div>
            <div class="session-meta">
              更新: ${formatDate(s.updated_at)}
              <span class="session-iterations">${s.iterations}回練習済み</span>
              ${scoreHtml}
            </div>
          </div>
          <div class="session-actions">
            <button class="btn btn-sm btn-ghost" title="名前を変更" onclick="event.stopPropagation(); renameSession('${s.id}', ${JSON.stringify(s.title || '').replace(/"/g, '&quot;')})">✏️</button>
            <button class="btn btn-sm btn-ghost" title="削除" onclick="event.stopPropagation(); deleteSession('${s.id}')">🗑️</button>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty-state">読み込みに失敗しました</div>';
  }
}

async function createNewSession() {
  const title = `セッション ${new Date().toLocaleString('ja-JP')}`;
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const session = await res.json();
    openSession(session);
  } catch (e) {
    showToast('セッション作成に失敗しました', 'error');
  }
}

async function loadSession(id) {
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const session = await res.json();
    openSession(session);
  } catch (e) {
    console.error('[loadSession] error:', e);
    showToast('セッションの読み込みに失敗しました: ' + (e.message || e), 'error');
  }
}

async function deleteSession(id) {
  if (!confirm('このセッションを削除しますか？')) return;
  await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  showToast('削除しました');
  loadSessions();
}

// 自動生成タイトル判定（"セッション 2026/5/14 13:41:12" のような形式）
function isAutoTitle(title) {
  if (!title) return true;
  return /^セッション\s+\d{4}\/\d{1,2}\/\d{1,2}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/.test(title.trim());
}

async function renameSession(id, currentTitle) {
  const suggested = isAutoTitle(currentTitle) ? '' : currentTitle;
  const newTitle = prompt('新しいセッション名を入力してください：', suggested);
  if (newTitle === null) return; // キャンセル
  const trimmed = newTitle.trim();
  if (!trimmed) {
    showToast('セッション名が空のため変更しませんでした', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast('セッション名を変更しました');
    loadSessions();
  } catch (e) {
    showToast('変更に失敗しました: ' + (e.message || e), 'error');
  }
}

function openSession(session) {
  state.session  = session;
  state.slides   = session.slides_pages || [];
  state.currentSlide = 0;
  state.targetType = session.target_type || 'general';
  state.targetDuration = session.target_duration || 0;

  // PPTXファイル情報を復元
  state.pptxOriginalFile = session.pptx_file || null;
  state.hasPptxSource = !!session.pptx_file;

  // ─── per-slide のスクリプト状態を復元 ───
  state.transcriptsBySlide = _normalizeBySlideMap(session.transcripts_by_slide);
  state.improvedBySlide    = _normalizeBySlideMap(session.improved_by_slide);
  state.slideTimings       = Array.isArray(session.slide_timings) ? session.slide_timings : [];

  // 直近イテレーションのデータを復元（per-slideが空のときのフォールバック源）
  const iters = session.iterations || [];
  const lastIter = iters[iters.length - 1] || null;
  state.restoredTranscript  = lastIter?.transcript || '';
  state.restoredImproved    = lastIter?.improved_script || '';
  state.restoredUserScript  = lastIter?.user_script || lastIter?.improved_script || '';

  // iteration（次の練習回）は iterations.length + 1（既存挙動）
  state.iteration = (iters.length || 0) + 1;

  // 全文スクリプト：保存値 > per-slideから組み立て > 直近iterationのimproved
  state.currentScript = session.current_script
    || getFullTranscript()
    || getLatestScript(session);

  // セッション名をフォームに反映（自動生成タイトルなら空にして placeholder を見せる）
  document.getElementById('session-title').value =
    isAutoTitle(session.title) ? '' : (session.title || '');

  // 目的タイプを反映
  document.querySelectorAll('.target-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === state.targetType);
  });

  // 目標時間を反映
  const mins = Math.floor(state.targetDuration / 60);
  const secs = state.targetDuration % 60;
  document.getElementById('target-minutes').value = mins;
  document.getElementById('target-seconds').value = secs;

  // スライドがあれば復元
  if (state.slides.length > 0) {
    showSlideImage(0);
    updateSlideNav();
  } else {
    showUploadArea();
  }

  // 前回の原稿があれば練習ヒント表示
  updatePrevScriptHint();

  switchScreen('work');
  goToStep(state.slides.length > 0 ? 2 : 1);

  // PPTX並列起動ボタン更新
  updatePptxButton();

  // セッション復元ナビ表示
  _updateResumeNav(iters);

  presenterPublishInit();
}

/** JSONで来たキーが文字列でも数値でも扱えるよう、全エントリの空白を除いてからオブジェクトに正規化 */
function _normalizeBySlideMap(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (typeof v === 'string' && v.trim()) out[k] = v;
  }
  return out;
}

/** いずれかのスライドに per-slide 文字おこしがあれば true */
function _hasAnyPerSlideTranscript() {
  return Object.values(state.transcriptsBySlide || {}).some(v => (v || '').trim());
}
/** いずれかのスライドに AI改善原稿があれば true */
function _hasAnyPerSlideImproved() {
  return Object.values(state.improvedBySlide || {}).some(v => (v || '').trim());
}

/** セッション復元ナビゲーションバーの表示・ボタン制御（null安全） */
function _updateResumeNav(iters) {
  const resumeNav = document.getElementById('session-resume-nav');
  if (!resumeNav) return;

  const hasIter        = (iters || []).length > 0;
  const hasTranscripts = _hasAnyPerSlideTranscript();
  const hasImproved    = _hasAnyPerSlideImproved();
  const hasUserScript  = !!state.restoredUserScript || hasImproved;

  const hasData = hasIter || hasTranscripts || hasImproved || !!state.currentScript;
  resumeNav.style.display = hasData ? 'flex' : 'none';

  // data-step 属性でボタンを特定（querySelectorの特殊文字問題を回避）
  const btns = resumeNav.querySelectorAll('[data-resume-step]');
  btns.forEach(btn => {
    const step = parseInt(btn.dataset.resumeStep, 10);
    if (step === 3) {
      btn.style.display = (hasTranscripts || state.restoredTranscript) ? 'inline-flex' : 'none';
    }
    if (step === 4) {
      btn.style.display = (hasTranscripts || hasImproved || state.restoredImproved) ? 'inline-flex' : 'none';
    }
    if (step === 5) {
      btn.style.display = (hasImproved || hasUserScript || state.currentScript) ? 'inline-flex' : 'none';
    }
  });
}

/** セッション復元後、指定ステップへ遷移してデータを注入 */
function resumeGoToStep(step) {
  const hasPerSlideTranscript = _hasAnyPerSlideTranscript();
  const hasPerSlideImproved   = _hasAnyPerSlideImproved();

  if (step === 3) {
    goToStep(3);
    // per-slide があれば優先してスライド別 textarea を描画
    if (hasPerSlideTranscript) {
      renderStep3Transcripts();
    } else if (state.restoredTranscript) {
      const el = document.getElementById('transcript-editable');
      if (el) el.innerText = state.restoredTranscript;
    }
    setTimeout(() => {
      runFillerAnalysis();
      runStumbleAnalysis();
    }, 300);
  } else if (step === 4) {
    // Step3 にも per-slide が反映されているように仕込んでおく
    if (hasPerSlideTranscript) {
      renderStep3Transcripts();
    } else if (state.restoredTranscript) {
      const el = document.getElementById('transcript-editable');
      if (el) el.innerText = state.restoredTranscript;
    }
    state.previousTranscript = state.restoredTranscript
      || Object.values(state.transcriptsBySlide).join('\n');
    // 全文スクリプトを per-slide から再構築（保存済みがあればそれを使う）
    state.currentScript = state.currentScript || getFullTranscript() || state.restoredImproved || '';
    // レガシーセッション（per-slideなし）の場合のみ、AIマーカーで比例分割
    if (!hasPerSlideTranscript && state.restoredTranscript && state.restoredImproved) {
      _buildTranscriptBySlide(state.restoredTranscript, state.restoredImproved);
    }
    goToStep(4);
    // スライド別表示に更新
    updateImproveSlideContent(state.currentSlide);
    _updateAiImproveActionRow();
    if (state.restoredTranscript && state.restoredImproved) {
      updateDiffView(state.restoredTranscript, state.restoredImproved);
    }
    setTimeout(() => runSpeechAnalysis(), 300);
  } else if (step === 5) {
    if (hasPerSlideTranscript) {
      renderStep3Transcripts();
    } else if (state.restoredTranscript) {
      const el = document.getElementById('transcript-editable');
      if (el) el.innerText = state.restoredTranscript;
    }
    // currentScript は goToStep(5) 内で per-slide から再構築される
    if (!state.currentScript) {
      state.currentScript = state.restoredUserScript || state.restoredImproved || '';
    }
    goToStep(5);
  }
}

function getLatestScript(session) {
  const iters = session?.iterations || [];
  if (!iters.length) return '';
  return iters[iters.length - 1]?.improved_script || '';
}

// ============================================================
// 言語モード
// ============================================================

function setLanguageMode(lang) {
  state.presentationLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  // 文字おこし画面の英語翻訳セクション表示制御
  const sec = document.getElementById('translate-section');
  if (sec) sec.style.display = lang === 'en' ? 'block' : 'none';
}

function setTranslationStyle(style) {
  state.translationStyle = style;
  document.querySelectorAll('.style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.style === style);
  });
}

async function requestTranslation() {
  const transcript = document.getElementById('transcript-editable')?.textContent.trim();
  if (!transcript) {
    showToast('文字おこし内容がありません。', 'warning');
    return;
  }
  const statusEl = document.getElementById('translate-status');
  if (statusEl) statusEl.style.display = 'flex';

  const styleMap = {
    formal:   'Professional, polished, business-formal English suitable for investor or executive presentations. No contractions, assertive tone.',
    casual:   'Conversational, friendly English. Use natural contractions (it\'s, we\'ve). Approachable and engaging tone.',
    academic: 'Academic English with precise terminology, passive voice where appropriate, formal citations style, methodology-focused.',
    accented: 'Natural spoken English with personality and flair. Include rhetorical questions, vivid metaphors, charismatic delivery cues.',
  };
  const styleDesc = styleMap[state.translationStyle] || styleMap.formal;

  const prompt = `You are a professional Japanese-to-English presentation translator.

Translate the following Japanese presentation transcript to English.
Style: ${styleDesc}

Requirements:
- Keep slide markers like 【スライド1】 or [Slide 1] if present
- Use natural spoken language rhythm (not stiff writing)
- Culturally ADAPT (not just translate)
- Mark key emphasis with **bold**

Japanese Transcript:
${transcript}

Output ONLY the translated English script.`;

  try {
    let result = '';
    if (cfg.aiMethod === 'openai' && cfg.openaiKey) {
      const res = await fetch('/api/translate-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          style: state.translationStyle,
          api_key: cfg.openaiKey,
          model: cfg.openaiModel,
          use_ollama: false,
          ollama_model: cfg.ollamaModel,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      result = data.translated || '';
    } else if (cfg.aiMethod === 'ollama') {
      const res = await fetch('/api/translate-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          style: state.translationStyle,
          api_key: '',
          model: cfg.openaiModel,
          use_ollama: true,
          ollama_model: cfg.ollamaModel,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      result = data.translated || '';
    } else {
      // APIキーなし：フロントのみで仮翻訳メッセージ
      showToast('翻訳にはOpenAI APIキーまたはOllamaの設定が必要です。', 'warning');
      if (statusEl) statusEl.style.display = 'none';
      return;
    }

    state.translatedTranscript = result;
    // 文字おこし欄に翻訳結果を反映
    const editEl = document.getElementById('transcript-editable');
    if (editEl) editEl.innerText = result;
    if (statusEl) statusEl.style.display = 'none';
    showToast('英語に翻訳しました ✓', 'success');
    // 原稿改善へ進む
    await requestImprovement();
  } catch (e) {
    if (statusEl) statusEl.style.display = 'none';
    showToast(`翻訳エラー: ${e.message}`, 'error');
  }
}

// ============================================================
// ステップ1: 設定保存
// ============================================================

function selectTargetType(btn) {
  document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.targetType = btn.dataset.type;
}

async function saveStep1AndProceed() {
  const inputVal = document.getElementById('session-title').value.trim();
  const title = inputVal
    || (state.session?.title)
    || `セッション ${new Date().toLocaleString('ja-JP')}`;
  const mins = parseInt(document.getElementById('target-minutes').value) || 0;
  const secs = parseInt(document.getElementById('target-seconds').value) || 0;
  state.targetDuration = mins * 60 + secs;

  await saveCurrentSession({
    title,
    target_type: state.targetType,
    target_duration: state.targetDuration,
  });
  if (!isAutoTitle(title)) {
    document.getElementById('session-title').value = title;
  }
  goToStep(2);
}

// セッション名入力欄の onchange ハンドラ（フォーカスアウト等で自動保存）
async function saveSessionTitleFromInput() {
  if (!state.session) return;
  const val = document.getElementById('session-title').value.trim();
  if (!val) return; // 空のままなら既存タイトルを維持
  if (val === state.session.title) return; // 変更なし
  await saveCurrentSession({ title: val });
  showToast('セッション名を保存しました');
}

// ============================================================
// 画面・ステップ切り替え
// ============================================================

function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  state.currentScreen = name;
}

function goToStep(n) {
  // ステップ番号バリデーション
  if (n < 1 || n > 5) return;

  // ステップガード（要件定義書 §5.4）
  if (n === 2 && !state.session && state.slides.length === 0) {
    showToast('先にスライドをセットしてください', 'warning');
    return;
  }
  if (n === 3 && !state._recordedBlob && Object.keys(state.transcriptsBySlide).length === 0 && !state.restoredTranscript) {
    showToast('先に録音を行ってください', 'warning');
    return;
  }
  if (n === 4 && Object.keys(state.transcriptsBySlide).length === 0 && !state.currentScript) {
    showToast('先に文字おこしを行ってください', 'warning');
    return;
  }
  if (n === 5 && !state.currentScript && Object.keys(state.improvedBySlide).length === 0 && Object.keys(state.transcriptsBySlide).length === 0) {
    showToast('先に原稿を作成してください', 'warning');
    return;
  }

  // ステップドット更新
  for (let i = 1; i <= 5; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    dot.classList.remove('active', 'done');
    if (i < n)  dot.classList.add('done');
    if (i === n) dot.classList.add('active');
  }

  // コンテンツ切替
  document.querySelectorAll('.step-content').forEach(el => {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  const active = document.getElementById(`content-${n}`);
  active.style.display = 'block';
  active.classList.add('active');

  state.currentStep = n;

  // ステップごとの初期化
  if (n === 5) {
    // Step4 の #user-script は現在スライド分しか保持していないため、
    // まず現在スライドの編集内容を improvedBySlide に反映してから、
    // 全スライドを 【スライドN】 マーカー付きで結合する
    commitUserScriptEditsToSlide();
    const fullText = getFullTranscript();
    if (fullText) {
      state.currentScript = fullText;
    } else {
      const userText = getUserScriptText();
      if (userText) state.currentScript = userText;
    }
    setupPracticeStep();
    // Step5入場時に最新の per-slide 原稿を保存
    void persistScriptState();
  }
  if (n === 2) setupRecordStep();
  if (n === 3) {
    // 英語モードのとき翻訳セクションを表示
    const sec = document.getElementById('translate-section');
    if (sec) sec.style.display = state.presentationLang === 'en' ? 'block' : 'none';
    // per-slide のデータがあれば、（録音直後でなくても）スライド別 textarea を描画
    if (_hasAnyPerSlideTranscript() &&
        !document.getElementById('slides-transcripts-container')) {
      renderStep3Transcripts();
    }
    // 録音データ or 既存テキストがあれば削除ボタンと分析バーを表示
    const discardArea = document.getElementById('step3-discard-area');
    const analysisBar = document.getElementById('analysis-btn-bar');
    const hasContent = !!(state._recordedBlob || state.restoredTranscript || _hasAnyPerSlideTranscript());
    if (discardArea) discardArea.style.display = hasContent ? 'flex' : 'none';
    if (analysisBar) analysisBar.style.display = hasContent ? 'flex' : 'none';
    // 再スコアボタン表示
    const rescoreBtn = document.getElementById('btn-rescore');
    if (rescoreBtn) rescoreBtn.style.display = state.currentScript ? 'inline-flex' : 'none';
  }
  if (n === 4) {
    // transcript-editableの内容をpreviousTranscriptに同期（未設定の場合）
    const teEl = document.getElementById('transcript-editable');
    const rawTranscript = teEl ? teEl.textContent.trim() : '';
    if (rawTranscript && !state.previousTranscript) {
      state.previousTranscript = rawTranscript;
    }
    // 自分の原稿欄にすぐ表示
    _syncUserScriptFromTranscript();
    // 編集を検知して_userEditedフラグを立てる（1度だけバインド）
    const userEl = document.getElementById('user-script');
    if (userEl && !userEl._inputBound) {
      userEl.addEventListener('input', () => {
        userEl._userEdited = true;
        // 編集内容を per-slide に反映してデバウンス保存
        try { commitUserScriptEditsToSlide(); } catch (_) {}
        persistScriptStateDebounced();
      });
      userEl._inputBound = true;
    }
    // スライド別表示を初期化
    updateImproveSlideContent(state.currentSlide);
    updateLeftPanelScript(state.currentSlide);
    // 再スコアボタンはスクリプトがあるときだけ表示
    const rescoreBtn = document.getElementById('btn-rescore');
    if (rescoreBtn) rescoreBtn.style.display = state.currentScript ? 'inline-flex' : 'none';
    // AI改善済みかどうかでボタン表示を切り替え
    _updateAiImproveActionRow();
  }
}

// ============================================================
// スライド管理
// ============================================================

function setupDragDrop() {
  const viewer = document.getElementById('slide-viewer');
  viewer.addEventListener('dragover', e => {
    e.preventDefault();
    document.getElementById('upload-area')?.classList.add('drag-over');
  });
  viewer.addEventListener('dragleave', () => {
    document.getElementById('upload-area')?.classList.remove('drag-over');
  });
  viewer.addEventListener('drop', e => {
    e.preventDefault();
    document.getElementById('upload-area')?.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processSlideFile(file);
  });
}

function handleSlideUpload(event) {
  const file = event.target.files[0];
  if (file) processSlideFile(file);
}

async function processSlideFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'pptx', 'ppt'];
  if (!allowed.includes(ext)) {
    showToast('PDF / PNG / JPG / PPTX ファイルを選択してください', 'error');
    return;
  }

  showConverting(true);

  // PPTXの場合はヒント表示
  if (['pptx', 'ppt'].includes(ext)) {
    showToast('PowerPointを変換中... (しばらくお待ちください)', 'info');
    const lbl = document.getElementById('slide-converting-label');
    if (lbl) lbl.textContent = 'PowerPoint変換中...';
  }

  // アップロード
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload-slides', { method: 'POST', body: formData });
    if (!res.ok) {
      const errText = await res.text();
      // PPTXで変換失敗した場合、わかりやすいメッセージ
      if (['pptx', 'ppt'].includes(ext)) {
        throw new Error('PowerPointの変換に失敗しました。PDFに変換してからアップロードしてください。\n（PowerPointでファイルを開き「名前を付けて保存」→PDF を選択）');
      }
      throw new Error(errText);
    }
    const data = await res.json();

    // 元のPPTXファイル名を記録（並列起動ボタン用）
    const isPptx = ['pptx', 'ppt'].includes(ext);
    if (isPptx) {
      // アップロードされた元ファイルはサーバー側で同名で保存されているので
      // converted_from フラグがある場合、元ファイルのパスを別途記録
      state.pptxOriginalFile = data.pptx_original || null;
      // 実際はアップロード時に元ファイルも保存しているので別エンドポイント不要
      // ここでは converted_from === 'pptx' のフラグを使って UI を制御
      state.hasPptxSource = true;
    } else {
      state.hasPptxSource = false;
      state.pptxOriginalFile = null;
    }

    if (data.type === 'pdf') {
      const label = data.converted_from === 'pptx' ? 'PowerPoint' : 'PDF';
      const convRes = await fetch('/api/convert-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: data.filename }),
      });
      if (!convRes.ok) throw new Error(await convRes.text());
      const convData = await convRes.json();
      state.slides = convData.pages;
      showToast(`${label}を${convData.total}ページに変換しました ✓`, 'success');
    } else if (data.type === 'pptx_only') {
      // PDF変換失敗・PPTXのみ有効
      state.slides = [];
      showToast('PDF変換できませんでした。PowerPointで開いてご利用ください。', 'warning');
    } else {
      state.slides = [data.filename];
      showToast('スライドをアップロードしました ✓', 'success');
    }

    // セッションに保存（元のPPTXファイル名も含める）
    const sessionPatch = {
      slides_file: data.filename,
      slides_pages: state.slides,
    };
    if (data.pptx_source) {
      sessionPatch.pptx_file = data.pptx_source;
      state.pptxOriginalFile = data.pptx_source;
      state.hasPptxSource = true;
    }
    await saveCurrentSession(sessionPatch);

    state.currentSlide = 0;
    if (state.slides.length > 0) {
      showSlideImage(0);
      updateSlideNav();
    }
    showConverting(false);

    // PPTX並列起動ボタン表示
    updatePptxButton();

    presenterPublishInit();
  } catch (e) {
    showConverting(false);
    showToast(`アップロードエラー: ${e.message}`, 'error');
  }
}

// ============================================================
// 🖥️ 別ウィンドウ「プレゼン画面」同期（BroadcastChannel）
// ============================================================

function setupPresenterBridge() {
  try {
    presenterBC = new BroadcastChannel(PRESENTER_BC_NAME);
    presenterBC.onmessage = handlePresenterBridgeMessage;
  } catch (_) {
    presenterBC = null;
  }
}

let _presenterScreensChangeBound = false;

/** 直近の getScreenDetails 結果（プレゼン押下と同じターンで left/top を付けるため） */
let presenterScreensCacheSd = null;

function setupPresenterScreenSelect() {
  const sel = document.getElementById('presenter-display-select');
  if (!sel) return;
  sel.addEventListener('focus', () => {
    if (sel.options.length <= 1) {
      void refreshPresenterScreensList(false);
    }
  });
  sel.addEventListener('change', () => {
    void presenterPrefetchScreensForOpen();
  });
}

/** 「プレゼン画面」に触れた時点で座標キャッシュを温める（open と同期した left/top 指定に使う） */
function setupPresenterPrefetchOnHover() {
  const btn = document.getElementById('btn-open-presenter');
  if (!btn) return;
  btn.addEventListener(
    'pointerenter',
    () => {
      void presenterPrefetchScreensForOpen();
    },
    { passive: true }
  );
}

/** 参照が異なるオブジェクトになることがあるため、座標・サイズベースで同一モニターか判定（★ 表示／自動の別出力先） */
function presenterScreensEqual(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const near = (x, y) => Math.abs(Math.round(Number(x) || 0) - Math.round(Number(y) || 0)) <= 2;
  return (
    near(a.left, b.left) &&
    near(a.top, b.top) &&
    near(a.width, b.width) &&
    near(a.height, b.height)
  );
}

/** Screen Detailed のスケール（無ければ 1） */
function presenterScreenDevicePixelRatio(scr) {
  if (!scr) return 1;
  const d = Number(scr.devicePixelRatio);
  if (!Number.isNaN(d) && d > 0) return d;
  const s = Number(scr.scaleFactor);
  if (!Number.isNaN(s) && s > 0) return s;
  return 1;
}

/** プルダウン用。Windows 拡大縮小で論理 1280×720・実機 1920×1080 などを区別しやすくする */
function presenterDimLabel(scr) {
  const w = Math.round(Number(scr.width) || 0);
  const h = Math.round(Number(scr.height) || 0);
  const dpr = presenterScreenDevicePixelRatio(scr);
  if (dpr > 1.015) {
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    return `約 ${pw}×${ph}px（論理 ${w}×${h}）`;
  }
  const infer = presenterInferPhysicalFromLogical(w, h);
  if (infer) {
    return `約 ${infer.pw}×${infer.ph}px（論理 ${w}×${h}※）`;
  }
  return `${w}×${h}px`;
}

function presenterMonitorOptionLabel(scr, idx, currentScreen) {
  const prefix = `モニタ${idx + 1}`;
  const current = presenterScreensEqual(scr, currentScreen) ? '（プレデキ表示中）' : '';
  const dim = presenterDimLabel(scr);
  const label = typeof scr.label === 'string' ? scr.label.trim() : '';
  return label ? `${prefix}${current} - ${label} / ${dim}` : `${prefix}${current} - ${dim}`;
}

/** API が DPR を返さないときのごく一例（よくある 1080p 系の論理解像のみ） */
function presenterInferPhysicalFromLogical(w, h) {
  const table = [
    { pw: 1920, ph: 1080, w: 1280, h: 720 },
    { pw: 1920, ph: 1080, w: 1536, h: 864 },
    { pw: 2560, ph: 1440, w: 1707, h: 960 },
    { pw: 2560, ph: 1440, w: 2048, h: 1152 },
    { pw: 3840, ph: 2160, w: 2560, h: 1440 },
  ];
  for (let i = 0; i < table.length; i++) {
    const r = table[i];
    if (w === r.w && h === r.h) return { pw: r.pw, ph: r.ph };
  }
  return null;
}

/** 出力を選んだ直後など、ウィンドウ open と同じ座標へ寄せられるようキャッシュ */
async function presenterPrefetchScreensForOpen() {
  try {
    if (typeof window.getScreenDetails !== 'function') return;
    presenterScreensCacheSd = await window.getScreenDetails();
  } catch (_) {
    /* 許可待ち・拒否など */
  }
}

/**
 * プルダウンに接続ディスプレイを反映（Window Management / getScreenDetails）
 * @param {boolean} withFeedback トースト表示
 */
async function refreshPresenterScreensList(withFeedback) {
  const sel = document.getElementById('presenter-display-select');
  if (!sel) return;
  const prev = sel.value;
  const hadNonAuto = prev !== 'auto' && prev !== '';

  sel.innerHTML = '';
  const autoOpt = document.createElement('option');
  autoOpt.value = 'auto';
  autoOpt.textContent = '自動（プレデキとは別モニタ）';
  sel.appendChild(autoOpt);

  try {
    if (typeof window.getScreenDetails !== 'function') {
      if (withFeedback) {
        showToast('このブラウザはディスプレイ一覧 API に未対応です。手動でプレゼン窓を移動してください。', 'info');
      }
      return;
    }

    const sd = await window.getScreenDetails();
    presenterScreensCacheSd = sd;

    sd.screens.forEach((scr, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = presenterMonitorOptionLabel(scr, idx, sd.currentScreen);
      sel.appendChild(opt);
    });

    if (!_presenterScreensChangeBound && sd && typeof sd.addEventListener === 'function') {
      _presenterScreensChangeBound = true;
      try {
        sd.addEventListener('screenschange', () => {
          void refreshPresenterScreensList(false);
        });
      } catch (_) {}
    }

    if (hadNonAuto && [...sel.options].some((o) => o.value === prev)) {
      sel.value = prev;
    } else {
      sel.value = 'auto';
    }

    if (withFeedback) {
      showToast(`ディスプレイ ${sd.screens.length} 件を一覧に反映しました`, 'success');
    }
  } catch (_) {
    sel.value = 'auto';
    if (withFeedback) {
      showToast('一覧の取得に失敗しました。Edge のサイト権限で「ウィンドウの配置」を許可してください。', 'warning');
    }
  }
}

function handlePresenterBridgeMessage(ev) {
  const d = ev && ev.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'hello') {
    presenterPublishInit();
    return;
  }
  if (d.type === 'slide' && d.source === 'presenter' && typeof d.index === 'number') {
    if (state.currentScreen !== 'work' || !state.session) return;
    goToSlide(d.index, { fromPresenter: true });
  }
}

function presenterPublishInit() {
  if (!presenterBC) return;
  presenterBC.postMessage({
    type: 'init',
    slides: state.slides.slice(),
    index: state.currentSlide,
    autoFullscreen: true,
  });
}

function presenterPublishSlide() {
  if (!presenterBC) return;
  presenterBC.postMessage({ type: 'slide', index: state.currentSlide });
}

/** プレゼン子ページに全画面化を促す */
function presenterBroadcastFullscreenCue() {
  if (!presenterBC) return;
  try {
    presenterBC.postMessage({ type: 'fullscreen', source: 'main' });
  } catch (_) {}
}

async function presenterTryFullscreenFromMain(win, targetScreen) {
  if (!win || win.closed) return false;
  try {
    const doc = win.document;
    const root = doc && doc.documentElement;
    if (!doc || !root || typeof root.requestFullscreen !== 'function') return false;
    if (doc.fullscreenElement) return true;

    const opts = { navigationUI: 'hide' };
    if (targetScreen) opts.screen = targetScreen;
    try {
      await root.requestFullscreen(opts);
      return true;
    } catch (_) {
      if (!targetScreen) return false;
      try {
        await root.requestFullscreen();
        return true;
      } catch (_) {
        return false;
      }
    }
  } catch (_) {
    return false;
  }
}

function presenterBurstFullscreenTry(win, targetScreen) {
  // 最初の1回は setTimeout を介さず、その場で実行して user activation を使う
  void presenterTryFullscreenFromMain(win, targetScreen);
  presenterBroadcastFullscreenCue();

  const delays = [0, 60, 180, 360];
  delays.forEach((ms) => {
    setTimeout(() => {
      void presenterTryFullscreenFromMain(win, targetScreen);
      presenterBroadcastFullscreenCue();
    }, ms);
  });
}

function presenterFocusRepeated(win) {
  if (!win || win.closed) return;
  const delays = [0, 40, 100, 180, 320, 520, 820, 1200, 1700];
  delays.forEach((ms) => {
    setTimeout(() => {
      try {
        win.focus();
      } catch (_) {}
    }, ms);
  });
}

function presenterWindowChromeDelta(win) {
  const fallback = { dw: 18, dh: 96 };
  if (!win || win.closed) return fallback;
  try {
    const outerW = Number(win.outerWidth) || 0;
    const innerW = Number(win.innerWidth) || 0;
    const outerH = Number(win.outerHeight) || 0;
    const innerH = Number(win.innerHeight) || 0;
    const dw = Math.max(0, Math.min(240, Math.round(outerW - innerW)));
    const dh = Math.max(0, Math.min(320, Math.round(outerH - innerH)));
    return {
      dw: Number.isFinite(dw) && dw > 0 ? dw : fallback.dw,
      dh: Number.isFinite(dh) && dh > 0 ? dh : fallback.dh,
    };
  } catch (_) {
    return fallback;
  }
}

/** ウィンドウの作業領域いっぱいに張り付ける寸法（OS の「最大化」に近い） */
function presenterMaxBoxFromScreen(tgt) {
  if (!tgt) return null;
  const left = Math.floor(Number(tgt.availLeft != null ? tgt.availLeft : tgt.left) || 0);
  const top = Math.floor(Number(tgt.availTop != null ? tgt.availTop : tgt.top) || 0);
  let w = Math.floor(Number(tgt.availWidth != null ? tgt.availWidth : tgt.width) || 800);
  let h = Math.floor(Number(tgt.availHeight != null ? tgt.availHeight : tgt.height) || 600);
  w = Math.max(200, w);
  h = Math.max(200, h);
  return { width: w, height: h, left, top };
}

/** キャッシュ済み一覧から、ウィンドウ open 時の left/top を同期指定するボックスを得る */
function presenterOpenBoxForChoice(choiceVal) {
  const sd = presenterScreensCacheSd;
  if (!sd || !sd.screens || !sd.screens.length) return null;
  const tgt = presenterResolveTargetScreen(sd, choiceVal || 'auto');
  if (!tgt) return null;
  return presenterMaxBoxFromScreen(tgt);
}

/** ポップアップ用の同期寸法（キャッシュが無いときの既定） */
function presenterInitialWindowBox() {
  const aw = Math.max(400, screen.availWidth || window.innerWidth || 1280);
  const ah = Math.max(300, screen.availHeight || window.innerHeight || 720);
  const wth = Math.floor(aw * 0.94);
  const hgt = Math.floor(ah * 0.9);
  return {
    width: Math.max(480, wth),
    height: Math.max(360, hgt),
    left: Math.floor(screen.availLeft + Math.max(0, (aw - wth) / 2)),
    top: Math.floor(screen.availTop + Math.max(0, (ah - hgt) / 16)),
  };
}

function presenterSnapWinToScreen(win, tgt) {
  if (!win || win.closed || !tgt) return;
  try {
    const rawL = tgt.availLeft != null ? tgt.availLeft : tgt.left;
    const rawT = tgt.availTop != null ? tgt.availTop : tgt.top;
    const rawW = tgt.availWidth != null ? tgt.availWidth : tgt.width;
    const rawH = tgt.availHeight != null ? tgt.availHeight : tgt.height;

    const left = Math.floor(Number(rawL) || 0);
    const top = Math.floor(Number(rawT) || 0);
    let w = Math.floor(Number(rawW) || 800);
    let h = Math.floor(Number(rawH) || 600);
    w = Math.max(320, w);
    h = Math.max(240, h);
    const delta = presenterWindowChromeDelta(win);
    const outerW = w + delta.dw;
    const outerH = h + delta.dh;
    win.moveTo(left, top);
    win.resizeTo(outerW, outerH);
    win.moveTo(left, top);
  } catch (_) {
    /* ブラウザが move/resize を拒否することがある */
  }
}

/** 描画レイアウト後にサイズが戻されるブラウザ向けに数回適用する */
function presenterSnapRepeated(win, tgt) {
  presenterSnapWinToScreen(win, tgt);
  setTimeout(() => presenterSnapWinToScreen(win, tgt), 60);
  setTimeout(() => presenterSnapWinToScreen(win, tgt), 180);
  setTimeout(() => presenterSnapWinToScreen(win, tgt), 360);
  setTimeout(() => presenterSnapWinToScreen(win, tgt), 620);
  setTimeout(() => presenterSnapWinToScreen(win, tgt), 900);
  setTimeout(() => presenterSnapWinToScreen(win, tgt), 1200);
}

function presenterResolveTargetScreen(sd, choiceVal) {
  const list = sd.screens && sd.screens.length ? [...sd.screens] : [];
  if (!list.length) return null;
  const cur = sd.currentScreen;

  if (choiceVal === 'auto' || choiceVal == null || choiceVal === '') {
    const other = list.find((s) => !presenterScreensEqual(s, cur));
    return other || list[0];
  }
  const ix = parseInt(choiceVal, 10);
  if (!Number.isNaN(ix) && ix >= 0 && ix < list.length) return list[ix];
  const other = list.find((s) => !presenterScreensEqual(s, cur));
  return other || list[0];
}

/** 選択値に応じて子ウィンドウを配置し、fullscreen 用の Screen オブジェクトを返す（未対応時は null） */
async function presenterPlacePresenterWindow(win, choiceVal) {
  if (!win || win.closed) return null;
  let tgt = null;
  try {
    if (typeof window.getScreenDetails !== 'function') throw new Error('no-multi-screen-api');
    const sd = await window.getScreenDetails();
    presenterScreensCacheSd = sd;
    tgt = presenterResolveTargetScreen(sd, choiceVal || 'auto');
    if (tgt) presenterSnapRepeated(win, tgt);
    return tgt;
  } catch (_) {
    presenterSnapRepeated(win, {
      availLeft: screen.availLeft,
      availTop: screen.availTop,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
    });
    return null;
  }
}

/**
 * プレゼン窓を「別モニターへ最大化＋全画面」化する流れ：
 *   1. クリック時点ではキャッシュ済みの screen 情報だけを使って同期 open（gesture を維持）
 *   2. popup/fullscreen 指定で新規ウィンドウを開く
 *   3. 直後に親・子の両方から fullscreen を試し、同時にスライド同期を開始する
 *   4. 非同期で screen 情報を再取得し、選択モニターへ move/resize を再適用する
 */
async function openPresenterWindow() {
  if (!state.slides.length) {
    showToast('先にスライドをアップロードしてください', 'warning');
    return;
  }
  const selAtClick = document.getElementById('presenter-display-select');
  const presenterScreenChoice = selAtClick && selAtClick.value ? selAtClick.value : 'auto';

  const sdCached = presenterScreensCacheSd;
  let targetScreenIndex = -1;
  let targetScreen = null;
  if (sdCached && sdCached.screens && sdCached.screens.length) {
    targetScreen = presenterResolveTargetScreen(sdCached, presenterScreenChoice);
    if (targetScreen) targetScreenIndex = sdCached.screens.indexOf(targetScreen);
  }
  const box = presenterOpenBoxForChoice(presenterScreenChoice) || presenterInitialWindowBox();

  const featList = [
    `width=${box.width}`,
    `height=${box.height}`,
    `left=${box.left}`,
    `top=${box.top}`,
    'popup=yes',
    'fullscreen',
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
    'resizable=yes',
  ];
  try {
    if (window.predeckPresenterWinRef && !window.predeckPresenterWinRef.closed) {
      window.predeckPresenterWinRef.close();
    }
  } catch (_) {}

  const presenterWindowName = `predeck_presenter_${Date.now()}`;
  const query = new URLSearchParams();
  query.set('screen', String(targetScreenIndex));
  query.set('autofs', '1');
  query.set('left', String(box.left));
  query.set('top', String(box.top));
  query.set('width', String(box.width));
  query.set('height', String(box.height));
  query.set('ch', PRESENTER_BC_NAME);
  query.set('t', String(Date.now()));
  const url = '/static/presenter.html?' + query.toString();
  const w = window.open(url, presenterWindowName, featList.join(','));
  if (!w) {
    showToast('ポップアップがブロックされました。このサイトのポップアップを許可してください。', 'error');
    return;
  }
  window.predeckPresenterWinRef = w;
  presenterFocusRepeated(w);
  presenterBurstFullscreenTry(w, targetScreen);
  presenterPublishInit();

  /** 対象モニターへスナップ。OS の「最大化」近似はあくまでベストエフォート */
  void (async () => {
    try {
      await refreshPresenterScreensList(false);
      const selSync = document.getElementById('presenter-display-select');
      try {
        if (selSync && [...selSync.options].some((o) => o.value === presenterScreenChoice)) {
          selSync.value = presenterScreenChoice;
        }
      } catch (_) {}
      const placedScreen = await presenterPlacePresenterWindow(w, presenterScreenChoice);
      presenterFocusRepeated(w);
      presenterBurstFullscreenTry(w, placedScreen || targetScreen);
    } catch (_) {
      /* 何もできない場合は既に開いたウィンドウをそのまま使う */
    }
  })();

  setTimeout(() => presenterPublishInit(), 220);
  setTimeout(() => presenterBroadcastFullscreenCue(), 260);
  setTimeout(() => presenterBroadcastFullscreenCue(), 520);

  setTimeout(() => {
    try {
      w.opener = null;
    } catch (_) {}
  }, 4000);
}

/**
 * スライド番号を指定して表示・周辺UIを更新。プレゼン窓とは fromPresenter 経由で同期する。
 */
function goToSlide(index, opts = {}) {
  const fromPresenter = opts.fromPresenter === true;
  if (!state.slides.length) return;
  if (index < 0 || index >= state.slides.length) return;
  if (index === state.currentSlide) return;

  // Step4 でスライドを切り替える前に、現在スライドの編集内容を保存
  if (state.currentStep === 4) commitUserScriptEditsToSlide();

  state.currentSlide = index;
  showSlideImage(index);
  updateSlideNav();
  if (state.isRecording) logSlideChange();
  if (state.currentStep === 5) updateSlideScriptDisplay(state.currentSlide);
  if (state.currentStep === 2) updateRecordSlideScript(state.currentSlide);
  if (state.currentStep === 4) {
    // スライド変更後は新スライドの内容を表示するため、編集フラグをリセット
    const userEl = document.getElementById('user-script');
    if (userEl) userEl._userEdited = false;
    updateImproveSlideContent(state.currentSlide);
  }
  updateLeftPanelScript(state.currentSlide);

  if (!fromPresenter) presenterPublishSlide();
}

function showSlideImage(index) {
  const img = document.getElementById('slide-image');
  const uploadArea = document.getElementById('upload-area');

  if (!state.slides.length) {
    uploadArea.style.display = 'flex';
    img.style.display = 'none';
    return;
  }

  uploadArea.style.display = 'none';
  img.style.display = 'block';
  img.src = `/api/slides/${state.slides[index]}`;
  img.alt = `スライド ${index + 1}`;
}

function showUploadArea() {
  document.getElementById('upload-area').style.display = 'flex';
  document.getElementById('slide-image').style.display = 'none';
}

function showConverting(show) {
  const el = document.getElementById('slide-converting');
  const ua = document.getElementById('upload-area');
  if (show) {
    ua.style.display = 'none';
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function updateSlideNav() {
  const total = state.slides.length;
  const counter = document.getElementById('slide-counter');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');

  if (total === 0) {
    counter.textContent = '－';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  counter.textContent = `${state.currentSlide + 1} / ${total}`;
  prevBtn.disabled = state.currentSlide <= 0;
  nextBtn.disabled = state.currentSlide >= total - 1;
}

function prevSlide() {
  if (state.currentSlide > 0) goToSlide(state.currentSlide - 1);
}

function nextSlide() {
  if (state.currentSlide < state.slides.length - 1) goToSlide(state.currentSlide + 1);
}

/**
 * 左パネル（練習原稿パネル）を現在のスライドの原稿に更新
 */
function updateLeftPanelScript(slideIdx) {
  const practicePanel = document.getElementById('practice-script-panel');
  const practiceText  = document.getElementById('practice-script-text');
  if (!practicePanel || !practiceText) return;

  // per-slide のデータソースを優先して表示
  let slideText = (typeof getSlideScriptText === 'function')
    ? getSlideScriptText(slideIdx)
    : '';

  // 何もなければ全文（マーカー除去）にフォールバック
  if (!slideText && state.currentScript) {
    slideText = state.currentScript
      .replace(/【スライド\d+】\s*/g, '')
      .replace(/\[スライド\d+\]\s*/g, '')
      .trim();
  }

  if (!slideText) {
    practicePanel.style.display = 'none';
    return;
  }

  practicePanel.style.display = 'block';
  practiceText.innerHTML = renderMarkdown(slideText);
}

/**
 * Step4（原稿改善）でスライドが変わったとき、
 * 自分の原稿欄（文字おこし）とAI改善欄をそのスライドのセクションに切替
 */
function updateImproveSlideContent(slideIdx) {
  const aiEl   = document.getElementById('improved-script');
  const userEl = document.getElementById('user-script');

  // --- 生テキスト取得 ---
  const srcText = state.transcriptsBySlide[slideIdx] || '';

  // ────────────────────────────────────────────────
  // 左パネル：自分の原稿
  // ────────────────────────────────────────────────
  if (userEl && !userEl._userEdited) {
    if (srcText) {
      userEl.innerHTML = renderMarkdown(srcText);
    } else {
      userEl.innerHTML = '<span class="placeholder-hint">このスライドの文字おこしがありません</span>';
    }
  }

  // ────────────────────────────────────────────────
  // 右パネル：AI改善原稿
  // ────────────────────────────────────────────────
  if (aiEl) {
    const aiText = state.improvedBySlide[slideIdx] || '';
    if (aiText) {
      aiEl.innerHTML = buildInlineDiffHtml(srcText, aiText);
      updateDiffView(srcText, aiText);
    } else {
      aiEl.innerHTML = '<div class="ai-not-run-hint">このスライドのAI改善原稿はまだありません。「AI原稿改善を実行」をクリックしてください。</div>';
      updateDiffView('', '');
    }
  }
}

function logSlideChange() {
  const elapsed = (Date.now() - state.recordingStartTime) / 1000;
  state.slideTimings.push({ slide: state.currentSlide, time: elapsed });
  renderTimingLog();
}

function renderTimingLog() {
  const container = document.getElementById('timing-log-items');
  const slideEntries = (state.slideTimings || []).map(t => ({
    kind: 'slide',
    time: t.time,
    slide: t.slide,
  }));
  const liveEntries = (state.liveTranscripts || []).map(t => ({
    kind: 'live',
    time: t.time,
    text: t.text,
  }));
  const all = [...slideEntries, ...liveEntries].sort((a, b) => a.time - b.time);

  if (!all.length) {
    container.innerHTML = '<span class="no-data">録音中にスライド切り替えと話した内容が記録されます</span>';
    return;
  }

  container.innerHTML = all.map(e => {
    if (e.kind === 'slide') {
      return `<div class="timing-log-item">
        <span class="timing-log-time">${formatTime(e.time)}</span>
        <span class="timing-log-icon">🗂</span>
        <span>スライド ${e.slide + 1} に切り替え</span>
      </div>`;
    }
    // live transcript
    return `<div class="timing-log-item timing-log-item-live">
      <span class="timing-log-time">${formatTime(e.time)}</span>
      <span class="timing-log-icon">💬</span>
      <span class="timing-log-text">${_escapeHtml(e.text)}</span>
    </div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

// ============================================================
// 録音
// ============================================================

function setupRecordStep() {
  const iterEl = document.getElementById('iteration-info');
  const iterLabel = document.getElementById('iteration-label');

  if (state.iteration > 1) {
    iterEl.style.display = 'flex';
    iterLabel.textContent = `第${state.iteration}回練習`;
  } else {
    iterEl.style.display = 'none';
  }

  updatePrevScriptHint();

  const rssPanel = document.getElementById('record-slide-script');
  if (rssPanel) {
    // 前回の原稿がある場合のみ表示（第2回以降の練習時）
    const hasScript = Object.keys(state.improvedBySlide).length > 0 || (state.currentScript && state.slides.length > 0);
    if (hasScript) {
      rssPanel.style.display = 'block';
      updateRecordSlideScript(state.currentSlide);
    } else {
      rssPanel.style.display = 'none';
    }
  }
}

/** Step2録音中：現在のスライド原稿と次のスライド原稿の冒頭を表示 */
function updateRecordSlideScript(slideIdx) {
  const rssPanel = document.getElementById('record-slide-script');
  if (!rssPanel) return;

  const currentScriptText = state.improvedBySlide[slideIdx] || state.transcriptsBySlide[slideIdx] || '';
  if (!currentScriptText && slideIdx === 0 && Object.keys(state.improvedBySlide).length === 0) {
    rssPanel.style.display = 'none';
    return;
  }

  rssPanel.style.display = 'block';

  const label = document.getElementById('rss-label');
  const currentEl = document.getElementById('rss-current');
  const nextEl = document.getElementById('rss-next-preview');

  const next = state.improvedBySlide[slideIdx + 1] || state.transcriptsBySlide[slideIdx + 1] || '';

  label.textContent = `📄 スライド ${slideIdx + 1} の原稿`;
  if (currentEl) {
    currentEl.style.display = 'block';
    currentEl.innerHTML = renderMarkdown(currentScriptText) || '<em class="no-script">原稿なし</em>';
  }

  if (next) {
    nextEl.style.display = 'block';
    const preview = next.replace(/\*\*/g,'').replace(/#+\s/g,'').slice(0, 80);
    nextEl.textContent = `▼ 次: ${preview}...`;
  } else {
    nextEl.style.display = 'none';
  }
}

function updateRecordSlideScriptLive(interimTranscript) {
  // Web Speech APIのリアルタイム結果を録音ログに表示する
}

/**
 * 改善原稿を【スライドN】セクションで分割
 * @returns {string[]} スライド0始まりの配列
 */
function parseScriptBySlideSections(script) {
  if (!script) return [];
  const sections = {};
  let currentIdx = -1;
  let buf = [];

  for (const line of script.split('\n')) {
    const m = line.match(/【スライド(\d+)】/);
    if (m) {
      if (currentIdx >= 0) sections[currentIdx] = buf.join('\n').trim();
      currentIdx = parseInt(m[1]) - 1; // 0-based
      buf = [line];
    } else {
      if (currentIdx >= 0) buf.push(line);
    }
  }
  if (currentIdx >= 0) sections[currentIdx] = buf.join('\n').trim();

  // 配列に変換（欠番はundefined）
  const maxIdx = Math.max(...Object.keys(sections).map(Number), -1);
  const arr = [];
  for (let i = 0; i <= maxIdx; i++) arr.push(sections[i] || '');
  return arr;
}

/**
 * Whisperセグメントのタイムスタンプ＋スライド切り替えタイミングを使って
 * 文字おこし全文をスライドごとに分割する
 * @param {string} fullTranscript - 全文テキスト
 * @param {Array|null} segments   - Whisperセグメント [{start, end, text}, ...]
 * @param {Array|null} slideTimings - [{slide:0始まり, time:秒}, ...]
 * @returns {Object} - { slideIdx(0-based): text }
 */
function splitTranscriptByTimings(fullTranscript, segments, slideTimings) {
  if (!slideTimings || slideTimings.length === 0) {
    return { 0: fullTranscript };
  }

  // 時刻順にソート
  const sorted = [...slideTimings].sort((a, b) => a.time - b.time);

  // ★ Whisperセグメントがある場合：タイムスタンプで正確に分割
  if (segments && segments.length > 0) {
    const maxTime = Math.max(...segments.map(s => s.end || s.start || 0)) + 30;
    const result = {};
    sorted.forEach((t, i) => {
      const startTime = t.time;
      const endTime   = sorted[i + 1]?.time ?? maxTime;
      // セグメントの中間点がこのスライドの時間帯に入るものを選択
      const slideSegs = segments.filter(s => {
        const mid = ((s.start || 0) + (s.end || s.start || 0)) / 2;
        return mid >= startTime && mid < endTime;
      });
      result[t.slide] = slideSegs.map(s => (s.text || '').trim()).join('').trim();
    });
    return result;
  }

  // ★ セグメントがない場合（ブラウザ音声認識など）：文字数で比例分割
  const totalDuration = sorted[sorted.length - 1].time;
  if (totalDuration <= 0) return { 0: fullTranscript };

  // 最後のスライドの推定終了時刻（1.2倍）
  const estimatedEnd = totalDuration * 1.2;
  const chars = fullTranscript.length;
  const result = {};
  let charOffset = 0;

  sorted.forEach((t, i) => {
    const nextTime  = sorted[i + 1]?.time ?? estimatedEnd;
    const fraction  = Math.max(0, (nextTime - t.time) / estimatedEnd);
    const numChars  = (i === sorted.length - 1)
      ? chars - charOffset  // 最後のスライドは残り全部
      : Math.round(chars * fraction);
    result[t.slide] = fullTranscript.slice(charOffset, charOffset + numChars).trim();
    charOffset += numChars;
  });

  return result;
}

/**
 * AIの改善原稿の【スライドN】マーカーを使って
 * 生テキストを比例分割し state.transcriptBySlide に格納する
 * @param {string} rawTranscript - 生テキスト（Whisper出力）
 * @param {string} aiScript      - AIが生成した改善原稿（【スライドN】マーカー付き）
 */
function _buildTranscriptBySlide(rawTranscript, aiScript) {
  if (!rawTranscript) return;

  // ① AIマーカーで分割できるか試みる
  const aiSections = parseScriptBySlideSections(aiScript || '');
  if (aiSections.length >= 2) {
    // AI各セクションの文字数を比率としてrawを比例分割
    const aiLengths = aiSections.map(s => Math.max(1, (s || '').replace(/【スライド\d+】/g, '').length));
    const totalAiLen = aiLengths.reduce((a, b) => a + b, 0);
    const rawLen = rawTranscript.length;
    let offset = 0;
    aiSections.forEach((_, i) => {
      const isLast = i === aiSections.length - 1;
      const numChars = isLast
        ? rawLen - offset
        : Math.round(rawLen * (aiLengths[i] / totalAiLen));
      state.transcriptBySlide[i] = rawTranscript.slice(offset, offset + numChars).trim();
      offset += numChars;
    });
    return;
  }

  // ② タイミングデータがある場合はそちらで分割
  if (state.slideTimings && state.slideTimings.length >= 2) {
    const timingMap = splitTranscriptByTimings(
      rawTranscript,
      state.transcriptResult?.segments,
      state.slideTimings
    );
    state.transcriptBySlide = timingMap;
    return;
  }

  // ③ それ以外：等分割（スライド枚数で割る）
  const numSlides = state.slides.length || 1;
  const chunkSize = Math.ceil(rawTranscript.length / numSlides);
  for (let i = 0; i < numSlides; i++) {
    state.transcriptBySlide[i] = rawTranscript.slice(i * chunkSize, (i + 1) * chunkSize).trim();
  }
}

/**
 * 自分の原稿欄にtranscriptをセット（AI改善前の初期表示用）
 * - AI未実行：全文表示（スライドごと分割のヒント付き）
 * - AI実行済：transcriptBySlide[slideIdx]を使用
 */
function _syncUserScriptFromTranscript() {
  const userEl = document.getElementById('user-script');
  if (!userEl || userEl._userEdited) return;

  const transcript = state.previousTranscript
    || document.getElementById('transcript-editable')?.textContent?.trim()
    || '';
  if (!transcript) return;

  // AI実行済みでtranscriptBySildeがある場合はスライド別表示
  if (state.currentScript && Object.keys(state.transcriptBySlide).length > 0) {
    const slideText = state.transcriptBySlide[state.currentSlide];
    userEl.innerHTML = slideText ? renderMarkdown(slideText) : renderMarkdown(transcript);
    return;
  }

  // AI未実行：全文表示（スライドごとの分割は AI改善後に行われます）
  userEl.innerHTML = renderMarkdown(transcript)
    + '<div class="transcript-split-hint">💡 「AI原稿改善を実行」するとスライドごとに分割されます</div>';
}

/**
 * AI改善アクションエリアの表示を更新
 */
function _updateAiImproveActionRow() {
  const readyDiv  = document.getElementById('ai-improve-ready');
  const hintText  = document.getElementById('ai-improve-hint-text');
  const btn       = document.getElementById('btn-run-improvement');
  if (!readyDiv) return;

  // ボタンエリアを必ず表示（AI実行中はrequestImprovement側で一時的に隠される）
  readyDiv.style.display = 'flex';

  if (state.currentScript) {
    // AI改善済み → 再実行ボタンに変更
    if (btn) btn.textContent = '🔄 AI原稿を再改善';
    if (hintText) hintText.textContent = '自分の原稿を編集後、再度AIで磨き直せます';
    readyDiv.classList.add('ai-improved-done');
  } else {
    // 未実行
    if (btn) btn.textContent = '🤖 AI原稿改善を実行';
    if (hintText) hintText.textContent = '文字おこし原稿をAIが改善・整形します（句読点・誤字も修正）';
    readyDiv.classList.remove('ai-improved-done');
  }
}

function updatePrevScriptHint() {
  // prev-script-hint は削除済みのため、左パネル更新のみ行う
  updateLeftPanelScript(state.currentSlide);
}

async function toggleRecording() {
  if (state.isRecording) {
    await stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    state.audioChunks   = [];
    state.slideTimings  = [];
    state.liveTranscripts = [];
    state.liveTranscriptDisabled = false;
    state.recordingStartTime = Date.now();
    state.isRecording   = true;
    state.mediaStream   = stream;  // 停止時に解放するため保持

    // MediaRecorder 設定（WAV/WebM対応）
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    state.mediaRecorder = new MediaRecorder(stream, { mimeType });
    state.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) state.audioChunks.push(e.data);
    };
    state.mediaRecorder.start(500); // 500ms ごとにチャンク

    // タイマー開始
    state.timerInterval = setInterval(updateTimer, 1000);

    // 音量メーター開始
    setupVolumeMeter(stream);

    // UI更新
    const btn = document.getElementById('btn-record');
    btn.classList.add('recording');
    document.getElementById('record-label').textContent = '⏹️ 録音停止';
    document.getElementById('volume-wrap').style.display = 'flex';

    // 最初のスライドのタイミングを記録
    if (state.slides.length > 0) {
      state.slideTimings.push({ slide: state.currentSlide, time: 0 });
    }

    renderTimingLog();

    // Web Speech API でリアルタイム文字おこしを開始（バックアップ用）
    startWebSpeechRecognition();

    showToast('録音を開始しました 🎙️ 話し終わったらもう一度ボタンを押してください');
  } catch (e) {
    showToast('マイクのアクセスに失敗しました: ' + e.message, 'error');
  }
}

// ============================================================
// OSネイティブ文字起こし（Web Speech API）
// ============================================================

function startWebSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log('[SpeechRecognition] ブラウザ非対応 - サーバーサイドWhisperのみで文字おこしします');
    return;
  }
  state.speechRecognition = new SpeechRecognition();
  state.speechRecognition.lang = cfg.language === 'ja' ? 'ja-JP' : 'en-US';
  state.speechRecognition.interimResults = false;
  state.speechRecognition.continuous = true;

  state.speechRecognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        const text = event.results[i][0].transcript;
        const elapsed = state.recordingStartTime ? (Date.now() - state.recordingStartTime) / 1000 : 0;
        state.liveTranscripts.push({ time: elapsed, text });
        renderTimingLog();
      }
    }
  };

  state.speechRecognition.onerror = (event) => {
    console.warn('Speech recognition error', event.error);
  };

  state.speechRecognition.onend = () => {
    if (state.isRecording && state.speechRecognition) {
      try { state.speechRecognition.start(); } catch (e) {}
    }
  };

  try {
    state.speechRecognition.start();
  } catch (e) {
    console.warn('Speech recognition start failed', e);
  }
}

function stopWebSpeechRecognition() {
  if (state.speechRecognition) {
    state.speechRecognition.onend = null; // 再起動防止
    try {
      state.speechRecognition.stop();
    } catch (e) {}
    state.speechRecognition = null;
  }
}

// ============================================================
// リアルタイム文字起こし（旧チャンクレコーダー・削除済み）
// ============================================================

/** チャンクをサーバーに送って文字起こし→ログに追記 */
async function sendChunkForTranscription(blob, chunkStartElapsed) {
  if (state.liveTranscriptDisabled) return;
  try {
    const form = new FormData();
    const ext = (state.chunkRecorderMime || '').includes('webm') ? 'webm' : 'audio';
    form.append('audio', blob, `chunk.${ext}`);
    form.append('language', cfg.language || 'ja');
    form.append('session_id', state.session?.id || '');
    form.append('engine', cfg.realtimeEngine === 'openai' ? 'openai' : 'faster');
    form.append('model_size', cfg.whisperModel || 'base');

    const resp = await fetch('/api/transcribe-chunk', { method: 'POST', body: form });
    if (resp.status === 503) {
      // ローカルWhisperが使えない → 以降は静かに諦める
      state.liveTranscriptDisabled = true;
      console.info('[live-transcribe] ローカルWhisperが未利用可のため無効化');
      return;
    }
    if (!resp.ok) return;

    const data = await resp.json();
    const text = (data.text || '').trim();
    if (!text) return;

    state.liveTranscripts.push({ time: chunkStartElapsed, text });
    renderTimingLog();
  } catch (e) {
    // 単発の失敗は無視（次のチャンクで再挑戦）
    console.warn('[live-transcribe] chunk送信失敗:', e);
  }
}

async function stopRecording() {
  if (!state.mediaRecorder) return;

  state.isRecording = false;
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  stopVolumeMeter();

  // UI更新
  const btn = document.getElementById('btn-record');
  btn.classList.remove('recording');
  document.getElementById('record-label').textContent = '🎙️ 録音開始';
  document.getElementById('volume-wrap').style.display = 'none';

  // 録音完了を待ってからBlobを保存・ストリーム解放
  await new Promise(resolve => {
    state.mediaRecorder.onstop = () => {
      // マイクストリームを確実に解放（ヘッドホンのモニタリング音を止める）
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(t => t.stop());
        state.mediaStream = null;
      }
      resolve();
    };
    state.mediaRecorder.stop();
  });

  state._recordedBlob = new Blob(state.audioChunks, { type: 'audio/webm' });

  // Web Speech APIを停止
  stopWebSpeechRecognition();

  // 録音停止後アクションボタンを表示（削除して録り直す / 文字おこしへ）
  document.getElementById('post-record-actions').style.display = 'flex';
  document.getElementById('btn-record').disabled = true;
  showToast('録音完了！「文字おこしへ」をクリックするか、自動で文字おこしを開始します...', 'success');

  // 自動で文字おこしへ進む（2秒後）
  setTimeout(() => {
    if (state._recordedBlob) {
      proceedToTranscribe();
    }
  }, 1500);
}

/** 録音を破棄してリセット */
function discardRecording() {
  state._recordedBlob = null;
  state.audioChunks = [];
  state.slideTimings = [];
  state.liveTranscripts = [];

  // タイマーリセット
  document.getElementById('timer-display').textContent = '0:00';
  document.getElementById('btn-record').disabled = false;
  document.getElementById('post-record-actions').style.display = 'none';

  // スライドタイミングログもリセット
  renderTimingLog();
  showToast('録音を削除しました。録り直せます。');
}

/** 文字おこしへ進む（サーバーサイドfaster-whisperで一括文字おこし） */
async function proceedToTranscribe() {
  document.getElementById('post-record-actions').style.display = 'none';
  document.getElementById('btn-record').disabled = false;

  goToStep(3);

  // 録音データがあればサーバーに送信して文字おこし
  if (state._recordedBlob) {
    const statusEl = document.getElementById('transcribe-status');
    const statusText = document.getElementById('transcribe-status-text');
    if (statusEl) statusEl.style.display = 'flex';
    if (statusText) statusText.textContent = 'Whisperで文字起こし中... しばらくお待ちください';

    try {
      // WAVに変換してから送信
      const wavBlob = await convertToWav(state._recordedBlob);
      const form = new FormData();
      form.append('audio', wavBlob, 'recording.wav');
      form.append('language', cfg.language || 'ja');
      form.append('api_key', cfg.openaiKey || '');
      form.append('use_api', cfg.transcribeMethod === 'api' ? 'true' : 'false');
      form.append('model_size', cfg.whisperModel || 'base');
      form.append('engine', cfg.finalEngine || 'faster');

      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'サーバーエラー' }));
        throw new Error(err.detail || 'サーバーエラー');
      }

      const result = await res.json();
      state.transcriptResult = result;
      state.originalTranscript = result.text || '';

      // スライドタイミングで分割
      const bySlide = splitTranscriptByTimings(
        result.text || '',
        result.segments || [],
        state.slideTimings
      );
      state.transcriptsBySlide = bySlide;

      if (statusEl) statusEl.style.display = 'none';
      showToast('文字おこし完了！ 📝', 'success');
      void persistScriptState();
    } catch (e) {
      if (statusEl) statusEl.style.display = 'none';
      showToast('文字おこしに失敗しました: ' + e.message + '\n手動で入力できます。', 'error');
    }
  }

  // UIに反映
  renderStep3Transcripts();
}

function renderStep3Transcripts() {
  const container = document.getElementById('transcript-area');
  if (!container) return;
  
  let html = '<div class="transcript-meta">Whisperによる文字起こし結果（編集可能）</div>';
  const numSlides = Math.max(state.slides.length, 1);
  
  for (let i = 0; i < numSlides; i++) {
    const text = state.transcriptsBySlide[i] || '';
    html += `
      <div class="slide-transcript-block" style="margin-bottom:16px;">
        <div style="font-weight:bold; margin-bottom:4px; color:var(--primary);">スライド ${i+1}</div>
        <textarea class="transcript-editable slide-transcript-editable"
             id="transcript-editable-${i}"
             data-slide="${i}"
             rows="5"
             style="width:100%; min-height:80px; padding:12px; font-size:1em; border-radius:var(--radius); border:2px solid var(--border); resize:vertical; font-family:inherit;"
             placeholder="このスライドの文字起こし結果（直接編集もできます）...">${text}</textarea>
      </div>
    `;
  }
  
  // 以前のボタンバーなども残すため、一時的に書き換え
  // ※ 分析ボタンバー（#analysis-btn-bar）等は元のHTMLにあるので、上書きしないように子要素で対応
  const oldEditable = document.getElementById('transcript-editable');
  if (oldEditable) {
    oldEditable.style.display = 'none'; // 古い単一エディタは隠す
  }
  
  // 新規追加要素
  let slidesContainer = document.getElementById('slides-transcripts-container');
  if (!slidesContainer) {
    slidesContainer = document.createElement('div');
    slidesContainer.id = 'slides-transcripts-container';
    container.insertBefore(slidesContainer, document.getElementById('analysis-btn-bar'));
  }
  slidesContainer.innerHTML = html;
  
  // inputイベントでstateを同期＋デバウンス保存
  document.querySelectorAll('.slide-transcript-editable').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-slide');
      state.transcriptsBySlide[idx] = e.target.value;
      persistScriptStateDebounced();
    });
  });

  // 分析機能の自動実行用などに
  setTimeout(() => {
    runFillerAnalysis();
    runStumbleAnalysis();
  }, 300);
}

function getFullTranscript() {
  const numSlides = Math.max(state.slides.length, 1);
  let full = '';
  for (let i = 0; i < numSlides; i++) {
    const text = state.improvedBySlide[i] || state.transcriptsBySlide[i] || '';
    if (text.trim()) {
      full += `【スライド${i+1}】\n${text.trim()}\n\n`;
    }
  }
  return full.trim();
}

// ============================================================
// タイマー
// ============================================================

function updateTimer() {
  const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
  document.getElementById('timer-display').textContent = formatTime(elapsed);

  // 読み上げ位置ハイライト（目標時間と原稿がある場合）
  if (state.targetDuration > 0 && state.currentScript) {
    updateScriptReadingHighlight(elapsed, state.targetDuration);
  }
}

/**
 * 想定時間に合わせて左パネルの原稿で現在読んでいる位置をハイライト
 */
function updateScriptReadingHighlight(elapsed, targetDuration) {
  const practiceText = document.getElementById('practice-script-text');
  if (!practiceText) return;

  const sections = parseScriptBySlideSections(state.currentScript);
  const section = sections[state.currentSlide] || state.currentScript;
  if (!section) return;

  // 現在のスライドの経過割合を計算（スライドごとの時間配分）
  const progress = Math.min(elapsed / targetDuration, 1.0);

  // 段落単位で分割してハイライト
  const lines = section.split('\n').filter(l => l.trim());
  if (!lines.length) return;

  const highlightIdx = Math.floor(progress * lines.length);
  const html = lines.map((line, i) => {
    const escaped = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (i < highlightIdx) {
      return `<span class="script-line-done">${escaped}</span>`;
    } else if (i === highlightIdx) {
      return `<span class="script-line-current">${escaped}</span>`;
    } else {
      return `<span class="script-line-upcoming">${escaped}</span>`;
    }
  }).join('<br>');

  practiceText.innerHTML = html;
}

// ============================================================
// 音量メーター
// ============================================================

function setupVolumeMeter(stream) {
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    const source = state.audioContext.createMediaStreamSource(stream);
    source.connect(state.analyser);

    state.volumeInterval = setInterval(() => {
      const data = new Uint8Array(state.analyser.frequencyBinCount);
      state.analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const pct = Math.min(100, (avg / 128) * 100 * 2);
      document.getElementById('volume-fill').style.width = `${pct}%`;
    }, 50);
  } catch (_) {}
}

function stopVolumeMeter() {
  clearInterval(state.volumeInterval);
  state.volumeInterval = null;
  if (state.audioContext) {
    state.audioContext.close().catch(() => {});
    state.audioContext = null;
  }
  document.getElementById('volume-fill').style.width = '0%';
}

// ============================================================
// 文字起こし
// ============================================================

async function transcribeAudio(blob) {
  const statusEl = document.getElementById('transcribe-status');
  const statusText = document.getElementById('transcribe-status-text');
  statusEl.style.display = 'flex';
  const finalEngine = cfg.finalEngine || 'faster';
  const engineLabel = finalEngine === 'faster'
    ? 'faster-whisper（高速）'
    : 'openai-whisper（旧来）';
  const isApi = cfg.transcribeMethod === 'api';
  statusText.textContent = isApi
    ? 'OpenAI Whisper APIで文字起こし中...'
    : `ローカルWhisperで文字起こし中... [${engineLabel}]`;

  try {
    // WAVに変換してから送信（ffmpeg不要化）
    const wavBlob = await convertToWav(blob);

    const form = new FormData();
    form.append('audio', wavBlob, 'recording.wav');
    form.append('language', cfg.language);
    form.append('api_key', cfg.openaiKey);
    form.append('use_api', isApi ? 'true' : 'false');
    form.append('model_size', cfg.whisperModel);
    form.append('engine', finalEngine);

    const res = await fetch('/api/transcribe', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'サーバーエラー');
    }

    const result = await res.json();
    state.transcriptResult = result;
    displayTranscript(result);
    statusEl.style.display = 'none';
    // 文字起こし完了後に自動解析
    runFillerAnalysis();
    runSpeechAnalysis();
    runStructureAnalysis();
    runStumbleAnalysis();
    // 少し遅らせて熱量解析・メタファー提案を実行
    setTimeout(() => {
      runEnergyAnalysis();
      runMetaphorAnalysis();
    }, 1200);
  } catch (e) {
    statusEl.style.display = 'none';
    document.getElementById('transcript-editable').textContent = '';
    showToast(`文字起こしエラー: ${e.message}`, 'error');
    // エラーでも手動入力できるよう続行
    showManualInputHint();
  }
}

function showManualInputHint() {
  const meta = document.getElementById('transcript-meta');
  meta.innerHTML = `
    <span style="color: var(--danger);">⚠️ 自動文字起こしに失敗しました</span>
    <span>下のテキストエリアに手動で入力できます</span>
  `;
  document.getElementById('transcript-editable').setAttribute('data-placeholder', 'こちらに発表内容を入力してください...');
}

function displayTranscript(result) {
  const editEl = document.getElementById('transcript-editable');
  const metaEl = document.getElementById('transcript-meta');
  const breakdownEl = document.getElementById('timing-breakdown');

  editEl.textContent = result.text || '';

  // メタ情報
  const duration = result.segments?.length
    ? Math.max(...result.segments.map(s => s.end || 0))
    : 0;
  metaEl.innerHTML = `
    <span>⏱ 録音時間: ${formatTime(Math.round(duration))}</span>
    <span>📝 文字数: ${(result.text || '').length}文字</span>
    <span>🌐 言語: ${result.language || cfg.language}</span>
  `;

  // スライドごとの時間分析
  if (state.slideTimings.length > 1) {
    breakdownEl.innerHTML = '<div class="timing-breakdown-title" style="font-weight:600; margin-bottom:6px; font-size:12px; color:#64748b">📊 スライドごとの発表時間</div>'
      + state.slideTimings.map((t, i) => {
          const nextTime = state.slideTimings[i + 1]?.time ?? duration;
          const dur = Math.max(0, nextTime - t.time);
          return `<div class="timing-breakdown-item">
            <span class="timing-breakdown-slide">スライド ${t.slide + 1}</span>
            <span>${formatTime(Math.round(dur))} (${t.time.toFixed(1)}s〜${nextTime.toFixed(1)}s)</span>
          </div>`;
        }).join('');
  } else {
    breakdownEl.innerHTML = '';
  }
}

// ============================================================
// WAV変換（ffmpeg不要）
// ============================================================

async function convertToWav(blob) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();
    return audioBufferToWavBlob(audioBuffer);
  } catch (e) {
    // 変換失敗時はそのまま送る
    console.warn('WAV変換スキップ:', e.message);
    return blob;
  }
}

function audioBufferToWavBlob(buffer) {
  const sampleRate = buffer.sampleRate;
  // モノラルにミックスダウン
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const samples = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) samples[i] = (left[i] + right[i]) / 2;

  const numSamples = samples.length;
  const byteLength = 44 + numSamples * 2;
  const buf = new ArrayBuffer(byteLength);
  const view = new DataView(buf);

  const w = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  w(0,  'RIFF');
  view.setUint32(4,  36 + numSamples * 2, true);
  w(8,  'WAVE');
  w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);         // PCM
  view.setUint16(22, 1, true);         // モノラル
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buf], { type: 'audio/wav' });
}

// ============================================================
// AI スクリプト改善
// ============================================================

async function requestImprovement() {
  const currentIdx = state.currentSlide;
  const userEl = document.getElementById('user-script');
  
  let transcript = '';
  if (state.currentStep === 4 && userEl && userEl._userEdited) {
    transcript = userEl.innerText.trim();
  } else {
    transcript = state.transcriptsBySlide[currentIdx] || '';
  }

  if (!transcript) {
    showToast('このスライドの文字起こしテキストが空です。', 'warning');
    return;
  }

  goToStep(4);
  document.getElementById('improve-status').style.display = 'flex';
  const readyDiv = document.getElementById('ai-improve-ready');
  if (readyDiv) readyDiv.style.display = 'none';
  document.getElementById('diagnosis-panel').style.display = 'none';

  const body = {
    transcript,
    slide_timings: [{ slide: currentIdx, time: 0 }], // ダミー
    total_slides: 1, // 現在のスライドのみとして処理
    api_key: cfg.aiMethod === 'openai' ? cfg.openaiKey : '',
    model: cfg.openaiModel,
    use_ollama: cfg.aiMethod === 'ollama',
    ollama_model: cfg.ollamaModel,
    iteration: state.iteration,
    previous_script: state.improvedBySlide[currentIdx] || '',
    target_type: state.targetType,
    target_duration: state.targetDuration, // TODO: 全体の時間ではなくスライドごとの時間になるかも
    presentation_lang: state.presentationLang,
  };

  if (userEl) {
    userEl._userEdited = false;
  }

  // ストリーミング可否：OpenAI（APIキー有り）または Ollama
  const canStream = (cfg.aiMethod === 'openai' && cfg.openaiKey) || cfg.aiMethod === 'ollama';

  try {
    let improved = '';

    if (canStream) {
      improved = await requestImprovementStreaming(body);
    } else {
      // Ollama または APIキーなし → 通常リクエスト
      const res = await fetch('/api/improve-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'APIエラー');
      }
      const data = await res.json();
      improved = data.improved_script || '';
      state.improvedBySlide[currentIdx] = improved;
      displayImprovedScript(improved);
    }

    // 解析データをまとめる
    const analysisData = lastSpeechAnalysis ? {
      pitch_score:      lastSpeechAnalysis.pitch_score,
      pitch_rank:       lastSpeechAnalysis.pitch_rank,
      filler_count:     lastSpeechAnalysis.filler_count,
      cpm:              lastSpeechAnalysis.cpm,
      pace_status:      lastSpeechAnalysis.pace_status,
      weak_word_count:  lastSpeechAnalysis.weak_words?.length || 0,
    } : null;

    // セッションに保存
    const iterData = {
      iteration: state.iteration,
      transcript,
      slide_timings: slideDurations,
      improved_script: improved,
      analysis: analysisData,
      timestamp: new Date().toISOString(),
    };
    if (!state.session.iterations) state.session.iterations = [];
    state.session.iterations.push(iterData);
    await saveCurrentSession({
      iterations: state.session.iterations,
      ...buildScriptStatePatch(),
    });

    document.getElementById('improve-status').style.display = 'none';
    const readyDiv2 = document.getElementById('ai-improve-ready');
    if (readyDiv2) readyDiv2.style.display = 'flex';
    
    // AI改善完了後：ボタン・スライド表示を更新
    _updateAiImproveActionRow();
    updateImproveSlideContent(state.currentSlide);
    const rescoreBtn = document.getElementById('btn-rescore');
    if (rescoreBtn) rescoreBtn.style.display = 'inline-flex';
    showToast('AIが原稿を改善しました ✓', 'success');
  } catch (e) {
    document.getElementById('improve-status').style.display = 'none';
    showToast(`改善エラー: ${e.message}`, 'error');
    goToStep(3);
  }
}

async function requestImprovementStreaming(body) {
  const scriptEl = document.getElementById('improved-script');
  scriptEl.innerHTML = '';
  scriptEl.classList.add('streaming-cursor');

  const statusText = document.getElementById('improve-status-text');
  if (statusText) statusText.textContent = 'AIが原稿を生成中...（リアルタイム表示）';

  const res = await fetch('/api/improve-script-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'ストリーミングエラー');
  }

  let fullText = '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const chunk = JSON.parse(data);
        fullText += chunk.text || '';
        // リアルタイムでMarkdownレンダリング
        scriptEl.innerHTML = renderMarkdown(fullText);
        scriptEl.scrollTop = scriptEl.scrollHeight;
      } catch { /* ignore parse errors */ }
    }
  }

  scriptEl.classList.remove('streaming-cursor');
  state.improvedBySlide[state.currentSlide] = fullText;

  // 診断サマリーを抽出して別パネルに表示
  extractAndShowDiagnosis(fullText);
  // ReadyエリアをAI完了後に再表示
  const readyDiv = document.getElementById('ai-improve-ready');
  if (readyDiv) readyDiv.style.display = 'flex';
  
  // AI改善完了後：スライド別表示に切り替え（インライン差分付き）
  updateImproveSlideContent(state.currentSlide);
  _updateAiImproveActionRow();
  // 差分ビューも更新
  updateDiffView(state.transcriptsBySlide[state.currentSlide] || '', fullText);

  return fullText;
}

// 診断サマリーを本文から抽出してパネルに表示
function extractAndShowDiagnosis(text) {
  const diagPanel = document.getElementById('diagnosis-panel');
  if (!diagPanel) return;

  // 診断サマリーセクションを正規表現で抽出
  const diagMatch = text.match(/##\s*📊\s*診断サマリー([\s\S]*?)(?=##\s*✨|$)/i);
  const coachMatch = text.match(/##\s*💡\s*コーチングメモ([\s\S]*?)$/i);

  if (!diagMatch) return;

  const diagContent = diagMatch[1].trim();
  const coachContent = coachMatch ? coachMatch[1].trim() : '';

  // スコア抽出
  const scoreMatch = diagContent.match(/構造スコア[:\：]\s*(\d+)\s*\/\s*10/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

  const scoreHtml = score !== null ? `
    <div class="diagnosis-score">
      <span class="score-label">${score}/10</span>
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${score * 10}%"></div>
      </div>
    </div>` : '';

  // 弱点リスト抽出
  const weakLines = diagContent.match(/^\d\.\s+.+/gm) || [];
  const weakHtml = weakLines.length ? `
    <ul class="diagnosis-weakpoints">
      ${weakLines.map(l => `<li>${l.replace(/^\d\.\s+/, '')}</li>`).join('')}
    </ul>` : '';

  const coachHtml = coachContent ? `
    <div class="coaching-memo">💡 コーチングメモ<br>${coachContent.replace(/\n/g, '<br>')}</div>
  ` : '';

  diagPanel.innerHTML = `
    <h3>📊 AI診断サマリー</h3>
    ${scoreHtml}
    ${weakHtml}
    ${coachHtml}
  `;
  diagPanel.style.display = 'block';
}

function calcSlideDurations() {
  if (state.slideTimings.length === 0) return [];
  const maxTime = state.transcriptResult?.segments?.length
    ? Math.max(...state.transcriptResult.segments.map(s => s.end || 0))
    : 0;

  return state.slideTimings.map((t, i) => {
    const next = state.slideTimings[i + 1]?.time ?? maxTime;
    return {
      slide: t.slide + 1,
      duration: Math.max(0, next - t.time),
    };
  });
}

function displayImprovedScript(text) {
  // 右：AI改善原稿（参照用）- インライン差分ハイライト付き
  const aiEl = document.getElementById('improved-script');
  if (aiEl) {
    // AI改善原稿をインライン差分ハイライト付きで表示
    const diffHtml = buildInlineDiffHtml(state.previousTranscript, text);
    aiEl.innerHTML = diffHtml;
  }
  // 左：ユーザー編集欄 = 文字おこし原稿（または英語翻訳済み）をそのまま
  const userScriptEl = document.getElementById('user-script');
  if (userScriptEl) {
    const sourceText = state.previousTranscript || text;
    userScriptEl.innerHTML = renderMarkdown(sourceText);
  }
  // 差分ビューも更新
  updateDiffView(state.previousTranscript, text);
  // 「差分」タブに切り替え可能に
  const diffBtn = document.getElementById('tab-diff');
  if (diffBtn) diffBtn.disabled = false;
}

/**
 * インライン差分HTML生成（AI改善原稿に変更箇所をハイライト）
 * 追加テキスト：緑背景、削除テキスト：打ち消し線
 */
function buildInlineDiffHtml(original, improved) {
  if (!original) return renderMarkdown(improved);

  const oldWords = original.split(/(\s+)/);
  const newWords = improved.split(/(\s+)/);

  const m = Math.min(oldWords.length, 400);
  const n = Math.min(newWords.length, 400);
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i-1] === newWords[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
      ops.unshift({ type: 'eq', val: newWords[j-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      ops.unshift({ type: 'add', val: newWords[j-1] });
      j--;
    } else {
      ops.unshift({ type: 'del', val: oldWords[i-1] });
      i--;
    }
  }

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = '';
  for (const op of ops) {
    if (op.type === 'eq') html += esc(op.val);
    else if (op.type === 'add') html += `<mark class="diff-inline-add">${esc(op.val)}</mark>`;
    else if (op.type === 'del') html += `<del class="diff-inline-del">${esc(op.val)}</del>`;
  }
  // 改行を<br>に
  return html.replace(/\n/g, '<br>');
}

/**
 * AI原稿をユーザー編集欄に上書きコピー
 */
function syncAiToUser() {
  const aiEl   = document.getElementById('improved-script');
  const userEl = document.getElementById('user-script');
  if (!aiEl || !userEl) return;
  userEl.innerHTML = aiEl.innerHTML;
  showToast('AI改善原稿を自分の原稿に反映しました ✓', 'success');
}

/**
 * ユーザー編集欄のプレーンテキストを取得
 */
function getUserScriptText() {
  const userEl = document.getElementById('user-script');
  return userEl ? userEl.innerText.trim() : state.currentScript;
}

/**
 * Step4 の #user-script に表示されているテキストを、
 * 現在スライドの improvedBySlide に書き戻す。
 * ユーザーが編集していた場合・していない場合の両方で安全に呼べる。
 */
function commitUserScriptEditsToSlide() {
  const userEl = document.getElementById('user-script');
  if (!userEl) return;
  const text = userEl.innerText.trim();
  if (!text) return;
  const placeholderHint = 'このスライドの文字おこしがありません';
  if (text.includes(placeholderHint)) return;
  const idx = state.currentSlide;
  // 編集済みなら improvedBySlide を更新（既存のAI改善内容を上書き）
  if (userEl._userEdited) {
    state.improvedBySlide[idx] = text;
    return;
  }
  // 未編集でも、AI未実行スライドには transcripts として表示中のテキストを残しておく
  if (!state.improvedBySlide[idx] && !state.transcriptsBySlide[idx]) {
    state.transcriptsBySlide[idx] = text;
  }
}

// ============================================================
// タブ切り替え（改善原稿 / 差分 / 英語版）
// ============================================================

function switchScriptTab(tab) {
  ['improved','diff'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    if (btn)   btn.classList.toggle('active', t === tab);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
  });
}

// ============================================================
// 差分ハイライト
// ============================================================

function updateDiffView(original, improved) {
  const diffEl = document.getElementById('diff-view');
  if (!original || !improved) { diffEl.textContent = '差分なし'; return; }

  // 文単位でdiff（シンプルな単語レベルdiff）
  const oldWords = original.split(/(\s+)/);
  const newWords = improved.split(/(\s+)/);
  const html = simpleDiff(oldWords, newWords);
  diffEl.innerHTML = html;
}

function simpleDiff(oldArr, newArr) {
  // LCS ベースのシンプルdiff（短いテキスト向け）
  const m = Math.min(oldArr.length, 300);
  const n = Math.min(newArr.length, 300);
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldArr[i-1] === newArr[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }

  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldArr[i-1] === newArr[j-1]) {
      result.unshift({ type: 'eq', val: oldArr[i-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', val: newArr[j-1] });
      j--;
    } else {
      result.unshift({ type: 'del', val: oldArr[i-1] });
      i--;
    }
  }

  // 残りを追記（300語超の部分）
  if (newArr.length > n) {
    result.push({ type: 'add', val: '...' + newArr.slice(n).join('') });
  }

  return result.map(({ type, val }) => {
    const escaped = val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (type === 'add') return `<span class="diff-add">${escaped}</span>`;
    if (type === 'del') return `<span class="diff-del">${escaped}</span>`;
    return escaped;
  }).join('');
}

// ============================================================
// スピーチ総合解析（WPM・弱気ワード・ピッチスコア）
// ============================================================

// 最新の解析結果を保持（ステップ5の成長グラフ表示用）
let lastSpeechAnalysis = null;

async function runSpeechAnalysis() {
  const text = document.getElementById('transcript-editable').textContent.trim();
  if (!text) return;

  // 録音時間を取得（セグメントから推定）
  const durationSec = state.transcriptResult?.segments?.length
    ? Math.max(...state.transcriptResult.segments.map(s => s.end || 0))
    : 0;

  try {
    const res = await fetch('/api/analyze-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        duration_seconds: durationSec,
        target_type: state.targetType,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    lastSpeechAnalysis = data;

    renderWeakWords(data);
    renderWpmPerSlide(data, durationSec);
    renderPitchScore(data);
  } catch (e) {
    console.warn('speech analysis error:', e);
  }
}

function renderWeakWords(data) {
  const el = document.getElementById('weak-word-analysis');
  const resultEl = document.getElementById('weak-word-result');
  if (!el || !resultEl) return;

  if (!data.weak_words || data.weak_words.length === 0) {
    el.style.display = 'block';
    resultEl.innerHTML = '<span class="weak-none">✅ 弱気ワードは検出されませんでした！言い切りができています。</span>';
    return;
  }

  el.style.display = 'block';
  resultEl.innerHTML = data.weak_words.map(w => `
    <div class="weak-item">
      <span class="weak-word-tag">「${w.word}」× ${w.count}回</span>
      ${w.replacement ? `<span class="weak-arrow">→</span><span class="weak-replacement">「${w.replacement}」に言い換え推奨</span>` : '<span class="weak-delete">→ 削除推奨</span>'}
    </div>
  `).join('');
}

function renderWpmPerSlide(data, durationSec) {
  const wpmEl = document.getElementById('wpm-analysis');
  const chartEl = document.getElementById('wpm-chart');
  const badgeEl = document.getElementById('wpm-overall-badge');
  if (!wpmEl || !chartEl) return;

  wpmEl.style.display = 'block';

  // 全体CPM
  const cpm = data.cpm;
  if (badgeEl) {
    if (cpm === 0) {
      badgeEl.textContent = '計測不可（セグメント情報なし）';
      badgeEl.className = 'wpm-badge';
    } else {
      const status = cpm < 150 ? 'slow' : cpm > 450 ? 'fast' : 'good';
      const label = status === 'slow' ? 'ゆっくり' : status === 'fast' ? '速い' : '良好';
      badgeEl.textContent = `全体: ${cpm} 文字/分 (${label})`;
      badgeEl.className = `wpm-badge ${status}`;
    }
  }

  // スライドごとWPM（セグメントがある場合）
  const segs = state.transcriptResult?.segments || [];
  const timings = state.slideTimings || [];

  if (segs.length === 0 || timings.length === 0) {
    if (cpm > 0) {
      const status = cpm < 150 ? 'slow' : cpm > 450 ? 'fast' : 'good';
      const pct = Math.min(100, (cpm / 600) * 100);
      chartEl.innerHTML = `
        <div class="wpm-bar-row">
          <span class="wpm-bar-label">全体</span>
          <div class="wpm-bar-track">
            <div class="wpm-bar-fill ${status}" style="width:${pct}%"></div>
          </div>
          <span class="wpm-bar-val">${cpm} 文字/分</span>
        </div>`;
    } else {
      chartEl.innerHTML = '<div class="wpm-no-data">録音とWhisperセグメントが必要です</div>';
    }
    return;
  }

  const maxSeg = Math.max(...segs.map(s => s.end || 0));
  const rows = timings.map((t, i) => {
    const endTime = timings[i + 1]?.time ?? maxSeg;
    const slideSegs = segs.filter(s => s.start >= t.time && s.start < endTime);
    const chars = slideSegs.map(s => s.text || '').join('').replace(/\s/g, '').length;
    const dur = endTime - t.time;
    const slideCpm = dur > 0 ? Math.round(chars / (dur / 60)) : 0;
    const status = slideCpm === 0 ? 'good' : slideCpm < 150 ? 'slow' : slideCpm > 450 ? 'fast' : 'good';
    const pct = slideCpm > 0 ? Math.min(100, (slideCpm / 600) * 100) : 0;
    return `
      <div class="wpm-bar-row">
        <span class="wpm-bar-label">S${t.slide + 1}</span>
        <div class="wpm-bar-track">
          <div class="wpm-bar-fill ${status}" style="width:${pct}%"></div>
        </div>
        <span class="wpm-bar-val">${slideCpm > 0 ? slideCpm + ' 文字/分' : '—'}</span>
      </div>`;
  });
  chartEl.innerHTML = rows.join('');
}

function renderPitchScore(data) {
  const panel = document.getElementById('pitch-score-panel');
  const rankEl = document.getElementById('pitch-rank-badge');
  const fillEl = document.getElementById('pitch-score-fill');
  const valEl  = document.getElementById('pitch-score-value');
  const listEl = document.getElementById('pitch-checklist');
  if (!panel) return;

  panel.style.display = 'block';
  const score = data.pitch_score || 0;
  const rank  = data.pitch_rank || 'D';

  if (rankEl) {
    rankEl.textContent = `${rank}ランク`;
    rankEl.className = `pitch-rank-badge rank-${rank.toLowerCase()}`;
  }
  if (fillEl) fillEl.style.width = `${score}%`;
  if (valEl)  valEl.textContent = `${score}/100`;

  if (listEl && data.pitch_checks) {
    listEl.innerHTML = data.pitch_checks.map(c => `
      <div class="pitch-check-item ${c.ok ? 'ok' : 'ng'}">
        <span class="pitch-check-icon">${c.ok ? '✅' : '❌'}</span>
        <div class="pitch-check-body">
          <span class="pitch-check-name">${c.item}</span>
          ${!c.ok && c.hint ? `<span class="pitch-check-hint">${c.hint}</span>` : ''}
        </div>
        <span class="pitch-check-weight">+${c.weight}pt</span>
      </div>
    `).join('');
  }
}

// ============================================================
// 成長グラフ（ステップ5）
// ============================================================

function renderGrowthChart() {
  const section = document.getElementById('growth-chart-section');
  const chartEl = document.getElementById('growth-chart');
  const statsEl = document.getElementById('growth-stats');
  const badgeEl = document.getElementById('growth-improvement-badge');

  const iters = state.session?.iterations || [];
  if (!section || iters.length === 0) return;

  section.style.display = 'block';

  // スコアがある反復だけ抽出
  const withScore = iters.filter(it => it.analysis?.pitch_score != null);
  if (withScore.length === 0) {
    chartEl.innerHTML = '<div class="wpm-no-data">スコアデータはまだありません（AI改善を実行するとスコアが記録されます）</div>';
    return;
  }

  // 改善率バッジ
  if (withScore.length >= 2 && badgeEl) {
    const first = withScore[0].analysis.pitch_score;
    const last  = withScore[withScore.length - 1].analysis.pitch_score;
    const diff  = last - first;
    badgeEl.textContent = diff >= 0 ? `+${diff}pt 改善！` : `${diff}pt`;
    badgeEl.className   = `growth-badge ${diff >= 0 ? 'up' : 'down'}`;
    section.style.display = 'block';
  }

  // バーチャート描画
  const maxScore = 100;
  const barRows = iters.map((it, i) => {
    const score     = it.analysis?.pitch_score ?? null;
    const fillers   = it.analysis?.filler_count ?? '?';
    const cpm       = it.analysis?.cpm ?? 0;
    const scoreLabel = score != null ? score : '未計測';
    const barPct     = score != null ? score : 0;
    const rank       = it.analysis?.pitch_rank || '';
    return `
      <div class="growth-bar-row">
        <span class="growth-bar-label">第${i + 1}回</span>
        <div class="growth-bar-track">
          <div class="growth-bar-fill" style="width:${barPct}%">
            ${score != null ? `<span class="growth-bar-score-label">${score}pt ${rank ? '(' + rank + ')' : ''}</span>` : ''}
          </div>
        </div>
        <div class="growth-bar-sub">
          フィラー:${fillers} ${cpm ? '/ ' + cpm + '文字/分' : ''}
        </div>
      </div>`;
  });
  chartEl.innerHTML = barRows.join('');

  // 統計サマリー
  if (statsEl && withScore.length >= 2) {
    const first = withScore[0].analysis;
    const last  = withScore[withScore.length - 1].analysis;
    const scoreDiff   = last.pitch_score - first.pitch_score;
    const fillerDiff  = (first.filler_count || 0) - (last.filler_count || 0);
    statsEl.innerHTML = `
      <div class="growth-stat-item ${scoreDiff >= 0 ? 'up' : 'down'}">
        ピッチスコア: ${first.pitch_score} → ${last.pitch_score} (${scoreDiff >= 0 ? '+' : ''}${scoreDiff})
      </div>
      <div class="growth-stat-item ${fillerDiff >= 0 ? 'up' : 'down'}">
        フィラー: ${first.filler_count || 0} → ${last.filler_count || 0} (${fillerDiff >= 0 ? '−' + fillerDiff : '+' + Math.abs(fillerDiff)})
      </div>
    `;
  }

  // 今回スコアのサマリー表示
  const latestAnalysis = iters[iters.length - 1]?.analysis;
  if (latestAnalysis) {
    const summaryEl = document.getElementById('practice-score-summary');
    if (summaryEl) {
      summaryEl.style.display = 'flex';
      const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
      el('pss-pitch',  latestAnalysis.pitch_score != null ? `${latestAnalysis.pitch_score}pt (${latestAnalysis.pitch_rank})` : '未計測');
      el('pss-filler', latestAnalysis.filler_count != null ? `${latestAnalysis.filler_count}個` : '未計測');
      el('pss-cpm',    latestAnalysis.cpm ? `${latestAnalysis.cpm}文字/分` : '—');
      el('pss-weak',   latestAnalysis.weak_word_count != null ? `${latestAnalysis.weak_word_count}種` : '—');
    }
  }
}

// ============================================================
// フィラー解析
// ============================================================

async function runFillerAnalysis() {
  const text = document.getElementById('transcript-editable').textContent.trim();
  if (!text) return;

  const res = await fetch('/api/analyze-fillers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return;

  const data = await res.json();
  const el = document.getElementById('filler-analysis');
  const resultEl = document.getElementById('filler-result');
  el.style.display = 'block';

  if (data.filler_count === 0) {
    resultEl.innerHTML = '<span style="color:var(--success);font-weight:600;">✓ フィラーは検出されませんでした！素晴らしい！</span>';
    return;
  }

  const scoreClass = data.filler_rate < 1 ? 'good' : data.filler_rate < 3 ? 'warning' : 'bad';
  const tagsHtml = data.summary.map(s =>
    `<span class="filler-tag">「${s.word}」${s.count}回</span>`
  ).join('');

  resultEl.innerHTML = `
    <div class="filler-summary">${tagsHtml}</div>
    <div class="filler-score ${scoreClass}">
      合計 ${data.filler_count}個 ／ フィラー率 ${data.filler_rate}%
      ${scoreClass === 'good' ? '（良好）' : scoreClass === 'warning' ? '（やや多め）' : '（改善が必要）'}
    </div>
    <div style="margin-top:6px;font-size:12px;color:var(--text-secondary);">
      💡 AIの原稿改善でフィラーは自動的に除去・言い換えされます
    </div>
  `;
}

// ============================================================
// 練習ステップ
// ============================================================

/**
 * 原稿テキストを【スライドN】マーカーで分割して配列で返す
 * 例: { 0: "スライド1の内容", 1: "スライド2の内容", ... }
 */
function parseScriptBySlide(script) {
  if (!script) return {};
  const map = {};
  // 【スライドN】 または [スライドN] 形式のマーカーで分割
  const parts = script.split(/(?=【スライド\d+】|\[スライド\d+\])/);
  for (const part of parts) {
    const m = part.match(/【スライド(\d+)】|\[スライド(\d+)\]/);
    if (m) {
      const idx = parseInt(m[1] || m[2], 10) - 1; // 0-indexed
      map[idx] = part.trim();
    }
  }
  // マーカーがない場合は全文を0番に
  if (Object.keys(map).length === 0 && script.trim()) {
    map[0] = script.trim();
  }
  return map;
}

// スライド別原稿マップ（練習ステップで使用）
let slideScriptMap = {};

/**
 * 指定スライドの原稿テキストを返す（per-slideのデータソース優先）
 * 優先順位: improvedBySlide → transcriptsBySlide → slideScriptMap → state.currentScript
 */
function getSlideScriptText(slideIdx) {
  const fromImproved   = state.improvedBySlide[slideIdx];
  if (fromImproved && fromImproved.trim()) return fromImproved.trim();
  const fromTranscript = state.transcriptsBySlide[slideIdx];
  if (fromTranscript && fromTranscript.trim()) return fromTranscript.trim();
  const fromMap = slideScriptMap[slideIdx];
  if (fromMap && fromMap.trim()) {
    return fromMap
      .replace(/^【スライド\d+】\s*/m, '')
      .replace(/^\[スライド\d+\]\s*/m, '')
      .trim();
  }
  return '';
}

/**
 * 現在スライドの原稿を更新表示（Step5用）
 */
function updateSlideScriptDisplay(slideIndex) {
  const box    = document.getElementById('slide-script-box');
  const label  = document.getElementById('slide-script-label');
  const textEl = document.getElementById('slide-script-text');
  if (!box || !label || !textEl) return;

  const totalSlides = state.slides.length;
  const slideNum    = slideIndex + 1;
  label.textContent = totalSlides > 0
    ? `📄 スライド ${slideNum} / ${totalSlides} の原稿`
    : '📄 現在の原稿';

  let slideText = getSlideScriptText(slideIndex);
  // それでも空なら全文（マーカー除去）にフォールバック
  if (!slideText && state.currentScript) {
    slideText = state.currentScript
      .replace(/【スライド\d+】\s*/g, '')
      .replace(/\[スライド\d+\]\s*/g, '')
      .trim();
  }

  if (slideText) {
    textEl.innerHTML = renderMarkdown(slideText);
    box.style.display = 'block';
  } else {
    textEl.innerHTML = '<em class="no-script">このスライドの原稿はまだありません</em>';
    box.style.display = 'block';
  }
}

let slideScriptExpanded = false;
function toggleSlideScript() {
  const textEl = document.getElementById('slide-script-text');
  const btn    = document.querySelector('#slide-script-box .btn');
  if (!textEl) return;
  slideScriptExpanded = !slideScriptExpanded;
  textEl.classList.toggle('expanded', slideScriptExpanded);
  if (btn) btn.textContent = slideScriptExpanded ? '閉じる ▴' : '全文表示 ▾';
}

function setupPracticeStep() {
  const display = document.getElementById('practice-script-display');
  display.innerHTML = renderMarkdown(state.currentScript);

  // スライド別原稿マップを構築
  slideScriptMap = parseScriptBySlide(state.currentScript);

  // 現在スライドの原稿を表示
  updateSlideScriptDisplay(state.currentSlide);

  // 圧迫ピッチモードボタンを目的タイプに応じて表示
  const pressureBtn = document.getElementById('btn-pressure-mode');
  const pressureTargets = ['vc', 'ringi', 'interview', 'academic'];
  if (pressureBtn) {
    pressureBtn.style.display = pressureTargets.includes(state.targetType) ? 'inline-flex' : 'none';
    // ラベルカスタマイズ
    const labelMap = { vc: 'VC', ringi: '役員', interview: '面接官', academic: '審査員' };
    const label = labelMap[state.targetType] || 'AI';
    pressureBtn.textContent = `💥 ${label}から圧迫質問を受ける`;
  }

  // 圧迫モードをリセット
  closePressureMode();

  // テレプロンプターにも同じ内容をセット
  const tpScriptEl = document.getElementById('tp-script');
  if (tpScriptEl) {
    tpScriptEl.innerHTML = renderMarkdown(state.currentScript);
    tpScriptEl.style.fontSize = tp.fontSize + 'px';
    tpScriptEl.scrollTop = 0;
    updateTpProgress();
  }
  // テレプロンプターを通常表示にリセット
  stopTp();
  const tpNorm = document.getElementById('tp-normal-view');
  const tpMode = document.getElementById('tp-mode-view');
  const tpBtn  = document.getElementById('tp-mode-btn');
  if (tpNorm) tpNorm.style.display = 'block';
  if (tpMode) tpMode.style.display = 'none';
  if (tpBtn)  tpBtn.textContent = '📜 スクロール原稿モード';

  // 左パネルにも表示
  updatePrevScriptHint();

  // 成長グラフを表示
  renderGrowthChart();
}

function startNextIteration() {
  state.iteration++;
  state.slideTimings = [];
  state.currentSlide = 0;
  if (state.slides.length) showSlideImage(0);
  updateSlideNav();
  renderTimingLog();
  presenterPublishInit();
  // タイマーリセット
  document.getElementById('timer-display').textContent = '0:00';
  goToStep(2);
  showToast(`第${state.iteration}回練習を開始します 🎙️`, 'success');
}

async function finishSession() {
  const title = document.getElementById('session-title').value.trim()
    || `セッション ${new Date().toLocaleString('ja-JP')}`;
    
  const finalScript = getFullTranscript();
  
  // レポートテキスト生成（セッション情報 + 原稿）
  if (finalScript) {
    const dateStr = new Date().toLocaleString('ja-JP');
    let report = `════════════════════════════════════════\n`;
    report += `  プレデキ (PreDeck) - 原稿レポート\n`;
    report += `════════════════════════════════════════\n\n`;
    report += `セッション: ${title}\n`;
    report += `出力日時: ${dateStr}\n`;
    report += `練習回数: ${state.iteration}回\n`;
    report += `スライド数: ${Math.max(state.slides.length, 1)}枚\n\n`;
    report += `────────────────────────────────────────\n`;
    report += `  原稿\n`;
    report += `────────────────────────────────────────\n\n`;
    report += finalScript;
    report += `\n\n────────────────────────────────────────\n`;
    report += `  Generated by PreDeck (プレデキ)\n`;
    report += `────────────────────────────────────────\n`;
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `プレデキ_原稿_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  await saveCurrentSession({ title, final_script: finalScript });
  showToast('セッションを保存しました ✓ 原稿をダウンロードしました！お疲れ様でした！', 'success');
  setTimeout(showHome, 1500);
}

// ============================================================
// セッション保存
// ============================================================

async function saveCurrentSession(patch = {}) {
  if (!state.session) return;
  try {
    const res = await fetch(`/api/sessions/${state.session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      state.session = updated;
    }
  } catch (_) {}
}

/**
 * 現在の per-slide スクリプト状態をセッションJSONに保存する。
 * - transcripts_by_slide: スライドごとの文字おこし
 * - improved_by_slide:    スライドごとのAI改善原稿
 * - slide_timings:        録音中のタイミング
 * - current_script:       【スライドN】マーカー付き全文（即復元用）
 * - iteration:            現在の練習回数
 */
function buildScriptStatePatch() {
  const fullScript = (typeof getFullTranscript === 'function')
    ? getFullTranscript()
    : (state.currentScript || '');
  return {
    transcripts_by_slide: state.transcriptsBySlide || {},
    improved_by_slide:    state.improvedBySlide    || {},
    slide_timings:        state.slideTimings       || [],
    current_script:       fullScript,
    iteration:            state.iteration,
  };
}

async function persistScriptState() {
  if (!state.session) return;
  await saveCurrentSession(buildScriptStatePatch());
}

let _persistScriptTimer = null;
/** 連続編集時のサーバ書き込みを抑えるためのデバウンス保存 */
function persistScriptStateDebounced(delayMs = 1500) {
  if (!state.session) return;
  if (_persistScriptTimer) clearTimeout(_persistScriptTimer);
  _persistScriptTimer = setTimeout(() => {
    _persistScriptTimer = null;
    void persistScriptState();
  }, delayMs);
}

/** beforeunload など離脱時に呼び出す。fetch keepalive でブラウザに残してもらう */
function persistScriptStateSync() {
  if (!state.session) return;
  try {
    const payload = buildScriptStatePatch();
    fetch(`/api/sessions/${state.session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}

// ============================================================
// 🌐 英語変換
// ============================================================

async function requestEnglishConversion() {
  const script = document.getElementById('improved-script')?.textContent?.trim();
  if (!script) {
    showToast('先にAI改善原稿を生成してください', 'warning');
    return;
  }

  const statusEl = document.getElementById('english-convert-status');
  const scriptEl = document.getElementById('english-script');
  const copyBtn  = document.getElementById('btn-copy-english');
  const dlBtn    = document.getElementById('btn-dl-english');
  const convertBtn = document.getElementById('btn-convert-english');

  statusEl.style.display = 'flex';
  if (convertBtn) convertBtn.disabled = true;
  scriptEl.innerHTML = '';

  try {
    const res = await fetch('/api/convert-english', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: script,
        target_type: state.targetType,
        api_key:     cfg.aiMethod === 'openai' ? cfg.openaiKey : '',
        model:       cfg.openaiModel,
        use_ollama:  cfg.aiMethod === 'ollama',
        ollama_model: cfg.ollamaModel,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'APIエラー');
    }
    const data = await res.json();
    const english = data.english_script || '';
    scriptEl.innerHTML = renderMarkdown(english);
    if (copyBtn) copyBtn.style.display = 'inline-flex';
    if (dlBtn)   dlBtn.style.display   = 'inline-flex';
    // Speakable English セクションを表示
    const speakableSection = document.getElementById('speakable-section');
    if (speakableSection) speakableSection.style.display = 'block';
    showToast('英語に変換しました ✓', 'success');
  } catch (e) {
    scriptEl.innerHTML = `<span style="color:var(--danger)">変換に失敗しました: ${escHtml(e.message)}</span>`;
    showToast(`英語変換エラー: ${e.message}`, 'error');
  } finally {
    statusEl.style.display = 'none';
    if (convertBtn) convertBtn.disabled = false;
  }
}

function copyEnglishScript() {
  const text = document.getElementById('english-script')?.textContent?.trim();
  if (!text) { showToast('コピーするテキストがありません', 'warning'); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast('英語原稿をコピーしました ✓', 'success'))
    .catch(() => showToast('コピーに失敗しました', 'error'));
}

function downloadEnglishScript() {
  const text = document.getElementById('english-script')?.textContent?.trim();
  if (!text) { showToast('ダウンロードするテキストがありません', 'warning'); return; }
  const title = state.session?.title || 'script';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title}_英語版.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// 🔍 つまずき検知
// ============================================================

async function runStumbleAnalysis() {
  const text = document.getElementById('transcript-editable')?.textContent?.trim();
  if (!text) return;

  const panelEl  = document.getElementById('stumble-analysis');
  const resultEl = document.getElementById('stumble-result');
  if (!panelEl || !resultEl) return;

  panelEl.style.display = 'block';
  resultEl.innerHTML = '<div style="text-align:center;padding:8px"><div class="spinner" style="margin:0 auto 4px"></div><span style="font-size:12px">つまずきを検出中...</span></div>';

  try {
    const res = await fetch('/api/analyze-stumbles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (data.stumble_count === 0) {
      resultEl.innerHTML = '<span style="color:var(--success);font-weight:600">✅ つまずきは検出されませんでした！流暢な発話です。</span>';
      return;
    }

    const scoreColor = data.score >= 80 ? 'var(--success)' : data.score >= 50 ? 'var(--warning)' : 'var(--danger)';
    const typeLabelMap = {
      repeat: '繰り返し',
      rephrase: '言い直し',
      filler_burst: 'フィラー連発',
      broken_sentence: '文の中断',
    };

    const items = data.stumbles.map(s => `
      <div class="stumble-item">
        <span class="stumble-type-badge">${typeLabelMap[s.type] || s.type}</span>
        <span class="stumble-text">${escHtml(s.label)}</span>
      </div>`).join('');

    resultEl.innerHTML = `
      <div class="stumble-score" style="color:${scoreColor}">
        流暢度スコア: ${data.score}/100（${data.stumble_count}箇所検出）
      </div>
      <div class="stumble-list">${items}</div>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:6px">
        💡 AIの原稿改善後に再練習すると大幅に改善します
      </div>`;
  } catch (e) {
    resultEl.innerHTML = '<span style="color:var(--text-secondary);font-size:12px">検出に失敗しました</span>';
  }
}

// ============================================================
// 💡 メタファー提案
// ============================================================

async function runMetaphorAnalysis() {
  const text = document.getElementById('transcript-editable')?.textContent?.trim();
  if (!text) return;

  const panelEl  = document.getElementById('metaphor-suggestions');
  const resultEl = document.getElementById('metaphor-result');
  if (!panelEl || !resultEl) return;

  panelEl.style.display = 'block';
  resultEl.innerHTML = '<div style="text-align:center;padding:8px"><div class="spinner" style="margin:0 auto 4px"></div><span style="font-size:12px">比喩を考え中...</span></div>';

  // つまずき位置を取得（既に解析済みの場合）
  const stumbleItems = document.querySelectorAll('.stumble-item');
  const stumblePositions = [];
  // stumbleAnalysisの結果からpositionを収集（データ属性として保存されていれば）

  try {
    const res = await fetch('/api/suggest-metaphors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        stumble_positions: stumblePositions,
        target_type: state.targetType,
      }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (!data.suggestions || data.suggestions.length === 0) {
      resultEl.innerHTML = '<span style="color:var(--text-secondary);font-size:12px;padding:8px;display:block">メタファー提案が見つかりませんでした。より具体的な内容を話してみてください。</span>';
      return;
    }

    resultEl.innerHTML = data.suggestions.map(s => `
      <div class="metaphor-item">
        <div class="metaphor-topic-badge">${escHtml(s.topic)}</div>
        <div class="metaphor-example">${escHtml(s.example)}</div>
        <div class="metaphor-hint">💡 ${escHtml(s.usage_hint)}</div>
        <button class="btn btn-sm btn-ghost metaphor-copy-btn"
                onclick="copyToClipboard('${escHtml(s.example).replace(/'/g,"\\'")}')">
          📋 コピー
        </button>
      </div>`).join('');
  } catch (e) {
    resultEl.innerHTML = '<span style="color:var(--text-secondary);font-size:12px;padding:8px;display:block">提案の取得に失敗しました</span>';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('コピーしました ✓', 'success'))
    .catch(() => showToast('コピーに失敗しました', 'error'));
}

// ============================================================
// 🌡️ 熱量ヒートマップ
// ============================================================

async function runEnergyAnalysis() {
  const text = document.getElementById('transcript-editable')?.textContent?.trim();
  if (!text) return;

  const panelEl   = document.getElementById('energy-heatmap');
  const resultEl  = document.getElementById('energy-result');
  const badgeEl   = document.getElementById('energy-overall-badge');
  if (!panelEl || !resultEl) return;

  panelEl.style.display = 'block';
  resultEl.innerHTML = '<div style="text-align:center;padding:8px"><div class="spinner" style="margin:0 auto 4px"></div><span style="font-size:12px">熱量を解析中...</span></div>';

  const segments = state.transcriptResult?.segments || [];

  try {
    const res = await fetch('/api/analyze-energy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, segments }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    // バッジ更新
    if (badgeEl) {
      const levelMap = { high: '🔥 高い', medium: '✅ 普通', low: '❄️ 低い' };
      const colorMap = { high: 'var(--success)', medium: 'var(--warning)', low: 'var(--danger)' };
      badgeEl.textContent = `全体: ${data.overall_energy}pt / ${levelMap[data.overall_level] || ''}`;
      badgeEl.style.color = colorMap[data.overall_level] || '';
    }

    if (data.energy_map.length === 0) {
      resultEl.innerHTML = '<span style="font-size:12px;color:var(--text-secondary)">解析データが不十分です</span>';
      return;
    }

    // サマリー
    const peakText = data.peak_section ? `「${data.peak_section.text}」` : '';
    const summaryHtml = `
      <div class="energy-summary">
        <div class="energy-stat">全体スコア: <strong>${data.overall_energy}/100</strong></div>
        <div class="energy-stat ${data.low_energy_count > 2 ? 'warn' : 'ok'}">
          低エネルギー箇所: <strong>${data.low_energy_count}箇所</strong>
          ${data.low_energy_count > 2 ? '（改善が必要）' : '（良好）'}
        </div>
        ${peakText ? `<div class="energy-stat">最高エネルギー: <strong>${escHtml(peakText)}</strong></div>` : ''}
      </div>`;

    // ヒートマップバー表示（最大15文）
    const displayItems = data.energy_map.slice(0, 15);
    const mapHtml = displayItems.map(item => `
      <div class="energy-row level-${item.level}" title="${escHtml(item.full_text)}">
        <div class="energy-bar-wrap">
          <div class="energy-bar-fill level-${item.level}" style="width:${item.score}%"></div>
        </div>
        <span class="energy-text">${escHtml(item.text)}</span>
        <span class="energy-score-badge level-${item.level}">${item.score}</span>
      </div>`).join('');

    // 低エネルギー箇所のアドバイス
    const lowItems = data.energy_map.filter(e => e.level === 'low').slice(0, 3);
    const adviceHtml = lowItems.length ? `
      <div class="energy-advice">
        <div class="energy-advice-title">⬆️ エネルギーアップのコツ</div>
        ${lowItems.map(item => `
          <div class="energy-advice-item">
            <span class="energy-low-badge">低</span>
            <span>「${escHtml(item.text)}」</span>
            <span class="energy-tip">→ 言い切りの表現に変え、数値や強調語を追加しましょう</span>
          </div>`).join('')}
      </div>` : '';

    resultEl.innerHTML = summaryHtml + `<div class="energy-map-list">${mapHtml}</div>` + adviceHtml;

  } catch (e) {
    resultEl.innerHTML = '<span style="color:var(--text-secondary);font-size:12px">解析に失敗しました</span>';
  }
}

// ============================================================
// 🗣️ Speakable English
// ============================================================

async function requestSpeakableEnglish() {
  const englishText = document.getElementById('english-script')?.textContent?.trim();
  if (!englishText) {
    showToast('先に「英語に変換」してください', 'warning');
    return;
  }

  const statusEl  = document.getElementById('speakable-status');
  const scriptEl  = document.getElementById('speakable-script');
  const actionsEl = document.getElementById('speakable-actions');
  const btn       = document.getElementById('btn-speakable');

  statusEl.style.display = 'flex';
  if (btn) btn.disabled = true;
  scriptEl.innerHTML = '';
  const sectionEl = document.getElementById('speakable-section');
  if (sectionEl) sectionEl.style.display = 'block';

  try {
    const res = await fetch('/api/speakable-english', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:         englishText,
        api_key:      cfg.aiMethod === 'openai' ? cfg.openaiKey : '',
        model:        cfg.openaiModel,
        use_ollama:   cfg.aiMethod === 'ollama',
        ollama_model: cfg.ollamaModel,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'エラー');
    }
    const data = await res.json();
    const speakable = data.speakable_script || '';

    // マーカーをハイライト表示
    const formatted = speakable
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\[breath\]/gi, '<span class="sp-breath">[息]</span>')
      .replace(/\[pause\]/gi,  '<span class="sp-pause">[間]</span>')
      .replace(/\(slow down\)/gi, '<span class="sp-note">(ゆっくり)</span>')
      .replace(/\(pause\)/gi,     '<span class="sp-note">(間を取る)</span>')
      .replace(/\(strong\)/gi,    '<span class="sp-note">(強調)</span>')
      .replace(/\(smile in voice\)/gi, '<span class="sp-note">(笑顔で)</span>')
      .replace(/\*([^*]+)\*/g,    '<strong class="sp-stress">$1</strong>')
      .replace(/\[([^\]]+\])/g,   '<span class="sp-hint">[$1</span>')
      .replace(/\n/g, '<br>');

    scriptEl.innerHTML = formatted;
    if (actionsEl) actionsEl.style.display = 'flex';
    showToast('Speakable変換完了 ✓', 'success');
  } catch (e) {
    scriptEl.innerHTML = `<span style="color:var(--danger)">${escHtml(e.message)}</span>`;
    showToast(`Speakable変換エラー: ${e.message}`, 'error');
  } finally {
    statusEl.style.display = 'none';
    if (btn) btn.disabled = false;
  }
}

function copySpeakableScript() {
  const text = document.getElementById('speakable-script')?.innerText?.trim();
  if (!text) { showToast('コピーするテキストがありません', 'warning'); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast('Speakable原稿をコピー ✓', 'success'))
    .catch(() => showToast('コピーに失敗しました', 'error'));
}

function downloadSpeakableScript() {
  const text = document.getElementById('speakable-script')?.innerText?.trim();
  if (!text) { showToast('ダウンロードするテキストがありません', 'warning'); return; }
  const title = state.session?.title || 'script';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title}_Speakable英語版.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// 💥 圧迫ピッチモード
// ============================================================

const pressureState = {
  history: [],
  active: false,
};

function startPressureMode() {
  if (!state.currentScript) {
    showToast('先にAI改善原稿を生成してください', 'warning');
    return;
  }

  pressureState.history = [];
  pressureState.active = true;

  const section = document.getElementById('pressure-mode-section');
  const chat    = document.getElementById('pressure-chat');
  if (section) section.style.display = 'block';
  if (chat) chat.innerHTML = '';

  section?.scrollIntoView({ behavior: 'smooth' });
  sendPressureQuestion();
}

function closePressureMode() {
  pressureState.active = false;
  const section = document.getElementById('pressure-mode-section');
  if (section) section.style.display = 'none';
}

async function sendPressureQuestion() {
  const chatEl = document.getElementById('pressure-chat');
  if (!chatEl) return;

  // ローディング表示
  const loadingId = 'pressure-loading-' + Date.now();
  chatEl.innerHTML += `<div id="${loadingId}" class="pressure-bubble ai loading"><div class="spinner"></div> 考え中...</div>`;
  chatEl.scrollTop = chatEl.scrollHeight;

  try {
    const res = await fetch('/api/pressure-pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script:      state.currentScript,
        history:     pressureState.history,
        target_type: state.targetType,
        api_key:     cfg.aiMethod === 'openai' ? cfg.openaiKey : '',
        model:       cfg.openaiModel,
        use_ollama:  cfg.aiMethod === 'ollama',
        ollama_model: cfg.ollamaModel,
      }),
    });
    const data = await res.json();
    const question = data.question || 'もっと詳しく教えてください。';

    pressureState.history.push({ role: 'ai', text: question });

    // ローディング除去・AIバブル追加
    const loadEl = document.getElementById(loadingId);
    if (loadEl) loadEl.remove();
    chatEl.innerHTML += `<div class="pressure-bubble ai"><span class="pressure-ai-label">💥 AI審査員</span>${escHtml(question)}</div>`;
    chatEl.scrollTop = chatEl.scrollHeight;

    const inputEl = document.getElementById('pressure-answer-input');
    if (inputEl) {
      inputEl.disabled = false;
      inputEl.focus();
      inputEl.onkeydown = (e) => { if (e.key === 'Enter') sendPressureAnswer(); };
    }
  } catch (e) {
    const loadEl = document.getElementById(loadingId);
    if (loadEl) loadEl.remove();
    chatEl.innerHTML += `<div class="pressure-bubble ai" style="color:var(--danger)">エラー: ${escHtml(e.message)}</div>`;
  }
}

function sendPressureAnswer() {
  const inputEl = document.getElementById('pressure-answer-input');
  const chatEl  = document.getElementById('pressure-chat');
  if (!inputEl || !chatEl) return;

  const answer = inputEl.value.trim();
  if (!answer) return;

  pressureState.history.push({ role: 'user', text: answer });
  chatEl.innerHTML += `<div class="pressure-bubble user"><span class="pressure-user-label">🙋 あなた</span>${escHtml(answer)}</div>`;
  chatEl.scrollTop = chatEl.scrollHeight;

  inputEl.value = '';
  inputEl.disabled = true;

  // 3ターン以上なら終了メッセージ
  if (pressureState.history.filter(h => h.role === 'user').length >= 5) {
    chatEl.innerHTML += `<div class="pressure-bubble ai" style="background:#dcfce7;color:#166534">
      ✅ 5問お疲れさまでした！練習を終了するか、続けるかを選んでください。
    </div>`;
    chatEl.scrollTop = chatEl.scrollHeight;
    return;
  }

  sendPressureQuestion();
}

// ============================================================
// 📄 セッションレポートエクスポート
// ============================================================

function exportSessionReport() {
  const session = state.session;
  if (!session) { showToast('セッションがありません', 'warning'); return; }

  const iters = session.iterations || [];
  const title = session.title || '無題セッション';
  const created = formatDate(session.created_at);

  let report = `PreDeck セッションレポート
========================
セッション名: ${title}
作成日時: ${created}
練習回数: ${iters.length}回
目的: ${state.targetType}
目標時間: ${state.targetDuration > 0 ? formatTime(state.targetDuration) : '設定なし'}

`;

  iters.forEach((iter, i) => {
    const analysis = iter.analysis || {};
    report += `--- 第${i + 1}回練習 ---
日時: ${formatDate(iter.timestamp)}
ピッチスコア: ${analysis.pitch_score != null ? `${analysis.pitch_score}pt (${analysis.pitch_rank}ランク)` : '未計測'}
フィラー数: ${analysis.filler_count != null ? `${analysis.filler_count}個` : '—'}
話速: ${analysis.cpm ? `${analysis.cpm}文字/分` : '—'}
弱気ワード: ${analysis.weak_word_count != null ? `${analysis.weak_word_count}種` : '—'}

【文字起こし】
${iter.transcript || '（なし）'}

【改善原稿】
${iter.improved_script || '（なし）'}

`;
  });

  // 最終スクリプト
  if (state.currentScript) {
    report += `\n\n========================\n最終改善原稿\n========================\n${state.currentScript}`;
  }

  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_レポート_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('レポートをエクスポートしました ✓', 'success');
}

// ============================================================
// スクリプト操作
// ============================================================

function copyScript() {
  const text = document.getElementById('improved-script').textContent;
  if (!text.trim()) { showToast('コピーするテキストがありません', 'warning'); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast('コピーしました ✓', 'success'))
    .catch(() => showToast('コピーに失敗しました', 'error'));
}

function downloadScript() {
  const text = document.getElementById('improved-script').textContent;
  if (!text.trim()) { showToast('ダウンロードするテキストがありません', 'warning'); return; }
  const title = state.session?.title || 'script';
  const filename = `${title}_改善原稿_第${state.iteration}回.txt`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// 設定モーダル
// ============================================================

function showSettings() {
  applySettingsToForm();
  updateSettingsStrictStatus();
  document.getElementById('modal-settings').style.display = 'flex';
  void runAllChecks();
}

/** 設定フォームの現在値（保存前でもテストに使う） */
function getSettingsFormSnapshot() {
  const finEl = document.getElementById('cfg-final-engine');
  const rtEl  = document.getElementById('cfg-realtime-engine');
  return {
    language: document.getElementById('cfg-language').value,
    transcribeMethod: document.getElementById('cfg-transcribe-method').value,
    finalEngine:    finEl ? finEl.value : (cfg.finalEngine    || 'faster'),
    realtimeEngine: rtEl  ? rtEl.value  : (cfg.realtimeEngine || 'faster'),
    whisperModel: document.getElementById('cfg-whisper-model').value,
    openaiKey: document.getElementById('cfg-openai-key').value,
    aiMethod: document.getElementById('cfg-ai-method').value,
    ollamaModel: document.getElementById('cfg-ollama-model').value,
    openaiModel: document.getElementById('cfg-openai-model').value,
  };
}

/** 設定画面内の Strict Local Mode 表示と取消ボタンの可視性を更新 */
function updateSettingsStrictStatus() {
  const cloudInUse = (cfg.transcribeMethod === 'api') || (cfg.aiMethod === 'openai');
  const badge = document.getElementById('settings-strict-current');
  const hint  = document.getElementById('settings-strict-hint');
  const btn   = document.getElementById('btn-revoke-consent');
  if (badge) {
    if (cloudInUse && cfg.cloudConsent) {
      badge.textContent = '☁️ クラウド許可中';
      badge.className = 'strict-local-badge cloud-on';
    } else {
      badge.textContent = '🔒 Strict Local';
      badge.className = 'strict-local-badge strict-on';
    }
  }
  if (hint) {
    hint.textContent = (cloudInUse && cfg.cloudConsent)
      ? `クラウドAPIへの送信を許可しています（同意日時: ${cfg.cloudConsentAt}）。取り消すといつでもローカル処理に戻ります。`
      : 'すべての処理がローカルで完結し、外部送信は発生しません。クラウド利用が必要な場合は下の「文字起こし方法」または「AI方法」をクラウドに変更してください（同意モーダルが表示されます）。';
  }
  if (btn) {
    btn.style.display = cfg.cloudConsent ? 'inline-flex' : 'none';
  }
}

function closeSettings() {
  document.getElementById('modal-settings').style.display = 'none';
}

function closeSettingsOnOverlay(event) {
  if (event.target === document.getElementById('modal-settings')) closeSettings();
}

function onTranscribeMethodChange() {
  const method = document.getElementById('cfg-transcribe-method').value;
  const modelGroup = document.getElementById('cfg-whisper-model-group');
  modelGroup.style.display = method === 'local' ? 'block' : 'none';
  const engineGroup = document.getElementById('cfg-local-engine-group');
  if (engineGroup) engineGroup.style.display = method === 'local' ? 'block' : 'none';
  document.getElementById('openai-cfg').style.display =
    (method === 'api' || document.getElementById('cfg-ai-method').value === 'openai') ? 'block' : 'none';
  // クラウドAPI（OpenAI Whisper API）選択時、未同意なら同意モーダル
  if (method === 'api' && !cfg.cloudConsent) {
    requireCloudConsent('asr',
      () => { document.getElementById('cfg-transcribe-method').value = 'local'; onTranscribeMethodChange(); },
      null
    );
  }
}

function onAIMethodChange() {
  const method = document.getElementById('cfg-ai-method').value;
  document.getElementById('openai-cfg').style.display  =
    (method === 'openai' || document.getElementById('cfg-transcribe-method').value === 'api') ? 'block' : 'none';
  document.getElementById('ollama-cfg').style.display  = method === 'ollama' ? 'block' : 'none';
  // クラウドAPI（OpenAI Chat）選択時、未同意なら同意モーダル
  if (method === 'openai' && !cfg.cloudConsent) {
    requireCloudConsent('llm',
      () => { document.getElementById('cfg-ai-method').value = 'ollama'; onAIMethodChange(); },
      null
    );
  }
}

async function checkInstallStatus() {
  // 旧関数（互換性維持）
  await runAllChecks();
}

// ============================================================
// 設定タブ切り替え
// ============================================================

function switchSettingsTab(tab) {
  const isSettings = tab === 'settings';
  document.getElementById('stab-settings').classList.toggle('active', isSettings);
  document.getElementById('stab-setup').classList.toggle('active', !isSettings);
  document.getElementById('spanel-settings').style.display = isSettings ? 'block' : 'none';
  document.getElementById('spanel-setup').style.display    = isSettings ? 'none'  : 'block';
  document.getElementById('btn-save-settings').style.display    = isSettings ? 'inline-flex' : 'none';
  document.getElementById('btn-run-all-checks').style.display   = isSettings ? 'none' : 'inline-flex';
  if (!isSettings) runAllChecks();
}

// ============================================================
// セットアップ方法選択
// ============================================================

function selectSetupMethod(method) {
  ['local', 'api'].forEach(m => {
    document.getElementById(`smtab-${m}`)?.classList.toggle('active', m === method);
    document.getElementById(`setup-${m}`)?.style && (document.getElementById(`setup-${m}`).style.display = m === method ? 'block' : 'none');
  });
}

function selectAISetupMethod(method) {
  ['ollama', 'openai'].forEach(m => {
    document.getElementById(`smtab-ai-${m}`)?.classList.toggle('active', m === method);
    document.getElementById(`setup-ai-${m}`)?.style && (document.getElementById(`setup-ai-${m}`).style.display = m === method ? 'block' : 'none');
  });
}

// ============================================================
// セットアップ: 各項目チェック
// ============================================================

function setCheckIcon(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = state === 'ok' ? '✅' : state === 'fail' ? '❌' : state === 'loading' ? '⏳' : '⬜';
}

function setBadge(id, text, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `setup-step-badge${cls ? ' ' + cls : ''}`;
}

async function checkFfmpeg() {
  setCheckIcon('icon-ffmpeg', 'loading');
  try {
    const r = await fetch('/api/setup-check');
    const d = await r.json();
    if (d.ffmpeg) {
      setCheckIcon('icon-ffmpeg', 'ok');
      document.getElementById('ffmpeg-install').style.display = 'none';
    } else {
      setCheckIcon('icon-ffmpeg', 'fail');
      document.getElementById('ffmpeg-install').style.display = 'block';
    }
    return d.ffmpeg;
  } catch { setCheckIcon('icon-ffmpeg', 'fail'); return false; }
}

async function checkWhisper() {
  setCheckIcon('icon-whisper', 'loading');
  try {
    const r = await fetch('/api/setup-check');
    const d = await r.json();
    if (d.whisper) {
      setCheckIcon('icon-whisper', 'ok');
      document.getElementById('whisper-install').style.display = 'none';
    } else {
      setCheckIcon('icon-whisper', 'fail');
      document.getElementById('whisper-install').style.display = 'block';
    }
    return d.whisper;
  } catch { setCheckIcon('icon-whisper', 'fail'); return false; }
}

async function checkFasterWhisper() {
  setCheckIcon('icon-faster-whisper', 'loading');
  try {
    const r = await fetch('/api/setup-check');
    const d = await r.json();
    const installBlock = document.getElementById('faster-whisper-install');
    if (d.faster_whisper) {
      setCheckIcon('icon-faster-whisper', 'ok');
      if (installBlock) installBlock.style.display = 'none';
    } else {
      setCheckIcon('icon-faster-whisper', 'fail');
      if (installBlock) installBlock.style.display = 'block';
    }
    return !!d.faster_whisper;
  } catch { setCheckIcon('icon-faster-whisper', 'fail'); return false; }
}

async function checkOllama() {
  setCheckIcon('icon-ollama', 'loading');
  try {
    const r = await fetch('/api/setup-check');
    const d = await r.json();
    if (d.ollama_running) {
      setCheckIcon('icon-ollama', 'ok');
      document.getElementById('ollama-install').style.display = 'none';
      document.getElementById('ollama-model-setup-area').style.display = 'block';
      setBadge('badge-ai', d.ollama_models.length > 0 ? '✅ 準備完了' : '⚠️ モデル未取得', d.ollama_models.length > 0 ? 'ok' : 'warn');
      // 起動確認できたらバージョン情報も取得
      checkOllamaVersion();
    } else {
      setCheckIcon('icon-ollama', 'fail');
      document.getElementById('ollama-install').style.display = 'block';
      document.getElementById('ollama-model-setup-area').style.display = 'none';
      document.getElementById('ollama-version-info').style.display = 'none';
      setBadge('badge-ai', '❌ 未起動', 'error');
    }
    return d.ollama_running;
  } catch { setCheckIcon('icon-ollama', 'fail'); return false; }
}

function applyOllamaModelsPanel(models) {
  const displayEl = document.getElementById('ollama-models-display');
  const installedEl = document.getElementById('ollama-installed-models');
  const installEl = document.getElementById('ollama-model-install');
  if (!displayEl || !installedEl || !installEl) return;
  displayEl.style.display = 'block';

  if (models.length > 0) {
    setCheckIcon('icon-ollama-model', 'ok');
    installedEl.innerHTML = `
        <div style="margin-bottom:8px;font-size:13px;font-weight:700;color:var(--success)">
          ✅ インストール済みモデル (${models.length}件)
        </div>
        ${models.map(m => `
          <div class="ollama-model-list-item" onclick="selectOllamaModel('${m.name}', this)">
            <span>${m.name}</span>
            <span style="font-size:11px;color:var(--text-secondary)">${m.size_gb}GB</span>
          </div>
        `).join('')}
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">
          👆 モデルをクリックすると設定に反映されます
        </div>
      `;
    installEl.style.display = 'none';
    setBadge('badge-ai', '✅ 準備完了', 'ok');
  } else {
    setCheckIcon('icon-ollama-model', 'fail');
    installedEl.innerHTML = '<div style="font-size:13px;color:var(--danger);margin-bottom:8px">❌ モデルがインストールされていません</div>';
    installEl.style.display = 'block';
    setBadge('badge-ai', '⚠️ モデル未取得', 'warn');
  }
}

async function checkOllamaModels() {
  setCheckIcon('icon-ollama-model', 'loading');
  try {
    const r = await fetch('/api/ollama-models');
    const d = await r.json();
    const displayEl = document.getElementById('ollama-models-display');
    const installedEl = document.getElementById('ollama-installed-models');
    if (!d.running) {
      setCheckIcon('icon-ollama-model', 'fail');
      if (displayEl) displayEl.style.display = 'block';
      if (installedEl) {
        installedEl.innerHTML = '<div style="font-size:13px;color:var(--danger);margin-bottom:8px">❌ Ollamaが起動していません</div>';
      }
      const installEl = document.getElementById('ollama-model-install');
      if (installEl) installEl.style.display = 'none';
      setBadge('badge-ai', '❌ 未起動', 'error');
      return false;
    }
    applyOllamaModelsPanel(d.models || []);
    return (d.models || []).length > 0;
  } catch { setCheckIcon('icon-ollama-model', 'fail'); return false; }
}

function selectOllamaModel(name, el) {
  document.querySelectorAll('.ollama-model-list-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('cfg-ollama-model').value = name;
  cfg.ollamaModel = name;
  showToast(`モデルを「${name}」に設定しました`, 'success');
}

async function loadOllamaModelList() {
  const listEl = document.getElementById('ollama-model-list');
  listEl.style.display = 'block';
  listEl.innerHTML = '<div class="spinner" style="margin:6px auto;width:20px;height:20px"></div>';
  try {
    const r = await fetch('/api/ollama-models');
    const d = await r.json();
    if (!d.running) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--danger)">❌ Ollamaが起動していません</div>';
      return;
    }
    if (d.models.length === 0) {
      listEl.innerHTML = '<div style="font-size:12px;color:var(--warning)">⚠️ モデルが見つかりません（セットアップガイドでインストール）</div>';
      return;
    }
    listEl.innerHTML = d.models.map(m => `
      <div class="ollama-model-list-item${cfg.ollamaModel === m.name ? ' selected' : ''}"
           onclick="selectOllamaModel('${m.name}', this)">
        <span>${m.name}</span>
        <span style="font-size:11px;color:var(--text-secondary)">${m.size_gb}GB</span>
      </div>
    `).join('');
  } catch {
    listEl.innerHTML = '<div style="font-size:12px;color:var(--danger)">取得に失敗しました</div>';
  }
}

async function runAllChecks() {
  const r = await fetch('/api/setup-check').catch(() => null);
  if (!r || !r.ok) return;
  const d = await r.json();

  setCheckIcon('icon-ffmpeg', d.ffmpeg ? 'ok' : 'fail');
  document.getElementById('ffmpeg-install').style.display = d.ffmpeg ? 'none' : 'block';

  setCheckIcon('icon-whisper', d.whisper ? 'ok' : 'fail');
  document.getElementById('whisper-install').style.display = d.whisper ? 'none' : 'block';

  // faster-whisper（任意推奨）
  const fwIcon = document.getElementById('icon-faster-whisper');
  if (fwIcon) setCheckIcon('icon-faster-whisper', d.faster_whisper ? 'ok' : 'fail');
  const fwInstall = document.getElementById('faster-whisper-install');
  if (fwInstall) fwInstall.style.display = d.faster_whisper ? 'none' : 'block';

  // 少なくとも片方のエンジンがあればOK
  const transcribeOk = d.ffmpeg && (d.whisper || d.faster_whisper);
  setBadge('badge-transcribe', transcribeOk ? '✅ 準備完了' : '⚠️ 要設定', transcribeOk ? 'ok' : 'warn');

  setCheckIcon('icon-ollama', d.ollama_running ? 'ok' : 'fail');
  document.getElementById('ollama-install').style.display = d.ollama_running ? 'none' : 'block';
  document.getElementById('ollama-model-setup-area').style.display = d.ollama_running ? 'block' : 'none';

  const displayEl = document.getElementById('ollama-models-display');
  const installPanel = document.getElementById('ollama-model-install');

  if (!d.ollama_running) {
    setBadge('badge-ai', '❌ 未起動', 'error');
    if (displayEl) displayEl.style.display = 'none';
    if (installPanel) installPanel.style.display = 'none';
    const ver = document.getElementById('ollama-version-info');
    if (ver) ver.style.display = 'none';
    return;
  }

  let modelsForPanel = [];
  try {
    const r2 = await fetch('/api/ollama-models');
    if (r2.ok) {
      const d2 = await r2.json();
      if (d2.running && Array.isArray(d2.models)) {
        modelsForPanel = d2.models;
      }
    }
  } catch (_) {}

  applyOllamaModelsPanel(modelsForPanel);

  checkOllamaVersion();
}

function _escapeHtml(s) {
  if (s == null || s === '') return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function _renderLlmRecommendationHtml(d) {
  const rec = d.recommendation || {};
  const alts = (rec.alternatives || []).map(
    a => `<li><strong>${_escapeHtml(a.model)}</strong> — ${_escapeHtml(a.note)}</li>`
  ).join('');
  let inner = `
    <div class="llm-rec-mode">${_escapeHtml(d.pc_class)} · ${_escapeHtml(rec.mode_label || '')}</div>
    <p class="form-hint">${_escapeHtml(rec.summary || '')}</p>`;
  if (rec.primary_ollama_model) {
    inner += `<p style="margin-top:8px"><strong>推奨モデル</strong> <code>${_escapeHtml(rec.primary_ollama_model)}</code></p>
      <div class="code-copy-row" style="margin-top:6px">
        <code>${_escapeHtml(rec.pull_command || '')}</code>
        <button type="button" class="btn btn-sm btn-ghost js-llm-copy-pull">📋</button>
      </div>
      <button type="button" class="btn btn-sm btn-primary js-llm-apply-model" style="margin-top:8px">設定にこのモデルを反映</button>`;
  }
  if (alts) {
    inner += `<ul class="llm-rec-alts" style="margin:8px 0 0 18px;font-size:13px">${alts}</ul>`;
  }
  inner += `<p class="form-hint" style="margin-top:8px;font-size:11px">根拠: ${_escapeHtml(rec.doc_ref || '')}</p>`;
  return `<div class="llm-rec-card">${inner}</div>`;
}

function _bindLlmRecommendHandlers(container, d) {
  if (!container) return;
  const rec = d.recommendation || {};
  const copyBtn = container.querySelector('.js-llm-copy-pull');
  if (copyBtn && rec.pull_command) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(rec.pull_command);
      showToast('コピーしました', 'success');
    };
  }
  const applyBtn = container.querySelector('.js-llm-apply-model');
  if (applyBtn && rec.primary_ollama_model) {
    applyBtn.onclick = () => applyRecommendedOllamaModel(rec.primary_ollama_model);
  }
}

async function refreshSystemSpecRecommendations() {
  const sumIds = ['pc-spec-summary', 'pc-spec-summary-setup'];
  const bodyIds = ['llm-recommend-body', 'llm-recommend-body-setup'];
  sumIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '⏳ 取得中…';
      el.style.color = '';
    }
  });
  bodyIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  try {
    const r = await fetch('/api/system-spec');
    if (!r.ok) throw new Error('APIエラー');
    const d = await r.json();
    const sumLine = [
      `OS ${d.os}`,
      `RAM ${d.ram_total_gb}GB`,
      d.cpu_logical ? `CPU論理 ${d.cpu_logical}` : null,
      d.gpu_summary ? `GPU ${d.gpu_summary}` : 'GPU 未検出（NVIDIA のみ nvidia-smi で検出）',
      `${d.pc_class} ${d.pc_class_label}`,
    ].filter(Boolean).join(' ／ ');
    sumIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = sumLine;
        el.style.color = 'var(--text-secondary)';
      }
    });
    const html = _renderLlmRecommendationHtml(d);
    bodyIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = html;
        _bindLlmRecommendHandlers(el, d);
      }
    });
    showToast('PCスペックとモデル候補を更新しました', 'success');
  } catch (_) {
    sumIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '取得に失敗しました';
        el.style.color = 'var(--danger)';
      }
    });
    showToast('スペック取得に失敗しました', 'error');
  }
}

function applyRecommendedOllamaModel(name) {
  if (!name) return;
  const input = document.getElementById('cfg-ollama-model');
  if (input) input.value = name;
  cfg.ollamaModel = name;
  showToast(`モデルを「${name}」に設定しました（保存で確定）`, 'success');
}

async function checkWhisperModelDownload() {
  const model = document.getElementById('cfg-whisper-model')?.value || 'base';
  const rtEl  = document.getElementById('cfg-realtime-engine');
  const finEl = document.getElementById('cfg-final-engine');
  const rtEngine  = (rtEl?.value  || cfg.realtimeEngine || cfg.localEngine || 'faster');
  const finEngine = (finEl?.value || cfg.finalEngine    || cfg.localEngine || 'faster');
  const engines = rtEngine === finEngine ? [rtEngine] : [rtEngine, finEngine];
  const labelOf = (e) => e === 'faster' ? 'faster-whisper' : 'openai-whisper';
  const hints = [
    document.getElementById('whisper-model-check-hint'),
    document.getElementById('whisper-model-check-setup'),
  ].filter(Boolean);

  const setHints = (text, colorVar) => {
    hints.forEach(h => {
      h.textContent = text;
      h.style.color = colorVar || '';
    });
  };

  setHints('⏳ 確認中…', 'var(--text-secondary)');
  try {
    const results = await Promise.all(engines.map(async (engine) => {
      const r = await fetch(`/api/whisper-model-check?model=${encodeURIComponent(model)}&engine=${encodeURIComponent(engine)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'エラー');
      return { engine, ...d };
    }));

    const missingLib = results.find(x => !x.whisper_installed);
    if (missingLib) {
      setHints(`❌ ${labelOf(missingLib.engine)} が未インストールです`, 'var(--danger)');
      showToast(`${labelOf(missingLib.engine)} ライブラリ未インストール`, 'error');
      return;
    }
    const notReady = results.filter(x => !x.model_ready);
    if (notReady.length === 0) {
      const lbls = results.map(x => `[${labelOf(x.engine)}]`).join(' ');
      setHints(`✅ ${lbls} 「${model}」はダウンロード済みです`, 'var(--success)');
      showToast('モデルは利用可能です', 'success');
    } else {
      const lbls = notReady.map(x => `[${labelOf(x.engine)}]`).join(' ');
      setHints(`⚠️ ${lbls} 「${model}」は未ダウンロードです（初回ローカル文字起こしで取得）`, 'var(--warning)');
      showToast('モデルは未ダウンロードです', 'warning');
    }
  } catch (e) {
    setHints('❌ 確認に失敗しました', 'var(--danger)');
    showToast(`確認に失敗: ${e.message}`, 'error');
  }
}

// ============================================================
// 動作テスト
// ============================================================

async function testMic() {
  const el = document.getElementById('test-mic-result');
  el.className = 'test-result';
  el.textContent = '⏳ マイクを確認中...';

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (_) {
    el.className = 'test-result fail';
    el.innerHTML = '❌ マイクのアクセスが拒否されました<br><small>ブラウザのアドレスバー左のアイコンからマイクのアクセスを許可してください</small>';
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  let peak = 0;
  const t0 = performance.now();

  await new Promise(resolve => {
    function tick() {
      analyser.getByteTimeDomainData(buf);
      let localMax = 0;
      for (let i = 0; i < buf.length; i++) {
        const dev = Math.abs(buf[i] - 128);
        if (dev > localMax) localMax = dev;
      }
      const norm = localMax / 128;
      if (norm > peak) peak = norm;
      el.textContent = `⏳ 入力レベルを測定中…（ピーク ${Math.round(peak * 100)}%）`;
      if (performance.now() - t0 < 3000) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });

  stream.getTracks().forEach(t => t.stop());
  await ctx.close().catch(() => {});

  if (peak < 0.01) {
    el.className = 'test-result fail';
    el.innerHTML = '⚠️ マイクは許可されましたが、入力がほとんど検出できませんでした<br><small>デバイスの選択・ミュート・音量を確認してください</small>';
  } else {
    el.className = 'test-result ok';
    el.innerHTML = `✅ マイク入力を検出しました（ピーク約 ${Math.round(peak * 100)}%）`;
    checkTestsDone();
  }
}

async function testTranscribe() {
  const el = document.getElementById('test-transcribe-result');
  const btn = document.getElementById('btn-test-transcribe');
  el.className = 'test-result';
  el.textContent = '🎤 3秒間録音中...';
  btn.disabled = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.start();

    await new Promise(r => setTimeout(r, 3000));
    recorder.stop();
    stream.getTracks().forEach(t => t.stop());

    await new Promise(r => { recorder.onstop = r; });

    el.textContent = '⏳ 文字起こし中...';

    const blob = new Blob(chunks, { type: 'audio/webm' });
    const form = new FormData();
    const s = getSettingsFormSnapshot();
    form.append('audio', blob, 'test.webm');
    form.append('language', s.language);
    form.append('api_key', s.openaiKey);
    form.append('use_api', s.transcribeMethod === 'api' ? 'true' : 'false');
    form.append('model_size', s.whisperModel);
    form.append('engine', s.localEngine || 'faster');

    const res = await fetch('/api/transcribe', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'エラー');
    }
    const data = await res.json();
    const text = data.text || '（無音または認識不可）';

    el.className = 'test-result ok';
    el.innerHTML = `✅ 文字起こし成功<br><small>認識結果: 「${text.slice(0, 60)}...」</small>`;
    checkTestsDone();
  } catch (e) {
    el.className = 'test-result fail';
    el.innerHTML = `❌ 文字起こし失敗<br><small>${e.message}</small><br><small>セットアップガイドのSTEP1を確認してください</small>`;
  } finally {
    btn.disabled = false;
  }
}

async function testAI() {
  const el = document.getElementById('test-ai-result');
  el.className = 'test-result';
  el.textContent = '⏳ AIに接続中...';

  try {
    const s = getSettingsFormSnapshot();
    const res = await fetch('/api/test-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        use_ollama:   s.aiMethod === 'ollama',
        ollama_model: s.ollamaModel,
        api_key:      s.openaiKey,
        model:        s.openaiModel,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'エラー');
    }
    const data = await res.json();
    el.className = 'test-result ok';
    el.innerHTML = `✅ AI接続成功<br><small>応答: 「${data.response}」</small>`;
    checkTestsDone();
  } catch (e) {
    el.className = 'test-result fail';
    el.innerHTML = `❌ AI接続失敗<br><small>${e.message}</small><br><small>セットアップガイドのSTEP2を確認してください</small>`;
  }
}

function checkTestsDone() {
  const mic  = document.getElementById('test-mic-result')?.className.includes('ok');
  const tr   = document.getElementById('test-transcribe-result')?.className.includes('ok');
  const ai   = document.getElementById('test-ai-result')?.className.includes('ok');
  if (mic && tr && ai) {
    setBadge('badge-test', '✅ 完了', 'ok');
    document.getElementById('all-tests-ok').style.display = 'block';
  }
}

function copyCode(id) {
  const text = document.getElementById(id)?.textContent || '';
  navigator.clipboard.writeText(text).then(() => showToast('コピーしました！', 'success'));
}

// ============================================================
// アプリフォルダをエクスプローラーで開く
// ============================================================

async function openAppFolder() {
  try {
    const res = await fetch('/api/open-app-folder');
    if (!res.ok) throw new Error();
    showToast('📂 アプリフォルダを開きました。start.bat をダブルクリックしてください', 'success');
  } catch {
    showToast('フォルダを開けませんでした', 'error');
  }
}

// ============================================================
// PowerPoint 並列起動
// ============================================================

/**
 * セッション内のPPTXファイルをPowerPointで開く
 */
async function openPptx() {
  // pptxファイル名を取得（state or session）
  const pptxFile = state.pptxOriginalFile
    || state.session?.pptx_file
    || null;

  if (!pptxFile) {
    showToast('PPTXファイルが見つかりません。スライドを再アップロードしてください。', 'error');
    return;
  }

  try {
    const res = await fetch('/api/open-pptx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: pptxFile }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'エラー');
    }
    showToast('📊 PowerPointで開きました！PreDeckと並べて使いましょう', 'success');
    // 並列起動バナーを表示
    showPptxBanner();
  } catch (e) {
    showToast(`PowerPointを開けませんでした: ${e.message}`, 'error');
  }
}

/** 並列起動バナーを表示 */
function showPptxBanner() {
  const banner = document.getElementById('pptx-parallel-banner');
  if (banner) banner.style.display = 'flex';
}

/** 並列起動バナーを閉じる */
function closePptxBanner() {
  const banner = document.getElementById('pptx-parallel-banner');
  if (banner) banner.style.display = 'none';
}

/**
 * PPTXボタンの表示・非表示を更新
 * - state.hasPptxSource または session.pptx_file がある場合に表示
 */
function updatePptxButton() {
  const btn = document.getElementById('btn-open-pptx');
  if (!btn) return;
  const hasPptx = !!(state.hasPptxSource
    || state.pptxOriginalFile
    || state.session?.pptx_file);
  btn.style.display = hasPptx ? 'inline-flex' : 'none';
}

// ============================================================
// Ollama バージョン確認
// ============================================================

async function checkOllamaVersion() {
  const card = document.getElementById('ollama-version-info');
  if (!card) return;
  card.style.display = 'block';

  document.getElementById('ollama-current-ver').textContent = '確認中...';
  document.getElementById('ollama-latest-ver').textContent  = '確認中...';
  document.getElementById('ollama-update-available').style.display = 'none';
  document.getElementById('ollama-up-to-date').style.display       = 'none';

  try {
    const r = await fetch('/api/ollama-version');
    const d = await r.json();

    document.getElementById('ollama-current-ver').textContent = d.current  ? `v${d.current}`  : '取得失敗';
    document.getElementById('ollama-latest-ver').textContent  = d.latest   ? `v${d.latest}`   : '取得失敗';

    if (d.update_available) {
      document.getElementById('ollama-update-available').style.display = 'block';
    } else if (d.current && d.latest) {
      document.getElementById('ollama-up-to-date').style.display = 'block';
    }
  } catch {
    document.getElementById('ollama-current-ver').textContent = 'エラー';
    document.getElementById('ollama-latest-ver').textContent  = 'エラー';
  }
}

// ============================================================
// Markdown 軽量レンダリング
// ============================================================

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')  // XSS対策
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[間\]/g, '<span class="pause-marker">[間]</span>')
    .replace(/【(スライド\d+)】/g, '<span class="slide-marker">【$1】</span>')
    .replace(/^### (.*)/gm, '<strong style="font-size:15px;display:block;margin:8px 0 2px">$1</strong>')
    .replace(/^## (.*)/gm, '<strong style="font-size:16px;display:block;margin:10px 0 4px">$1</strong>')
    .replace(/^# (.*)/gm, '<strong style="font-size:18px;display:block;margin:12px 0 4px">$1</strong>')
    .replace(/\n/g, '<br>');
}

// ============================================================
// ユーティリティ
// ============================================================

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '不明';
  try {
    return new Date(iso).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) { return iso; }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ============================================================
// ⚡ プリセットモード
// ============================================================

const PRESETS = {
  vc:       { targetType: 'vc',       mins: 5,  secs: 0,  label: 'VCピッチ',   hint: '投資家向け：数字・市場規模・差別化・成長ストーリーを重視してAI改善します' },
  ringi:    { targetType: 'ringi',    mins: 10, secs: 0,  label: '社内稟議',   hint: '役員向け：ROI・リスク対策・意思決定の根拠を明確にします' },
  academic: { targetType: 'academic', mins: 15, secs: 0,  label: '学会発表',   hint: '研究者向け：方法論・先行研究との差異・再現性を重視します' },
  interview:{ targetType: 'interview',mins: 3,  secs: 0,  label: '面接対策',   hint: '面接官向け：具体的エピソード・成果数値・熱意を自然に伝えます' },
  lt:       { targetType: 'general',  mins: 5,  secs: 0,  label: 'LT発表',     hint: 'コミュニティ向け：インパクト・わかりやすさ・記憶に残るメッセージを重視します' },
};

function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;

  // 目的タイプをセット
  document.querySelectorAll('.target-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === p.targetType);
  });
  state.targetType = p.targetType;

  // 目標時間をセット
  document.getElementById('target-minutes').value = p.mins;
  document.getElementById('target-seconds').value = p.secs;
  state.targetDuration = p.mins * 60 + p.secs;

  // プリセットボタンのアクティブ表示
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });

  // ヒント表示
  const hintEl = document.getElementById('preset-hint');
  if (hintEl) {
    hintEl.textContent = `💡 ${p.label}モード: ${p.hint}`;
    hintEl.style.display = 'block';
  }

  showToast(`✓ ${p.label}モードを設定しました`, 'success');
}

// ============================================================
// 🏗️ 構造診断エンジン
// ============================================================

async function runStructureAnalysis() {
  const textEl = document.getElementById('transcript-editable');
  const text = textEl ? textEl.textContent.trim() : '';
  if (!text) return;

  const panelEl  = document.getElementById('structure-analysis');
  const resultEl = document.getElementById('structure-result');
  if (!panelEl || !resultEl) return;

  panelEl.style.display = 'block';
  resultEl.innerHTML = '<div style="text-align:center;padding:12px"><div class="spinner" style="margin:0 auto 6px"></div><span style="font-size:12px;color:var(--text-secondary)">構造を診断中...</span></div>';

  try {
    const res = await fetch('/api/analyze-structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_type: state.targetType }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    renderStructureDiagnosis(data, resultEl);
  } catch (e) {
    resultEl.innerHTML = `<div style="color:var(--danger);font-size:12px;padding:8px">診断に失敗しました: ${escHtml(e.message)}</div>`;
  }
}

function renderStructureDiagnosis(data, container) {
  const arc = data.arc;
  const arcDefs = [
    { key: 'intro',    label: '導入' },
    { key: 'problem',  label: '問題提起' },
    { key: 'solution', label: '解決策' },
    { key: 'evidence', label: '根拠・数値' },
    { key: 'cta',      label: 'CTA' },
  ];

  const arcHtml = `
    <div class="structure-arc">
      ${arcDefs.map((item, i) => `
        <div class="arc-item ${arc[item.key] ? 'ok' : 'ng'}">
          <div class="arc-dot">${arc[item.key] ? '✓' : (i + 1)}</div>
          <div class="arc-label">${item.label}</div>
        </div>
        ${i < arcDefs.length - 1 ? '<div class="arc-arrow">→</div>' : ''}
      `).join('')}
    </div>`;

  const rankColors = { A: ['#166534','#dcfce7'], B: ['#1d4ed8','#dbeafe'], C: ['#92400e','#fef3c7'], D: ['#991b1b','#fee2e2'] };
  const [rc, rb] = rankColors[data.rank] || rankColors.D;

  const scoreHtml = `
    <div class="structure-score-row">
      <div class="structure-rank" style="color:${rc};background:${rb}">${data.rank}ランク</div>
      <div class="structure-score-bar-wrap">
        <div class="structure-score-bar" style="width:${data.score}%"></div>
      </div>
      <span class="structure-score-val">${data.score}pt</span>
    </div>`;

  const improvementsHtml = data.top_improvements.length
    ? `<div class="structure-improvements">
        <div class="structure-imp-title">💡 優先改善項目</div>
        ${data.top_improvements.map(c => `
          <div class="structure-imp-item">
            <span class="structure-imp-icon">${c.icon}</span>
            <div>
              <div class="structure-imp-name">${escHtml(c.item)}</div>
              <div class="structure-imp-hint">${escHtml(c.hint)}</div>
            </div>
          </div>`).join('')}
      </div>`
    : `<div class="structure-perfect">🎉 全項目クリア！素晴らしい構成です！</div>`;

  container.innerHTML = arcHtml + scoreHtml + improvementsHtml;
}

// ============================================================
// 📺 テレプロンプター
// ============================================================

const tp = {
  scrollInterval: null,
  speed: 25,
  fontSize: 22,
  isPlaying: false,
};

function toggleTeleprompterMode() {
  const normalView = document.getElementById('tp-normal-view');
  const tpView     = document.getElementById('tp-mode-view');
  const btn        = document.getElementById('tp-mode-btn');
  if (!tpView) return;

  const entering = tpView.style.display === 'none';
  if (entering) {
    normalView.style.display = 'none';
    tpView.style.display     = 'flex';
    btn.textContent = '⬅️ 通常表示に戻る';
    // スクリプトを更新・先頭へ
    const tpScript = document.getElementById('tp-script');
    if (tpScript) {
      tpScript.innerHTML   = renderMarkdown(state.currentScript);
      tpScript.style.fontSize = tp.fontSize + 'px';
      tpScript.scrollTop   = 0;
      updateTpProgress();
    }
  } else {
    stopTp();
    normalView.style.display = 'block';
    tpView.style.display     = 'none';
    btn.textContent = '📜 スクロール原稿モード';
  }
}

function toggleTpScroll() {
  tp.isPlaying ? stopTp() : startTp();
}

function startTp() {
  tp.isPlaying = true;
  const btn = document.getElementById('tp-play-btn');
  if (btn) btn.textContent = '⏸ 一時停止';
  tp.scrollInterval = setInterval(() => {
    const el = document.getElementById('tp-script');
    if (!el) { stopTp(); return; }
    el.scrollTop += tp.speed / 10;
    updateTpProgress();
    if (el.scrollTop >= el.scrollHeight - el.clientHeight - 2) stopTp();
  }, 50);
}

function stopTp() {
  tp.isPlaying = false;
  clearInterval(tp.scrollInterval);
  tp.scrollInterval = null;
  const btn = document.getElementById('tp-play-btn');
  if (btn) btn.textContent = '▶ 自動スクロール';
}

function setTpSpeed(val) {
  tp.speed = parseInt(val);
}

function changeTpFontSize(delta) {
  tp.fontSize = Math.max(14, Math.min(40, tp.fontSize + delta));
  const el = document.getElementById('tp-script');
  if (el) el.style.fontSize = tp.fontSize + 'px';
}

function resetTp() {
  stopTp();
  const el = document.getElementById('tp-script');
  if (el) { el.scrollTop = 0; updateTpProgress(); }
}

function updateTpProgress() {
  const el     = document.getElementById('tp-script');
  const fillEl = document.getElementById('tp-progress-fill');
  if (!el || !fillEl) return;
  const pct = el.scrollHeight <= el.clientHeight
    ? 100
    : (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
  fillEl.style.width = `${Math.min(100, pct)}%`;
}

// ============================================================
// ⌨️ キーボードショートカット
// ============================================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // テキスト入力中は無効
    const t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
    if (state.currentScreen !== 'work') return;

    // ← → Home End でスライド切り替え
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0);
    } else if (e.key === 'End' && state.slides.length > 0) {
      e.preventDefault();
      goToSlide(state.slides.length - 1);
    }

    // Space: Step2では録音トグル、Step5テレプロンプターでは再生/停止
    if (e.key === ' ') {
      if (state.currentStep === 2) {
        e.preventDefault();
        toggleRecording();
      } else if (state.currentStep === 5) {
        const tpView = document.getElementById('tp-mode-view');
        if (tpView && tpView.style.display !== 'none') {
          e.preventDefault();
          toggleTpScroll();
        }
      }
    }
  });
}

// ============================================================
// ③文字おこし確認：録音削除ボタン
// ============================================================
function discardFromStep3() {
  if (!confirm('録音データと文字おこしを削除して②録音画面に戻りますか？')) return;
  discardRecording();
  // 文字おこしエリアをリセット
  const te = document.getElementById('transcript-editable');
  if (te) te.textContent = '';
  const meta = document.getElementById('transcript-meta');
  if (meta) meta.textContent = '';
  // 分析パネルを全部閉じる
  ['filler','weak','wpm','structure','stumble','metaphor','energy'].forEach(id => {
    const panelId = { filler:'filler-analysis', weak:'weak-word-analysis', wpm:'wpm-analysis',
      structure:'structure-analysis', stumble:'stumble-analysis', metaphor:'metaphor-suggestions', energy:'energy-heatmap' }[id];
    const panel = document.getElementById(panelId);
    const btn = document.getElementById(`abtn-${id}`);
    if (panel) panel.style.display = 'none';
    if (btn) btn.classList.remove('active');
  });
  goToStep(2);
}

// ============================================================
// ③文字おこし確認：分析パネルの開閉トグル
// ============================================================
const _analysisPanelMap = {
  filler:    { panel: 'filler-analysis',     run: () => runFillerAnalysis() },
  weak:      { panel: 'weak-word-analysis',  run: null },
  wpm:       { panel: 'wpm-analysis',        run: null },
  structure: { panel: 'structure-analysis',  run: () => runStructureAnalysis() },
  stumble:   { panel: 'stumble-analysis',    run: () => runStumbleAnalysis() },
  metaphor:  { panel: 'metaphor-suggestions',run: () => runMetaphorAnalysis() },
  energy:    { panel: 'energy-heatmap',      run: () => runEnergyAnalysis() },
};

function toggleAnalysisPanel(id) {
  const info = _analysisPanelMap[id];
  if (!info) return;
  const panel = document.getElementById(info.panel);
  const btn   = document.getElementById(`abtn-${id}`);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  if (isOpen) {
    panel.style.display = 'none';
    if (btn) btn.classList.remove('active');
  } else {
    panel.style.display = 'block';
    if (btn) btn.classList.add('active');
    // 初回表示時は自動で分析実行
    if (info.run && !panel.dataset.loaded) {
      info.run();
      panel.dataset.loaded = '1';
    }
  }
}

// ============================================================
// ④原稿改善：ピッチスコアパネルの開閉トグル
// ============================================================
function togglePitchScorePanel() {
  const panel = document.getElementById('pitch-score-panel');
  const triggerBtn = document.getElementById('btn-show-pitch');
  const rescoreBtn = document.getElementById('btn-rescore');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (triggerBtn) triggerBtn.classList.toggle('active', !isOpen);
  // 開いたときに再スコアボタンも表示
  if (!isOpen && rescoreBtn) rescoreBtn.style.display = 'inline-flex';
}

// ============================================================
// 保存ドロップダウン開閉
// ============================================================
function toggleSaveMenu() {
  const menu = document.getElementById('save-menu');
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : 'block';
  // 外クリックで閉じる
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', function closeSaveMenu(e) {
        if (!e.target.closest('.save-dropdown-wrap')) {
          menu.style.display = 'none';
          document.removeEventListener('click', closeSaveMenu);
        }
      });
    }, 0);
  }
}

// ============================================================
// QRコード生成（同一Wi-Fi内でモバイルアクセス）
// ============================================================
async function showQRCode() {
  const modal = document.getElementById('qr-modal');
  const container = document.getElementById('qr-code-container');
  const urlDisplay = document.getElementById('qr-url-display');
  if (!modal || !container) return;

  // ローカルIPを取得するためにバックエンドに問い合わせ
  let url = window.location.href;
  try {
    const res = await fetch('/api/local-ip');
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        url = `http://${data.ip}:${window.location.port || 8000}/`;
        if (state.sessionId) url += `?session=${state.sessionId}`;
      }
    }
  } catch (e) {
    // フォールバック: localhostのURLをそのまま使用
  }

  // QRコード生成
  container.innerHTML = '';
  try {
    new QRCode(container, {
      text: url,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
    if (urlDisplay) urlDisplay.textContent = url;
    modal.style.display = 'flex';
  } catch (e) {
    showToast('QRコード生成に失敗しました。ブラウザがオフラインの可能性があります。', 'error');
  }
}

function closeQRModal() {
  const modal = document.getElementById('qr-modal');
  if (modal) modal.style.display = 'none';
}
