/**
 * 中小法人（資本金1億円以下）向けの税額概算エンジン。
 * 税率・端数処理は一般的な標準税率ベース。自治体の超過税率・外形標準課税・
 * 各種特別措置は反映しないため、申告前に必ず公式情報・会計ソフトで確認すること。
 */

export interface TaxRates {
  /** 法人県民税 法人税割（%） */
  pref: number;
  /** 法人市民税 法人税割（%） */
  city: number;
  /** 県民税均等割（年額） */
  prefEqual: number;
  /** 市民税均等割（年額） */
  cityEqual: number;
}

export const DEFAULT_RATES: TaxRates = { pref: 1.0, city: 6.0, prefEqual: 21000, cityEqual: 60000 };

export interface TaxInput {
  pretaxProfit: number; // 税引前当期純利益
  addBack: number; // 加算（交際費の損金不算入・役員給与の否認など）
  deduct: number; // 減算
  carryLoss: number; // 期首の繰越欠損金
  months: number; // 事業年度の月数
  capital: number;
  rates: TaxRates;
  /** 6か月仮決算など、均等割を含めない場合 */
  includeEqual?: boolean;
}

export interface TaxResult {
  rawIncome: number;
  lossUsed: number;
  lossGenerated: number;
  nextCarryLoss: number;
  income: number;
  corp: number; // 法人税
  local: number; // 地方法人税
  biz: number; // 法人事業税（所得割）
  special: number; // 特別法人事業税
  pref: number; // 法人県民税 法人税割
  city: number; // 法人市民税 法人税割
  prefEqual: number;
  cityEqual: number;
  national: number;
  prefTotal: number;
  cityTotal: number;
  total: number;
  effectiveRate: number; // 所得に対する負担率
  largeCompany: boolean;
}

export const floorTo = (n: number, unit: number) => Math.floor(n / unit) * unit;

export function calcTax(i: TaxInput): TaxResult {
  const m = Math.min(Math.max(i.months, 1), 12);
  const small = i.capital <= 100_000_000;
  const rawIncome = i.pretaxProfit + i.addBack - i.deduct;
  const lossGenerated = rawIncome < 0 ? -rawIncome : 0;
  const positive = Math.max(0, rawIncome);
  const lossCap = small ? positive : Math.floor(positive * 0.5);
  const lossUsed = Math.min(Math.max(i.carryLoss, 0), lossCap);
  const income = floorTo(positive - lossUsed, 1000);
  const nextCarryLoss = Math.max(i.carryLoss, 0) - lossUsed + lossGenerated;

  // 法人税：年800万円以下の部分は軽減税率15%（月数按分）
  const reduced = small ? Math.floor((8_000_000 * m) / 12) : 0;
  const low = Math.min(income, reduced);
  const corp = floorTo(low * 0.15 + (income - low) * 0.232, 100);
  const local = floorTo(floorTo(corp, 1000) * 0.103, 100);

  // 法人事業税（所得割）標準税率 3.5% / 5.3% / 7.0%、特別法人事業税 37%
  const b1 = Math.floor((4_000_000 * m) / 12);
  const b2 = Math.floor((8_000_000 * m) / 12);
  const t1 = Math.min(income, b1);
  const t2 = Math.min(Math.max(income - b1, 0), b2 - b1);
  const t3 = Math.max(income - b2, 0);
  const biz = floorTo(t1 * 0.035 + t2 * 0.053 + t3 * 0.07, 100);
  const special = floorTo(biz * 0.37, 100);

  // 法人住民税 法人税割
  const base = floorTo(corp, 1000);
  const pref = floorTo((base * i.rates.pref) / 100, 100);
  const city = floorTo((base * i.rates.city) / 100, 100);

  const withEqual = i.includeEqual !== false;
  const prefEqual = withEqual ? floorTo((i.rates.prefEqual * m) / 12, 100) : 0;
  const cityEqual = withEqual ? floorTo((i.rates.cityEqual * m) / 12, 100) : 0;

  const national = corp + local;
  const prefTotal = biz + special + pref + prefEqual;
  const cityTotal = city + cityEqual;
  const total = national + prefTotal + cityTotal;
  return {
    rawIncome, lossUsed, lossGenerated, nextCarryLoss, income,
    corp, local, biz, special, pref, city, prefEqual, cityEqual,
    national, prefTotal, cityTotal, total,
    effectiveRate: income > 0 ? total / income : 0,
    largeCompany: !small,
  };
}

/* ───────── 中間申告 ───────── */

export interface PrevTax {
  months: number;
  corp: number;
  local: number;
  biz: number;
  special: number;
  pref: number;
  city: number;
}

export const EMPTY_PREV: PrevTax = { months: 12, corp: 0, local: 0, biz: 0, special: 0, pref: 0, city: 0 };

export type InterimKey = "corp" | "local" | "biz" | "special" | "pref" | "city";

export const INTERIM_LABELS: Record<InterimKey, string> = {
  corp: "法人税",
  local: "地方法人税",
  biz: "法人事業税",
  special: "特別法人事業税",
  pref: "法人県民税（法人税割）",
  city: "法人市民税（法人税割）",
};

export const INTERIM_KEYS: InterimKey[] = ["corp", "local", "biz", "special", "pref", "city"];

export type InterimAmounts = Record<InterimKey, number>;

/** 前期実績による予定納付額（前期税額 × 6 ÷ 前期月数）。10万円以下は納付不要の目安 */
export function interimFromPrev(prev: PrevTax): { amounts: InterimAmounts; required: Record<InterimKey, boolean> } {
  const amounts = {} as InterimAmounts;
  const required = {} as Record<InterimKey, boolean>;
  const pm = Math.max(prev.months, 1);
  for (const k of INTERIM_KEYS) {
    const a = floorTo((prev[k] * 6) / pm, 100);
    required[k] = a > 100_000;
    amounts[k] = required[k] ? a : 0;
  }
  return { amounts, required };
}

/** 仮決算による中間納付額（6か月間の実績で計算。均等割は含めない） */
export function interimProvisional(
  firstHalfIncome: number, carryLoss: number, capital: number, rates: TaxRates,
): InterimAmounts {
  const r = calcTax({
    pretaxProfit: firstHalfIncome, addBack: 0, deduct: 0, carryLoss, months: 6,
    capital, rates, includeEqual: false,
  });
  return { corp: r.corp, local: r.local, biz: r.biz, special: r.special, pref: r.pref, city: r.city };
}

export const sumAmounts = (a: InterimAmounts) => INTERIM_KEYS.reduce((s, k) => s + a[k], 0);


/* ───────── 消費税（概算） ───────── */

/** 簡易課税のみなし仕入率（第1種〜第6種） */
export const DEEMED_RATES: Record<number, { label: string; rate: number }> = {
  1: { label: "第1種（卸売業）", rate: 0.9 },
  2: { label: "第2種（小売業・農林水産業）", rate: 0.8 },
  3: { label: "第3種（製造業・建設業など）", rate: 0.7 },
  4: { label: "第4種（飲食店業・その他）", rate: 0.6 },
  5: { label: "第5種（サービス業・金融保険業など）", rate: 0.5 },
  6: { label: "第6種（不動産業）", rate: 0.4 },
};

export interface ConsumptionResult {
  outputTax: number; // 課税売上に係る消費税（10%）
  inputTax: number; // 控除対象仕入税額
  payable: number; // 納付税額（マイナスは還付）
  national: number; // 消費税（国）7.8%分
  localTax: number; // 地方消費税 2.2%分
}

/** simpleType=0 は原則課税。課税売上・課税仕入は税抜金額 */
export function calcConsumption(taxableSales: number, taxablePurchases: number, simpleType: number): ConsumptionResult {
  const outputTax = Math.floor(taxableSales * 0.1);
  const inputTax = simpleType > 0 && DEEMED_RATES[simpleType]
    ? Math.floor(outputTax * DEEMED_RATES[simpleType].rate)
    : Math.floor(taxablePurchases * 0.1);
  const payable = outputTax - inputTax;
  const national = Math.floor((payable * 78) / 100);
  return { outputTax, inputTax, payable, national, localTax: payable - national };
}
