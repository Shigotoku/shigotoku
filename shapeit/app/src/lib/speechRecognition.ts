export type SpeechSupport = "web-speech" | "keyboard-dictation" | "audio-only";

export function detectSpeechSupport(): SpeechSupport {
  const SR =
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  if (SR) return "web-speech";
  if (/iP(hone|ad|od)/.test(navigator.userAgent)) return "keyboard-dictation";
  return "audio-only";
}

export function startLiveSpeech(opts: {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
  /** false にすると Chrome の区切りで自動再開しない（既定: true） */
  autoRestart?: boolean;
}): { stop: () => void } | null {
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => Rec }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  let userStopped = false;
  const autoRestart = opts.autoRestart !== false;

  rec.lang = "ja-JP";
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (ev: RecEvent) => {
    let finalText = "";
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0]?.transcript ?? "";
      if (ev.results[i].isFinal) finalText += t;
      else interim += t;
    }
    if (interim) opts.onInterim?.(interim);
    if (finalText) opts.onFinal?.(finalText);
  };
  rec.onerror = (ev: { error?: string }) => {
    const code = ev.error || "error";
    if (code === "aborted" || userStopped) return;
    opts.onError?.(code);
  };
  rec.onend = () => {
    if (!userStopped && autoRestart) {
      try {
        rec.start();
        return;
      } catch {
        /* 即時再開できない場合は onEnd へ */
      }
    }
    opts.onEnd?.();
  };
  rec.start();
  return {
    stop: () => {
      userStopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

interface Rec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: RecEvent) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface RecEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
}
