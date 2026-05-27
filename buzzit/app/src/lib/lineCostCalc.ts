/** LINE 公式 + Lステップ vs BuzzIt 試算（API と同じ定数） */

export const LINE_PRICE_PER_MSG = 3;
export const LINE_LIGHT_INCLUDED = 5000;
export const LINE_LIGHT_BASE = 5000;
export const LINE_STANDARD_BASE = 16500;

export const LSTEP_STANDARD = 21780;
export const LSTEP_PRO = 32780;
export const LINE_CRM_LITE = 980;
export const LINE_CRM_LITE_PROMO = 500;
export const LINE_CRM_PRO = 4980;
export const BUZZIT_PRO = 9800;
export const BUZZIT_GROWTH = 24800;

export interface LineAccountCost {
  plan: 'light' | 'standard';
  planLabel: string;
  baseFee: number;
  messageCount: number;
  overageMessages: number;
  messageFee: number;
  lineTotal: number;
}

export interface StackCost {
  toolPlan: string;
  toolFee: number;
  line: LineAccountCost;
  total: number;
}

export interface CostComparisonRow {
  monthlyMessages: number;
  line: LineAccountCost;
  lstepStandard: StackCost;
  lineCrmPro: StackCost;
  buzzitPro: StackCost;
  savingsLineCrmVsLstepStandard: number;
}

export function calcLineAccountCost(
  monthlyMessages: number,
  pricePerMessage = LINE_PRICE_PER_MSG,
): LineAccountCost {
  const messageCount = Math.max(0, Math.round(monthlyMessages));
  if (messageCount <= LINE_LIGHT_INCLUDED) {
    return {
      plan: 'light',
      planLabel: 'ライト（月5,000通まで）',
      baseFee: LINE_LIGHT_BASE,
      messageCount,
      overageMessages: 0,
      messageFee: 0,
      lineTotal: LINE_LIGHT_BASE,
    };
  }
  const overageMessages = messageCount - LINE_LIGHT_INCLUDED;
  const messageFee = Math.round(overageMessages * pricePerMessage);
  return {
    plan: 'standard',
    planLabel: 'スタンダード（5,000通超）',
    baseFee: LINE_STANDARD_BASE,
    messageCount,
    overageMessages,
    messageFee,
    lineTotal: LINE_STANDARD_BASE + messageFee,
  };
}

export function calcStackCost(
  monthlyMessages: number,
  toolPlan: string,
  toolFee: number,
  pricePerMessage = LINE_PRICE_PER_MSG,
): StackCost {
  const line = calcLineAccountCost(monthlyMessages, pricePerMessage);
  return { toolPlan, toolFee, line, total: line.lineTotal + toolFee };
}

export function calcCostComparison(
  monthlyMessages: number,
  pricePerMessage = LINE_PRICE_PER_MSG,
): CostComparisonRow {
  const line = calcLineAccountCost(monthlyMessages, pricePerMessage);
  const lstepStandard = calcStackCost(monthlyMessages, 'Lステップ・スタンダード', LSTEP_STANDARD, pricePerMessage);
  const lineCrmPro = calcStackCost(monthlyMessages, 'BuzzIt LINE CRM Pro', LINE_CRM_PRO, pricePerMessage);
  const buzzitPro = calcStackCost(monthlyMessages, 'BuzzIt Pro（SNS込）', BUZZIT_PRO, pricePerMessage);
  return {
    monthlyMessages: line.messageCount,
    line,
    lstepStandard,
    lineCrmPro,
    buzzitPro,
    savingsLineCrmVsLstepStandard: lstepStandard.total - lineCrmPro.total,
  };
}

export function calcSegmentComparison(
  monthlyMessages: number,
  segmentRatio = 0.4,
  pricePerMessage = LINE_PRICE_PER_MSG,
) {
  const segmentMessages = Math.round(monthlyMessages * segmentRatio);
  return {
    segmentRatio,
    segmentMessages,
    fullBroadcast: calcCostComparison(monthlyMessages, pricePerMessage),
    segment: calcCostComparison(segmentMessages, pricePerMessage),
  };
}

export const MESSAGE_PRESETS = [3000, 5000, 10000, 20000, 50000] as const;

export function formatYen(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

/** LINE公式アカウント料金の内訳テキスト */
export function describeLineAccountCost(line: LineAccountCost, pricePerMessage = LINE_PRICE_PER_MSG) {
  if (line.plan === 'light') {
    return {
      planNote: `ライトプラン（月${LINE_LIGHT_INCLUDED.toLocaleString()}通まで）`,
      baseNote: `基本料 ${formatYen(line.baseFee)}`,
      messageNote: null as string | null,
    };
  }
  return {
    planNote: 'スタンダードプラン（5,000通超）',
    baseNote: `基本料 ${formatYen(line.baseFee)}`,
    messageNote: `追加配信 ${line.overageMessages.toLocaleString()}通 × ${formatYen(pricePerMessage)} = ${formatYen(line.messageFee)}`,
  };
}
