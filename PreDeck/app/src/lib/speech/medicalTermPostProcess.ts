import { getVocabulary, type SpeechVocabulary } from './vocabulary';

const MAX_PHRASES = 80;
const DEFAULT_CANONICAL_BOOST = 2.5;
const DEFAULT_ALIAS_BOOST = 1.5;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 確定文に医療用語辞書の置換を適用（誤認識の後処理）
 */
export function applyMedicalTermCorrections(
  text: string,
  vocabulary: SpeechVocabulary = 'general'
): string {
  if (!text) return text;

  const { corrections } = getVocabulary(vocabulary);
  const replacements: { alias: string; canonical: string }[] = [];

  for (const [canonical, aliases] of Object.entries(corrections)) {
    for (const alias of aliases) {
      if (alias && alias !== canonical) {
        replacements.push({ alias, canonical });
      }
    }
  }

  replacements.sort((a, b) => b.alias.length - a.alias.length);

  let result = text;
  for (const { alias, canonical } of replacements) {
    result = result.replace(new RegExp(escapeRegExp(alias), 'gi'), canonical);
  }

  return result;
}

export interface SpeechPhraseHint {
  phrase: string;
  boost: number;
}

/**
 * Web Speech API contextual biasing 用フレーズ一覧
 */
export function buildSpeechPhraseHints(
  vocabulary: SpeechVocabulary = 'general'
): SpeechPhraseHint[] {
  const { phraseTerms, corrections } = getVocabulary(vocabulary);
  const hints: SpeechPhraseHint[] = [];
  const seen = new Set<string>();

  const add = (phrase: string, boost: number) => {
    const key = phrase.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    hints.push({ phrase: key, boost });
  };

  for (const term of phraseTerms) {
    add(term, DEFAULT_CANONICAL_BOOST);
  }

  for (const [canonical, aliases] of Object.entries(corrections)) {
    add(canonical, DEFAULT_CANONICAL_BOOST);
    for (const alias of aliases.slice(0, 2)) {
      add(alias, DEFAULT_ALIAS_BOOST);
    }
  }

  return hints.slice(0, MAX_PHRASES);
}

type SpeechRecognitionPhraseCtor = new (phrase: string, boost?: number) => unknown;

/**
 * 対応ブラウザでは recognition.phrases に語彙バイアスを設定
 */
export function applySpeechPhraseHints(
  recognition: { phrases?: unknown; processLocally?: boolean },
  vocabulary?: SpeechVocabulary
): void {
  if (!vocabulary || !('phrases' in recognition)) return;
  if (recognition.processLocally === true) return;

  const PhraseCtor = (
    window as unknown as { SpeechRecognitionPhrase?: SpeechRecognitionPhraseCtor }
  ).SpeechRecognitionPhrase;
  if (!PhraseCtor) return;

  try {
    recognition.phrases = buildSpeechPhraseHints(vocabulary).map(
      (hint) => new PhraseCtor(hint.phrase, hint.boost)
    );
  } catch {
    /* 未対応ブラウザは無視 */
  }
}
