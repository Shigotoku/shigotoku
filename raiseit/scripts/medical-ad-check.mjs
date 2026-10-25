// 医療広告ガイドライン 簡易チェッカー(ルールベース最小版)。
// ※弁護士・行政の判断の代替ではない。リスクの洗い出し補助。最終判断は人が行う。
// 重大度: block=公開不可の疑い / review=要レビュー / info=確認推奨
// 使い方: npm run check:ad -- --file path.md   |   npm run check:ad -- --text "文章"
// ルールは RULES に追加するだけで拡張できる。誤検知は許容し、見落としを減らす方針。
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './lib.mjs';

export const RULES = [
  // 体験談・口コミの引用(原則広告不可)
  { id: 'testimonial', severity: 'block', label: '体験談・患者の声', re: /(体験談|患者様?の声|口コミ(を|より|から)?(紹介|掲載)|お客様の声|治った(という|と)?お声|良くなったとの声|感謝の(お)?声)/g, advice: '治療効果に関する患者の体験談・感想は広告に載せられません。削除してください。' },
  // 効果の断定・保証
  { id: 'guarantee', severity: 'block', label: '効果の断定・保証', re: /(必ず(治|良く|改善|効)|絶対(に)?(治|安全|痛くない|大丈夫|再発しない)|100\s?[%％]\s?(治|成功|安全|改善)|完治(します|を保証)|確実に(治|改善|効果)|副作用(は)?(ありません|なし|ゼロ)|リスク(は)?(ありません|なし|ゼロ))/g, advice: '効果・安全性の断定や保証は不可です。「個人差があります」等ではなく、記載自体を見直してください。' },
  // 最上級・誇大
  { id: 'superlative', severity: 'review', label: '最上級・優良誤認の恐れ', re: /(日本一|世界一|地域一番|地域No\.?\s?1|県内No\.?\s?1|No\.?\s?1|ナンバーワン|最高(の|水準)|最先端|最新鋭|最も(選ばれ|信頼|安全)|業界初|唯一|トップクラス|圧倒的)/g, advice: '客観的根拠のない最上級・優位表現は不可です。根拠(出典・調査時点)を示せない場合は削除してください。' },
  // 比較広告
  { id: 'comparison', severity: 'review', label: '他院との比較', re: /(他院(より|と比べ|と違い)|他の(クリニック|病院|医院)(より|と比べ)|どこよりも|他では(受けられ|できない))/g, advice: '他の医療機関との比較による優位表現は不可です。' },
  // ビフォーアフター
  { id: 'before-after', severity: 'review', label: 'ビフォーアフター', re: /(ビフォー\s?[・&＆]?\s?アフター|before\s?[\/&・]?\s?after|施術(前|後)の写真|症例写真|治療前後)/gi, advice: '治療前後の写真は、治療内容・費用・リスク・副作用等の詳細説明が同一ページに必要です。原則として人の確認が必要です。' },
  // 誘導・特典付き口コミ依頼(ステマ・Googleポリシー)
  { id: 'review-incentive', severity: 'block', label: '口コミ投稿の誘導・特典', re: /(口コミ|レビュー).{0,20}(投稿|記入|書いて).{0,30}(割引|無料|プレゼント|特典|ポイント|クーポン)|(割引|無料|プレゼント|特典|クーポン).{0,30}(口コミ|レビュー).{0,20}(投稿|記入|書いて)|(星|★)\s?[5５五]\s?(を|で)?(お願い|つけて|付けて)/g, advice: '特典と引き換えの口コミ依頼、評価の指定は景品表示法・Googleポリシー違反です。全員に同条件の中立的な依頼のみ可能です。' },
  // 医療用語としての誇大な効果表現
  { id: 'hype-effect', severity: 'review', label: '効果・安全の誇張', re: /(奇跡の|驚異の|魔法の|劇的に(改善|効果)|たちまち(治|効)|すぐに(治|効)|痛みゼロ|痛くない治療|安全な治療|安心の治療法)/g, advice: '誇大な効果・安全表現は不可です。事実に基づく表現に直してください。' },
  // 割引・キャンペーン(自由診療の価格訴求)
  { id: 'discount', severity: 'review', label: '割引・キャンペーン訴求', re: /(モニター(募集|価格)|今(だけ|月だけ)(半額|[0-9０-９]+\s?[%％]\s?(オフ|OFF))|期間限定(価格|割引)|キャンペーン価格|先着[0-9０-９]+名)/g, advice: '過度な価格訴求・誘引は不可の恐れがあります。費用・内容・リスクを併記し、人が確認してください。' },
  // 未承認医薬品・機器
  { id: 'unapproved', severity: 'info', label: '未承認医薬品・機器の言及', re: /(未承認(医薬品|医療機器|薬)|海外(製|承認)の(薬|機器)|個人輸入)/g, advice: '未承認医薬品・機器を使う場合は、その旨・入手経路・国内の承認状況・諸外国の安全性情報の記載が必要です。' },
  // 学会・専門医の名乗り
  { id: 'qualification', severity: 'info', label: '資格・専門医の記載', re: /(専門医|認定医|指導医|学会(認定|所属)|日本[^\s、。]{1,12}学会)/g, advice: '広告可能な専門医資格か(厚生労働大臣への届出のある団体か)を確認してください。' },
];

// 自由診療の記載があるのに費用/リスク/副作用の説明が無い場合の警告
const FREE_TREATMENT = /(自由診療|自費診療|美容(医療|皮膚科|外科)|審美|矯正|インプラント|レーザー|ボトックス|ヒアルロン酸|脱毛|AGA|ED治療|ピル|ダイエット外来|メディカルダイエット)/;
const HAS_COST = /(税込|円|費用|料金|価格)/;
const HAS_RISK = /(リスク|副作用|合併症|注意点|デメリット)/;

export function checkText(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(lines[i])) !== null) {
        findings.push({ rule: rule.id, severity: rule.severity, label: rule.label, line: i + 1, match: m[0], advice: rule.advice });
        if (m[0].length === 0) rule.re.lastIndex++;
      }
    }
  }
  if (FREE_TREATMENT.test(text)) {
    if (!HAS_COST.test(text)) findings.push({ rule: 'free-cost', severity: 'review', label: '自由診療の費用表示なし', line: 0, match: '', advice: '自由診療を扱う記述がありますが、費用の記載が見当たりません。標準的な費用の併記が必要です。' });
    if (!HAS_RISK.test(text)) findings.push({ rule: 'free-risk', severity: 'review', label: '自由診療のリスク表示なし', line: 0, match: '', advice: '自由診療を扱う記述がありますが、主なリスク・副作用の記載が見当たりません。' });
  }
  const rank = { block: 0, review: 1, info: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.line - b.line);
  const verdict = findings.some((f) => f.severity === 'block') ? 'block' : findings.some((f) => f.severity === 'review') ? 'review' : findings.length ? 'info' : 'ok';
  return { verdict, findings };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const a = parseArgs();
  const text = a.file ? readFileSync(a.file, 'utf8') : String(a.text ?? '');
  if (!text) { console.error('--file か --text を指定してください'); process.exit(2); }
  const r = checkText(text);
  const mark = { block: '[公開不可の疑い]', review: '[要レビュー]', info: '[確認推奨]' };
  console.log(`判定: ${{ block: 'NG(公開ブロック)', review: '要レビュー', info: '確認推奨', ok: '指摘なし' }[r.verdict]}(指摘 ${r.findings.length} 件)`);
  for (const f of r.findings) console.log(`${mark[f.severity]} ${f.label}${f.line ? ` (行${f.line})` : ''}${f.match ? ` 「${f.match}」` : ''}\n    → ${f.advice}`);
  console.log('\n※ 本チェックは補助です。弁護士・行政の判断の代替ではありません。');
  process.exit(r.verdict === 'block' ? 1 : 0);
}
