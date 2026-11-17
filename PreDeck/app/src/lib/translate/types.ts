/** 1 文（または 1 区切り）単位の逐次翻訳エンジン。 */
export interface TranslateEngine {
  readonly id: string;
  readonly label: string;
  /** true のエンジンはテキストが端末外に出る */
  readonly textLeavesDevice: boolean;
  /**
   * @param text 今回訳す日本語
   * @param context 直前の（原文, 訳文）。訳語のゆれ・主語の補完に使う
   */
  translate(text: string, context: TranslatePair[], opts?: { glossary?: string[]; signal?: AbortSignal }): Promise<string>;
}

export interface TranslatePair {
  ja: string;
  en: string;
}
