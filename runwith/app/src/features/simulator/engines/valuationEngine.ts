/**
 * 企業価値評価エンジン
 * - DCF法（割引キャッシュフロー法）
 * - マルチプル法（EV/Revenue, EV/EBITDA, PSR）
 * - ARRマルチプル法（SaaS特化）
 * - 加重平均評価
 */
import type {
  ValuationInput,
  ValuationResult,
  ComparableCompany,
} from '../types/stockOption';
import { STAGE_VALUATION_MULTIPLES } from '../types/stockOption';


// ========== DCF法 ==========
function calculateDCF(input: ValuationInput): {
  valuation: number;
  details: ValuationResult['dcfDetails'];
} {
  const years = input.projectionYears || 5;
  const wacc = (input.wacc || 15) / 100;
  const terminalGrowth = (input.terminalGrowthRate || 2) / 100;
  const currentRevenue = input.annualRevenue || input.monthlyRevenue * 12;
  const margin = (input.grossMargin || 60) / 100;

  // 各年の売上成長率
  const growthRates = input.revenueGrowthProjection?.length >= years
    ? input.revenueGrowthProjection.map(g => g / 100)
    : Array.from({ length: years }, (_, i) => {
        // デフォルト: 初年度の成長率から逓減
        const baseGrowth = (input.revenueGrowthRate || 30) / 100;
        return Math.max(0.05, baseGrowth * Math.pow(0.85, i));
      });

  // FCF予測
  const projectedCashFlows: number[] = [];
  let projectedRevenue = currentRevenue;
  for (let i = 0; i < years; i++) {
    projectedRevenue = projectedRevenue * (1 + growthRates[i]);
    // FCF = 売上 × 粗利率 × (1 - 再投資率)
    // 簡易: EBITDA マージンが粗利率の50%程度と仮定
    const ebitdaMargin = margin * 0.5;
    const fcf = projectedRevenue * ebitdaMargin;
    projectedCashFlows.push(Math.round(fcf));
  }

  // ターミナルバリュー（永続成長法）
  const lastFCF = projectedCashFlows[projectedCashFlows.length - 1];
  const terminalValue = wacc > terminalGrowth
    ? (lastFCF * (1 + terminalGrowth)) / (wacc - terminalGrowth)
    : lastFCF * 20; // フォールバック

  // 現在価値に割引
  const presentValues: number[] = [];
  for (let i = 0; i < years; i++) {
    const pv = projectedCashFlows[i] / Math.pow(1 + wacc, i + 1);
    presentValues.push(Math.round(pv));
  }
  const terminalPV = Math.round(terminalValue / Math.pow(1 + wacc, years));

  const totalPV = presentValues.reduce((sum, pv) => sum + pv, 0) + terminalPV;

  return {
    valuation: Math.round(totalPV),
    details: {
      projectedCashFlows,
      terminalValue: Math.round(terminalValue),
      presentValues: [...presentValues, terminalPV],
      totalPV: Math.round(totalPV),
    },
  };
}

// ========== マルチプル法 ==========
function calculateMultiples(input: ValuationInput): {
  revenueMultipleVal: number;
  ebitdaMultipleVal: number;
  psrVal: number;
  appliedMultiples: { evRevenue: number; evEbitda: number; psr: number };
} {
  const annualRevenue = input.annualRevenue || input.monthlyRevenue * 12;
  const comparables = input.comparableMultiples || [];

  let evRevenue: number;
  let evEbitda: number;
  let psr: number;

  if (comparables.length > 0) {
    // 類似企業の中央値を使用
    evRevenue = median(comparables.map(c => c.evRevenue).filter(v => v > 0)) || 5;
    evEbitda = median(comparables.map(c => c.evEbitda).filter(v => v > 0)) || 15;
    psr = median(comparables.map(c => c.psRatio).filter(v => v > 0)) || 5;
  } else {
    // ステージ別デフォルトマルチプル
    const stageMultiples = STAGE_VALUATION_MULTIPLES[input.stage] || STAGE_VALUATION_MULTIPLES['series-a'];
    evRevenue = stageMultiples.typical;
    evEbitda = stageMultiples.typical * 2;
    psr = stageMultiples.typical;
  }

  const revenueMultipleVal = Math.round(annualRevenue * evRevenue);
  const ebitdaMultipleVal = input.ebitda > 0 ? Math.round(input.ebitda * evEbitda) : 0;
  const psrVal = Math.round(annualRevenue * psr);

  return {
    revenueMultipleVal,
    ebitdaMultipleVal,
    psrVal,
    appliedMultiples: {
      evRevenue: Math.round(evRevenue * 10) / 10,
      evEbitda: Math.round(evEbitda * 10) / 10,
      psr: Math.round(psr * 10) / 10,
    },
  };
}

// ========== ARRマルチプル法（SaaS特化） ==========
function calculateARRMultiple(input: ValuationInput): {
  valuation: number;
  multiple: number;
} {
  const arr = input.arr || input.mrr * 12 || input.monthlyRevenue * 12;
  const growthRate = input.revenueGrowthRate || 30;
  const nrr = input.nrr || 100;
  const grossMargin = input.grossMargin || 60;

  // SaaS ARRマルチプルの計算
  // ベースライン: ステージ別
  const stageMultiple = STAGE_VALUATION_MULTIPLES[input.stage]?.typical || 10;

  // 成長率による調整（高成長 = 高マルチプル）
  const growthAdjustment = growthRate > 100 ? 1.5 : growthRate > 50 ? 1.2 : growthRate > 20 ? 1.0 : 0.8;

  // NRRによる調整（NRR > 120% で上方修正）
  const nrrAdjustment = nrr > 130 ? 1.3 : nrr > 120 ? 1.2 : nrr > 100 ? 1.0 : 0.8;

  // 粗利率による調整
  const marginAdjustment = grossMargin > 80 ? 1.1 : grossMargin > 60 ? 1.0 : 0.85;

  const adjustedMultiple = stageMultiple * growthAdjustment * nrrAdjustment * marginAdjustment;
  const valuation = Math.round(arr * adjustedMultiple);

  return {
    valuation,
    multiple: Math.round(adjustedMultiple * 10) / 10,
  };
}

// ========== 企業価値評価メインエンジン ==========
export function runValuation(input: ValuationInput): ValuationResult {
  // 各手法で評価
  const dcf = calculateDCF(input);
  const multiples = calculateMultiples(input);
  const arrMultiple = calculateARRMultiple(input);

  // 有効な評価方法のみ加重平均
  const valuations: { value: number; weight: number; name: string }[] = [];

  // DCF
  if (dcf.valuation > 0) {
    valuations.push({ value: dcf.valuation, weight: 0.3, name: 'DCF' });
  }

  // Revenue Multiple
  if (multiples.revenueMultipleVal > 0) {
    valuations.push({ value: multiples.revenueMultipleVal, weight: 0.25, name: 'Revenue Multiple' });
  }

  // EBITDA Multiple
  if (multiples.ebitdaMultipleVal > 0) {
    valuations.push({ value: multiples.ebitdaMultipleVal, weight: 0.15, name: 'EBITDA Multiple' });
  }

  // ARR Multiple（SaaS向け）
  if (arrMultiple.valuation > 0 && (input.mrr > 0 || input.arr > 0)) {
    valuations.push({ value: arrMultiple.valuation, weight: 0.3, name: 'ARR Multiple' });
  }

  // PSR
  if (multiples.psrVal > 0 && valuations.length < 3) {
    valuations.push({ value: multiples.psrVal, weight: 0.2, name: 'PSR' });
  }

  // 重みを正規化
  const totalWeight = valuations.reduce((sum, v) => sum + v.weight, 0);
  const weightedValuation = totalWeight > 0
    ? Math.round(valuations.reduce((sum, v) => sum + (v.value * v.weight / totalWeight), 0))
    : 0;

  // バリュエーションレンジ
  const allValues = valuations.map(v => v.value).filter(v => v > 0);
  const valuationRange = {
    low: allValues.length > 0 ? Math.min(...allValues) : 0,
    mid: weightedValuation,
    high: allValues.length > 0 ? Math.max(...allValues) : 0,
  };

  // 1株あたり価格（totalSharesが別途入力されると想定）
  const annualRevenue = input.annualRevenue || input.monthlyRevenue * 12;
  const impliedMultiples = {
    evRevenue: annualRevenue > 0 ? Math.round((weightedValuation / annualRevenue) * 10) / 10 : 0,
    evEbitda: input.ebitda > 0 ? Math.round((weightedValuation / input.ebitda) * 10) / 10 : 0,
    psr: annualRevenue > 0 ? Math.round((weightedValuation / annualRevenue) * 10) / 10 : 0,
  };

  // ステージベンチマーク
  const stageMultiple = STAGE_VALUATION_MULTIPLES[input.stage] || STAGE_VALUATION_MULTIPLES['series-a'];

  // インサイト生成
  const insights = generateValuationInsights(
    input, weightedValuation, valuationRange, dcf, multiples, arrMultiple, stageMultiple
  );

  return {
    dcfValuation: dcf.valuation,
    dcfDetails: dcf.details,
    revenueMultipleValuation: multiples.revenueMultipleVal,
    ebitdaMultipleValuation: multiples.ebitdaMultipleVal,
    psrValuation: multiples.psrVal,
    appliedMultiples: multiples.appliedMultiples,
    arrMultipleValuation: arrMultiple.valuation,
    arrMultiple: arrMultiple.multiple,
    weightedValuation,
    valuationRange,
    pricePerShare: 0, // SOプランと連動時に計算
    impliedMultiples,
    insights,
    stageMultipleBenchmark: {
      stage: input.stage,
      typicalMultiple: { min: stageMultiple.min, max: stageMultiple.max },
    },
  };
}

// ========== バリュエーション インサイト ==========
function generateValuationInsights(
  input: ValuationInput,
  weightedVal: number,
  range: ValuationResult['valuationRange'],
  _dcf: { valuation: number },
  _multiples: ReturnType<typeof calculateMultiples>,
  arrMultiple: { valuation: number; multiple: number },
  _stageMultiple: { min: number; max: number; typical: number }
): string[] {
  const insights: string[] = [];
  const annualRevenue = input.annualRevenue || input.monthlyRevenue * 12;

  // 総合評価
  insights.push(
    `📊 加重平均企業価値: ${(weightedVal / 100_000_000).toFixed(1)}億円（レンジ: ${(range.low / 100_000_000).toFixed(1)}億円〜${(range.high / 100_000_000).toFixed(1)}億円）`
  );

  // 直近ラウンドとの比較
  if (input.lastRoundValuation > 0) {
    const growth = ((weightedVal - input.lastRoundValuation) / input.lastRoundValuation) * 100;
    if (growth > 0) {
      insights.push(
        `📈 直近ラウンド（${(input.lastRoundValuation / 100_000_000).toFixed(1)}億円）から${growth.toFixed(0)}%の価値上昇が見込まれます。`
      );
    } else {
      insights.push(
        `⚠️ 直近ラウンド（${(input.lastRoundValuation / 100_000_000).toFixed(1)}億円）を下回るバリュエーションです。ダウンラウンドの可能性を考慮してください。`
      );
    }
  }

  // SaaS特有メトリクス
  if (input.mrr > 0 || input.arr > 0) {
    insights.push(
      `💡 SaaS ARRマルチプル: ${arrMultiple.multiple}x（ARR: ${((input.arr || input.mrr * 12) / 10000).toLocaleString()}万円 → 評価額: ${(arrMultiple.valuation / 100_000_000).toFixed(1)}億円）`
    );
  }

  // 成長率に応じたアドバイス
  if (input.revenueGrowthRate > 100) {
    insights.push(
      '🚀 年成長率100%超のハイパーグロースフェーズです。高いARRマルチプルが正当化されますが、持続可能性の検証が重要です。'
    );
  } else if (input.revenueGrowthRate > 50) {
    insights.push(
      '📈 年成長率50%超は優良スタートアップの水準です。「Rule of 40」（成長率+利益率≧40%）を意識した経営を推奨します。'
    );
  } else if (input.revenueGrowthRate < 20) {
    insights.push(
      '⚠️ 年成長率が20%未満です。成長が鈍化している場合、マルチプルの低下が懸念されます。新たな成長ドライバーの開発を検討してください。'
    );
  }

  // 粗利率
  if (input.grossMargin < 50) {
    insights.push(
      `⚠️ 粗利率${input.grossMargin}%はSaaS企業として低めです。一般的に60%以上が求められます。原価構造の見直しを検討してください。`
    );
  }

  // Implied multiple
  const impliedRevMultiple = annualRevenue > 0 ? weightedVal / annualRevenue : 0;
  if (impliedRevMultiple > 0) {
    insights.push(
      `📐 Implied EV/Revenue マルチプル: ${impliedRevMultiple.toFixed(1)}x`
    );
  }

  return insights;
}

// ========== ユーティリティ ==========
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 類似企業のデフォルトデータ（日本市場） */
export const DEFAULT_COMPARABLES: ComparableCompany[] = [
  { id: '1', name: 'freee', industry: 'SaaS', revenue: 25_000_000_000, ebitda: -2_000_000_000, valuation: 200_000_000_000, evRevenue: 8.0, evEbitda: 0, psRatio: 8.0 },
  { id: '2', name: 'マネーフォワード', industry: 'SaaS', revenue: 22_000_000_000, ebitda: -1_500_000_000, valuation: 180_000_000_000, evRevenue: 8.2, evEbitda: 0, psRatio: 8.2 },
  { id: '3', name: 'Sansan', industry: 'SaaS', revenue: 28_000_000_000, ebitda: 3_000_000_000, valuation: 150_000_000_000, evRevenue: 5.4, evEbitda: 50, psRatio: 5.4 },
  { id: '4', name: 'ラクス', industry: 'SaaS', revenue: 35_000_000_000, ebitda: 8_000_000_000, valuation: 400_000_000_000, evRevenue: 11.4, evEbitda: 50, psRatio: 11.4 },
  { id: '5', name: 'HENNGE', industry: 'SaaS', revenue: 8_000_000_000, ebitda: 1_000_000_000, valuation: 40_000_000_000, evRevenue: 5.0, evEbitda: 40, psRatio: 5.0 },
];
