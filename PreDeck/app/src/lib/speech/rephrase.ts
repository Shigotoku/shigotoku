/**
 * 言い直しの処理（純粋関数）。
 *
 *   「火曜日、いや水曜日」        → 「水曜日」
 *   「3日、いや5日に来院」        → 「5日に来院」
 *   「10月5日、いや6日」          → 「10月6日」
 *   「50mg、違う、100mg」         → 「100mg」（医療モードでは明示的な訂正語のときだけ）
 *   「右、いや左の膝」            → 「左の膝」
 *
 * 安全のための方針:
 *  - 言い直す前と後が「同じ種類」（曜日どうし・同じ単位の数・左右）のときだけ置き換える。
 *    種類が合わない・どちらかが読み取れないときは何もしない（文章を壊さない）。
 *  - strict（医療モード）では、数値と左右の言い直しは「違う」「間違えた」「訂正」など
 *    明示的な訂正語のときだけ置き換える。「いや」「やっぱり」は迷いの言葉でもあり、
 *    取り違えると左右・薬の量が変わって危険なため、両方を残してユーザーに見せる。
 */

const SOFT = '(?:いや|いえ|やっぱり|やはり)';
const HARD =
  '(?:違う|ちがう|違います|じゃなくて|ではなく|間違えた|まちがえた|間違い|訂正します|訂正)';
const FILL = '(?:あ|あー|あっ|えっと|えーと)?';
const SEP = `[、,]?${FILL}[、,]?`;

const WEEKDAY = '[月火水木金土日]曜日?';
const UNITS =
  'か月|ヶ月|ヵ月|週間|日間|mg|μg|kg|mL|dL|cm|mm|℃|%|日|時|分|月|年|週|回|錠|歳|本|個|人|g|L';

interface Rule {
  re: RegExp;
  /** true: 訂正語が HARD のときだけ置き換える（strict のとき） */
  risky: boolean;
  build: (m: RegExpExecArray) => string;
}

function rules(marker: string): Rule[] {
  const sep = `${SEP}${marker}${SEP}`;
  return [
    {
      // 曜日: 火曜日、いや水曜日
      re: new RegExp(`${WEEKDAY}${sep}([月火水木金土日])(曜日?)?`, 'g'),
      risky: false,
      build: (m) => `${m[1]}${m[2] ?? '曜日'}`,
    },
    {
      // 数 + 単位（月日つきも）: 10月5日、いや6日 / 50mg、違う、100mg
      re: new RegExp(`(\\d+月)?\\d+(?:\\.\\d+)?(${UNITS})${sep}(\\d+(?:\\.\\d+)?)\\2`, 'g'),
      risky: true,
      build: (m) => `${m[1] ?? ''}${m[3]}${m[2]}`,
    },
    {
      // 左右: 右、いや左
      re: new RegExp(`(?<![左右])[左右]${sep}([左右])`, 'g'),
      risky: true,
      build: (m) => m[1],
    },
  ];
}

/**
 * 言い直しを反映する。strict=true（医療モード）では、数値・左右は明示的な訂正語のときだけ。
 * 何も当てはまらなければ入力をそのまま返す。
 */
export function applyRephrase(text: string, strict: boolean): string {
  if (!text) return text;
  let result = text;
  const softRules = rules(SOFT);
  const hardRules = rules(HARD);
  for (let i = 0; i < softRules.length; i++) {
    // 「いや」系: 厳格モードでは危険な種類（数値・左右）を除く
    if (!(strict && softRules[i].risky)) {
      result = result.replace(softRules[i].re, (...args) => softRules[i].build(toMatch(args)));
    }
    // 「違う」系: 常に有効
    result = result.replace(hardRules[i].re, (...args) => hardRules[i].build(toMatch(args)));
  }
  return result;
}

/** String.replace のコールバック引数から、キャプチャグループの配列を取り出す */
function toMatch(args: unknown[]): RegExpExecArray {
  const groups: unknown[] = [];
  for (const a of args) {
    if (typeof a === 'number') break; // offset に到達
    groups.push(a);
  }
  return groups as unknown as RegExpExecArray;
}
