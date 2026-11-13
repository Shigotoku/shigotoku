import { setUserDictionary, type UserDictionaryEntry } from "@/lib/speech";

const KEY = "predeck.userDictionary.v1";

// 端末内（localStorage）にのみ保存。
export function loadUserDictionary(): UserDictionaryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveUserDictionary(entries: UserDictionaryEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
  setUserDictionary(entries);
}

/** 「用語=誤認識1,誤認識2」形式の複数行テキストを解析 */
export function parseDictionaryText(text: string): UserDictionaryEntry[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [term, rest = ""] = l.split("=");
      return { term: term.trim(), aliases: rest.split(/[,、]/).map((s) => s.trim()).filter(Boolean) };
    })
    .filter((e) => e.term);
}

export function formatDictionaryText(entries: UserDictionaryEntry[]): string {
  return entries.map((e) => (e.aliases.length ? `${e.term}=${e.aliases.join(",")}` : e.term)).join("\n");
}

setUserDictionary(loadUserDictionary());
