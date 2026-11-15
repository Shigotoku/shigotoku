/** 音声認識1セグメントの空白・改行を正規化 */
export function normalizeSpeechSegment(text: string): string {
  return text
    .replace(/[\r\n]+/g, '')
    .replace(/\u3000/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 確定セグメントを既存テキストに追記（改行なし・句読点あり） */
export function appendJapaneseSpeechSegment(base: string, segment: string): string {
  const seg = normalizeSpeechSegment(segment);
  if (!seg) return base;

  const trimmedBase = base.trimEnd();
  if (!trimmedBase) return seg;

  if (/[。！？]$/.test(trimmedBase)) {
    return `${trimmedBase}${seg}`;
  }
  if (/、$/.test(trimmedBase)) {
    return `${trimmedBase}${seg}`;
  }

  return `${trimmedBase}、${seg}`;
}

/** 音声入力停止時に文末を整える */
export function finalizeJapaneseSpeechText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  if (/、$/.test(trimmed)) {
    return `${trimmed.slice(0, -1)}。`;
  }
  if (!/[。！？]$/.test(trimmed)) {
    return `${trimmed}。`;
  }
  return trimmed;
}

/** 確定前の interim 表示用 */
export function composeJapaneseInterim(base: string, interimText: string): string {
  const interim = normalizeSpeechSegment(interimText);
  if (!interim) return base;
  if (!base.trim()) return interim;

  const trimmedBase = base.trimEnd();
  if (/[、。！？]$/.test(trimmedBase)) {
    return `${trimmedBase}${interim}`;
  }
  return `${trimmedBase}、${interim}`;
}
