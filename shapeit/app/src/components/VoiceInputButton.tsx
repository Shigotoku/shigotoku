import { Keyboard, Mic, MicOff, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  detectSpeechSupport,
  startLiveSpeech,
  type SpeechSupport,
} from "../lib/speechRecognition";
import { isIos } from "../lib/device";

type Props = {
  value: string;
  onChange: (text: string) => void;
  onFocusTextarea?: () => void;
  /** mobile では大きな押し話し UI */
  variant?: "compact" | "hero";
};

/**
 * 環境横断の音声入力。
 * 1) Web Speech（ブラウザ＝OS の認識）
 * 2) キーボード音声入力への誘導（iOS PWA など）
 * 3) 呼び出し側の音声添付フォールバックと併用
 */
export default function VoiceInputButton({
  value,
  onChange,
  onFocusTextarea,
  variant = "compact",
}: Props) {
  const [support, setSupport] = useState<SpeechSupport>("audio-only");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<{ stop: () => void } | null>(null);
  const baseRef = useRef("");

  const composeWithInterim = (base: string, interimText: string) => {
    if (!interimText) return base;
    return base ? `${base}\n${interimText}` : interimText;
  };

  useEffect(() => {
    setSupport(detectSpeechSupport());
  }, []);

  useEffect(() => {
    if (!listening) baseRef.current = value;
  }, [value, listening]);

  useEffect(() => {
    return () => sessionRef.current?.stop();
  }, []);

  const stop = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setListening(false);
    setInterim("");
  };

  const startWebSpeech = () => {
    setError(null);
    if (listening) {
      stop();
      return;
    }
    baseRef.current = value.trim();
    const session = startLiveSpeech({
      onInterim: (t) => {
        setInterim(t);
        onChange(composeWithInterim(baseRef.current, t));
      },
      onFinal: (t) => {
        const next = baseRef.current ? `${baseRef.current}\n${t}` : t;
        onChange(next);
        baseRef.current = next;
        setInterim("");
      },
      onError: (code) => {
        setListening(false);
        setInterim("");
        if (code === "not-allowed") {
          setError("マイクの許可が必要です。設定から許可してください。");
        } else if (code === "network") {
          setError("音声認識にネットワークが必要です。オフライン時はキーボード入力か音声添付を使ってください。");
        } else {
          setError(
            isIos()
              ? "この環境ではアプリ内認識が不安定です。キーボードのマイクで入力してください。"
              : "音声認識に失敗しました。もう一度試すか、キーボード入力を使ってください。",
          );
        }
      },
      onEnd: () => {
        setListening(false);
        setInterim("");
        sessionRef.current = null;
      },
    });
    if (!session) {
      setError("このブラウザではアプリ内の音声認識に対応していません。");
      setSupport(detectSpeechSupport() === "web-speech" ? "keyboard-dictation" : "audio-only");
      return;
    }
    sessionRef.current = session;
    setListening(true);
  };

  const openKeyboardDictation = () => {
    setError(null);
    onFocusTextarea?.();
  };

  if (variant === "hero") {
    return (
      <div className="space-y-3 rounded-2xl border border-mint/25 bg-gradient-to-b from-sand/80 to-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">話すだけで入力</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink/55">
              {support === "web-speech" && "端末の音声認識をアプリ内から使います（スクショ → 話す → 送信）。"}
              {support === "keyboard-dictation" &&
                "この端末ではキーボードのマイクが確実です。入力欄を開き、マイクをタップしてください。"}
              {support === "audio-only" && "文字起こし非対応のため、下の「音声添付」か手入力を使います。"}
            </p>
          </div>
        </div>

        {support === "web-speech" ? (
          <button
            type="button"
            onClick={startWebSpeech}
            className={`mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${
              listening ? "bg-ink animate-pulse shadow-ink/30" : "bg-mint shadow-mint/30"
            }`}
            aria-pressed={listening}
          >
            {listening ? <Square className="h-8 w-8" /> : <Mic className="h-9 w-9" />}
            <span className="mt-1 text-[10px] font-bold">{listening ? "停止" : "話す"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openKeyboardDictation}
            className="mx-auto flex min-h-[72px] w-full max-w-xs flex-col items-center justify-center gap-1 rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink active:bg-sand"
          >
            <Keyboard className="h-6 w-6 text-mint" aria-hidden />
            キーボードのマイクで話す
          </button>
        )}

        {listening && !interim && (
          <p className="rounded-xl bg-white/80 px-3 py-2 text-center text-sm text-ink/60" aria-live="polite">
            聞いています…（内容欄に表示されます）
          </p>
        )}

        {error && <p className="text-center text-xs text-amber-800">{error}</p>}

        {support === "web-speech" && (
          <button
            type="button"
            className="mx-auto flex items-center gap-1 text-[11px] text-ink/45 underline-offset-2 hover:underline"
            onClick={openKeyboardDictation}
          >
            <Keyboard className="h-3 w-3" aria-hidden />
            うまくいかないときはキーボード音声へ
          </button>
        )}
      </div>
    );
  }

  // compact（デスクトップ等）
  if (support === "audio-only") {
    return (
      <span className="text-[11px] text-ink/45" title="音声認識非対応">
        音声認識非対応
      </span>
    );
  }

  if (support === "keyboard-dictation") {
    return (
      <button
        type="button"
        onClick={openKeyboardDictation}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-ink/15 px-3 py-2 text-xs font-semibold text-ink/70"
      >
        <Keyboard className="h-3.5 w-3.5" aria-hidden />
        キーボードで音声入力
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={startWebSpeech}
        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${
          listening ? "border-mint bg-sand text-ink" : "border-ink/15 text-ink/70"
        }`}
        title="音声で入力（内容欄に随時表示）"
        aria-pressed={listening}
      >
        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {listening ? "聞き取り中…" : "音声入力"}
      </button>
      {error && <span className="max-w-[16rem] text-[10px] text-amber-800">{error}</span>}
    </div>
  );
}
