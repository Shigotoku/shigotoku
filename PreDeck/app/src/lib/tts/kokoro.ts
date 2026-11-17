import type { TtsEngine } from "./index";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

type Kokoro = {
  generate: (text: string, o: { voice: string; speed: number }) => Promise<{ audio: Float32Array; sampling_rate: number }>;
};

export interface KokoroOptions {
  voice?: string;
  /** モデル読み込みの進捗（0〜100） */
  onProgress?: (percent: number) => void;
  /** 読み込み失敗時（呼び出し側でブラウザ音声へ切り替える） */
  onLoadError?: (message: string) => void;
}

/**
 * ブラウザ内で動く高品質 TTS（Kokoro-82M, Apache-2.0）。音声合成は端末内で完結する。
 * 初回のみモデル（約 80MB）を Hugging Face から取得し、以降はブラウザにキャッシュされる。
 * 合成と再生は文の到着順に 1 件ずつ行う。
 */
export function createKokoroTts(o: KokoroOptions = {}): TtsEngine & { preload: () => Promise<boolean> } {
  let model: Promise<Kokoro | null> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let epoch = 0; // stop() で古い再生を捨てるための世代番号
  let ctx: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let pending = 0;

  function load(): Promise<Kokoro | null> {
    if (!model) {
      model = (async () => {
        try {
          const { KokoroTTS } = await import("kokoro-js");
          const device = "gpu" in navigator ? "webgpu" : "wasm";
          const files = new Map<string, number>();
          return (await KokoroTTS.from_pretrained(MODEL_ID, {
            dtype: device === "webgpu" ? "fp32" : "q8",
            device,
            progress_callback: (p: { status?: string; file?: string; progress?: number }) => {
              if (p.status === "progress" && p.file && typeof p.progress === "number") {
                files.set(p.file, p.progress);
                o.onProgress?.(Math.round(Math.max(...files.values())));
              }
            },
          })) as unknown as Kokoro;
        } catch (e) {
          o.onLoadError?.(e instanceof Error ? e.message : "音声モデルを読み込めませんでした");
          return null;
        }
      })();
    }
    return model;
  }

  function play(buf: AudioBuffer, myEpoch: number): Promise<void> {
    return new Promise((resolve) => {
      if (!ctx || myEpoch !== epoch) return resolve();
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(ctx.destination);
      s.onended = () => resolve();
      source = s;
      s.start();
    });
  }

  return {
    id: "kokoro-browser",
    label: "高品質音声（Kokoro・端末内）",
    isSupported: () => typeof window !== "undefined" && typeof AudioContext !== "undefined",
    preload: async () => (await load()) !== null,
    speak(text) {
      const t = text.trim();
      if (!t) return;
      if (!ctx) ctx = new AudioContext();
      void ctx.resume();
      const myEpoch = epoch;
      pending += 1;
      chain = chain.then(async () => {
        try {
          const k = await load();
          if (!k || myEpoch !== epoch || !ctx) return;
          // 溜まってきたら少し速める（最大 1.25 倍）
          const speed = Math.min(1.25, 1 + Math.max(0, pending - 2) * 0.05);
          const out = await k.generate(t, { voice: o.voice ?? "af_heart", speed });
          if (myEpoch !== epoch || !ctx) return;
          const buf = ctx.createBuffer(1, out.audio.length, out.sampling_rate);
          buf.copyToChannel(new Float32Array(out.audio), 0);
          await play(buf, myEpoch);
        } catch {
          /* 1 文の失敗で後続を止めない */
        } finally {
          pending = Math.max(0, pending - 1);
        }
      });
    },
    stop() {
      epoch += 1;
      pending = 0;
      try {
        source?.stop();
      } catch {
        /* 既に停止済み */
      }
      source = null;
    },
  };
}
