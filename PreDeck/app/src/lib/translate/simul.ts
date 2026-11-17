import type { TranslateEngine, TranslatePair } from "./types";

export interface SimulOptions {
  engine: TranslateEngine;
  glossary?: string[];
  /** 訳が確定するたびに呼ばれる（順序は入力順を保証） */
  onTranslated: (pair: TranslatePair) => void;
  onError: (message: string) => void;
  /** 文脈として渡す直近ペア数 */
  contextSize?: number;
}

/** 日本語の確定文を、入力順を保って 1 件ずつ訳すキュー。 */
export function createSimulTranslator(o: SimulOptions) {
  const history: TranslatePair[] = [];
  const ctxSize = o.contextSize ?? 3;
  let chain: Promise<void> = Promise.resolve();
  const ac = new AbortController();

  return {
    enqueue(ja: string) {
      const text = ja.trim();
      if (!text) return;
      chain = chain.then(async () => {
        if (ac.signal.aborted) return;
        try {
          const en = await o.engine.translate(text, history.slice(-ctxSize), { glossary: o.glossary, signal: ac.signal });
          const pair = { ja: text, en };
          history.push(pair);
          o.onTranslated(pair);
        } catch (e) {
          if (!ac.signal.aborted) o.onError(e instanceof Error ? e.message : "翻訳に失敗しました");
        }
      });
    },
    /** 残りの翻訳を待つ（録音終了時） */
    flush: () => chain,
    cancel() {
      ac.abort();
    },
  };
}
