import type { SpeechVocabulary } from "@/lib/speech";

/** 認識エンジンに渡す共通オプション。エンジン固有の事情はエンジン側で吸収する。 */
export interface AsrStartOptions {
  lang: "ja-JP" | "en-US";
  vocabulary?: SpeechVocabulary;
  /** 優先して聞き取らせたい語（マイ辞書など） */
  hints?: string[];
  onPreparing?: (message: string) => void;
  /** 話している途中の文 */
  onInterim: (text: string) => void;
  /** 確定した文（整形前の生テキスト） */
  onFinal: (text: string) => void;
  /** 利用者に見せてよい日本語のエラーメッセージ */
  onError: (message: string) => void;
}

export interface AsrSession {
  stop: () => void;
}

/**
 * 文字起こしエンジンの共通インターフェース。
 * 音声をどこで処理するかを `audioLeavesDevice` で明示し、UI とポリシー判定が使う。
 */
export interface AsrEngine {
  readonly id: string;
  readonly label: string;
  /** true のエンジンは、利用者の同意なしに既定で選ばない */
  readonly audioLeavesDevice: boolean;
  isSupported(): boolean;
  start(opts: AsrStartOptions): Promise<AsrSession | null>;
}
