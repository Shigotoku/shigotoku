import { addDays, lastDayOfMonth, monthsInPeriod, parseIso, toIso } from "./dates";
import { calcTax, DEFAULT_RATES, EMPTY_PREV, type InterimAmounts, type PrevTax, type TaxRates } from "./taxEngine";

export interface TermData {
  termNo: number;
  startDate: string;
  endDate: string;
  pretaxProfit: number;
  addBack: number;
  deduct: number;
  carryLoss: number;
  /** 仮決算用：期首〜6か月の所得見込 */
  firstHalfProfit: number;
  interimPaid: InterimAmounts;
  /** 前期の税額（前期データが本アプリにない場合の手入力） */
  prevManual: PrevTax;
  /** 基準期間（2期前）の課税売上高 */
  baseSales: number;
  /** 消費税の概算用（税抜） */
  taxableSales?: number;
  taxablePurchases?: number;
  /** 0=原則課税、1〜6=簡易課税の事業区分 */
  simpleType?: number;
  done: Record<string, boolean>;
  monthly: Record<string, Record<string, boolean>>;
  filedDate: string;
}

export interface SettlementState {
  fiscalEndMonth: number;
  invoice: "yes" | "no" | "unknown";
  filing: "self" | "freee" | "taxaccountant";
  profitView: "loss" | "profit" | "unknown";
  rates: TaxRates;
  terms: Record<string, TermData>;
  currentEnd: string;
  inhouse: Record<string, boolean>;
  txPerMonth: number;
  advisorMonthly: number;
  advisorSettlement: number;
}

export const ZERO_AMOUNTS: InterimAmounts = { corp: 0, local: 0, biz: 0, special: 0, pref: 0, city: 0 };

export const DEFAULT_STATE: SettlementState = {
  fiscalEndMonth: 9,
  invoice: "unknown",
  filing: "self",
  profitView: "unknown",
  rates: DEFAULT_RATES,
  terms: {},
  currentEnd: "",
  inhouse: {},
  txPerMonth: 50,
  advisorMonthly: 25000,
  advisorSettlement: 150000,
};

export function buildTerm(startIso: string, endIso: string, termNo: number, carryLoss: number): TermData {
  return {
    termNo, startDate: startIso, endDate: endIso,
    pretaxProfit: 0, addBack: 0, deduct: 0, carryLoss,
    firstHalfProfit: 0, interimPaid: { ...ZERO_AMOUNTS },
    prevManual: { ...EMPTY_PREV }, baseSales: 0,
    done: {}, monthly: {}, filedDate: "",
  };
}

export const termMonths = (t: TermData) => monthsInPeriod(parseIso(t.startDate), parseIso(t.endDate));

export function calcTerm(t: TermData, capital: number, rates: TaxRates) {
  return calcTax({
    pretaxProfit: t.pretaxProfit, addBack: t.addBack, deduct: t.deduct,
    carryLoss: t.carryLoss, months: termMonths(t), capital, rates,
  });
}

export function sortedTerms(terms: Record<string, TermData>) {
  return Object.values(terms).sort((a, b) => a.endDate.localeCompare(b.endDate));
}

/** 直前の期（開始日の前日が期末日の期） */
export function findPrevTerm(terms: Record<string, TermData>, t: TermData) {
  const key = toIso(addDays(parseIso(t.startDate), -1));
  return terms[key] ?? null;
}

/** 中間申告の基準にする前期税額（前期データがあればそちらを優先） */
export function prevTaxOf(terms: Record<string, TermData>, t: TermData, capital: number, rates: TaxRates): PrevTax | null {
  const prev = findPrevTerm(terms, t);
  if (prev) {
    const r = calcTerm(prev, capital, rates);
    return { months: termMonths(prev), corp: r.corp, local: r.local, biz: r.biz, special: r.special, pref: r.pref, city: r.city };
  }
  const m = t.prevManual;
  return m.corp + m.local + m.biz + m.special + m.pref + m.city > 0 ? m : null;
}

/** 設立日（または前期末の翌日）から最初に迎える期末日 */
export function firstEndDate(founded: Date | null, endMonth: number, today: Date) {
  if (founded) {
    let y = founded.getFullYear();
    let e = lastDayOfMonth(y, endMonth);
    while (e < addDays(founded, 28)) {
      y += 1;
      e = lastDayOfMonth(y, endMonth);
    }
    return e;
  }
  let y = today.getFullYear();
  let e = lastDayOfMonth(y, endMonth);
  if (e > today) e = lastDayOfMonth(y - 1, endMonth);
  return e;
}

export function nextTermOf(prev: TermData, endMonth: number, capital: number, rates: TaxRates): TermData {
  const prevEnd = parseIso(prev.endDate);
  const start = addDays(prevEnd, 1);
  const end = lastDayOfMonth(prevEnd.getFullYear() + 1, endMonth);
  const r = calcTerm(prev, capital, rates);
  return buildTerm(toIso(start), toIso(end), prev.termNo + 1, r.nextCarryLoss);
}
