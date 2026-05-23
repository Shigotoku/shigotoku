import type { SimulationResult } from "@/features/simulator/types/simulation";
import { AlertTriangle, CheckCircle, Info, Lightbulb, Target, TrendingUp, Activity } from "lucide-react";

interface Props {
  result: SimulationResult;
}

export default function SimInsights({ result }: Props) {
  const { aiInsights, checklist, industryKpis, vitals } = result;

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary-600" />
          <h3 className="text-base font-bold text-slate-900">AI インサイト</h3>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          シミュレーション結果に基づく自動分析レポートです
        </p>
        <div className="space-y-3">
          {aiInsights.map((insight, i) => {
            const isGood = insight.startsWith("✅");
            const isWarning = insight.startsWith("⚠️") || insight.startsWith("💡");
            const isDanger = insight.startsWith("🚨");
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  isGood ? "border-success-200 bg-success-50/40" :
                  isDanger ? "border-danger-200 bg-danger-50/40" :
                  isWarning ? "border-warning-200 bg-warning-50/40" :
                  "border-slate-200 bg-slate-50/50"
                }`}
              >
                <p className="text-xs leading-relaxed text-slate-700">{insight}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Industry KPIs */}
      {industryKpis.type !== "general" && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent-600" />
            <h3 className="text-base font-bold text-slate-900">業種別KPI</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(industryKpis.data).map(([key, value]) => (
              <IndustryKpiCard key={key} label={INDUSTRY_KPI_LABELS[key] || key} value={value} />
            ))}
          </div>
        </div>
      )}

      {/* Vitals Detail */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <h3 className="text-base font-bold text-slate-900">バイタルサイン詳細</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(vitals).map(([key, data]) => {
            if (key === "overall") return null;
            const labels: Record<string, string> = {
              growth: "成長力",
              stability: "安定性",
              scalability: "拡張性",
              risk: "安全性",
            };
            const descriptions: Record<string, string> = {
              growth: "MRR成長率に基づく成長力の評価。高いほど急成長中。",
              stability: "解約率の低さと粗利率で測る安定性。高いほど基盤が堅い。",
              scalability: "LTV/CAC比率で測る拡張余地。3.0x以上が目標。",
              risk: "Runway（資金余裕）から算出。長いほど安全。",
            };
            return (
              <div key={key} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{labels[key] || key}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-bold text-slate-900">{data.score}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                      data.grade === "A" ? "bg-emerald-100 text-emerald-700" :
                      data.grade === "B" ? "bg-blue-100 text-blue-700" :
                      data.grade === "C" ? "bg-yellow-100 text-yellow-700" :
                      data.grade === "D" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {data.grade}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{descriptions[key]}</p>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      data.score >= 75 ? "bg-emerald-500" :
                      data.score >= 50 ? "bg-blue-500" :
                      data.score >= 25 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, data.score)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checklist Summary */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success-600" />
          <h3 className="text-base font-bold text-slate-900">チェックリストサマリー</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl border border-success-200 bg-success-50/40 p-3">
            <p className="text-2xl font-bold text-success-600">
              {checklist.filter((c) => c.status === "good").length}
            </p>
            <p className="text-xs text-success-700">良好</p>
          </div>
          <div className="rounded-xl border border-warning-200 bg-warning-50/40 p-3">
            <p className="text-2xl font-bold text-warning-600">
              {checklist.filter((c) => c.status === "warning").length}
            </p>
            <p className="text-xs text-warning-700">注意</p>
          </div>
          <div className="rounded-xl border border-danger-200 bg-danger-50/40 p-3">
            <p className="text-2xl font-bold text-danger-500">
              {checklist.filter((c) => c.status === "danger").length}
            </p>
            <p className="text-xs text-danger-600">危険</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndustryKpiCard({ label, value }: { label: string; value: number }) {
  const displayValue = value >= 10000
    ? `${(value / 10000).toFixed(0)}万`
    : value >= 1 ? value.toLocaleString() : `${(value * 100).toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900">{displayValue}</p>
    </div>
  );
}

const INDUSTRY_KPI_LABELS: Record<string, string> = {
  fRatio: "F比率（食材費率）",
  lRatio: "L比率（人件費率）",
  flRatio: "FL比率",
  flrRatio: "FLR比率",
  salesPerManHour: "人時売上高",
  dailySales: "日商",
  monthlySales: "月商",
  maxCapacitySales: "最大売上キャパシティ",
  capacityUtilization: "キャパシティ利用率",
  newClientRepeatRate: "新規リピート率",
  existingClientRepeatRate: "既存リピート率",
  clientLtv: "顧客LTV",
  ltvCacRatio: "LTV/CAC",
  revenuePerStylist: "スタイリスト生産性",
  maxDailyClients: "日最大施術数",
  acquisitionCostRatio: "獲得コスト比率",
  memberLtv: "会員LTV",
  cac: "顧客獲得単価",
  revenuePerSqm: "㎡あたり収益",
  avgMembershipMonths: "平均会員期間",
  monthlyChurnRate: "月次退会率",
  trialConversionRate: "体験入会率",
  totalMonthlyRevenue: "月間総収益",
  memberDensity: "会員密度",
  congestionPenalty: "混雑ペナルティ",
  personalTrainingRevenue: "パーソナル収益",
  studentLtv: "生徒LTV",
  monthlyTuitionRevenue: "月謝収入",
  seasonalRevenue: "季節講習収入",
  revenuePerTeacher: "講師あたり売上",
  estimatedChurnRate: "推定退塾率",
  parentSatisfactionImpact: "保護者満足度影響",
  actualVehicleRate: "実車率",
  dailyRevenuePerVehicle: "日車営収",
  workingRate: "実働率",
  optimalVehicleCount: "適正車両数",
  totalDailyRevenue: "日次総売上",
  monthlyRevenue: "月次総売上",
  fuelCostTotal: "燃料費合計",
  idleVehicleCost: "遊休車両コスト",
  driverShortage: "乗務員不足台数",
  dispatchAppImpact: "配車アプリ効果",
};
