/**
 * 業種別特殊KPI計算エンジン
 *
 * ドキュメントの3モジュール構造に基づく:
 * 1. キャパシティ＆スループット制約エンジン
 * 2. 変動費率＆品質トレードオフエンジン（FLコスト等）
 * 3. ライフサイクル＆ユニットエコノミクスエンジン（LTV/CAC力学）
 */

import type {
  SimulationData,
  IndustrySpecificKpis,
  FoodKpis,
  BeautySalonKpis,
  FitnessGymKpis,
  JukuKpis,
  TaxiKpis,
} from '../types/simulation';

// ========== メインディスパッチ ==========
export function calculateIndustryKpis(data: SimulationData): IndustrySpecificKpis {
  switch (data.profile.industry) {
    case 'food':
      return { type: 'food', data: calculateFoodKpis(data) };
    case 'beautySalon':
      return { type: 'beautySalon', data: calculateBeautySalonKpis(data) };
    case 'fitnessGym':
      return { type: 'fitnessGym', data: calculateFitnessGymKpis(data) };
    case 'juku':
      return { type: 'juku', data: calculateJukuKpis(data) };
    case 'taxi':
      return { type: 'taxi', data: calculateTaxiKpis(data) };
    default:
      return { type: 'general', data: {} };
  }
}

// ========== 飲食業KPI ==========
// FL比率: 食材費(F) + 人件費(L) の売上比率。60%以下が健全基準。
// FLR比率: FL + 家賃(R)。70-75%が目安。
// 人時売上高: 5,000円が基準。3,000円以下は過剰配置、8,000円超は過労リスク。
function calculateFoodKpis(data: SimulationData): FoodKpis {
  const p = data.industryParams;
  const seatCount = p.seatCount ?? 30;
  const turnoverRate = p.turnoverRate ?? 2.5;
  const avgSpend = p.avgSpendPerCustomer ?? 1200;
  const foodCostRate = p.foodCostRate ?? 0.30;
  const laborCostRate = p.laborCostRate ?? 0.27;
  const rentCost = p.rentCost ?? 300000;
  const staffCount = p.staffCount ?? 6;
  const operatingHoursPerDay = p.operatingHoursPerDay ?? 10;
  const operatingDaysPerMonth = p.operatingDaysPerMonth ?? 26;

  // 日商 = 客席数 × 回転率 × 客単価
  const dailySales = seatCount * turnoverRate * avgSpend;

  // 月商
  const monthlySales = dailySales * operatingDaysPerMonth;

  // 最大キャパシティ月商（回転率を理論上限4.0で計算）
  const maxCapacitySales = seatCount * 4.0 * avgSpend * operatingDaysPerMonth;

  // キャパシティ利用率
  const capacityUtilization = maxCapacitySales > 0 ? monthlySales / maxCapacitySales : 0;

  // F比率（食材費率）
  const fRatio = foodCostRate;

  // L比率（人件費率）
  const lRatio = laborCostRate;

  // FL比率
  const flRatio = fRatio + lRatio;

  // FLR比率
  const flrRatio = monthlySales > 0 ? flRatio + (rentCost / monthlySales) : 0;

  // 人時売上高 = 月商 ÷ (スタッフ数 × 営業時間 × 営業日数)
  const totalManHours = staffCount * operatingHoursPerDay * operatingDaysPerMonth;
  const salesPerManHour = totalManHours > 0 ? monthlySales / totalManHours : 0;

  return {
    fRatio: Math.round(fRatio * 1000) / 10,
    lRatio: Math.round(lRatio * 1000) / 10,
    flRatio: Math.round(flRatio * 1000) / 10,
    flrRatio: Math.round(flrRatio * 1000) / 10,
    salesPerManHour: Math.round(salesPerManHour),
    dailySales: Math.round(dailySales),
    monthlySales: Math.round(monthlySales),
    maxCapacitySales: Math.round(maxCapacitySales),
    capacityUtilization: Math.round(capacityUtilization * 1000) / 10,
  };
}

// ========== 美容サロンKPI ==========
// 「1対5の法則」: 新規獲得コストは既存維持の5倍
// 新規リピート率目標: 50%以上（業界平均30%）
// 既存リピート率目標: 90%以上（業界平均70%）
// LTV = 平均単価 × 来店頻度/年 × 継続年数
function calculateBeautySalonKpis(data: SimulationData): BeautySalonKpis {
  const p = data.industryParams;
  const stylistCount = p.stylistCount ?? 3;
  const avgServicePrice = p.avgServicePrice ?? 8000;
  const monthlyNewClients = p.monthlyNewClients ?? 30;
  const newClientRepeatRate = p.newClientRepeatRate ?? 0.30;
  const existingClientRepeatRate = p.existingClientRepeatRate ?? 0.70;
  const avgVisitCycleDays = p.avgVisitCycleDays ?? 75;
  const clientAcquisitionCost = p.clientAcquisitionCost ?? 5000;
  const avgServiceTimeMinutes = p.avgServiceTimeMinutes ?? 90;
  const operatingHoursPerDay = p.operatingHoursPerDay ?? 10;
  const operatingDaysPerMonth = p.operatingDaysPerMonth ?? 25;

  // 年間来店回数 = 365 ÷ 来店周期（日）
  const visitsPerYear = avgVisitCycleDays > 0 ? 365 / avgVisitCycleDays : 4;

  // LTV = 平均単価 × 年間来店回数 × 継続年数（リピート率からの推定）
  // 継続年数 ≈ 1 ÷ (1 - 既存リピート率) ÷ (visitsPerYear) を年単位で
  const avgRetentionYears = existingClientRepeatRate > 0
    ? Math.min(1 / (1 - existingClientRepeatRate) / visitsPerYear * visitsPerYear, 10)
    : 1;
  const clientLtv = avgServicePrice * visitsPerYear * Math.max(avgRetentionYears, 1);

  // LTV/CAC
  const ltvCacRatio = clientAcquisitionCost > 0 ? clientLtv / clientAcquisitionCost : 0;

  // 月商（概算: 既存顧客ベース＋新規）
  // ここでは入力パラメータから月売上を推計
  const existingClientsPerMonth = monthlyNewClients * newClientRepeatRate * 3; // 直近3ヶ月の新規からの再来店
  const totalMonthlyClients = monthlyNewClients + existingClientsPerMonth;
  const monthlySales = totalMonthlyClients * avgServicePrice;

  // スタイリスト生産性 = 月商 ÷ スタイリスト数
  const revenuePerStylist = stylistCount > 0 ? monthlySales / stylistCount : 0;

  // 日最大施術数 = (営業時間×60÷平均施術時間) × スタイリスト数
  const maxDailyClients = avgServiceTimeMinutes > 0
    ? Math.floor((operatingHoursPerDay * 60 / avgServiceTimeMinutes) * stylistCount)
    : 0;

  // 稼働率
  const actualDailyClients = operatingDaysPerMonth > 0
    ? totalMonthlyClients / operatingDaysPerMonth
    : 0;
  const capacityUtilization = maxDailyClients > 0 ? actualDailyClients / maxDailyClients : 0;

  // 1対5の法則による獲得コスト比率
  const acquisitionCostRatio = 5.0;

  return {
    newClientRepeatRate: Math.round(newClientRepeatRate * 1000) / 10,
    existingClientRepeatRate: Math.round(existingClientRepeatRate * 1000) / 10,
    clientLtv: Math.round(clientLtv),
    ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
    monthlySales: Math.round(monthlySales),
    revenuePerStylist: Math.round(revenuePerStylist),
    maxDailyClients,
    capacityUtilization: Math.round(capacityUtilization * 1000) / 10,
    acquisitionCostRatio,
  };
}

// ========== フィットネスジムKPI ==========
// 会員LTV = 月額会費 × 平均会員期間
// 混雑ペナルティ: 会員密度が閾値超過で退会率上昇
// ㎡あたり収益 = 総収益 ÷ 店舗面積
function calculateFitnessGymKpis(data: SimulationData): FitnessGymKpis {
  const p = data.industryParams;
  const floorAreaSqm = p.floorAreaSqm ?? 200;
  const monthlyFee = p.monthlyMembershipFee ?? 10000;
  const totalMembers = p.totalMembers ?? 200;
  const monthlyNewMembers = p.monthlyNewMembers ?? 25;
  const trialToMemberRate = p.trialToMemberRate ?? 0.40;
  const monthlyChurnRate = p.monthlyChurnRate ?? 0.06;
  const avgMembershipMonths = p.avgMembershipMonths ?? 9;
  const personalTrainingRate = p.personalTrainingRate ?? 0.10;
  const personalTrainingPrice = p.personalTrainingPrice ?? 6000;
  const retailRevenuePerMember = p.retailRevenuePerMember ?? 500;
  const congestionThreshold = p.congestionThreshold ?? 2.0;

  // 会員LTV = 月額会費 × 平均会員期間
  const memberLtv = monthlyFee * avgMembershipMonths;

  // CAC（概算: 広告費÷新規会員数）
  const cac = monthlyNewMembers > 0
    ? (data.coreParams.monthlyAdSpend + data.coreParams.monthlySalesPayroll) / monthlyNewMembers
    : 0;

  // LTV/CAC
  const ltvCacRatio = cac > 0 ? memberLtv / cac : 0;

  // パーソナルトレーニング月次収益
  const personalTrainingRevenue = totalMembers * personalTrainingRate * personalTrainingPrice;

  // 月間総収益
  const membershipRevenue = totalMembers * monthlyFee;
  const retailRevenue = totalMembers * retailRevenuePerMember;
  const totalMonthlyRevenue = membershipRevenue + personalTrainingRevenue + retailRevenue;

  // ㎡あたり収益
  const revenuePerSqm = floorAreaSqm > 0 ? totalMonthlyRevenue / floorAreaSqm : 0;

  // 会員密度 = 総会員数 ÷ 店舗面積
  const memberDensity = floorAreaSqm > 0 ? totalMembers / floorAreaSqm : 0;

  // 混雑ペナルティ（密度が閾値超過でペナルティ発動）
  let congestionPenalty = 0;
  if (memberDensity > congestionThreshold) {
    // 超過割合に応じてペナルティ上昇（退会率を増加させる係数）
    congestionPenalty = Math.min(1, (memberDensity - congestionThreshold) / congestionThreshold);
  }

  return {
    memberLtv: Math.round(memberLtv),
    cac: Math.round(cac),
    ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
    revenuePerSqm: Math.round(revenuePerSqm),
    avgMembershipMonths,
    monthlyChurnRate: Math.round(monthlyChurnRate * 1000) / 10,
    trialConversionRate: Math.round(trialToMemberRate * 1000) / 10,
    totalMonthlyRevenue: Math.round(totalMonthlyRevenue),
    memberDensity: Math.round(memberDensity * 100) / 100,
    congestionPenalty: Math.round(congestionPenalty * 1000) / 10,
    personalTrainingRevenue: Math.round(personalTrainingRevenue),
  };
}

// ========== 学習塾KPI ==========
// サブスクリプション型LTV = 月謝 ÷ 月次退塾率
// 売り切り型LTV = 平均購入単価 × 購入頻度 × 継続年数
// ユニットエコノミクス = LTV ÷ CAC
// 保護者満足度と成績向上率が退塾率に影響
function calculateJukuKpis(data: SimulationData): JukuKpis {
  const p = data.industryParams;
  const monthlyTuition = p.monthlyTuition ?? 25000;
  const totalStudents = p.totalStudents ?? 50;
  const monthlyNewStudents = p.monthlyNewStudents ?? 8;
  const monthlyChurnRate = p.monthlyChurnRate ?? 0.04;
  const seasonalCoursePrice = p.seasonalCoursePrice ?? 50000;
  const seasonalCourseRate = p.seasonalCourseRate ?? 0.60;
  const teacherCount = p.teacherCount ?? 5;
  const parentSatisfactionScore = p.parentSatisfactionScore ?? 70;
  const studentAchievementRate = p.studentAchievementRate ?? 0.60;
  const textbookCostPerStudent = p.textbookCostPerStudent ?? 3000;
  const maxCapacity = p.maxCapacity ?? 80;

  // サブスクリプション型LTV = 月謝 ÷ 退塾率
  const studentLtv = monthlyChurnRate > 0 ? monthlyTuition / monthlyChurnRate : monthlyTuition * 24;

  // CAC（概算）
  const cac = monthlyNewStudents > 0
    ? (data.coreParams.monthlyAdSpend + data.coreParams.monthlySalesPayroll) / monthlyNewStudents
    : 0;

  // LTV/CAC
  const ltvCacRatio = cac > 0 ? studentLtv / cac : 0;

  // 月謝収入
  const monthlyTuitionRevenue = totalStudents * monthlyTuition;

  // 季節講習収入（年4回を月按分）
  const seasonalRevenue = (totalStudents * seasonalCoursePrice * seasonalCourseRate * 4) / 12;

  // 講師あたり売上
  const revenuePerTeacher = teacherCount > 0
    ? (monthlyTuitionRevenue + seasonalRevenue) / teacherCount
    : 0;

  // 定員充足率
  const capacityUtilization = maxCapacity > 0 ? totalStudents / maxCapacity : 0;

  // 保護者満足度の影響（満足度が低いと退塾率上昇）
  // 基準: 80点以上で退塾率据え置き、80未満で1点毎に退塾率+0.5%
  const parentSatisfactionImpact = parentSatisfactionScore >= 80
    ? 0
    : (80 - parentSatisfactionScore) * 0.005;

  // 推定退塾率（成績向上率と保護者満足度で補正）
  const achievementBonus = studentAchievementRate > 0.5 ? (studentAchievementRate - 0.5) * 0.03 : 0;
  const estimatedChurnRate = Math.max(0.01, monthlyChurnRate + parentSatisfactionImpact - achievementBonus);

  return {
    studentLtv: Math.round(studentLtv),
    cac: Math.round(cac),
    ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
    monthlyTuitionRevenue: Math.round(monthlyTuitionRevenue),
    seasonalRevenue: Math.round(seasonalRevenue),
    revenuePerTeacher: Math.round(revenuePerTeacher),
    capacityUtilization: Math.round(capacityUtilization * 1000) / 10,
    estimatedChurnRate: Math.round(estimatedChurnRate * 1000) / 10,
    parentSatisfactionImpact: Math.round(parentSatisfactionImpact * 1000) / 10,
  };
}

// ========== タクシーKPI ==========
// 実車率 = 実車キロ ÷ 総走行キロ
// 日車実車キロ = 年間実車キロ ÷ 延実働車両数
// 実働率 = 延実働車両数 ÷ 延実在車両数
// 適正車両数 = 延実働車両数 ÷ 365 ÷ 実働率
function calculateTaxiKpis(data: SimulationData): TaxiKpis {
  const p = data.industryParams;
  const totalVehicles = p.totalVehicles ?? 10;
  const activeDrivers = p.activeDrivers ?? 8;
  const avgFarePerTrip = p.avgFarePerTrip ?? 1800;
  const tripsPerDayPerVehicle = p.tripsPerDayPerVehicle ?? 20;
  const dailyActualKm = p.dailyActualKm ?? 120;
  const totalDailyKm = p.totalDailyKm ?? 267;
  const fuelCostPerKm = p.fuelCostPerKm ?? 15;
  const vehicleDepreciation = p.vehicleDepreciation ?? 80000;
  const insuranceCostPerVehicle = p.insuranceCostPerVehicle ?? 30000;
  const driverSalaryPerPerson = p.driverSalaryPerPerson ?? 280000;
  const hasDispatchApp = Boolean(p.hasDispatchApp);
  const dispatchAppFeeRate = p.dispatchAppFeeRate ?? 0.10;
  const operatingDaysPerMonth = p.operatingDaysPerMonth ?? 26;

  // 実働率 = 稼働乗務員 ÷ 保有車両数
  const workingRate = totalVehicles > 0 ? Math.min(activeDrivers / totalVehicles, 1.0) : 0;

  // 実車率（配車アプリで向上）
  let actualVehicleRate = totalDailyKm > 0 ? dailyActualKm / totalDailyKm : 0.45;
  const dispatchAppImpact = hasDispatchApp ? 0.12 : 0; // アプリで実車率+12%向上
  actualVehicleRate = Math.min(actualVehicleRate + dispatchAppImpact, 0.80);

  // 実稼働車両数/日
  const activeVehiclesPerDay = Math.min(activeDrivers, totalVehicles);

  // 日車営収 = 乗車回数/台/日 × 平均運賃
  const dailyRevenuePerVehicle = tripsPerDayPerVehicle * avgFarePerTrip;

  // 日次総売上
  const totalDailyRevenue = dailyRevenuePerVehicle * activeVehiclesPerDay;

  // 月次総売上
  let monthlyRevenue = totalDailyRevenue * operatingDaysPerMonth;
  // 配車アプリ手数料を差し引く
  if (hasDispatchApp) {
    monthlyRevenue = monthlyRevenue * (1 - dispatchAppFeeRate);
  }

  // 適正車両数 = 地域需要に基づく（簡易計算）
  const optimalVehicleCount = Math.ceil(activeDrivers / workingRate);

  // 燃料費合計
  const fuelCostTotal = totalDailyKm * fuelCostPerKm * activeVehiclesPerDay * operatingDaysPerMonth;

  // 遊休車両コスト（稼働していない車両の固定費）
  const idleVehicles = Math.max(0, totalVehicles - activeVehiclesPerDay);
  const idleVehicleCost = idleVehicles * (vehicleDepreciation + insuranceCostPerVehicle);

  // 乗務員不足台数
  const driverShortage = Math.max(0, totalVehicles - activeDrivers);

  return {
    actualVehicleRate: Math.round(actualVehicleRate * 1000) / 10,
    dailyRevenuePerVehicle: Math.round(dailyRevenuePerVehicle),
    workingRate: Math.round(workingRate * 1000) / 10,
    optimalVehicleCount,
    totalDailyRevenue: Math.round(totalDailyRevenue),
    monthlyRevenue: Math.round(monthlyRevenue),
    fuelCostTotal: Math.round(fuelCostTotal),
    idleVehicleCost: Math.round(idleVehicleCost),
    driverShortage,
    dispatchAppImpact: Math.round(dispatchAppImpact * 1000) / 10,
  };
}
