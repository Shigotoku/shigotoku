// ========== ストックオプション型定義 ==========

/** 従業員グレード（等級） */
export interface EmployeeGrade {
  id: string;
  name: string;            // グレード名（例: G1, G2, ... / CTO, VPoE, etc.）
  level: number;           // グレードレベル（1〜10）
  baseAllocationPercent: number; // 標準SO付与率（%）
  monthlySalaryMin: number;     // 月給レンジ下限
  monthlySalaryMax: number;     // 月給レンジ上限
  description: string;
}

/** SO付与対象の従業員 */
export interface SORecipient {
  id: string;
  name: string;
  role: string;            // 役職
  gradeId: string;         // グレードID
  joinDate: string;        // 入社日（YYYY-MM-DD）
  currentMonthlySalary: number;
  performanceScore: number; // パフォーマンス評価（0-100）
  isExecutive: boolean;     // 取締役/執行役員かどうか
  isExternal: boolean;      // 社外人材かどうか
  allocatedShares: number;  // 付与予定株数
  vestingMonths: number;    // ベスティング期間（月）
  cliffMonths: number;      // クリフ期間（月）
  exercisePrice: number;    // 行使価額
}

/** ストックオプションプラン */
export interface SOPlan {
  id: string;
  name: string;                  // プラン名
  planType: 'taxQualified' | 'nonQualified' | 'trust' | 'paidSO';
  totalShares: number;           // 発行済株式総数
  soPoolShares: number;          // SOプール（予約割当可能株数）
  soPoolPercent: number;         // SOプール比率（%）
  exercisePrice: number;         // 行使価額
  currentValuation: number;      // 現在の企業価値（時価総額）
  pricePerShare: number;         // 1株あたり時価
  vestingMonths: number;         // 標準ベスティング期間
  cliffMonths: number;           // 標準クリフ期間
  expirationYears: number;       // 権利行使期限（年）
  createdAt: string;
}

/** 税制適格バリデーション結果 */
export interface TaxQualifiedValidation {
  isValid: boolean;
  checks: TaxQualifiedCheck[];
  overallStatus: 'pass' | 'warning' | 'fail';
}

export interface TaxQualifiedCheck {
  id: string;
  rule: string;                // ルール説明
  status: 'pass' | 'warning' | 'fail';
  detail: string;              // 詳細説明
  reference: string;           // 法令根拠
}

/** エグジットシナリオ */
export interface ExitScenario {
  id: string;
  name: string;
  type: 'ipo' | 'ma' | 'secondary';
  targetValuation: number;         // 想定企業価値
  targetYear: number;              // 想定年数
  pricePerShareAtExit: number;     // Exit時の1株あたり価格
  dilutionAtExit: number;          // Exit時の追加希薄化率（%）
}

/** 個人のキャピタルゲイン計算結果 */
export interface CapitalGainResult {
  recipientId: string;
  recipientName: string;
  allocatedShares: number;
  exercisePrice: number;
  exitPricePerShare: number;
  grossGain: number;               // 総利益
  taxQualifiedTax: number;         // 税制適格時の税額（約20.315%）
  nonQualifiedTaxExercise: number; // 非適格時：行使時の税額（最大55%）
  nonQualifiedTaxSale: number;     // 非適格時：売却時の税額（約20.315%）
  netGainQualified: number;        // 税制適格時の手取り
  netGainNonQualified: number;     // 非適格時の手取り
  taxBenefit: number;              // 税制適格のメリット額
}

/** 希薄化分析結果 */
export interface DilutionAnalysis {
  beforeSO: {
    founders: number;       // 創業者持分（%）
    investors: number;      // 投資家持分（%）
    others: number;         // その他（%）
  };
  afterSO: {
    founders: number;
    investors: number;
    soPool: number;         // SOプール（%）
    others: number;
  };
  totalDilution: number;    // 総希薄化率（%）
}

/** SOシミュレーション全体の状態 */
export interface SOSimulationState {
  plan: SOPlan;
  recipients: SORecipient[];
  grades: EmployeeGrade[];
  exitScenarios: ExitScenario[];
}

/** SOシミュレーション結果 */
export interface SOSimulationResult {
  taxValidation: TaxQualifiedValidation;
  dilution: DilutionAnalysis;
  capitalGains: CapitalGainResult[];
  totalAllocatedShares: number;
  totalAllocatedPercent: number;
  remainingPoolShares: number;
  remainingPoolPercent: number;
  marketBenchmarks: SOMarketBenchmark[];
  insights: string[];
}

/** SO市場ベンチマーク */
export interface SOMarketBenchmark {
  role: string;
  stage: string;
  minPercent: number;
  maxPercent: number;
  medianPercent: number;
  source: string;
}

// ========== 企業価値評価型定義 ==========

/** 企業価値評価の入力データ */
export interface ValuationInput {
  // 基本情報
  companyName: string;
  industry: string;
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'later' | 'pre-ipo';
  foundedDate: string;

  // 財務データ
  annualRevenue: number;         // 年間売上
  monthlyRevenue: number;        // 月次売上
  revenueGrowthRate: number;     // 売上成長率（YoY %）
  grossMargin: number;           // 粗利率（%）
  ebitda: number;                // EBITDA
  netIncome: number;             // 純利益
  cashBalance: number;           // 現金残高
  totalDebt: number;             // 負債合計
  totalAssets: number;           // 総資産

  // SaaS特有指標
  mrr: number;                   // MRR
  arr: number;                   // ARR
  nrr: number;                   // NRR (%)
  monthlyChurnRate: number;      // 月次解約率 (%)

  // 資金調達
  totalFundingRaised: number;    // 累計調達額
  lastRoundValuation: number;    // 直近ラウンド評価額
  lastRoundDate: string;

  // DCF用パラメータ
  projectionYears: number;       // 予測期間（年）
  wacc: number;                  // 加重平均資本コスト（%）
  terminalGrowthRate: number;    // 永続成長率（%）
  revenueGrowthProjection: number[]; // 各年の売上成長率予測

  // マルチプル用
  comparableMultiples: ComparableCompany[];
}

/** 類似企業データ */
export interface ComparableCompany {
  id: string;
  name: string;
  industry: string;
  revenue: number;
  ebitda: number;
  valuation: number;
  evRevenue: number;             // EV/Revenue マルチプル
  evEbitda: number;              // EV/EBITDA マルチプル
  psRatio: number;               // PSR (Price-to-Sales)
}

/** 企業価値評価結果 */
export interface ValuationResult {
  // DCF法
  dcfValuation: number;
  dcfDetails: {
    projectedCashFlows: number[];
    terminalValue: number;
    presentValues: number[];
    totalPV: number;
  };

  // マルチプル法
  revenueMultipleValuation: number;
  ebitdaMultipleValuation: number;
  psrValuation: number;
  appliedMultiples: {
    evRevenue: number;
    evEbitda: number;
    psr: number;
  };

  // ARR法（SaaS向け）
  arrMultipleValuation: number;
  arrMultiple: number;

  // 総合評価
  weightedValuation: number;     // 加重平均評価額
  valuationRange: {
    low: number;
    mid: number;
    high: number;
  };
  pricePerShare: number;         // 1株あたり価格
  impliedMultiples: {
    evRevenue: number;
    evEbitda: number;
    psr: number;
  };

  // 分析
  insights: string[];
  stageMultipleBenchmark: {
    stage: string;
    typicalMultiple: { min: number; max: number };
  };
}

// ========== 資金繰りシミュレーション型定義 ==========

/** 資金繰りの月次エントリ */
export interface CashFlowEntry {
  month: number;
  label: string;
  // 収入
  salesReceipts: number;        // 売上入金
  otherIncome: number;          // その他収入
  fundingIncome: number;        // 資金調達
  totalIncome: number;

  // 支出
  purchasePayments: number;     // 仕入支払
  payrollExpense: number;       // 給与
  rentExpense: number;          // 家賃
  utilitiesExpense: number;     // 水道光熱費
  taxPayments: number;          // 税金支払
  loanRepayments: number;       // 借入返済
  otherExpense: number;         // その他支出
  totalExpense: number;

  // 差引
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  isNegative: boolean;          // 資金ショートフラグ
}

/** 採用計画エントリ */
export interface HiringPlanEntry {
  id: string;
  role: string;
  department: string;
  plannedHireMonth: number;     // 採用予定月
  monthlySalary: number;
  recruitmentCost: number;      // 採用費
  onboardingMonths: number;     // 戦力化期間
  expectedRevenueImpact: number; // 期待される売上貢献/月
  soAllocationPercent: number;  // SO付与率
}

/** 価格戦略シミュレーション */
export interface PricingScenario {
  id: string;
  name: string;
  price: number;
  estimatedConversionRate: number;
  estimatedChurnRate: number;
  estimatedCustomers12m: number;
  mrr12m: number;
  revenue12m: number;
  profitMargin12m: number;
}

// ========== デフォルトグレード定義 ==========
export const DEFAULT_GRADES: EmployeeGrade[] = [
  { id: 'c-suite', name: 'C-Suite（CxO）', level: 10, baseAllocationPercent: 1.5, monthlySalaryMin: 800000, monthlySalaryMax: 2000000, description: 'CEO/CTO/CFO/COO等の経営トップ' },
  { id: 'vp', name: 'VP（執行役員）', level: 9, baseAllocationPercent: 0.8, monthlySalaryMin: 600000, monthlySalaryMax: 1200000, description: 'VPoE, VP of Sales等' },
  { id: 'director', name: 'Director（部長）', level: 8, baseAllocationPercent: 0.4, monthlySalaryMin: 500000, monthlySalaryMax: 900000, description: '部門責任者' },
  { id: 'manager', name: 'Manager（課長）', level: 7, baseAllocationPercent: 0.2, monthlySalaryMin: 400000, monthlySalaryMax: 700000, description: 'チームリーダー' },
  { id: 'senior', name: 'Senior（シニア）', level: 6, baseAllocationPercent: 0.1, monthlySalaryMin: 350000, monthlySalaryMax: 600000, description: 'シニアメンバー' },
  { id: 'mid', name: 'Mid（ミドル）', level: 5, baseAllocationPercent: 0.05, monthlySalaryMin: 280000, monthlySalaryMax: 450000, description: '中堅メンバー' },
  { id: 'junior', name: 'Junior（ジュニア）', level: 4, baseAllocationPercent: 0.02, monthlySalaryMin: 220000, monthlySalaryMax: 350000, description: '若手メンバー' },
  { id: 'intern', name: 'Intern（インターン）', level: 3, baseAllocationPercent: 0.01, monthlySalaryMin: 150000, monthlySalaryMax: 250000, description: 'インターン/アルバイト' },
];

/** 日本市場SO付与ベンチマーク（シリーズ別・役職別） */
export const SO_MARKET_BENCHMARKS: SOMarketBenchmark[] = [
  // Pre-Seed / Seed
  { role: 'CTO（共同創業者）', stage: 'Seed', minPercent: 3.0, maxPercent: 10.0, medianPercent: 5.0, source: 'Coral Capital / DNX調査' },
  { role: 'VPoE', stage: 'Seed', minPercent: 1.0, maxPercent: 3.0, medianPercent: 2.0, source: 'Coral Capital' },
  { role: 'エンジニア（1号社員）', stage: 'Seed', minPercent: 0.5, maxPercent: 2.0, medianPercent: 1.0, source: 'DNX Ventures' },
  { role: 'ビジネス（1号社員）', stage: 'Seed', minPercent: 0.3, maxPercent: 1.5, medianPercent: 0.7, source: 'DNX Ventures' },

  // Series A
  { role: 'CTO', stage: 'Series A', minPercent: 1.0, maxPercent: 3.0, medianPercent: 2.0, source: 'Coral Capital' },
  { role: 'VPoE', stage: 'Series A', minPercent: 0.5, maxPercent: 1.5, medianPercent: 0.8, source: 'Coral Capital' },
  { role: 'Director', stage: 'Series A', minPercent: 0.2, maxPercent: 0.8, medianPercent: 0.4, source: '市場推定' },
  { role: 'Senior Engineer', stage: 'Series A', minPercent: 0.1, maxPercent: 0.5, medianPercent: 0.25, source: '市場推定' },
  { role: 'Manager', stage: 'Series A', minPercent: 0.05, maxPercent: 0.3, medianPercent: 0.15, source: '市場推定' },
  { role: 'Junior', stage: 'Series A', minPercent: 0.01, maxPercent: 0.1, medianPercent: 0.05, source: '市場推定' },

  // Series B+
  { role: 'CTO', stage: 'Series B+', minPercent: 0.5, maxPercent: 1.5, medianPercent: 1.0, source: '市場推定' },
  { role: 'VP', stage: 'Series B+', minPercent: 0.2, maxPercent: 0.8, medianPercent: 0.5, source: '市場推定' },
  { role: 'Director', stage: 'Series B+', minPercent: 0.1, maxPercent: 0.4, medianPercent: 0.2, source: '市場推定' },
  { role: 'Senior', stage: 'Series B+', minPercent: 0.03, maxPercent: 0.15, medianPercent: 0.08, source: '市場推定' },
  { role: 'Mid', stage: 'Series B+', minPercent: 0.01, maxPercent: 0.08, medianPercent: 0.03, source: '市場推定' },
  { role: 'Junior', stage: 'Series B+', minPercent: 0.005, maxPercent: 0.03, medianPercent: 0.015, source: '市場推定' },
];

/** ステージ別ARRマルチプル目安 */
export const STAGE_VALUATION_MULTIPLES: Record<string, { min: number; max: number; typical: number }> = {
  'pre-seed': { min: 0, max: 0, typical: 0 },     // プレシード: 算定困難
  'seed': { min: 10, max: 50, typical: 20 },        // シード: 高マルチプル
  'series-a': { min: 8, max: 30, typical: 15 },
  'series-b': { min: 6, max: 20, typical: 12 },
  'series-c': { min: 5, max: 15, typical: 10 },
  'later': { min: 4, max: 12, typical: 8 },
  'pre-ipo': { min: 5, max: 20, typical: 10 },
};
