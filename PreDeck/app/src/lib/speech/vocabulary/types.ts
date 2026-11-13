/** 分野別の専門用語セット（academic = medical + science） */
export type SpeechVocabulary = 'general' | 'medical' | 'science' | 'academic';

export interface VocabularyDefinition {
  /** Web Speech API phrases 用（正式名称を優先） */
  phraseTerms: string[];
  /** 正式名称 → 誤認識しやすい表記・読み */
  corrections: Record<string, string[]>;
}

/** ユーザー辞書（誤り → 正） */
export interface UserDictionaryEntry {
  /** 正しい表記 */
  term: string;
  /** 誤認識されやすい表記・読み（任意） */
  aliases: string[];
}
