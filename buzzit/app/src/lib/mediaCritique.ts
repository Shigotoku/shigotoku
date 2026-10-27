/** アップロード時の簡易動画添削チェック */
export type CritiqueResult = {
  score: number;
  checks: Array<{ id: string; label: string; ok: boolean; tip: string }>;
};

export function critiqueMedia(input: {
  kind: 'image' | 'video';
  durationSec?: number;
  fileName?: string;
  hasCaptionHint?: boolean;
}): CritiqueResult {
  const checks = [
    {
      id: 'hook',
      label: '冒頭で目を止める（フック）',
      ok: true,
      tip: '最初の1〜2秒で「誰向けか」「何が変わるか」をテロップで出す',
    },
    {
      id: 'telop',
      label: 'テロップ想定がある',
      ok: !!input.hasCaptionHint || /\.(mp4|mov|webm)$/i.test(input.fileName ?? ''),
      tip: '無音再生でも伝わるよう、大きい文字で要点を重ねる',
    },
    {
      id: 'length',
      label: '尺が短尺向き',
      ok: input.kind === 'image' || (input.durationSec ?? 20) <= 45,
      tip: 'リールは15〜30秒が目安。長い場合はカット編集を',
    },
    {
      id: 'cta',
      label: 'CTA（次の行動）がある',
      ok: !!input.hasCaptionHint,
      tip: '最後に「LINEへ」「保存」「予約」のどれかを明示',
    },
    {
      id: 'vertical',
      label: '縦動画を想定',
      ok: input.kind === 'video' || input.kind === 'image',
      tip: '9:16（縦）で撮るとリール・ショートにそのまま使える',
    },
  ];
  const okCount = checks.filter((c) => c.ok).length;
  return { score: Math.round((okCount / checks.length) * 100), checks };
}
