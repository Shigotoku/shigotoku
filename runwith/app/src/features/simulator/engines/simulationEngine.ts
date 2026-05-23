import type {
  SimulationData,
  MonthlyMetrics,
  SimulationResult,
  VitalSigns,
  SensitivityResult,
  SensitivityScenario,
  BreakevenResult,
  BenchmarkComparison,
  ChecklistItem,
  CoreParams,
} from '../types/simulation';
import { industryPresets } from '../presets/index';
import { calculateIndustryKpis } from './industryKpiEngine';

const PROJECTION_MONTHS = 60; // 5年間

// ========== メインシミュレーション ==========
export function runSimulation(data: SimulationData): SimulationResult {
  const monthly = projectMonthly(data);
  const vitals = calculateVitals(data, monthly);
  const summary = buildSummary(data, monthly);
  const breakeven = calculateBreakeven(data, monthly);
  const sensitivity = runSensitivityAnalysis(data);
  const benchmarks = buildBenchmarks(data, summary);
  const industryKpis = calculateIndustryKpis(data);
  const checklist = buildChecklist(data, summary, breakeven);
  const aiInsights = generateInsights(data, summary, vitals, breakeven, industryKpis);
  return { monthly, vitals, summary, breakeven, sensitivity, benchmarks, checklist, aiInsights, industryKpis };
}

// ========== 月次予測 ==========
function projectMonthly(data: SimulationData): MonthlyMetrics[] {
  const { coreParams: p } = data;
  const results: MonthlyMetrics[] = [];

  const grossMarginRate = 1 - p.cogsRate - (p.partnerRatio * p.partnerCommissionRate);
  const totalAcquisitionCost = p.monthlyAdSpend + p.monthlySalesPayroll;

  // 固定費を詳細に計算
  const detailedFixedCost =
    p.devPayroll + p.csPayroll + p.salesPayroll + p.adminPayroll +
    p.outsourcingCost + p.officeInfra + p.serverCost + p.cloudServiceCost +
    p.monitoringToolCost + p.backupCost + p.otherFixed +
    p.designCost + p.qaCost + p.maintenanceCost + p.cdnCost +
    p.seoCost + p.contentCost + p.accountingCost + p.saasToolCost + p.securityCost;

  // totalPayroll > 0 ならそちらを使用、0なら詳細積上げを使用
  const fixedCosts = p.totalPayroll > 0
    ? p.totalPayroll + p.officeInfra + p.otherFixed + p.serverCost +
      p.cloudServiceCost + p.monitoringToolCost + p.backupCost +
      p.designCost + p.qaCost + p.maintenanceCost + p.cdnCost +
      p.seoCost + p.contentCost + p.accountingCost + p.saasToolCost + p.securityCost
    : detailedFixedCost;

  let totalCustomers = p.monthlyNewCustomers * 3; // 初期顧客を仮定
  let currentMrr = totalCustomers * p.averagePrice;
  let cash = p.cashBalance;
  let prevMrr = currentMrr;

  for (let m = 1; m <= PROJECTION_MONTHS; m++) {
    const newCustomers = p.monthlyNewCustomers;
    const churnedCustomers = Math.round(totalCustomers * p.monthlyChurnRate);
    const expansionRate = data.industryParams?.expansionRate ?? p.upsellRate;

    const newMrr = newCustomers * p.averagePrice;
    const expansionMrr = currentMrr * expansionRate;
    const churnedMrr = currentMrr * p.monthlyChurnRate;

    totalCustomers = totalCustomers + newCustomers - churnedCustomers;
    currentMrr = currentMrr + newMrr + expansionMrr - churnedMrr;

    // 従量課金収益
    const usageRevenue = totalCustomers * p.usageUnitPrice * p.avgUsagePerCustomer;

    // 初期費用収益 (新規顧客分のみ)
    const initialFeeRevenue = newCustomers * p.initialFee;

    // 総売上
    const revenue = currentMrr + usageRevenue;

    // 原価
    const cogs = revenue * p.cogsRate;
    const partnerCost = revenue * p.partnerRatio * p.partnerCommissionRate;
    const grossProfit = revenue - cogs - partnerCost;
    const grossMargin = revenue > 0 ? grossProfit / revenue : 0;

    // 変動費（COGS内訳含む）
    const paymentFees = revenue * p.paymentFeeRate;
    const serverCostVariable = revenue * (p.serverCostAsRevPercent || 0);
    const supportCost = totalCustomers * (p.supportCostPerCustomer || 0);
    const variableCost = paymentFees + serverCostVariable + supportCost + p.apiCost + p.communicationCost + p.storageCost;

    // OPEX
    const opex = fixedCosts + totalAcquisitionCost + variableCost;
    const ebitda = grossProfit - opex + initialFeeRevenue;
    const operatingProfit = ebitda; // 簡易化

    const cashflow = ebitda;
    cash = cash + cashflow;

    // ARPU
    const arpu = totalCustomers > 0 ? (currentMrr + usageRevenue) / totalCustomers : 0;

    // ユニットエコノミクス
    const cac = newCustomers > 0 ? totalAcquisitionCost / newCustomers : 0;
    const ltv = p.monthlyChurnRate > 0 ? (p.averagePrice * grossMarginRate) / p.monthlyChurnRate : 0;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    const paybackMonths = (p.averagePrice * grossMarginRate) > 0 ? cac / (p.averagePrice * grossMarginRate) : 0;

    // NRR
    const nrr = (currentMrr - newMrr) > 0 ? ((currentMrr - newMrr + expansionMrr - churnedMrr + newMrr) / (currentMrr - newMrr + churnedMrr - expansionMrr)) * 100 : 100;

    // MRR成長率
    const mrrGrowthRate = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 0;

    // Burn & Runway
    const burnRate = ebitda < 0 ? Math.abs(ebitda) : 0;
    const runway = burnRate > 0 ? cash / burnRate : 999;

    prevMrr = currentMrr;

    results.push({
      month: m,
      label: `${m}ヶ月目`,
      mrr: Math.round(currentMrr),
      newMrr: Math.round(newMrr),
      expansionMrr: Math.round(expansionMrr),
      churnedMrr: Math.round(churnedMrr),
      arr: Math.round(currentMrr * 12),
      totalCustomers,
      newCustomers,
      churnedCustomers,
      revenue: Math.round(revenue + initialFeeRevenue),
      usageRevenue: Math.round(usageRevenue),
      initialFeeRevenue: Math.round(initialFeeRevenue),
      cogs: Math.round(cogs + partnerCost),
      grossProfit: Math.round(grossProfit),
      grossMargin: Math.round(grossMargin * 1000) / 10,
      opex: Math.round(opex),
      variableCost: Math.round(variableCost),
      fixedCost: Math.round(fixedCosts),
      ebitda: Math.round(ebitda),
      operatingProfit: Math.round(operatingProfit),
      cashflow: Math.round(cashflow),
      cashBalance: Math.round(cash),
      ltv: Math.round(ltv),
      cac: Math.round(cac),
      ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
      paybackMonths: Math.round(paybackMonths * 10) / 10,
      arpu: Math.round(arpu),
      nrr: Math.round(nrr * 10) / 10,
      mrrGrowthRate: Math.round(mrrGrowthRate * 10) / 10,
      burnRate: Math.round(burnRate),
      runway: Math.round(runway * 10) / 10,
    });
  }

  return results;
}

// ========== 損益分岐点 ==========
function calculateBreakeven(data: SimulationData, monthly: MonthlyMetrics[]): BreakevenResult {
  const { coreParams: p } = data;

  // 月次黒字化月を探す
  let breakevenMonth = PROJECTION_MONTHS;
  for (const m of monthly) {
    if (m.ebitda >= 0) {
      breakevenMonth = m.month;
      break;
    }
  }

  // 累積損益分岐月
  let cumProfit = 0;
  let cumulativeBreakevenMonth = PROJECTION_MONTHS;
  // 初期投資も加算
  const initialInvestment = p.initialDevCost + p.initialMarketingCost + p.exhibitionCost + p.legalIpCost;
  cumProfit = -initialInvestment;
  for (const m of monthly) {
    cumProfit += m.ebitda;
    if (cumProfit >= 0) {
      cumulativeBreakevenMonth = m.month;
      break;
    }
  }

  // 黒字化に必要な顧客数
  const grossMarginRate = 1 - p.cogsRate - (p.partnerRatio * p.partnerCommissionRate);
  const fixedCosts = p.totalPayroll + p.officeInfra + p.otherFixed + p.monthlyAdSpend + p.monthlySalesPayroll;
  const marginPerCustomer = p.averagePrice * grossMarginRate;
  const breakevenCustomers = marginPerCustomer > 0 ? Math.ceil(fixedCosts / marginPerCustomer) : 999;
  const breakevenMrr = breakevenCustomers * p.averagePrice;

  return {
    breakevenMonth,
    breakevenCustomers,
    breakevenMrr: Math.round(breakevenMrr),
    cumulativeBreakevenMonth,
  };
}

// ========== 感度分析 ==========
function runSensitivityAnalysis(data: SimulationData): SensitivityResult {
  const scenarios: SensitivityScenario[] = [];

  const sensitivityItems: { label: string; paramKey: keyof CoreParams; variation: number }[] = [
    { label: '顧客数 ±20%', paramKey: 'monthlyNewCustomers', variation: 0.20 },
    { label: 'ARPU ±20%', paramKey: 'averagePrice', variation: 0.20 },
    { label: 'Churn率 ±50%', paramKey: 'monthlyChurnRate', variation: 0.50 },
    { label: '広告費 ±30%', paramKey: 'monthlyAdSpend', variation: 0.30 },
    { label: '人件費 ±20%', paramKey: 'totalPayroll', variation: 0.20 },
    { label: '価格改定 ±15%', paramKey: 'averagePrice', variation: 0.15 },
  ];

  for (const item of sensitivityItems) {
    const baseValue = data.coreParams[item.paramKey] as number;

    // 上方シナリオ
    const upData = cloneData(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (upData.coreParams as any)[item.paramKey] = baseValue * (1 + item.variation);
    const upMonthly = projectMonthly(upData);

    // 下方シナリオ
    const downData = cloneData(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (downData.coreParams as any)[item.paramKey] = baseValue * (1 - item.variation);
    const downMonthly = projectMonthly(downData);

    scenarios.push({
      label: item.label,
      paramKey: item.paramKey,
      baseValue,
      variation: item.variation,
      resultMrr12: upMonthly[11]?.mrr ?? 0,
      resultMrr36: downMonthly[11]?.mrr ?? 0,
      resultEbitda12: upMonthly[11]?.ebitda ?? 0,
      resultCash36: downMonthly[35]?.cashBalance ?? 0,
    });
  }

  return { scenarios };
}

function cloneData(data: SimulationData): SimulationData {
  return {
    profile: { ...data.profile },
    coreParams: { ...data.coreParams },
    scaleParams: { ...data.scaleParams },
    industryParams: { ...data.industryParams },
    competitors: [...(data.competitors || [])],
  };
}

// ========== ⑧ ベンチマーク比較 ==========
function buildBenchmarks(
  data: SimulationData,
  summary: SimulationResult['summary']
): BenchmarkComparison[] {
  const bench = industryPresets[data.profile.industry].benchmarks;

  return [
    {
      metric: 'cogsRate',
      label: '売上原価率',
      myValue: Math.round(data.coreParams.cogsRate * 100),
      industryAvg: Math.round((1 - bench.grossMargin) * 100),
      unit: '%',
      isHigherBetter: false,
    },
    {
      metric: 'payrollRatio',
      label: '人件費率',
      myValue: Math.round(summary.payrollRatio),
      industryAvg: Math.round(bench.payrollRatio * 100),
      unit: '%',
      isHigherBetter: false,
    },
    {
      metric: 'adSpendRatio',
      label: '広告比率',
      myValue: Math.round(summary.adSpendRatio),
      industryAvg: Math.round(bench.adSpendRatio * 100),
      unit: '%',
      isHigherBetter: false,
    },
    {
      metric: 'operatingMargin',
      label: '営業利益率',
      myValue: Math.round(summary.operatingMargin * 10) / 10,
      industryAvg: Math.round(bench.operatingMargin * 100),
      unit: '%',
      isHigherBetter: true,
    },
    {
      metric: 'ltvCacRatio',
      label: 'LTV/CAC',
      myValue: summary.ltvCacRatio,
      industryAvg: bench.ltvCacRatio,
      unit: '倍',
      isHigherBetter: true,
    },
    {
      metric: 'growthRate',
      label: '成長率',
      myValue: Math.round(summary.mrrGrowthRate * 10) / 10,
      industryAvg: Math.round(bench.growthRate * 100),
      unit: '%',
      isHigherBetter: true,
    },
  ];
}

// ========== ⑨ チェックリスト ==========
function buildChecklist(
  data: SimulationData,
  summary: SimulationResult['summary'],
  breakeven: BreakevenResult
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const bench = industryPresets[data.profile.industry].benchmarks;

  // 価格設定妥当性
  items.push({
    id: 'price',
    category: '価格設計',
    label: '価格設定妥当性',
    status: summary.ltvCacRatio >= 3 ? 'good' : summary.ltvCacRatio >= 2 ? 'warning' : 'danger',
    message: summary.ltvCacRatio >= 3
      ? `LTV/CAC ${summary.ltvCacRatio}xで健全な価格設定です`
      : `LTV/CAC ${summary.ltvCacRatio}xは低め。価格引き上げまたはCAC削減を検討`,
  });

  // 原価率
  items.push({
    id: 'cogs',
    category: '収益性',
    label: '原価率',
    status: data.coreParams.cogsRate <= (1 - bench.grossMargin) ? 'good' : data.coreParams.cogsRate <= 0.40 ? 'warning' : 'danger',
    message: `売上原価率 ${(data.coreParams.cogsRate * 100).toFixed(0)}%（業界平均: ${((1 - bench.grossMargin) * 100).toFixed(0)}%）`,
  });

  // 回収期間
  items.push({
    id: 'payback',
    category: '効率性',
    label: '回収期間',
    status: summary.paybackMonths <= 12 ? 'good' : summary.paybackMonths <= 18 ? 'warning' : 'danger',
    message: `CAC回収期間 ${summary.paybackMonths.toFixed(1)}ヶ月（目標: 12ヶ月以内）`,
  });

  // 解約率水準
  items.push({
    id: 'churn',
    category: '顧客維持',
    label: '解約率水準',
    status: data.coreParams.monthlyChurnRate <= bench.churnRate ? 'good' : data.coreParams.monthlyChurnRate <= bench.churnRate * 1.5 ? 'warning' : 'danger',
    message: `月次解約率 ${(data.coreParams.monthlyChurnRate * 100).toFixed(1)}%（業界平均: ${(bench.churnRate * 100).toFixed(1)}%）`,
  });

  // 顧客獲得チャネル
  items.push({
    id: 'channel',
    category: '獲得戦略',
    label: '顧客獲得チャネル',
    status: data.coreParams.partnerRatio < 0.7 ? 'good' : 'warning',
    message: data.coreParams.partnerRatio < 0.7
      ? `直販比率 ${((1 - data.coreParams.partnerRatio) * 100).toFixed(0)}%でバランスが取れています`
      : `代理店依存度 ${(data.coreParams.partnerRatio * 100).toFixed(0)}%が高め。自社チャネル強化を推奨`,
  });

  // 競合との差別化
  const competitors = data.competitors || [];
  items.push({
    id: 'competition',
    category: '市場',
    label: '競合との差別化',
    status: competitors.length > 0 ? 'good' : 'warning',
    message: competitors.length > 0
      ? `${competitors.length}社の競合データ入力済。比較分析可能`
      : '競合データを入力すると、より精密な分析が可能です',
  });

  // スケーラビリティ
  items.push({
    id: 'scalability',
    category: '成長性',
    label: 'スケーラビリティ',
    status: summary.grossMargin >= 60 ? 'good' : summary.grossMargin >= 40 ? 'warning' : 'danger',
    message: `粗利率 ${summary.grossMargin.toFixed(1)}%。${summary.grossMargin >= 60 ? 'スケーラブルなビジネスモデル' : '限界利益率の改善が必要'}`,
  });

  // セキュリティ体制
  items.push({
    id: 'security',
    category: '基盤',
    label: 'セキュリティ体制',
    status: data.coreParams.securityCost > 0 ? 'good' : 'warning',
    message: data.coreParams.securityCost > 0
      ? `月額 ${(data.coreParams.securityCost / 10000).toFixed(0)}万円のセキュリティ投資`
      : 'セキュリティ費の計上がありません。対策を検討してください',
  });

  return items;
}

// ========== バイタルサイン ==========
function calculateVitals(data: SimulationData, monthly: MonthlyMetrics[]): VitalSigns {
  const latest = monthly[monthly.length - 1];
  const m1 = monthly[0];

  // 成長力: MRR成長率ベース
  const mrrGrowth = m1.mrr > 0 ? ((latest.mrr - m1.mrr) / m1.mrr) * 100 : 0;
  const growthScore = Math.min(100, Math.max(0, mrrGrowth * 2));

  // 安定性: 解約率の低さ + 粗利率
  const churnScore = Math.max(0, 100 - data.coreParams.monthlyChurnRate * 2000);
  const marginScore = latest.grossMargin;
  const stabilityScore = (churnScore + marginScore) / 2;

  // 拡張性: LTV/CAC
  const ltvCacScore = Math.min(100, latest.ltvCacRatio * 20);
  const scalabilityScore = ltvCacScore;

  // 危険度: Runway
  const runwayScore = latest.runway >= 24 ? 0 : latest.runway >= 12 ? 30 : latest.runway >= 6 ? 60 : 90;
  const riskScore = 100 - runwayScore;

  const overall = (growthScore + stabilityScore + scalabilityScore + riskScore) / 4;

  const gradeFor = (s: number) => s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : s >= 40 ? 'D' : 'E';
  const labelFor = (g: string) => {
    const map: Record<string, string> = { A: '優秀', B: '良好', C: '普通', D: '注意', E: '危険' };
    return map[g] || '—';
  };

  const mkVital = (score: number) => {
    const s = Math.round(Math.min(100, Math.max(0, score)));
    const g = gradeFor(s);
    return { score: s, grade: g, label: labelFor(g) };
  };

  return {
    growth: mkVital(growthScore),
    stability: mkVital(stabilityScore),
    scalability: mkVital(scalabilityScore),
    risk: mkVital(riskScore),
    overall: mkVital(overall),
  };
}

// ========== サマリー ==========
function buildSummary(data: SimulationData, monthly: MonthlyMetrics[]) {
  const m0 = monthly[0];
  const m12 = monthly[11] || monthly[monthly.length - 1];
  const m36 = monthly[35] || monthly[monthly.length - 1];
  const m60 = monthly[monthly.length - 1];
  const latest = monthly[monthly.length - 1];

  const grossMarginRate = 1 - data.coreParams.cogsRate - (data.coreParams.partnerRatio * data.coreParams.partnerCommissionRate);

  // Rule of 40
  const yoyGrowth = m0.mrr > 0 ? ((m12.mrr - m0.mrr) / m0.mrr) * 100 : 0;
  const profitMargin = m12.revenue > 0 ? (m12.ebitda / m12.revenue) * 100 : 0;
  const ruleOf40 = yoyGrowth + profitMargin;

  // Quick Ratio
  const quickRatio = (m12.churnedMrr) > 0
    ? (m12.newMrr + m12.expansionMrr) / m12.churnedMrr
    : 99;

  // 営業利益率
  const operatingMargin = m12.revenue > 0 ? (m12.operatingProfit / m12.revenue) * 100 : 0;

  // 広告費率
  const adSpendRatio = m12.revenue > 0 ? (data.coreParams.monthlyAdSpend / m12.revenue) * 100 : 0;

  // 人件費率
  const payrollRatio = m12.revenue > 0 ? (data.coreParams.totalPayroll / m12.revenue) * 100 : 0;

  // MRR成長率 (12ヶ月後ベース)
  const mrrGrowthRate = m0.mrr > 0 ? ((m12.mrr - m0.mrr) / m0.mrr) * 100 : 0;

  return {
    currentMrr: m0.mrr,
    projectedMrr12: m12.mrr,
    projectedMrr36: m36.mrr,
    projectedMrr60: m60.mrr,
    ltv: latest.ltv,
    cac: latest.cac,
    ltvCacRatio: latest.ltvCacRatio,
    paybackMonths: latest.paybackMonths,
    arpu: latest.arpu,
    nrr: latest.nrr,
    grossMargin: Math.round(grossMarginRate * 100 * 10) / 10,
    operatingMargin: Math.round(operatingMargin * 10) / 10,
    ruleOf40: Math.round(ruleOf40 * 10) / 10,
    quickRatio: Math.round(quickRatio * 100) / 100,
    runway: latest.runway,
    bundleRate: Math.round(data.coreParams.bundleRate * 100),
    upsellRate: Math.round(data.coreParams.upsellRate * 100),
    mrrGrowthRate: Math.round(mrrGrowthRate * 10) / 10,
    adSpendRatio: Math.round(adSpendRatio * 10) / 10,
    payrollRatio: Math.round(payrollRatio * 10) / 10,
  };
}

// ========== AIインサイト ==========
function generateInsights(
  data: SimulationData,
  summary: SimulationResult['summary'],
  vitals: VitalSigns,
  breakeven: BreakevenResult,
  industryKpis?: SimulationResult['industryKpis']
): string[] {
  const insights: string[] = [];
  const benchmarks = industryPresets[data.profile.industry].benchmarks;

  // LTV/CAC チェック
  if (summary.ltvCacRatio < 3.0) {
    insights.push(
      `⚠️ LTV/CAC比率が${summary.ltvCacRatio}xと基準値(3.0x)を下回っています。CACを${Math.round(summary.cac * 0.3).toLocaleString()}円削減するか、LTVを向上させる施策（解約率の改善・ARPA引き上げ）を検討してください。`
    );
  } else {
    insights.push(
      `✅ LTV/CAC比率${summary.ltvCacRatio}xは健全な水準です。投資を加速できるフェーズにあります。`
    );
  }

  // 解約率
  if (data.coreParams.monthlyChurnRate > benchmarks.churnRate) {
    const diff = ((data.coreParams.monthlyChurnRate - benchmarks.churnRate) * 100).toFixed(1);
    insights.push(
      `⚠️ 月次解約率(${(data.coreParams.monthlyChurnRate * 100).toFixed(1)}%)が業界平均(${(benchmarks.churnRate * 100).toFixed(1)}%)より${diff}%高い状態です。カスタマーサクセスの強化を推奨します。`
    );
  }

  // Runway
  if (summary.runway < 6) {
    insights.push(
      `🚨 現在のBurn Rateではキャッシュが${Math.round(summary.runway)}ヶ月で枯渇します。資金調達または固定費の見直しが急務です。`
    );
  } else if (summary.runway < 12) {
    insights.push(
      `💡 Runway残り約${Math.round(summary.runway)}ヶ月です。12ヶ月の余裕を確保するため、半年以内の対策を検討してください。`
    );
  }

  // Rule of 40
  if (summary.ruleOf40 < 40) {
    insights.push(
      `📊 Rule of 40 = ${summary.ruleOf40}%です。SaaS企業の健全基準40%に到達するには、成長率の加速または利益率の改善が必要です。`
    );
  }

  // NRR
  if (summary.nrr < 100) {
    insights.push(
      `📉 NRR(売上維持率)が${summary.nrr}%と100%を下回っています。既存顧客からの収益が縮小傾向です。アップセル・クロスセル施策を強化してください。`
    );
  }

  // 代理店
  if (data.coreParams.partnerRatio > 0.5) {
    insights.push(
      `💼 代理店経由の割合が${(data.coreParams.partnerRatio * 100).toFixed(0)}%と高めです。自社チャネルの強化により、利益率の改善が見込めます。`
    );
  }

  // 損益分岐点
  if (breakeven.breakevenMonth <= 12) {
    insights.push(
      `✅ ${breakeven.breakevenMonth}ヶ月目で単月黒字化の見込みです。顧客数${breakeven.breakevenCustomers}件（MRR ${(breakeven.breakevenMrr / 10000).toFixed(0)}万円）が目安です。`
    );
  } else if (breakeven.breakevenMonth <= 24) {
    insights.push(
      `💡 単月黒字化は${breakeven.breakevenMonth}ヶ月目の見込みです。コスト構造の最適化で前倒しを検討してください。`
    );
  } else {
    insights.push(
      `⚠️ 黒字化まで${breakeven.breakevenMonth}ヶ月以上かかる見込みです。価格戦略・コスト構造の抜本的な見直しが必要です。`
    );
  }

  // バンドル率
  if (data.coreParams.bundleRate < 0.15 && data.coreParams.productCount > 1) {
    insights.push(
      `📦 バンドル率が${(data.coreParams.bundleRate * 100).toFixed(0)}%と低めです。複数サービスのセット販売を強化すると、ARPU向上とChurn低減が期待できます。`
    );
  }

  // 年払い推奨
  if (data.coreParams.annualPayRatio < 0.3) {
    insights.push(
      `💰 年払い顧客比率が${(data.coreParams.annualPayRatio * 100).toFixed(0)}%です。年払い割引(${(data.coreParams.annualDiscountRate * 100).toFixed(0)}%)を訴求し、キャッシュフロー改善と解約率低減を図れます。`
    );
  }

  // 医療向け特別インサイト
  if (data.profile.industry === 'medical' && data.industryParams?.annualTurnover) {
    const turnover = data.industryParams.annualTurnover;
    const recruitCost = data.industryParams.recruitmentCostPerPerson || 1500000;
    const avoidedCost = turnover * recruitCost;
    insights.push(
      `🏥 年間離職${turnover}人の採用コスト(約${(avoidedCost / 10000).toFixed(0)}万円)を考慮すると、DX投資による離職防止効果は大きなROIを生みます。`
    );
  }

  // ========== 業種別特殊KPIインサイト ==========
  if (industryKpis) {
    generateIndustrySpecificInsights(data, industryKpis, insights);
  }

  return insights;
}

/** 業種別特殊KPIに基づくインサイト生成 */
function generateIndustrySpecificInsights(
  data: SimulationData,
  kpis: SimulationResult['industryKpis'],
  insights: string[]
): void {
  // 飲食業
  if (kpis.type === 'food') {
    const d = kpis.data;
    if (d.flRatio > 60) {
      insights.push(
        `🍽️ FL比率が${d.flRatio}%と基準値60%を超えています。食材費(${d.fRatio}%)と人件費(${d.lRatio}%)のバランスを見直してください。メニュー原価の再設計やシフト最適化が有効です。`
      );
    } else if (d.flRatio <= 55) {
      insights.push(
        `✅ FL比率${d.flRatio}%は非常に優秀です。利益を確保しつつ品質維持に努めましょう。`
      );
    } else {
      insights.push(
        `🍽️ FL比率${d.flRatio}%は標準的な水準です。60%以下を維持するために、食材ロス削減と労働生産性改善を続けてください。`
      );
    }
    if (d.salesPerManHour < 3000) {
      insights.push(
        `⚠️ 人時売上高が${d.salesPerManHour.toLocaleString()}円と低めです（基準: 5,000円）。スタッフの過剰配置の可能性があります。ピーク時間帯分析とシフト最適化を検討してください。`
      );
    } else if (d.salesPerManHour > 8000) {
      insights.push(
        `⚠️ 人時売上高が${d.salesPerManHour.toLocaleString()}円と非常に高く、スタッフに過剰な負荷がかかっている可能性があります。サービス品質低下やスタッフ離職リスクに注意してください。`
      );
    }
    if (d.capacityUtilization < 50) {
      insights.push(
        `💡 キャパシティ利用率が${d.capacityUtilization}%です。回転率を上げる施策（ランチタイム強化、テイクアウト導入等）で売上向上の余地があります。`
      );
    }
  }

  // 美容サロン
  if (kpis.type === 'beautySalon') {
    const d = kpis.data;
    if (d.newClientRepeatRate < 30) {
      insights.push(
        `💇 新規顧客リピート率が${d.newClientRepeatRate}%と業界平均30%を下回っています。初回来店時の体験向上、次回予約の促進、来店後フォローメッセージの自動化を検討してください。`
      );
    } else if (d.newClientRepeatRate >= 50) {
      insights.push(
        `✅ 新規顧客リピート率${d.newClientRepeatRate}%は優秀です！この水準を維持し、既存顧客の既存リピート率(${d.existingClientRepeatRate}%)も90%以上を目指しましょう。`
      );
    }
    if (d.existingClientRepeatRate < 70) {
      insights.push(
        `⚠️ 既存顧客リピート率${d.existingClientRepeatRate}%は改善余地があります。「1対5の法則」により、新規獲得コストは既存維持の${d.acquisitionCostRatio}倍です。CRM活用で失客防止に注力してください。`
      );
    }
    if (d.capacityUtilization > 85) {
      insights.push(
        `📊 稼働率が${d.capacityUtilization}%と高く、予約が取りにくい状況です。スタイリスト増員またはスロット拡大を検討してください。`
      );
    }
    insights.push(
      `📈 顧客LTVは${d.clientLtv.toLocaleString()}円、LTV/CACは${d.ltvCacRatio}倍です。スタイリスト1人あたり月商${(d.revenuePerStylist / 10000).toFixed(0)}万円（目標: 80万円以上）。`
    );
  }

  // フィットネスジム
  if (kpis.type === 'fitnessGym') {
    const d = kpis.data;
    if (d.monthlyChurnRate > 5) {
      insights.push(
        `💪 月次退会率が${d.monthlyChurnRate}%と高めです。会員の平均在籍期間${d.avgMembershipMonths}ヶ月を延ばすために、初期エンゲージメントプログラム（入会30日間の集中フォロー）を導入してください。`
      );
    }
    if (d.congestionPenalty > 0) {
      insights.push(
        `⚠️ 混雑ペナルティが${d.congestionPenalty}%発動中です。会員密度(${d.memberDensity}人/㎡)が閾値を超えており、退会率上昇リスクがあります。フロア拡張またはピーク分散施策を検討してください。`
      );
    }
    insights.push(
      `📊 ㎡あたり月間収益: ${d.revenuePerSqm.toLocaleString()}円。会員LTV: ${d.memberLtv.toLocaleString()}円 / CAC: ${d.cac.toLocaleString()}円（LTV/CAC: ${d.ltvCacRatio}倍）。パーソナル収益: 月${(d.personalTrainingRevenue / 10000).toFixed(0)}万円。`
    );
    if (d.trialConversionRate < 40) {
      insights.push(
        `💡 体験→入会率が${d.trialConversionRate}%です。体験時のスタッフ接客改善、即日入会特典の導入で転換率向上を目指してください。`
      );
    }
  }

  // 学習塾
  if (kpis.type === 'juku') {
    const d = kpis.data;
    if (d.parentSatisfactionImpact > 0) {
      insights.push(
        `📚 保護者満足度が基準値(80点)を下回っており、退塾率に+${d.parentSatisfactionImpact}%の悪影響が出ています。保護者面談の頻度増加、成績レポートの充実化を検討してください。`
      );
    }
    if (d.capacityUtilization > 90) {
      insights.push(
        `🎉 定員充足率${d.capacityUtilization}%で満席に近い状態です！2教室目の展開を検討する好機です。`
      );
    } else if (d.capacityUtilization < 50) {
      insights.push(
        `💡 定員充足率${d.capacityUtilization}%です。紹介制度の活性化、地域イベント参加、口コミ施策で生徒を獲得してください。`
      );
    }
    insights.push(
      `📈 生徒LTV: ${d.studentLtv.toLocaleString()}円 / 獲得単価(CAC): ${d.cac.toLocaleString()}円。推定退塾率: ${d.estimatedChurnRate}%。講師あたり売上: 月${(d.revenuePerTeacher / 10000).toFixed(0)}万円。`
    );
    if (d.seasonalRevenue > 0) {
      insights.push(
        `💰 季節講習の月按分収入は${(d.seasonalRevenue / 10000).toFixed(0)}万円です。受講率を現在より10%引き上げると年間${(d.seasonalRevenue * 0.1 * 12 / 10000).toFixed(0)}万円の増収が見込めます。`
      );
    }
  }

  // タクシー
  if (kpis.type === 'taxi') {
    const d = kpis.data;
    if (d.actualVehicleRate < 45) {
      insights.push(
        `🚕 実車率が${d.actualVehicleRate}%と低い状態です。空車走行を減らすために、配車アプリの導入を検討してください。アプリ導入で実車率が約${d.dispatchAppImpact}%向上する効果が見込めます。`
      );
    }
    if (d.driverShortage > 0) {
      insights.push(
        `⚠️ 乗務員が${d.driverShortage}台分不足しています。遊休車両の固定費が月${d.idleVehicleCost.toLocaleString()}円発生中です。乗務員確保か車両削減を検討してください。`
      );
    }
    if (d.workingRate < 80) {
      insights.push(
        `💡 実働率${d.workingRate}%です。乗務員のシフト最適化と車両配置の見直しで実働率を向上できます。`
      );
    }
    insights.push(
      `📊 日車営収: ${d.dailyRevenuePerVehicle.toLocaleString()}円 / 月次売上: ${(d.monthlyRevenue / 10000).toFixed(0)}万円 / 燃料費: ${(d.fuelCostTotal / 10000).toFixed(0)}万円。適正車両数: ${d.optimalVehicleCount}台。`
    );
  }
}
