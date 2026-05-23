import { useSimulationStore } from "@/features/simulator/store/simulation";
import { industryPresets } from "@/features/simulator/presets/index";
import type { CoreParams } from "@/features/simulator/types/simulation";
import { formatCurrency } from "@/features/simulator/utils/formatters";
import { useState } from "react";

type Section = "revenue" | "cost_fixed" | "cost_variable" | "investment" | "cash" | "industry";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "revenue", label: "売上・顧客" },
  { id: "cost_fixed", label: "固定費" },
  { id: "cost_variable", label: "変動費" },
  { id: "investment", label: "投資" },
  { id: "cash", label: "キャッシュ" },
  { id: "industry", label: "業種別" },
];

export default function SimParams() {
  const [activeSection, setActiveSection] = useState<Section>("revenue");
  const { coreParams, industryParams, profile, updateCoreParam, updateIndustryParam } = useSimulationStore();
  const preset = industryPresets[profile.industry];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeSection === s.id ? "bg-primary-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        {activeSection === "revenue" && (
          <ParamGrid title="売上・顧客パラメータ">
            <ParamInput label="商品数" value={coreParams.productCount} unit="" onChange={(v) => updateCoreParam("productCount", v)} />
            <ParamInput label="平均単価" value={coreParams.averagePrice} unit="円/月" onChange={(v) => updateCoreParam("averagePrice", v)} />
            <ParamInput label="月間新規顧客数" value={coreParams.monthlyNewCustomers} unit="件" onChange={(v) => updateCoreParam("monthlyNewCustomers", v)} />
            <ParamInput label="原価率" value={coreParams.cogsRate} unit="" step={0.01} onChange={(v) => updateCoreParam("cogsRate", v)} />
            <ParamInput label="月次解約率" value={coreParams.monthlyChurnRate} unit="" step={0.001} onChange={(v) => updateCoreParam("monthlyChurnRate", v)} />
            <ParamInput label="初期費用" value={coreParams.initialFee} unit="円" onChange={(v) => updateCoreParam("initialFee", v)} />
            <ParamInput label="従量課金単価" value={coreParams.usageUnitPrice} unit="円" onChange={(v) => updateCoreParam("usageUnitPrice", v)} />
            <ParamInput label="平均従量/顧客" value={coreParams.avgUsagePerCustomer} unit="" onChange={(v) => updateCoreParam("avgUsagePerCustomer", v)} />
            <ParamInput label="バンドル割引率" value={coreParams.bundleDiscountRate} unit="" step={0.01} onChange={(v) => updateCoreParam("bundleDiscountRate", v)} />
            <ParamInput label="年払い割引率" value={coreParams.annualDiscountRate} unit="" step={0.01} onChange={(v) => updateCoreParam("annualDiscountRate", v)} />
            <ParamInput label="年払い顧客割合" value={coreParams.annualPayRatio} unit="" step={0.01} onChange={(v) => updateCoreParam("annualPayRatio", v)} />
            <ParamInput label="バンドル率" value={coreParams.bundleRate} unit="" step={0.01} onChange={(v) => updateCoreParam("bundleRate", v)} />
            <ParamInput label="アップセル率" value={coreParams.upsellRate} unit="" step={0.01} onChange={(v) => updateCoreParam("upsellRate", v)} />
            <ParamInput label="代理店比率" value={coreParams.partnerRatio} unit="" step={0.01} onChange={(v) => updateCoreParam("partnerRatio", v)} />
            <ParamInput label="代理店手数料率" value={coreParams.partnerCommissionRate} unit="" step={0.01} onChange={(v) => updateCoreParam("partnerCommissionRate", v)} />
            <ParamInput label="広告費" value={coreParams.monthlyAdSpend} unit="円/月" onChange={(v) => updateCoreParam("monthlyAdSpend", v)} />
            <ParamInput label="営業人件費" value={coreParams.monthlySalesPayroll} unit="円/月" onChange={(v) => updateCoreParam("monthlySalesPayroll", v)} />
          </ParamGrid>
        )}

        {activeSection === "cost_fixed" && (
          <ParamGrid title="固定費">
            <ParamInput label="開発人件費" value={coreParams.devPayroll} unit="円/月" onChange={(v) => updateCoreParam("devPayroll", v)} />
            <ParamInput label="CS人件費" value={coreParams.csPayroll} unit="円/月" onChange={(v) => updateCoreParam("csPayroll", v)} />
            <ParamInput label="営業人件費" value={coreParams.salesPayroll} unit="円/月" onChange={(v) => updateCoreParam("salesPayroll", v)} />
            <ParamInput label="管理部門人件費" value={coreParams.adminPayroll} unit="円/月" onChange={(v) => updateCoreParam("adminPayroll", v)} />
            <ParamInput label="外注費" value={coreParams.outsourcingCost} unit="円/月" onChange={(v) => updateCoreParam("outsourcingCost", v)} />
            <ParamInput label="人件費総額" value={coreParams.totalPayroll} unit="円/月" onChange={(v) => updateCoreParam("totalPayroll", v)} />
            <ParamInput label="オフィス費用" value={coreParams.officeInfra} unit="円/月" onChange={(v) => updateCoreParam("officeInfra", v)} />
            <ParamInput label="サーバー費用" value={coreParams.serverCost} unit="円/月" onChange={(v) => updateCoreParam("serverCost", v)} />
            <ParamInput label="クラウド利用料" value={coreParams.cloudServiceCost} unit="円/月" onChange={(v) => updateCoreParam("cloudServiceCost", v)} />
            <ParamInput label="監視ツール" value={coreParams.monitoringToolCost} unit="円/月" onChange={(v) => updateCoreParam("monitoringToolCost", v)} />
            <ParamInput label="バックアップ" value={coreParams.backupCost} unit="円/月" onChange={(v) => updateCoreParam("backupCost", v)} />
            <ParamInput label="その他固定費" value={coreParams.otherFixed} unit="円/月" onChange={(v) => updateCoreParam("otherFixed", v)} />
            <ParamInput label="デザイン費" value={coreParams.designCost} unit="円/月" onChange={(v) => updateCoreParam("designCost", v)} />
            <ParamInput label="QA費" value={coreParams.qaCost} unit="円/月" onChange={(v) => updateCoreParam("qaCost", v)} />
            <ParamInput label="保守費" value={coreParams.maintenanceCost} unit="円/月" onChange={(v) => updateCoreParam("maintenanceCost", v)} />
            <ParamInput label="CDN費用" value={coreParams.cdnCost} unit="円/月" onChange={(v) => updateCoreParam("cdnCost", v)} />
            <ParamInput label="SEO費" value={coreParams.seoCost} unit="円/月" onChange={(v) => updateCoreParam("seoCost", v)} />
            <ParamInput label="コンテンツ制作費" value={coreParams.contentCost} unit="円/月" onChange={(v) => updateCoreParam("contentCost", v)} />
            <ParamInput label="会計費" value={coreParams.accountingCost} unit="円/月" onChange={(v) => updateCoreParam("accountingCost", v)} />
            <ParamInput label="SaaS利用料" value={coreParams.saasToolCost} unit="円/月" onChange={(v) => updateCoreParam("saasToolCost", v)} />
            <ParamInput label="セキュリティ費" value={coreParams.securityCost} unit="円/月" onChange={(v) => updateCoreParam("securityCost", v)} />
          </ParamGrid>
        )}

        {activeSection === "cost_variable" && (
          <ParamGrid title="変動費">
            <ParamInput label="決済手数料率" value={coreParams.paymentFeeRate} unit="" step={0.001} onChange={(v) => updateCoreParam("paymentFeeRate", v)} />
            <ParamInput label="サーバー費(売上比)" value={coreParams.serverCostAsRevPercent} unit="" step={0.01} onChange={(v) => updateCoreParam("serverCostAsRevPercent", v)} />
            <ParamInput label="サポート費/顧客" value={coreParams.supportCostPerCustomer} unit="円" onChange={(v) => updateCoreParam("supportCostPerCustomer", v)} />
            <ParamInput label="API利用料" value={coreParams.apiCost} unit="円/月" onChange={(v) => updateCoreParam("apiCost", v)} />
            <ParamInput label="通信費" value={coreParams.communicationCost} unit="円/月" onChange={(v) => updateCoreParam("communicationCost", v)} />
            <ParamInput label="ストレージ費用" value={coreParams.storageCost} unit="円/月" onChange={(v) => updateCoreParam("storageCost", v)} />
          </ParamGrid>
        )}

        {activeSection === "investment" && (
          <ParamGrid title="投資">
            <ParamInput label="初期開発費" value={coreParams.initialDevCost} unit="円" onChange={(v) => updateCoreParam("initialDevCost", v)} />
            <ParamInput label="マーケティング初期費" value={coreParams.initialMarketingCost} unit="円" onChange={(v) => updateCoreParam("initialMarketingCost", v)} />
            <ParamInput label="展示会出展費" value={coreParams.exhibitionCost} unit="円" onChange={(v) => updateCoreParam("exhibitionCost", v)} />
            <ParamInput label="法務・知財費" value={coreParams.legalIpCost} unit="円" onChange={(v) => updateCoreParam("legalIpCost", v)} />
          </ParamGrid>
        )}

        {activeSection === "cash" && (
          <ParamGrid title="キャッシュ">
            <ParamInput label="現金残高" value={coreParams.cashBalance} unit="円" onChange={(v) => updateCoreParam("cashBalance", v)} />
            <ParamInput label="回収サイクル" value={coreParams.paymentCycleDays} unit="日" onChange={(v) => updateCoreParam("paymentCycleDays", v)} />
            <ParamInput label="負債残高" value={coreParams.debtBalance} unit="円" onChange={(v) => updateCoreParam("debtBalance", v)} />
          </ParamGrid>
        )}

        {activeSection === "industry" && (
          <ParamGrid title={`${preset.label} 固有パラメータ`}>
            {Object.entries(preset.industryDefaults).map(([key, defaultVal]) => (
              <ParamInput
                key={key}
                label={INDUSTRY_PARAM_LABELS[key] || key}
                value={industryParams[key] ?? defaultVal}
                unit=""
                step={typeof defaultVal === "number" && defaultVal < 1 ? 0.01 : 1}
                onChange={(v) => updateIndustryParam(key, v)}
              />
            ))}
          </ParamGrid>
        )}
      </div>
    </div>
  );
}

function ParamGrid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold text-slate-900">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function ParamInput({
  label, value, unit, step = 1, onChange,
}: {
  label: string; value: number; unit: string; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-500">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm tabular-nums focus:border-primary-400 focus:outline-none"
        />
        {unit && <span className="shrink-0 text-[10px] text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

const INDUSTRY_PARAM_LABELS: Record<string, string> = {
  monthlyPatients: "月間患者数",
  revisitRate: "再診率",
  avgConsultationPrice: "平均診察単価",
  adminTimePerPatient: "管理時間/患者(分)",
  avgStaffHourlyWage: "平均時給",
  annualTurnover: "年間離職数",
  recruitmentCostPerPerson: "採用費/人",
  selfPayConversionRate: "自費転換率",
  selfPayAvgPrice: "自費平均単価",
  arpa: "ARPA",
  currentMrr: "現在MRR",
  monthlyChurn: "月次解約率",
  expansionRate: "拡張率",
  csManagerMrr: "CSマネージャMRR",
  serverCostPerCustomer: "サーバー費/顧客",
  monthlyProduction: "月間生産数",
  defectRate: "不良率",
  downtimeHours: "ダウンタイム(時間)",
  downtimeCostPerHour: "ダウンタイム費/時",
  inventoryTurnover: "在庫回転率",
  materialPriceVariance: "材料費変動率",
  seatCount: "客席数",
  turnoverRate: "回転率(回/日)",
  avgSpendPerCustomer: "客単価",
  repeatRate: "リピート率",
  foodCostRate: "食材費率(F)",
  wasteRate: "廃棄ロス率",
  laborCostRate: "人件費率(L)",
  rentCost: "家賃(月額)",
  staffCount: "スタッフ数",
  operatingHoursPerDay: "営業時間(時/日)",
  operatingDaysPerMonth: "営業日数(日/月)",
  monthlyVisitors: "月間来客数",
  purchaseRate: "購入率",
  avgSpend: "平均客単価",
  inventoryDays: "在庫日数",
  stylistCount: "スタイリスト数",
  avgServicePrice: "平均施術単価",
  monthlyNewClients: "月間新規客数",
  newClientRepeatRate: "新規リピート率",
  existingClientRepeatRate: "既存リピート率",
  avgVisitCycleDays: "平均来店周期(日)",
  clientAcquisitionCost: "獲得コスト/人",
  crmSystemCost: "CRM月額費用",
  materialCostRate: "材料費率",
  avgServiceTimeMinutes: "平均施術時間(分)",
  floorAreaSqm: "店舗面積(㎡)",
  monthlyMembershipFee: "月額会費",
  totalMembers: "総会員数",
  monthlyNewMembers: "月間新規入会数",
  trialToMemberRate: "体験→入会率",
  monthlyChurnRate: "月次退会率",
  avgMembershipMonths: "平均会員期間(月)",
  personalTrainingRate: "パーソナル受講率",
  personalTrainingPrice: "パーソナル単価",
  retailRevenuePerMember: "付帯売上/会員",
  equipmentCost: "設備投資(月按分)",
  utilityCost: "水道光熱費",
  congestionThreshold: "混雑閾値(人/㎡)",
  monthlyTuition: "月謝",
  totalStudents: "生徒数",
  monthlyNewStudents: "月間新規入塾数",
  avgEnrollmentMonths: "平均在籍期間(月)",
  seasonalCoursePrice: "季節講習単価",
  seasonalCourseRate: "季節講習受講率",
  teacherCount: "講師数",
  teacherCostPerPerson: "講師人件費/人",
  parentSatisfactionScore: "保護者満足度(0-100)",
  studentAchievementRate: "成績向上率(0-1)",
  referralRate: "紹介入塾率",
  textbookCostPerStudent: "テキスト代/生徒",
  maxCapacity: "最大定員",
  totalVehicles: "保有車両数",
  activeDrivers: "稼働乗務員数",
  avgFarePerTrip: "平均運賃/回",
  tripsPerDayPerVehicle: "日車回数",
  actualVehicleRate: "実車率",
  dailyActualKm: "日車実車キロ",
  totalDailyKm: "日車走行キロ",
  workingRate: "実働率",
  fuelCostPerKm: "燃料費/km",
  vehicleDepreciation: "車両減価償却(月/台)",
  insuranceCostPerVehicle: "保険料/台/月",
  driverSalaryPerPerson: "乗務員月給",
  hasDispatchApp: "配車アプリ有無",
  dispatchAppFeeRate: "配車アプリ手数料率",
};
