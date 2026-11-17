/**
 * 英語音声の再生エンジン。まずブラウザ内蔵（Web Speech Synthesis）。
 * 端末内で完結する。Kokoro 等の高品質エンジンは TtsEngine を実装して差し替える。
 */
export interface TtsEngine {
  readonly id: string;
  readonly label: string;
  isSupported(): boolean;
  /** 文を再生キューに積む（先に積んだものから順に再生） */
  speak(text: string): void;
  /** 再生を止めてキューを空にする */
  stop(): void;
}

export function createBrowserTts(rate = 1.0): TtsEngine {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  let queued = 0;

  function pickVoice(): SpeechSynthesisVoice | undefined {
    const vs = synth?.getVoices() ?? [];
    return vs.find((v) => v.lang === "en-US" && /natural|neural|google/i.test(v.name)) ?? vs.find((v) => v.lang.startsWith("en"));
  }

  return {
    id: "browser-speech-synthesis",
    label: "ブラウザ内蔵音声",
    isSupported: () => Boolean(synth),
    speak(text) {
      if (!synth || !text.trim()) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      const v = pickVoice();
      if (v) u.voice = v;
      // 再生が遅れてきたら少し速める（最大 1.3 倍）
      queued += 1;
      u.rate = Math.min(1.3, rate + Math.max(0, queued - 2) * 0.05);
      u.onend = u.onerror = () => {
        queued = Math.max(0, queued - 1);
      };
      synth.speak(u);
    },
    stop() {
      queued = 0;
      synth?.cancel();
    },
  };
}
