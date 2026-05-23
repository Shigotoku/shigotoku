import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import type { ValuationInput, SOPlan, SORecipient, ExitScenario } from "@/features/simulator/types/stockOption";
import { DEFAULT_GRADES, SO_MARKET_BENCHMARKS } from "@/features/simulator/types/stockOption";
import { runValuation, DEFAULT_COMPARABLES } from "@/features/simulator/engines/valuationEngine";
import { runSOSimulation, validateTaxQualified, calculateCapitalGains } from "@/features/simulator/engines/soEngine";
import { formatCurrency } from "@/features/simulator/utils/formatters";
import { currencyFormatter, percentFormatter } from "@/features/simulator/utils/chartHelpers";
import { useSimulationStore } from "@/features/simulator/store/simulation";

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#ef4444", "#06b6d4"];

export default function SimValuation() {
  const [activeTab, setActiveTab] = useState<"valuation" | "so">("valuation");

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        <button
          onClick={() => setActiveTab("valuation")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${activeTab === "valuation" ? "bg-primary-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
        >
          企業価値評価
        </button>
        <button
          onClick={() => setActiveTab("so")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${activeTab === "so" ? "bg-primary-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
        >
          ストックオプション
        </button>
      </div>
      {activeTab === "valuation" ? <ValuationSection /> : <SOSection />}
    </div>
  );
}

function ValuationSection() {
  const { result, profile } = useSimulationStore();
  const summary = result?.summary;

  const [input, setInput] = useState<ValuationInput>({
    companyName: profile.companyName || "自社",
    industry: profile.industry,
    stage: "seed",
    foundedDate: "2024-01-01",
    annualRevenue: (summary?.currentMrr || 300000) * 12,
    monthlyRevenue: summary?.currentMrr || 300000,
    revenueGrowthRate: summary?.mrrGrowthRate || 30,
    grossMargin: summary?.grossMargin || 65,
    ebitda: result?.monthly[11]?.ebitda || 0,
    netIncome: 0,
    cashBalance: 10000000,
    totalDebt: 0,
    totalAssets: 20000000,
    mrr: summary?.currentMrr || 300000,
    arr: (summary?.currentMrr || 300000) * 12,
    nrr: summary?.nrr || 100,
    monthlyChurnRate: 3,
    totalFundingRaised: 0,
    lastRoundValuation: 0,
    lastRoundDate: "",
    projectionYears: 5,
    wacc: 15,
    terminalGrowthRate: 2,
    revenueGrowthProjection: [],
    comparableMultiples: DEFAULT_COMPARABLES,
  });

  const valResult = useMemo(() => runValuation(input), [input]);

  const methodData = [
    { name: "DCF法", value: valResult.dcfValuation },
    { name: "Revenue Multiple", value: valResult.revenueMultipleValuation },
    { name: "EBITDA Multiple", value: valResult.ebitdaMultipleValuation },
    { name: "ARR Multiple", value: valResult.arrMultipleValuation },
    { name: "PSR", value: valResult.psrValuation },
  ].filter((d) => d.value > 0);

  const update = (key: keyof ValuationInput, value: number | string) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Valuation Summary */}
      <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-6 shadow-sm">
        <h3 className="mb-2 text-sm font-bold text-primary-900">加重平均企業価値</h3>
        <p className="text-3xl font-extrabold text-primary-700">
          {formatCurrency(valResult.weightedValuation, true)}
        </p>
        <p className="mt-1 text-xs text-primary-600">
          レンジ: {formatCurrency(valResult.valuationRange.low, true)} 〜 {formatCurrency(valResult.valuationRange.high, true)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">評価パラメータ</h3>
          <div className="grid grid-cols-2 gap-3">
            <ValInput label="ステージ" type="select" value={input.stage}
              options={["pre-seed","seed","series-a","series-b","series-c","later","pre-ipo"]}
              onChange={(v) => update("stage", v)} />
            <ValInput label="年間売上" value={input.annualRevenue} onChange={(v) => update("annualRevenue", Number(v))} />
            <ValInput label="MRR" value={input.mrr} onChange={(v) => update("mrr", Number(v))} />
            <ValInput label="売上成長率(%)" value={input.revenueGrowthRate} onChange={(v) => update("revenueGrowthRate", Number(v))} />
            <ValInput label="粗利率(%)" value={input.grossMargin} onChange={(v) => update("grossMargin", Number(v))} />
            <ValInput label="EBITDA" value={input.ebitda} onChange={(v) => update("ebitda", Number(v))} />
            <ValInput label="NRR(%)" value={input.nrr} onChange={(v) => update("nrr", Number(v))} />
            <ValInput label="WACC(%)" value={input.wacc} onChange={(v) => update("wacc", Number(v))} />
            <ValInput label="永続成長率(%)" value={input.terminalGrowthRate} onChange={(v) => update("terminalGrowthRate", Number(v))} />
            <ValInput label="直近ラウンド評価額" value={input.lastRoundValuation} onChange={(v) => update("lastRoundValuation", Number(v))} />
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">評価手法別結果</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={methodData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 100_000_000).toFixed(1)}億`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={120} />
              <Tooltip formatter={currencyFormatter} />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">バリュエーションインサイト</h3>
        <div className="space-y-2">
          {valResult.insights.map((insight, i) => (
            <p key={i} className="text-xs text-slate-700 leading-relaxed">{insight}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function SOSection() {
  const [plan, setPlan] = useState<SOPlan>({
    id: "plan-1",
    name: "第1回SOプラン",
    planType: "taxQualified",
    totalShares: 10000,
    soPoolShares: 1500,
    soPoolPercent: 15,
    exercisePrice: 10000,
    currentValuation: 500000000,
    pricePerShare: 50000,
    vestingMonths: 48,
    cliffMonths: 12,
    expirationYears: 10,
    createdAt: new Date().toISOString(),
  });

  const [recipients, setRecipients] = useState<SORecipient[]>([
    { id: "r1", name: "CTO", role: "CTO", gradeId: "c-suite", joinDate: "2024-01-01", currentMonthlySalary: 800000, performanceScore: 85, isExecutive: true, isExternal: false, allocatedShares: 500, vestingMonths: 48, cliffMonths: 12, exercisePrice: 10000 },
    { id: "r2", name: "VPoE", role: "VPoE", gradeId: "vp", joinDate: "2024-06-01", currentMonthlySalary: 600000, performanceScore: 80, isExecutive: false, isExternal: false, allocatedShares: 200, vestingMonths: 48, cliffMonths: 12, exercisePrice: 10000 },
    { id: "r3", name: "エンジニア A", role: "Senior Engineer", gradeId: "senior", joinDate: "2024-03-01", currentMonthlySalary: 500000, performanceScore: 75, isExecutive: false, isExternal: false, allocatedShares: 100, vestingMonths: 48, cliffMonths: 12, exercisePrice: 10000 },
  ]);

  const exitScenarios: ExitScenario[] = [
    { id: "e1", name: "IPO (5年後)", type: "ipo", targetValuation: 5000000000, targetYear: 5, pricePerShareAtExit: 500000, dilutionAtExit: 15 },
    { id: "e2", name: "M&A (3年後)", type: "ma", targetValuation: 2000000000, targetYear: 3, pricePerShareAtExit: 200000, dilutionAtExit: 10 },
  ];

  const soResult = useMemo(
    () => runSOSimulation(plan, recipients, DEFAULT_GRADES, exitScenarios, 60, 30, "startup"),
    [plan, recipients]
  );

  const dilutionPie = [
    { name: "創業者", value: soResult.dilution.afterSO.founders },
    { name: "投資家", value: soResult.dilution.afterSO.investors },
    { name: "SOプール", value: soResult.dilution.afterSO.soPool },
    { name: "その他", value: soResult.dilution.afterSO.others },
  ];

  return (
    <div className="space-y-6">
      {/* SO Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">付与率合計</p>
          <p className="text-xl font-bold text-slate-900">{soResult.totalAllocatedPercent}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">残プール</p>
          <p className="text-xl font-bold text-slate-900">{soResult.remainingPoolPercent}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">希薄化率</p>
          <p className="text-xl font-bold text-slate-900">{soResult.dilution.totalDilution}%</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${
          soResult.taxValidation.overallStatus === "pass" ? "border-success-200 bg-success-50/50" :
          soResult.taxValidation.overallStatus === "warning" ? "border-warning-200 bg-warning-50/50" :
          "border-danger-200 bg-danger-50/50"
        }`}>
          <p className="text-xs text-slate-500">税制適格</p>
          <p className={`text-xl font-bold ${
            soResult.taxValidation.overallStatus === "pass" ? "text-success-600" :
            soResult.taxValidation.overallStatus === "warning" ? "text-warning-600" : "text-danger-500"
          }`}>
            {soResult.taxValidation.overallStatus === "pass" ? "適格" :
             soResult.taxValidation.overallStatus === "warning" ? "要確認" : "不適格"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Dilution Pie */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">希薄化分析</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={dilutionPie} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                {dilutionPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={percentFormatter} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Capital Gains */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">キャピタルゲイン（IPOシナリオ）</h3>
          <div className="space-y-2">
            {soResult.capitalGains.map((cg) => (
              <div key={cg.recipientId} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">{cg.recipientName}</span>
                  <span className="text-xs font-bold text-primary-700">{formatCurrency(cg.grossGain, true)}</span>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-500">適格手取り: </span>
                    <span className="font-medium text-success-600">{formatCurrency(cg.netGainQualified, true)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">非適格手取り: </span>
                    <span className="font-medium text-warning-600">{formatCurrency(cg.netGainNonQualified, true)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">税メリット: </span>
                    <span className="font-medium text-primary-700">{formatCurrency(cg.taxBenefit, true)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tax Qualified Checks */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">税制適格チェック</h3>
        <div className="space-y-2">
          {soResult.taxValidation.checks.map((check) => (
            <div key={check.id} className={`rounded-xl border p-3 ${
              check.status === "pass" ? "border-success-200 bg-success-50/30" :
              check.status === "warning" ? "border-warning-200 bg-warning-50/30" :
              "border-danger-200 bg-danger-50/30"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  check.status === "pass" ? "bg-success-500" :
                  check.status === "warning" ? "bg-warning-500" : "bg-danger-500"
                }`} />
                <span className="text-xs font-medium text-slate-700">{check.rule}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">{check.detail}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{check.reference}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SO Insights */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">SOインサイト</h3>
        <div className="space-y-2">
          {soResult.insights.map((insight, i) => (
            <p key={i} className="text-xs text-slate-700 leading-relaxed">{insight}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ValInput({
  label, value, type = "number", options, onChange,
}: {
  label: string; value: number | string; type?: "number" | "select";
  options?: string[]; onChange: (v: string) => void;
}) {
  if (type === "select" && options) {
    return (
      <div>
        <label className="mb-1 block text-[11px] font-medium text-slate-500">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none"
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm tabular-nums focus:border-primary-400 focus:outline-none"
      />
    </div>
  );
}
