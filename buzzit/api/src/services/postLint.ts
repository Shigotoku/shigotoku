/**
 * 投稿文のルールベース簡易チェック（参考情報）。
 * 医療広告ガイドライン・景品表示法・薬機法で問題になりやすい表現と、媒体仕様の注意を検出する。
 * 法的判断ではないため、最終確認は必ず人が行うこと。
 */

export interface LintIssue {
  level: 'warn' | 'info';
  rule: string;
  match?: string;
  message: string;
}

const RULES: Array<{ re: RegExp; rule: string; message: string }> = [
  { re: /(必ず|絶対|100%|１００％|確実に)(治|改善|効果|安全|成功)/, rule: '効果の保証', message: '効果や安全性を保証する表現は医療広告ガイドライン・景品表示法で問題になりやすい表現です。' },
  { re: /(完治|治ります|治せます|治る)/, rule: '治癒の断定', message: '治癒を断定する表現は避け、一般的な情報として表現してください。' },
  { re: /(日本一|地域一番|業界No\.?1|ナンバーワン|No\.?1|最高|最安|最先端|最良)/i, rule: '比較優良表現', message: '最上級・比較優良の表現は、客観的根拠の明示がない限り避ける必要があります。' },
  { re: /(ビフォー.?アフター|術前術後|症例写真|治療前後)/, rule: 'ビフォーアフター', message: '治療前後の写真・事例は、限定解除の要件（詳細説明・リスク等の併記）を満たす必要があります。' },
  { re: /(患者様?の声|口コミ|体験談|お客様の声)/, rule: '体験談・口コミ', message: '体験談・口コミの掲載は医療広告ガイドラインで原則禁止です。' },
  { re: /(今だけ|期間限定|キャンペーン|割引|無料(相談|カウンセリング)?|モニター)/, rule: '誘引表現', message: '自由診療の割引・キャンペーン表現は、料金・リスク等の併記が必要です。' },
  { re: /(副作用(は)?(ありません|なし|ゼロ)|リスク(は)?(ありません|なし|ゼロ)|痛みなし|ダウンタイムなし)/, rule: 'リスクの否定', message: 'リスクや副作用がないとする表現は不適切です。' },
  { re: /(承認(済み)?|認可)(された)?(薬|治療|機器)/, rule: '承認の誤認', message: '未承認医薬品・機器を扱う場合は、その旨とリスクの記載が必要です。' },
];

export function lintPost(text: string, ctx: { platform?: string; mediaUrls?: string[] } = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) issues.push({ level: 'warn', rule: r.rule, match: m[0], message: r.message });
  }
  const urls = ctx.mediaUrls ?? [];
  if (ctx.platform === 'instagram') {
    if (urls.some((u) => /\.(png|webp|gif)(\?|$)/i.test(u))) {
      issues.push({ level: 'warn', rule: '画像形式', message: 'Instagram の自動投稿は画像が JPEG のみ対応です。PNG/WebP は JPEG に変換してください。' });
    }
    if (urls.length > 10) issues.push({ level: 'warn', rule: 'カルーセル上限', message: 'Instagram のカルーセルは最大10枚です。' });
  }
  if (ctx.platform === 'x_thread' && [...text.replace(/\n---\n/g, '').trim()].length > 280 && !text.includes('\n---\n')) {
    issues.push({ level: 'info', rule: '文字数', message: 'Xの1投稿は280字までです。長文はスレッド（---区切り）にすると全文が投稿されます。' });
  }
  if (/(AI|ＡＩ|生成)/.test(text) === false && urls.length > 0) {
    issues.push({ level: 'info', rule: 'AI表示', message: '画像・動画をAIで生成・大幅加工した場合は「AI生成メディアを含む」をオンにしてください（X・Instagramの公式ラベルを付けて投稿します）。' });
  }
  return issues;
}
