import { GENERAL_VOCABULARY } from './general';
import { MEDICAL_VOCABULARY } from './medical';
import { SCIENCE_VOCABULARY } from './science';
import type { SpeechVocabulary, UserDictionaryEntry, VocabularyDefinition } from './types';

export type { SpeechVocabulary, UserDictionaryEntry, VocabularyDefinition } from './types';

function merge(...defs: VocabularyDefinition[]): VocabularyDefinition {
  const corrections: Record<string, string[]> = {};
  const phraseTerms: string[] = [];
  for (const d of defs) {
    phraseTerms.push(...d.phraseTerms);
    for (const [k, v] of Object.entries(d.corrections)) {
      corrections[k] = [...(corrections[k] ?? []), ...v];
    }
  }
  return { phraseTerms: [...new Set(phraseTerms)], corrections };
}

const BASE: Record<SpeechVocabulary, VocabularyDefinition> = {
  general: GENERAL_VOCABULARY,
  medical: merge(GENERAL_VOCABULARY, MEDICAL_VOCABULARY),
  science: merge(GENERAL_VOCABULARY, SCIENCE_VOCABULARY),
  academic: merge(GENERAL_VOCABULARY, MEDICAL_VOCABULARY, SCIENCE_VOCABULARY),
};

let userEntries: UserDictionaryEntry[] = [];

/** ユーザー辞書（自分の研究分野の用語）を登録。全分野に優先して適用される。 */
export function setUserDictionary(entries: UserDictionaryEntry[]): void {
  userEntries = entries.filter((e) => e.term.trim());
}

export function getUserDictionary(): UserDictionaryEntry[] {
  return userEntries;
}

export function getVocabulary(id: SpeechVocabulary): VocabularyDefinition {
  if (userEntries.length === 0) return BASE[id];
  const user: VocabularyDefinition = {
    phraseTerms: userEntries.map((e) => e.term),
    corrections: Object.fromEntries(userEntries.map((e) => [e.term, e.aliases])),
  };
  // ユーザー辞書を先頭にして優先
  return merge(user, BASE[id]);
}
