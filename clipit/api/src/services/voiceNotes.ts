/** 音声メモ全文を手順数に均等配分（AI 不要の軽量版） */
export function distributeVoiceToSteps(transcript: string, stepCount: number): string[] {
  const text = transcript.trim();
  if (!text || stepCount <= 0) return Array(stepCount).fill('');

  const sentences = text.split(/[。！？\n]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) {
    return [text, ...Array(stepCount - 1).fill('')];
  }

  if (sentences.length <= stepCount) {
    const out = sentences.map((s) => (s.endsWith('。') ? s : `${s}。`));
    while (out.length < stepCount) out.push('');
    return out;
  }

  const perStep = Math.ceil(sentences.length / stepCount);
  const result: string[] = [];
  for (let i = 0; i < stepCount; i++) {
    const chunk = sentences.slice(i * perStep, (i + 1) * perStep);
    result.push(chunk.length ? `${chunk.join('。')}。` : '');
  }
  return result;
}
