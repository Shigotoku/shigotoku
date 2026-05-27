/** LINE 公式 + CRM 試算（LP / アプリ共通ロジック） */

export const LINE_PRICE_PER_MSG = 3;
export const LINE_LIGHT_INCLUDED = 5000;
export const LINE_LIGHT_BASE = 5000;
export const LINE_STANDARD_BASE = 16500;

export const LSTEP_START = 5000;
export const LSTEP_STANDARD = 21780;
export const LSTEP_PRO = 32780;

export const LINE_CRM_LITE = 980;
export const LINE_CRM_LITE_PROMO = 500;
export const LINE_CRM_PRO = 4980;
export const BUZZIT_PRO = 9800;
export const BUZZIT_GROWTH = 24800;

export type LstepPlan = 'none' | 'start' | 'standard' | 'pro';

export interface LineAccountCost {
  plan: 'light' | 'standard';
  planLabel: string;
  baseFee: number;
  messageCount: number;
  overageMessages: number;
  messageFee: number;
  lineTotal: number;
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

export function lstepToolFee(plan: LstepPlan): number {
  switch (plan) {
    case 'start':
      return LSTEP_START;
    case 'standard':
      return LSTEP_STANDARD;
    case 'pro':
      return LSTEP_PRO;
    default:
      return 0;
  }
}

export function formatYen(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

export const MESSAGE_PRESETS = [3000, 5000, 10000, 20000, 50000] as const;

export interface SimulatorResult {
  line: LineAccountCost;
  lstepCrm: number;
  lstepTotal: number;
  buzzitLineCrmPro: number;
  buzzitLineCrmProTotal: number;
  buzzitLineCrmLitePromo: number;
  buzzitLineCrmLitePromoTotal: number;
  savingsVsLstep: number;
  savingsVsLstepAnnual: number;
  segmentMessages: number;
  segmentBuzzitTotal: number;
}

export function calcSimulator(
  monthlyMessages: number,
  lstepPlan: LstepPlan = 'standard',
  usePromoLite = true,
): SimulatorResult {
  const line = calcLineAccountCost(monthlyMessages);
  const lstepCrm = lstepToolFee(lstepPlan);
  const buzzitLineCrmPro = LINE_CRM_PRO;
  const buzzitLineCrmLitePromo = usePromoLite ? LINE_CRM_LITE_PROMO : LINE_CRM_LITE;
  const lstepTotal = line.lineTotal + lstepCrm;
  const buzzitLineCrmProTotal = line.lineTotal + buzzitLineCrmPro;
  const buzzitLineCrmLitePromoTotal = line.lineTotal + buzzitLineCrmLitePromo;
  const segmentMessages = Math.round(monthlyMessages * 0.4);
  const segmentLine = calcLineAccountCost(segmentMessages);
  const segmentBuzzitTotal = segmentLine.lineTotal + buzzitLineCrmPro;
  const savingsVsLstep = lstepTotal - buzzitLineCrmProTotal;
  return {
    line,
    lstepCrm,
    lstepTotal,
    buzzitLineCrmPro,
    buzzitLineCrmProTotal,
    buzzitLineCrmLitePromo,
    buzzitLineCrmLitePromoTotal,
    savingsVsLstep,
    savingsVsLstepAnnual: savingsVsLstep * 12,
    segmentMessages,
    segmentBuzzitTotal,
  };
}
