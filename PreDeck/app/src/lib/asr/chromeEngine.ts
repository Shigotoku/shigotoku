import { detectSpeechSupport, speechErrorMessage, startLiveSpeech } from "@/lib/speech";
import type { AsrEngine } from "./types";

/** Chrome の Web Speech API（端末内モード）。音声は端末外に出ない。 */
export const chromeOnDeviceEngine: AsrEngine = {
  id: "chrome-on-device",
  label: "Chrome 端末内認識",
  audioLeavesDevice: false,
  isSupported: () => detectSpeechSupport() === "web-speech",
  async start(opts) {
    const handle = await startLiveSpeech({
      privacyMode: "clinical", // 端末内のみ。クラウドへ自動切替しない
      lang: opts.lang,
      vocabulary: opts.lang === "ja-JP" ? opts.vocabulary : undefined,
      localPhrases: opts.hints,
      onPreparing: opts.onPreparing,
      onInterim: opts.onInterim,
      onFinal: opts.onFinal,
      onError: (code) => opts.onError(speechErrorMessage(code)),
    });
    return handle ? { stop: handle.stop } : null;
  },
};
