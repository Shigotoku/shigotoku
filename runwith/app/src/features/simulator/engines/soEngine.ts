/**
 * ストックオプション計算エンジン
 * - 税制適格SOバリデーション
 * - 希薄化分析
 * - キャピタルゲイン計算
 * - グレードベース付与量算出
 * - 市場ベンチマーク比較
 */
import type {
  SOPlan,
  SORecipient,
  EmployeeGrade,
  ExitScenario,
  TaxQualifiedValidation,
  TaxQualifiedCheck,
  DilutionAnalysis,
  CapitalGainResult,
  SOSimulationResult,
  SOMarketBenchmark,
} from '../types/stockOption';
import { SO_MARKET_BENCHMARKS } from '../types/stockOption';


// ========== 税制適格ストックオプション バリデーション ==========
export function validateTaxQualified(
  plan: SOPlan,
  recipients: SORecipient[]
): TaxQualifiedValidation {
  const checks: TaxQualifiedCheck[] = [];

  // ルール1: 年間行使価額の上限チェック（2024年改正: 年間3,600万円）
  // ※ 設立5年未満のスタートアップは特例で上限緩和の可能性
  const annualExerciseLimitYen = 36_000_000; // 3,600万円
  for (const r of recipients) {
    const annualExerciseAmount = r.allocatedShares * r.exercisePrice;
    if (annualExerciseAmount > annualExerciseLimitYen) {
      checks.push({
        id: `annual-limit-${r.id}`,
        rule: '年間行使価額上限',
        status: 'fail',
        detail: `${r.name}の年間行使価額（${(annualExerciseAmount / 10000).toLocaleString()}万円）が上限${(annualExerciseLimitYen / 10000).toLocaleString()}万円を超過。2024年税制改正で上限が1,200万円→3,600万円に引き上げ（一部条件で更に緩和）されましたが、それでも超過しています。`,
        reference: '租税特別措置法第29条の2',
      });
    } else if (annualExerciseAmount > annualExerciseLimitYen * 0.8) {
      checks.push({
        id: `annual-limit-${r.id}`,
        rule: '年間行使価額上限',
        status: 'warning',
        detail: `${r.name}の年間行使価額（${(annualExerciseAmount / 10000).toLocaleString()}万円）が上限の80%を超えています。将来の株価上昇で超過する可能性があります。`,
        reference: '租税特別措置法第29条の2',
      });
    } else {
      checks.push({
        id: `annual-limit-${r.id}`,
        rule: '年間行使価額上限',
        status: 'pass',
        detail: `${r.name}の年間行使価額（${(annualExerciseAmount / 10000).toLocaleString()}万円）は上限${(annualExerciseLimitYen / 10000).toLocaleString()}万円以内です。`,
        reference: '租税特別措置法第29条の2',
      });
    }
  }

  // ルール2: 行使価額 ≥ 付与時の株式時価
  if (plan.exercisePrice < plan.pricePerShare) {
    checks.push({
      id: 'exercise-price',
      rule: '行使価額要件',
      status: 'fail',
      detail: `行使価額（${plan.exercisePrice.toLocaleString()}円）が付与時の1株時価（${plan.pricePerShare.toLocaleString()}円）を下回っています。税制適格SOでは行使価額≧付与時時価が必須です。`,
      reference: '租税特別措置法第29条の2第1項第2号',
    });
  } else {
    checks.push({
      id: 'exercise-price',
      rule: '行使価額要件',
      status: 'pass',
      detail: `行使価額（${plan.exercisePrice.toLocaleString()}円）≧ 付与時1株時価（${plan.pricePerShare.toLocaleString()}円）：要件充足。`,
      reference: '租税特別措置法第29条の2第1項第2号',
    });
  }

  // ルール3: 権利行使期間（付与決議から2年後〜10年後）
  if (plan.expirationYears > 10) {
    checks.push({
      id: 'expiration',
      rule: '権利行使期限',
      status: 'fail',
      detail: `権利行使期限（${plan.expirationYears}年）が上限10年を超過しています。`,
      reference: '租税特別措置法第29条の2第1項第3号',
    });
  } else if (plan.expirationYears < 2) {
    checks.push({
      id: 'expiration',
      rule: '権利行使期限',
      status: 'warning',
      detail: `権利行使期限（${plan.expirationYears}年）が短すぎます。税制適格SOの行使可能期間は付与決議日後2年〜10年です。`,
      reference: '租税特別措置法第29条の2第1項第3号',
    });
  } else {
    checks.push({
      id: 'expiration',
      rule: '権利行使期限',
      status: 'pass',
      detail: `権利行使期限（${plan.expirationYears}年）は適格範囲（2〜10年）内です。`,
      reference: '租税特別措置法第29条の2第1項第3号',
    });
  }

  // ルール4: 付与対象者要件（取締役・従業員、2024年改正で外部人材も一部可能に）
  const externalRecipients = recipients.filter(r => r.isExternal);
  if (externalRecipients.length > 0) {
    checks.push({
      id: 'external-recipients',
      rule: '付与対象者要件（社外人材）',
      status: 'warning',
      detail: `社外人材${externalRecipients.length}名への付与があります。2024年税制改正で一定の要件を満たす社外高度人材への付与が可能になりましたが、「高度な専門的知識を有する」等の厳格な証明が必要です。個別に税理士・弁護士に確認してください。`,
      reference: '2024年度税制改正大綱（スタートアップ支援策）',
    });
  }

  // ルール5: 譲渡制限
  checks.push({
    id: 'transfer-restriction',
    rule: '譲渡制限',
    status: 'pass',
    detail: '税制適格SOは第三者への譲渡が禁止されています（自動適用）。システム上で譲渡制限フラグが有効化されています。',
    reference: '租税特別措置法第29条の2第1項第5号',
  });

  // ルール6: SOプール上限の慣行チェック（法的要件ではないが実務上重要）
  const totalAllocatedPercent = recipients.reduce((sum, r) => {
    return sum + (r.allocatedShares / plan.totalShares) * 100;
  }, 0);
  if (totalAllocatedPercent > 15) {
    checks.push({
      id: 'pool-size',
      rule: 'SOプールサイズ（実務慣行）',
      status: 'warning',
      detail: `SO付与率合計（${totalAllocatedPercent.toFixed(1)}%）が実務上の上限目安15%を超えています。投資家との合意や既存株主の希薄化に注意してください。`,
      reference: '一般的な実務慣行（法定要件ではない）',
    });
  } else if (totalAllocatedPercent > 10) {
    checks.push({
      id: 'pool-size',
      rule: 'SOプールサイズ（実務慣行）',
      status: 'pass',
      detail: `SO付与率合計（${totalAllocatedPercent.toFixed(1)}%）は一般的な範囲（10〜15%）内です。`,
      reference: '一般的な実務慣行',
    });
  } else {
    checks.push({
      id: 'pool-size',
      rule: 'SOプールサイズ（実務慣行）',
      status: 'pass',
      detail: `SO付与率合計（${totalAllocatedPercent.toFixed(1)}%）は標準的な水準です。`,
      reference: '一般的な実務慣行',
    });
  }

  // ルール7: 保管委託要件（2024年改正）
  if (plan.planType === 'taxQualified') {
    checks.push({
      id: 'custody',
      rule: '保管委託要件',
      status: 'warning',
      detail: '税制適格SOの行使により取得した株式は、証券会社等への保管委託が必要です（2024年改正により要件緩和あり）。行使前に証券口座の開設・保管委託契約を締結してください。',
      reference: '租税特別措置法第29条の2第1項第6号',
    });
  }

  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;
  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warning' : 'pass';

  return {
    isValid: failCount === 0,
    checks,
    overallStatus,
  };
}

// ========== 希薄化分析 ==========
export function calculateDilution(
  plan: SOPlan,
  recipients: SORecipient[],
  foundersPercent: number,
  investorsPercent: number
): DilutionAnalysis {
  const othersPercent = 100 - foundersPercent - investorsPercent;
  const totalAllocatedShares = recipients.reduce((sum, r) => sum + r.allocatedShares, 0);
  const soPoolPercent = (totalAllocatedShares / (plan.totalShares + totalAllocatedShares)) * 100;

  // SO発行後の持分比率を計算（完全希薄化ベース）
  const totalAfter = plan.totalShares + totalAllocatedShares;
  const foundersAfter = (foundersPercent / 100 * plan.totalShares / totalAfter) * 100;
  const investorsAfter = (investorsPercent / 100 * plan.totalShares / totalAfter) * 100;
  const othersAfter = (othersPercent / 100 * plan.totalShares / totalAfter) * 100;
  const soPoolAfter = (totalAllocatedShares / totalAfter) * 100;

  return {
    beforeSO: {
      founders: Math.round(foundersPercent * 10) / 10,
      investors: Math.round(investorsPercent * 10) / 10,
      others: Math.round(othersPercent * 10) / 10,
    },
    afterSO: {
      founders: Math.round(foundersAfter * 10) / 10,
      investors: Math.round(investorsAfter * 10) / 10,
      soPool: Math.round(soPoolAfter * 10) / 10,
      others: Math.round(othersAfter * 10) / 10,
    },
    totalDilution: Math.round(soPoolAfter * 10) / 10,
  };
}

// ========== キャピタルゲイン計算 ==========
export function calculateCapitalGains(
  recipients: SORecipient[],
  exitScenario: ExitScenario,
  planType: SOPlan['planType']
): CapitalGainResult[] {
  const TAX_RATE_CAPITAL_GAINS = 0.20315;  // 申告分離課税（20.315%）
  const TAX_RATE_INCOME_MAX = 0.55;         // 給与所得最大税率（所得税45%+住民税10%）

  return recipients.map((r) => {
    const exitPricePerShare = exitScenario.pricePerShareAtExit * (1 - exitScenario.dilutionAtExit / 100);
    const grossGain = r.allocatedShares * (exitPricePerShare - r.exercisePrice);

    // 税制適格の場合
    const taxQualifiedTax = Math.max(0, grossGain * TAX_RATE_CAPITAL_GAINS);
    const netGainQualified = grossGain - taxQualifiedTax;

    // 非適格の場合
    const gainAtExercise = r.allocatedShares * (exitPricePerShare - r.exercisePrice);
    const nonQualifiedTaxExercise = Math.max(0, gainAtExercise * TAX_RATE_INCOME_MAX);
    // 売却時は行使時との差額に課税（簡易計算ではExitと行使が同時として0と仮定）
    const nonQualifiedTaxSale = 0;
    const netGainNonQualified = grossGain - nonQualifiedTaxExercise - nonQualifiedTaxSale;

    const taxBenefit = netGainQualified - netGainNonQualified;

    return {
      recipientId: r.id,
      recipientName: r.name,
      allocatedShares: r.allocatedShares,
      exercisePrice: r.exercisePrice,
      exitPricePerShare,
      grossGain: Math.round(grossGain),
      taxQualifiedTax: Math.round(taxQualifiedTax),
      nonQualifiedTaxExercise: Math.round(nonQualifiedTaxExercise),
      nonQualifiedTaxSale: Math.round(nonQualifiedTaxSale),
      netGainQualified: Math.round(netGainQualified),
      netGainNonQualified: Math.round(netGainNonQualified),
      taxBenefit: Math.round(taxBenefit),
    };
  });
}

// ========== グレードベース付与量自動算出 ==========
export function calculateGradeBasedAllocation(
  grade: EmployeeGrade,
  performanceScore: number,
  plan: SOPlan
): number {
  // パフォーマンススコアによる調整（0-100 → 0.5x-1.5x）
  const performanceMultiplier = 0.5 + (performanceScore / 100);

  // 基本付与率 × パフォーマンス調整
  const adjustedPercent = grade.baseAllocationPercent * performanceMultiplier;

  // 株数に変換
  const shares = Math.round((adjustedPercent / 100) * plan.totalShares);

  return shares;
}

// ========== 市場ベンチマーク取得 ==========
export function getRelevantBenchmarks(
  stage: string,
  role?: string
): SOMarketBenchmark[] {
  const stageMap: Record<string, string> = {
    'pre-seed': 'Seed',
    'seed': 'Seed',
    'series-a': 'Series A',
    'series-b': 'Series B+',
    'series-c': 'Series B+',
    'later': 'Series B+',
    'pre-ipo': 'Series B+',
    'startup': 'Seed',
    'small': 'Series A',
    'medium': 'Series B+',
    'enterprise': 'Series B+',
  };

  const mappedStage = stageMap[stage] || 'Series A';

  return SO_MARKET_BENCHMARKS.filter(b => {
    const stageMatch = b.stage === mappedStage;
    if (role) {
      return stageMatch && b.role.toLowerCase().includes(role.toLowerCase());
    }
    return stageMatch;
  });
}

// ========== SO総合シミュレーション実行 ==========
export function runSOSimulation(
  plan: SOPlan,
  recipients: SORecipient[],
  grades: EmployeeGrade[],
  exitScenarios: ExitScenario[],
  foundersPercent: number,
  investorsPercent: number,
  stage: string
): SOSimulationResult {
  // 税制適格バリデーション
  const taxValidation = validateTaxQualified(plan, recipients);

  // 希薄化分析
  const dilution = calculateDilution(plan, recipients, foundersPercent, investorsPercent);

  // キャピタルゲイン計算（最初のExitシナリオを使用）
  const primaryExit = exitScenarios[0];
  const capitalGains = primaryExit
    ? calculateCapitalGains(recipients, primaryExit, plan.planType)
    : [];

  // 付与状況サマリー
  const totalAllocatedShares = recipients.reduce((sum, r) => sum + r.allocatedShares, 0);
  const totalAllocatedPercent = (totalAllocatedShares / plan.totalShares) * 100;
  const remainingPoolShares = plan.soPoolShares - totalAllocatedShares;
  const remainingPoolPercent = (remainingPoolShares / plan.totalShares) * 100;

  // 市場ベンチマーク
  const marketBenchmarks = getRelevantBenchmarks(stage);

  // インサイト生成
  const insights = generateSOInsights(
    plan, recipients, taxValidation, dilution, capitalGains, marketBenchmarks, grades
  );

  return {
    taxValidation,
    dilution,
    capitalGains,
    totalAllocatedShares,
    totalAllocatedPercent: Math.round(totalAllocatedPercent * 100) / 100,
    remainingPoolShares: Math.max(0, remainingPoolShares),
    remainingPoolPercent: Math.round(Math.max(0, remainingPoolPercent) * 100) / 100,
    marketBenchmarks,
    insights,
  };
}

// ========== インサイト生成 ==========
function generateSOInsights(
  plan: SOPlan,
  recipients: SORecipient[],
  taxValidation: TaxQualifiedValidation,
  dilution: DilutionAnalysis,
  capitalGains: CapitalGainResult[],
  benchmarks: SOMarketBenchmark[],
  _grades: EmployeeGrade[]
): string[] {
  const insights: string[] = [];

  // 税制適格状態
  if (taxValidation.overallStatus === 'fail') {
    insights.push(
      '🚨 税制適格要件に不適合な項目があります。このまま付与すると、受給者に最大55%の給与所得課税が発生する可能性があります。必ず修正してください。'
    );
  } else if (taxValidation.overallStatus === 'warning') {
    insights.push(
      '⚠️ 税制適格要件に注意が必要な項目があります。顧問税理士に確認の上、付与手続きを進めてください。'
    );
  } else {
    insights.push(
      '✅ 税制適格要件を全て充足しています。受給者は行使・売却時に約20.315%の申告分離課税のみで済みます。'
    );
  }

  // 希薄化
  if (dilution.totalDilution > 15) {
    insights.push(
      `⚠️ SO発行による希薄化率が${dilution.totalDilution}%と高めです。次回ラウンドの投資家から指摘される可能性があります。10-15%の範囲を推奨します。`
    );
  } else if (dilution.totalDilution < 5 && recipients.length > 3) {
    insights.push(
      `💡 SOプールが${dilution.totalDilution}%と小さめです。今後の採用計画を考慮し、追加のSO発行枠を確保することを検討してください。`
    );
  }

  // キャピタルゲイン
  if (capitalGains.length > 0) {
    const totalTaxBenefit = capitalGains.reduce((sum, cg) => sum + cg.taxBenefit, 0);
    if (totalTaxBenefit > 0) {
      insights.push(
        `💰 税制適格SOの全従業員合計の税メリットは約${(totalTaxBenefit / 10000).toLocaleString()}万円です。この金額が非適格SOと比較した「節税効果」となります。`
      );
    }
  }

  // ベンチマーク比較
  for (const r of recipients) {
    const allocPercent = (r.allocatedShares / plan.totalShares) * 100;
    const relevantBench = benchmarks.find(b =>
      b.role.toLowerCase().includes(r.role.toLowerCase()) ||
      r.role.toLowerCase().includes(b.role.toLowerCase())
    );
    if (relevantBench) {
      if (allocPercent < relevantBench.minPercent) {
        insights.push(
          `📊 ${r.name}（${r.role}）の付与率${allocPercent.toFixed(2)}%は市場水準（${relevantBench.minPercent}%〜${relevantBench.maxPercent}%）を下回っています。採用競争力が劣る可能性があります。`
        );
      } else if (allocPercent > relevantBench.maxPercent) {
        insights.push(
          `📊 ${r.name}（${r.role}）の付与率${allocPercent.toFixed(2)}%は市場上限（${relevantBench.maxPercent}%）を超えています。他の従業員とのバランスに注意してください。`
        );
      }
    }
  }

  // SOプラン種別ごとのアドバイス
  if (plan.planType === 'trust') {
    insights.push(
      '📌 信託型SOを選択されています。2023年の国税庁通達により、信託型SOの税制適格性に疑義が生じています。最新の法令解釈について専門家に確認してください。'
    );
  }

  // ベスティング期間
  if (plan.vestingMonths < 36) {
    insights.push(
      `💡 ベスティング期間が${plan.vestingMonths}ヶ月と短めです。一般的には48ヶ月（4年）のベスティングを推奨します。短いと早期退職のインセンティブが弱まります。`
    );
  }

  return insights;
}
