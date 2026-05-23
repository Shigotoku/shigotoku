// ========== 業種 ==========
export type Industry = 'medical' | 'saas' | 'manufacturing' | 'food' | 'retail' | 'beautySalon' | 'fitnessGym' | 'juku' | 'taxi' | 'general';

// ========== 企業規模 ==========
export type CompanyScale = 'startup' | 'small' | 'medium' | 'enterprise';

// ========== 販売モデル ==========
export type SalesModel = 'direct' | 'partner' | 'hybrid';

// ========== 企業プロファイル ==========
export interface CompanyProfile {
  industry: Industry;
  scale: CompanyScale;
  salesModel: SalesModel;
  companyName?: string;
}

// ========== Layer 1: 共通パラメータ ==========
export interface CoreParams {
  // 売上構造
  productCount: number;
  averagePrice: number;
  monthlyNewCustomers: number;
  cogsRate: number;
  monthlyChurnRate: number;

  // ⑤ 課金形態設計
  initialFee: number;           // 初期費用
  usageUnitPrice: number;       // 従量課金単価
  avgUsagePerCustomer: number;  // 顧客あたり平均従量
  bundleDiscountRate: number;   // バンドル割引率
  annualDiscountRate: number;   // 年払い割引率
  annualPayRatio: number;       // 年払い顧客割合
  trialEnabled: boolean;        // トライアル有無
  trialConversionRate: number;  // トライアル→有料転換率
  trialMonths: number;          // トライアル月数

  // ② KPI追加
  bundleRate: number;           // バンドル率（複数サービス契約割合）
  upsellRate: number;           // アップセル率

  // 顧客セグメント
  customerSegmentSmall: number;  // 小規模顧客割合
  customerSegmentMedium: number; // 中規模顧客割合
  customerSegmentLarge: number;  // 大規模顧客割合

  // 顧客獲得
  monthlyAdSpend: number;
  monthlySalesPayroll: number;
  partnerRatio: number;
  partnerCommissionRate: number;

  // ④ 固定費詳細
  devPayroll: number;            // 開発人件費
  csPayroll: number;             // CS人件費
  salesPayroll: number;          // 営業人件費
  adminPayroll: number;          // 管理部門人件費
  outsourcingCost: number;       // 外注費
  totalPayroll: number;          // 月間人件費総額（合計用）
  officeInfra: number;           // オフィス費用
  serverCost: number;            // サーバー費用
  cloudServiceCost: number;      // クラウド利用料
  monitoringToolCost: number;    // 監視ツール費
  backupCost: number;            // バックアップ費用
  otherFixed: number;            // その他固定費

  // ④ 変動費
  paymentFeeRate: number;       // 決済手数料率
  serverCostAsRevPercent: number; // サーバー費用（売上比率%）
  supportCostPerCustomer: number; // サポート費用（顧客あたり月額）
  apiCost: number;              // API利用料（月額）
  communicationCost: number;    // 通信費（月額）
  storageCost: number;          // ストレージ費用（月額）

  // ④ 投資費
  initialDevCost: number;       // 初期開発費
  initialMarketingCost: number; // マーケティング初期費
  exhibitionCost: number;       // 展示会出展費
  legalIpCost: number;          // 法務・知財費

  // ⑦ SaaS標準コスト（追加）
  designCost: number;           // デザイン費
  qaCost: number;               // QA費
  maintenanceCost: number;      // 保守費
  cdnCost: number;              // CDN費用
  seoCost: number;              // SEO費
  contentCost: number;          // コンテンツ制作費
  accountingCost: number;       // 会計費
  saasToolCost: number;         // SaaS利用料（Slack等）
  securityCost: number;         // セキュリティ費

  // キャッシュ
  cashBalance: number;
  paymentCycleDays: number;
  debtBalance: number;
}

// ========== Layer 2: 規模別パラメータ ==========
export interface StartupParams {
  burnRate: number;
  nextFundingAmount: number;
  nextFundingMonths: number;
  targetMrr: number;
  plannedHires: number;
  dilutionRate: number;
  cacPaybackTarget: number;
}

export interface SmallBizParams {
  ownerWeeklyHours: number;
  ownerSalary: number;
  departmentPayroll: number;
  recruitCostPerPerson: number;
  subsidyAmount: number;
  taxRate: number;
}

export interface MediumBizParams {
  departmentRevenue: number;
  departmentFixedCost: number;
  adminCostRate: number;
  revenuePerEmployee: number;
  turnoverRate: number;
  trainingCostPerPerson: number;
  capexPlanned: number;
}

export interface EnterpriseBizParams {
  wacc: number;
  investmentHorizonYears: number;
  irrTarget: number;
  internalControlCost: number;
  securityCost: number;
  complianceCost: number;
  cannibalizationRate: number;
}

export type ScaleParams = StartupParams | SmallBizParams | MediumBizParams | EnterpriseBizParams;

// ========== Layer 3: 業種別パラメータ ==========
export interface MedicalParams {
  monthlyPatients: number;
  revisitRate: number;
  avgConsultationPrice: number;
  adminTimePerPatient: number;
  avgStaffHourlyWage: number;
  annualTurnover: number;
  recruitmentCostPerPerson: number;
  selfPayConversionRate: number;
  selfPayAvgPrice: number;
}

export interface SaasParams {
  arpa: number;
  currentMrr: number;
  monthlyChurn: number;
  expansionRate: number;
  csManagerMrr: number;
  serverCostPerCustomer: number;
}

export interface ManufacturingParams {
  monthlyProduction: number;
  defectRate: number;
  downtimeHours: number;
  downtimeCostPerHour: number;
  inventoryTurnover: number;
  materialPriceVariance: number;
}

export interface FoodParams {
  seatCount: number;
  turnoverRate: number;          // 回転率（回/日）
  avgSpendPerCustomer: number;   // 客単価
  repeatRate: number;            // リピート率
  foodCostRate: number;          // 食材費率（F比率）
  wasteRate: number;             // 廃棄ロス率
  laborCostRate: number;         // 人件費率（L比率）
  rentCost: number;              // 家賃（月額）
  staffCount: number;            // スタッフ数
  operatingHoursPerDay: number;  // 営業時間（時間/日）
  operatingDaysPerMonth: number; // 営業日数（日/月）
}

// ========== 美容サロン ==========
export interface BeautySalonParams {
  stylistCount: number;              // スタイリスト数
  avgServicePrice: number;           // 平均施術単価
  monthlyNewClients: number;         // 月間新規顧客数
  newClientRepeatRate: number;       // 新規顧客リピート率
  existingClientRepeatRate: number;  // 既存顧客リピート率
  avgVisitCycleDays: number;         // 平均来店周期（日）
  clientAcquisitionCost: number;     // 新規獲得コスト/人
  crmSystemCost: number;             // CRM月額費用
  materialCostRate: number;          // 材料費率
  rentCost: number;                  // テナント賃料
  avgServiceTimeMinutes: number;     // 平均施術時間（分）
  operatingHoursPerDay: number;      // 営業時間（時間/日）
  operatingDaysPerMonth: number;     // 営業日数（日/月）
}

// ========== フィットネスジム ==========
export interface FitnessGymParams {
  floorAreaSqm: number;             // 店舗面積（㎡）
  monthlyMembershipFee: number;     // 月額会費
  totalMembers: number;             // 総会員数
  monthlyNewMembers: number;        // 月間新規入会数
  trialToMemberRate: number;        // 体験→入会率
  monthlyChurnRate: number;         // 月次退会率
  avgMembershipMonths: number;      // 平均会員期間（月）
  personalTrainingRate: number;     // パーソナル受講率
  personalTrainingPrice: number;    // パーソナル単価
  retailRevenuePerMember: number;   // 付帯売上/会員（プロテイン等）
  staffCount: number;               // スタッフ数
  equipmentCost: number;            // 設備投資（月按分）
  rentCost: number;                 // テナント賃料
  utilityCost: number;              // 水道光熱費
  congestionThreshold: number;      // 混雑閾値（会員/㎡）
}

// ========== 学習塾 ==========
export interface JukuParams {
  monthlyTuition: number;           // 月謝
  totalStudents: number;            // 生徒数
  monthlyNewStudents: number;       // 月間新規入塾数
  monthlyChurnRate: number;         // 月次退塾率
  avgEnrollmentMonths: number;      // 平均在籍期間（月）
  seasonalCoursePrice: number;      // 季節講習単価
  seasonalCourseRate: number;       // 季節講習受講率
  teacherCount: number;             // 講師数
  teacherCostPerPerson: number;     // 講師人件費/人
  parentSatisfactionScore: number;  // 保護者満足度(0-100)
  studentAchievementRate: number;   // 成績向上率(0-1)
  referralRate: number;             // 紹介入塾率
  rentCost: number;                 // テナント賃料
  textbookCostPerStudent: number;   // テキスト代/生徒
  maxCapacity: number;              // 最大定員
}

// ========== タクシー ==========
export interface TaxiParams {
  totalVehicles: number;            // 保有車両数
  activeDrivers: number;            // 稼働乗務員数
  avgFarePerTrip: number;           // 平均運賃/回
  tripsPerDayPerVehicle: number;    // 日車回数
  actualVehicleRate: number;        // 実車率
  dailyActualKm: number;           // 日車実車キロ
  totalDailyKm: number;            // 日車走行キロ
  workingRate: number;              // 実働率
  fuelCostPerKm: number;           // 燃料費/km
  vehicleDepreciation: number;     // 車両減価償却（月/台）
  insuranceCostPerVehicle: number; // 保険料/台/月
  driverSalaryPerPerson: number;   // 乗務員月給
  hasDispatchApp: boolean;          // 配車アプリ加盟有無
  dispatchAppFeeRate: number;      // 配車アプリ手数料率
  operatingDaysPerMonth: number;   // 稼働日数/月
}

export interface RetailParams {
  monthlyVisitors: number;
  purchaseRate: number;
  avgSpend: number;
  inventoryTurnover: number;
  inventoryDays: number;
}

export type IndustryParams = MedicalParams | SaasParams | ManufacturingParams | FoodParams | RetailParams | BeautySalonParams | FitnessGymParams | JukuParams | TaxiParams | Record<string, never>;

// ========== ⑥ 競合価格データ ==========
export interface CompetitorData {
  id: string;
  name: string;             // 競合サービス名
  initialFee: number;       // 初期費用
  monthlyFee: number;       // 月額費用
  hasUsageBilling: boolean;  // 従量課金有無
  targetScale: string;       // 医院規模 / ターゲット市場
  strength: string;          // 強み
  weakness: string;          // 弱み
}

// ========== シミュレーション全体データ ==========
export interface SimulationData {
  profile: CompanyProfile;
  coreParams: CoreParams;
  scaleParams: Partial<StartupParams & SmallBizParams & MediumBizParams & EnterpriseBizParams>;
  industryParams: Partial<MedicalParams & SaasParams & ManufacturingParams & FoodParams & RetailParams & BeautySalonParams & FitnessGymParams & JukuParams & TaxiParams>;
  competitors: CompetitorData[];
}

// ========== 計算結果 ==========
export interface MonthlyMetrics {
  month: number;
  label: string;
  mrr: number;
  newMrr: number;
  expansionMrr: number;
  churnedMrr: number;
  arr: number;
  totalCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  revenue: number;
  usageRevenue: number;     // 従量課金収益
  initialFeeRevenue: number; // 初期費用収益
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  opex: number;
  variableCost: number;     // 変動費合計
  fixedCost: number;        // 固定費合計
  ebitda: number;
  operatingProfit: number;  // 営業利益
  cashflow: number;
  cashBalance: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  paybackMonths: number;
  arpu: number;
  nrr: number;
  mrrGrowthRate: number;    // MRR成長率
  burnRate: number;
  runway: number;
}

// ========== 感度分析 ==========
export interface SensitivityScenario {
  label: string;
  paramKey: string;
  baseValue: number;
  variation: number;     // ±変動幅 (e.g. 0.2 = ±20%)
  resultMrr12: number;
  resultMrr36: number;
  resultEbitda12: number;
  resultCash36: number;
}

export interface SensitivityResult {
  scenarios: SensitivityScenario[];
}

// ========== 損益分岐点 ==========
export interface BreakevenResult {
  breakevenMonth: number;       // 黒字化月
  breakevenCustomers: number;   // 黒字化に必要な顧客数
  breakevenMrr: number;         // 黒字化MRR
  cumulativeBreakevenMonth: number; // 累積損益分岐月
}

// ========== ⑧ ベンチマーク比較 ==========
export interface BenchmarkComparison {
  metric: string;
  label: string;
  myValue: number;
  industryAvg: number;
  unit: string;
  isHigherBetter: boolean;
}

// ========== ⑨ チェックリスト ==========
export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  status: 'good' | 'warning' | 'danger';
  message: string;
}

// ========== バイタルサイン ==========
export interface VitalSigns {
  growth: { score: number; grade: string; label: string };
  stability: { score: number; grade: string; label: string };
  scalability: { score: number; grade: string; label: string };
  risk: { score: number; grade: string; label: string };
  overall: { score: number; grade: string; label: string };
}

// ========== シミュレーション結果 ==========
export interface SimulationResult {
  monthly: MonthlyMetrics[];
  vitals: VitalSigns;
  summary: {
    currentMrr: number;
    projectedMrr12: number;
    projectedMrr36: number;
    projectedMrr60: number;
    ltv: number;
    cac: number;
    ltvCacRatio: number;
    paybackMonths: number;
    arpu: number;
    nrr: number;
    grossMargin: number;
    operatingMargin: number;    // 営業利益率
    ruleOf40: number;
    quickRatio: number;
    runway: number;
    bundleRate: number;
    upsellRate: number;
    mrrGrowthRate: number;
    adSpendRatio: number;       // 広告費率
    payrollRatio: number;       // 人件費率
  };
  // ========== 業種別特殊KPI ==========
  industryKpis: IndustrySpecificKpis;
  breakeven: BreakevenResult;
  sensitivity: SensitivityResult;
  benchmarks: BenchmarkComparison[];
  checklist: ChecklistItem[];
  aiInsights: string[];
}

// ========== 業種別特殊KPI結果 ==========
export interface FoodKpis {
  fRatio: number;           // 食材費率 (F比率)
  lRatio: number;           // 人件費率 (L比率)
  flRatio: number;          // FL比率
  flrRatio: number;         // FLR比率
  salesPerManHour: number;  // 人時売上高
  dailySales: number;       // 日商
  monthlySales: number;     // 月商
  maxCapacitySales: number; // 最大売上キャパシティ
  capacityUtilization: number; // キャパシティ利用率
}

export interface BeautySalonKpis {
  newClientRepeatRate: number;      // 新規リピート率
  existingClientRepeatRate: number; // 既存リピート率
  clientLtv: number;                // 顧客LTV
  ltvCacRatio: number;              // LTV/CAC
  monthlySales: number;             // 月商
  revenuePerStylist: number;        // スタイリスト生産性
  maxDailyClients: number;          // 日最大施術数
  capacityUtilization: number;      // 稼働率
  acquisitionCostRatio: number;     // 新規vs既存のコスト比率(1:5の法則)
}

export interface FitnessGymKpis {
  memberLtv: number;                 // 会員LTV
  cac: number;                       // 顧客獲得単価
  ltvCacRatio: number;               // LTV/CAC
  revenuePerSqm: number;            // ㎡あたり収益
  avgMembershipMonths: number;       // 平均会員期間
  monthlyChurnRate: number;          // 月次退会率
  trialConversionRate: number;       // 体験入会率
  totalMonthlyRevenue: number;       // 月間総収益
  memberDensity: number;             // 会員密度（人/㎡）
  congestionPenalty: number;         // 混雑ペナルティ(0-1)
  personalTrainingRevenue: number;   // パーソナル収益
}

export interface JukuKpis {
  studentLtv: number;                // 生徒LTV
  cac: number;                       // 獲得単価
  ltvCacRatio: number;               // LTV/CAC
  monthlyTuitionRevenue: number;     // 月謝収入
  seasonalRevenue: number;           // 季節講習収入
  revenuePerTeacher: number;         // 講師あたり売上
  capacityUtilization: number;       // 定員充足率
  estimatedChurnRate: number;        // 推定退塾率
  parentSatisfactionImpact: number;  // 保護者満足度の影響
}

export interface TaxiKpis {
  actualVehicleRate: number;         // 実車率
  dailyRevenuePerVehicle: number;    // 日車営収
  workingRate: number;               // 実働率
  optimalVehicleCount: number;       // 適正車両数
  totalDailyRevenue: number;         // 日次総売上
  monthlyRevenue: number;            // 月次総売上
  fuelCostTotal: number;             // 燃料費合計
  idleVehicleCost: number;           // 遊休車両コスト
  driverShortage: number;            // 乗務員不足台数
  dispatchAppImpact: number;         // 配車アプリ効果(実車率向上分)
}

export type IndustrySpecificKpis = {
  type: 'food'; data: FoodKpis;
} | {
  type: 'beautySalon'; data: BeautySalonKpis;
} | {
  type: 'fitnessGym'; data: FitnessGymKpis;
} | {
  type: 'juku'; data: JukuKpis;
} | {
  type: 'taxi'; data: TaxiKpis;
} | {
  type: 'general'; data: Record<string, number>;
};

// ========== プリセット ==========
export interface IndustryPreset {
  label: string;
  icon: string;
  coreDefaults: Partial<CoreParams>;
  industryDefaults: Record<string, number>;
  benchmarks: {
    churnRate: number;
    grossMargin: number;
    ltvCacRatio: number;
    paybackMonths: number;
    operatingMargin: number;
    adSpendRatio: number;
    payrollRatio: number;
    growthRate: number;
  };
}

export interface ScalePreset {
  label: string;
  icon: string;
  description: string;
  scaleDefaults: Record<string, number>;
}
