/**
 * Web Speech API 音声認識（ShapeIt パターン + オンデバイス対応）
 *
 * - general: クラウド STT 優先。院内 FW 遮断時はオンデバイスへフォールバック
 * - clinical: オンデバイスのみ（診察会話）。クラウドへはフォールバックしない
 */
import { applyMedicalTermCorrections, applySpeechPhraseHints } from './medicalTermPostProcess';
import type { SpeechVocabulary } from './vocabulary';

export type SpeechSupport = 'web-speech' | 'keyboard-dictation' | 'audio-only';

/** clinical = 患者会話などローカル必須 / general = 受付メモなど */
export type SpeechPrivacyMode = 'clinical' | 'general';

export type OnDeviceSpeechStatus =
  'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported';

export interface LiveSpeechOptions {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
  /** 最終結果からこの秒数無音で onSilence を呼ぶ（省略時は無効） */
  silenceMs?: number;
  onSilence?: () => void;
  /** 省略時 general */
  privacyMode?: SpeechPrivacyMode;
  lang?: string;
  /**
   * オンデバイス品質（clinical は conversation 推奨）。
   * 'default' は quality を Chrome に渡さない（Chrome 155 では quality 指定で unavailable になる環境がある）
   */
  quality?: 'command' | 'dictation' | 'conversation' | 'default';
  /** 言語パック準備中 */
  onPreparing?: (message: string) => void;
  /** clinical 時に言語パック確認・マイク許可確認を省略して即開始する（呼び出し元で確認済みの場合のみ） */
  skipPreflight?: boolean;
  /** 診断用: 認識エンジンのイベント名（start/audiostart/speechstart/error:… など） */
  onDebug?: (event: string) => void;
  /** 医療用語バイアス・確定文後処理 */
  vocabulary?: SpeechVocabulary;
  /**
   * オンデバイス認識で優先して聞き取らせたい語（Chrome の contextual biasing）。
   * 未対応・エラーのときは自動で外して通常の認識を続ける。
   */
  localPhrases?: string[];
  /**
   * 確定結果の候補（n-best）から1つ選ぶための採点。候補の文字列を受け取り、高いほど良い（医学用語を多く含むなど）。
   * 指定すると候補を最大5つ取得し、1位より明らかに高得点の候補があればそちらを使う。
   */
  scoreAlternative?: (text: string) => number;
  /**
   * 事前に開いておいたマイクの音声（話し始めの取りこぼしを減らす）。
   * start(track) に未対応のブラウザでは、通常どおりマイクを開く。
   */
  audioTrack?: MediaStreamTrack;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length?: number;
      0?: { transcript?: string };
      [alt: number]: { transcript?: string } | boolean | number | undefined;
    };
  };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  maxAlternatives?: number;
  phrases?: unknown;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(track?: MediaStreamTrack): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionOptions {
  langs: string[];
  processLocally?: boolean;
  quality?: 'command' | 'dictation' | 'conversation' | 'default';
}

/** quality が 'default' のときは quality キー自体を渡さない */
function buildAvailabilityOptions(
  lang: string,
  quality: SpeechRecognitionOptions['quality']
): SpeechRecognitionOptions {
  const o: SpeechRecognitionOptions = { langs: [lang], processLocally: true };
  if (quality && quality !== 'default') o.quality = quality;
  return o;
}

type SpeechRecognitionStatic = SpeechRecognitionCtor & {
  available?: (options: SpeechRecognitionOptions) => Promise<OnDeviceSpeechStatus>;
  install?: (options: SpeechRecognitionOptions) => Promise<boolean>;
};

function getSpeechRecognitionCtor(): SpeechRecognitionStatic | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function supportsOnDeviceSpeech(): boolean {
  const Ctor = getSpeechRecognitionCtor();
  return Boolean(Ctor?.available && Ctor?.install);
}

/** iPhone / iPad（iPadOS 13+ は UA が Macintosh） */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iP(hone|ad|od)/.test(navigator.userAgent)) return true;
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
}

/** ホーム画面に追加したアプリ（standalone）として動作中か */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  } catch {
    return false;
  }
}

export function detectSpeechSupport(): SpeechSupport {
  // iOS のホーム画面アプリでは Web Speech API が service-not-allowed で必ず失敗するため、
  // 最初からキーボードの音声入力（Siri 音声入力）案内にする
  if (isIosDevice() && isStandaloneDisplay()) return 'keyboard-dictation';
  if (getSpeechRecognitionCtor()) return 'web-speech';
  if (isIosDevice()) return 'keyboard-dictation';
  return 'audio-only';
}

export function speechErrorMessage(code: string): string {
  if (code === 'not-allowed') {
    return 'マイクの使用が許可されていません。アドレスバー付近のマイクアイコンで許可してください';
  }
  if (code === 'network') {
    return '音声認識にネットワーク接続が必要です。インターネット接続を確認してください';
  }
  if (code === 'no-speech') return '音声が検出されませんでした';
  if (code === 'audio-capture') {
    return 'マイクが検出できません。接続とブラウザのマイク設定を確認してください';
  }
  if (code === 'service-not-allowed') {
    if (isIosDevice()) {
      return 'iPhone/iPadでは、文字欄をタップしてキーボードのマイク(🎤)で話してください。マイクが無い場合は 設定→一般→キーボード→音声入力 をオンにしてください';
    }
    return 'ブラウザの設定で音声認識がブロックされています。Chrome または Edge をお試しください';
  }
  if (code === 'not-supported') {
    return 'このブラウザでは音声認識に対応していません';
  }
  if (code === 'local-unavailable') {
    return '端末内音声認識が利用できません。Chrome/Edge で日本語オンデバイスパックをインストールしてください';
  }
  if (code === 'language-not-supported') {
    return '日本語のオンデバイス音声認識に対応していません';
  }
  if (code === 'aborted') return '音声入力が中断されました';
  if (code === 'timeout') {
    return 'マイクの許可確認がタイムアウトしました。ブラウザのマイク許可ダイアログを確認してください';
  }
  if (code && code !== 'error') return `音声認識に失敗しました（${code}）`;
  return '音声認識に失敗しました。Chrome/Edge でマイク許可を確認してください';
}

export async function getOnDeviceSpeechStatus(
  lang = 'ja-JP',
  quality: SpeechRecognitionOptions['quality'] = 'conversation'
): Promise<OnDeviceSpeechStatus> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor?.available) return 'unsupported';
  try {
    const status = await Ctor.available(buildAvailabilityOptions(lang, quality));
    // Chrome 155 以降は quality 指定付きだと unavailable になる環境がある → 指定なしで再確認
    if (status === 'unavailable' && quality && quality !== 'default') {
      return await Ctor.available(buildAvailabilityOptions(lang, 'default'));
    }
    return status;
  } catch {
    return 'unsupported';
  }
}

/**
 * オンデバイス音声認識の準備（言語パック確認・ダウンロード）
 */
export async function ensureOnDeviceSpeechReady(options: {
  lang?: string;
  quality?: SpeechRecognitionOptions['quality'];
  onProgress?: (message: string) => void;
}): Promise<{ ok: boolean; status: OnDeviceSpeechStatus }> {
  const lang = options.lang ?? 'ja-JP';
  const quality = options.quality ?? 'conversation';
  const Ctor = getSpeechRecognitionCtor();

  if (!Ctor?.available || !Ctor?.install) {
    return { ok: false, status: 'unsupported' };
  }

  let checkOpts = buildAvailabilityOptions(lang, quality);

  let status = await Ctor.available(checkOpts);

  // Chrome 155 以降は quality 指定付きだと unavailable になる環境がある → 指定なしで再確認
  if (status === 'unavailable' && quality && quality !== 'default') {
    const fallbackOpts = buildAvailabilityOptions(lang, 'default');
    const fallbackStatus = await Ctor.available(fallbackOpts);
    if (fallbackStatus !== 'unavailable') {
      checkOpts = fallbackOpts;
      status = fallbackStatus;
    }
  }

  if (status === 'available') {
    return { ok: true, status };
  }

  if (status === 'downloadable' || status === 'downloading') {
    options.onProgress?.('日本語の音声認識パックをダウンロード中…');
    try {
      const installed = await Ctor.install(checkOpts);
      if (installed) {
        status = await Ctor.available(checkOpts);
        if (status === 'available') {
          return { ok: true, status };
        }
      }
    } catch {
      /* fall through */
    }
  }

  return { ok: false, status };
}

/** Web Speech API 起動前にマイク許可を取得（未許可だと即時エラーになるブラウザ対策） */
let micGrantedThisSession = false;

export async function ensureMicrophonePermission(
  timeoutMs = 15000
): Promise<'granted' | 'denied' | 'no-device' | 'timeout'> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'granted';
  }
  // 許可ダイアログの回数を減らす:
  //  - 同じ画面セッションで一度許可されたら再確認しない
  //  - iOS は音声認識の開始時にブラウザ自身が許可を求めるため、事前の getUserMedia（=2重ダイアログ）を省く
  //  - Permissions API で許可済みと分かれば getUserMedia を呼ばない
  if (micGrantedThisSession || isIosDevice()) return 'granted';
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    if (status?.state === 'granted') {
      micGrantedThisSession = true;
      return 'granted';
    }
  } catch {
    /* Permissions API 非対応 → getUserMedia で確認 */
  }
  try {
    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      }),
      new Promise<MediaStream>((_, reject) => {
        setTimeout(() => {
          reject(new DOMException('マイク許可の確認がタイムアウトしました', 'TimeoutError'));
        }, timeoutMs);
      }),
    ]);
    for (const track of stream.getTracks()) {
      track.stop();
    }
    micGrantedThisSession = true;
    return 'granted';
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'TimeoutError') {
      return 'timeout';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'no-device';
    }
    return 'denied';
  }
}

function mapStartException(e: unknown, useLocal: boolean): string {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
      return 'not-allowed';
    }
    if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
      return 'audio-capture';
    }
    if (e.name === 'InvalidStateError') {
      return 'error';
    }
  }
  return useLocal ? 'local-unavailable' : 'error';
}

interface RecognitionSessionConfig {
  useLocal: boolean;
  usePhraseHints: boolean;
}

/** 候補(n-best)のうち、採点が1位より明らかに高いものを選ぶ（同点・僅差なら認識エンジンの1位をそのまま使う） */
function pickBestAlternative(
  result: { length?: number; [alt: number]: unknown },
  top: string,
  opts: LiveSpeechOptions
): string {
  const score = opts.scoreAlternative;
  const n = result.length ?? 1;
  if (!score || n < 2) return top;
  let best = top;
  let bestScore = score(top);
  for (let k = 1; k < Math.min(n, 5); k++) {
    const t = (result[k] as { transcript?: string } | undefined)?.transcript ?? '';
    if (!t || t === top) continue;
    const s = score(t);
    // 1位を覆すのは、医学用語の一致が明らかに多いとき（+1 以上）だけ
    if (s >= bestScore + 1) {
      best = t;
      bestScore = s;
    }
  }
  return best;
}

function bindRecognitionHandlers(
  rec: SpeechRecognitionLike,
  opts: LiveSpeechOptions,
  getStopped: () => boolean
): { clearSilenceTimer: () => void } {
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;

  const clearSilenceTimer = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const scheduleSilence = () => {
    if (!opts.silenceMs || !opts.onSilence) return;
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      opts.onSilence?.();
    }, opts.silenceMs);
  };

  rec.onresult = (ev) => {
    let finalText = '';
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0]?.transcript ?? '';
      if (ev.results[i].isFinal) finalText += pickBestAlternative(ev.results[i], t, opts);
      else interim += t;
    }
    if (interim) opts.onInterim?.(interim);
    if (finalText) {
      const corrected = opts.vocabulary
        ? applyMedicalTermCorrections(finalText, opts.vocabulary)
        : finalText;
      opts.onFinal?.(corrected);
      scheduleSilence();
    }
  };

  if (opts.onDebug) {
    const dbg = rec as unknown as Record<string, unknown>;
    for (const name of [
      'start',
      'audiostart',
      'soundstart',
      'speechstart',
      'speechend',
      'audioend',
      'end',
      'nomatch',
    ]) {
      dbg[`on${name}`] = () => opts.onDebug?.(name);
    }
  }

  rec.onerror = (ev) => {
    const code = ev.error || 'error';
    opts.onDebug?.(
      `error:${code}${(ev as { message?: string }).message ? `(${(ev as { message?: string }).message})` : ''}`
    );
    if (code === 'phrases-not-supported') {
      // 語彙の指定に対応していない: 外して、次の自動再開から通常の認識に戻す
      try {
        rec.phrases = [];
      } catch {
        /* ignore */
      }
      return;
    }
    if (code === 'no-speech' || code === 'aborted') return;
    if (opts.privacyMode === 'clinical' && (code === 'network' || code === 'service-not-allowed')) {
      opts.onError?.('local-unavailable');
      return;
    }
    opts.onError?.(code);
  };

  rec.onend = () => {
    clearSilenceTimer();
    if (getStopped()) {
      opts.onEnd?.();
      return;
    }
    // Chrome は continuous でもセッションを短く切るため、ユーザー停止まで自動再開する
    setTimeout(() => {
      if (getStopped()) {
        opts.onEnd?.();
        return;
      }
      try {
        startRec(rec, opts);
      } catch {
        opts.onEnd?.();
      }
    }, 80);
  };

  return { clearSilenceTimer };
}

type PhraseCtor = new (phrase: string, boost?: number) => unknown;

/** オンデバイス認識に、聞き取らせたい語（医学用語など）を渡す。使えない環境では何もしない */
function applyLocalPhrases(rec: SpeechRecognitionLike, opts: LiveSpeechOptions): void {
  const terms = opts.localPhrases;
  if (!terms || terms.length === 0 || !('phrases' in rec)) return;
  const Phrase = (window as unknown as { SpeechRecognitionPhrase?: PhraseCtor })
    .SpeechRecognitionPhrase;
  if (!Phrase) return;
  try {
    rec.phrases = terms.map((p) => new Phrase(p, 3));
    opts.onDebug?.('phrases:' + terms.length);
  } catch {
    /* 未対応のブラウザは無視 */
  }
}

/** 事前に開いたマイクがあればそれを渡して開始。未対応・失敗のときは通常の開始に切り替える */
function startRec(rec: SpeechRecognitionLike, opts: LiveSpeechOptions): void {
  const track = opts.audioTrack;
  if (track && track.readyState === 'live') {
    try {
      rec.start(track);
      return;
    } catch (e) {
      // InvalidStateError は呼び出し側で再試行する。それ以外（引数に未対応など）は通常の開始へ
      if (e instanceof DOMException && e.name === 'InvalidStateError') throw e;
    }
  }
  rec.start();
}

function configureRecognition(
  rec: SpeechRecognitionLike,
  opts: LiveSpeechOptions,
  config: RecognitionSessionConfig
): void {
  rec.lang = opts.lang ?? 'ja-JP';
  rec.continuous = true;
  rec.interimResults = true;
  if (opts.scoreAlternative) {
    try {
      rec.maxAlternatives = 5;
    } catch {
      /* 未対応なら1位だけ */
    }
  }

  if (config.useLocal) {
    rec.processLocally = true;
    applyLocalPhrases(rec, opts);
  } else {
    if ('processLocally' in rec) {
      rec.processLocally = false;
    }
    if (config.usePhraseHints) {
      applySpeechPhraseHints(rec, opts.vocabulary);
    }
  }
}

function startRecognitionSession(
  Ctor: SpeechRecognitionStatic,
  opts: LiveSpeechOptions,
  config: RecognitionSessionConfig
): { stop: () => void; local: boolean } | null {
  const rec = new Ctor();
  configureRecognition(rec, opts, config);

  let stopped = false;
  const { clearSilenceTimer } = bindRecognitionHandlers(rec, opts, () => stopped);

  const tryStart = (): boolean => {
    try {
      startRec(rec, opts);
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        try {
          rec.stop();
          startRec(rec, opts);
          return true;
        } catch (retryErr) {
          opts.onError?.(mapStartException(retryErr, config.useLocal));
          return false;
        }
      }
      opts.onError?.(mapStartException(e, config.useLocal));
      return false;
    }
  };

  if (!tryStart()) {
    clearSilenceTimer();
    return null;
  }

  return {
    local: config.useLocal,
    stop: () => {
      stopped = true;
      clearSilenceTimer();
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * リアルタイム音声認識を開始
 * clinical モードではオンデバイスのみ（クラウド STT 不使用）
 */
export async function startLiveSpeech(
  opts: LiveSpeechOptions
): Promise<{ stop: () => void; local: boolean } | null> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const privacyMode = opts.privacyMode ?? 'general';
  const lang = opts.lang ?? 'ja-JP';
  const quality = opts.quality ?? (privacyMode === 'clinical' ? 'conversation' : 'dictation');

  if (privacyMode === 'clinical' && opts.skipPreflight) {
    // 事前確認（言語パック・マイク許可）を済ませた呼び出し元向け: 待たずに即開始する
    return startRecognitionSession(Ctor, opts, { useLocal: true, usePhraseHints: false });
  }

  if (privacyMode === 'clinical') {
    opts.onPreparing?.('端末内音声認識を準備中…');
    const ready = await ensureOnDeviceSpeechReady({
      lang,
      quality,
      onProgress: opts.onPreparing,
    });
    if (!ready.ok) {
      opts.onError?.(
        ready.status === 'unsupported' ? 'local-unavailable' : 'language-not-supported'
      );
      return null;
    }

    opts.onPreparing?.('マイクの許可を確認中…');
    const mic = await ensureMicrophonePermission();
    if (mic === 'denied') {
      opts.onError?.('not-allowed');
      return null;
    }
    if (mic === 'no-device') {
      opts.onError?.('audio-capture');
      return null;
    }
    if (mic === 'timeout') {
      opts.onError?.('timeout');
      return null;
    }

    return startRecognitionSession(Ctor, opts, { useLocal: true, usePhraseHints: false });
  }

  // general: オンデバイス導入済みならローカル、未導入ならクラウド（フレーズバイアスなしで安定優先）
  let preferLocal = false;
  if (supportsOnDeviceSpeech()) {
    const status = await getOnDeviceSpeechStatus(lang, quality);
    preferLocal = status === 'available';
  }

  opts.onPreparing?.('マイクの許可を確認中…');
  const mic = await ensureMicrophonePermission();
  if (mic === 'denied') {
    opts.onError?.('not-allowed');
    return null;
  }
  if (mic === 'no-device') {
    opts.onError?.('audio-capture');
    return null;
  }
  if (mic === 'timeout') {
    opts.onError?.('timeout');
    return null;
  }

  if (preferLocal) {
    return startRecognitionSession(Ctor, opts, { useLocal: true, usePhraseHints: false });
  }

  // クラウド STT（phrases は phrases-not-supported の原因になるため general では使わない）
  const cloudHandle = startRecognitionSession(Ctor, opts, {
    useLocal: false,
    usePhraseHints: false,
  });
  if (cloudHandle) {
    return cloudHandle;
  }

  // クラウド起動失敗時: オンデバイスパックの準備を試みる
  if (supportsOnDeviceSpeech()) {
    opts.onPreparing?.('端末内音声認識を準備中…');
    const ready = await ensureOnDeviceSpeechReady({
      lang,
      quality,
      onProgress: opts.onPreparing,
    });
    if (ready.ok) {
      return startRecognitionSession(Ctor, opts, { useLocal: true, usePhraseHints: false });
    }
  }

  return null;
}

/** base テキストに interim を合成（確定前の表示用） */
export function composeWithInterim(
  base: string,
  interimText: string,
  joinWithNewline = false
): string {
  if (!interimText) return base;
  if (!base) return interimText;
  return joinWithNewline ? `${base}\n${interimText}` : `${base}${interimText}`;
}
