import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { SimulationResult, CompanyProfile } from "@/features/simulator/types/simulation";
import { formatCurrency, formatPercent, formatMultiple, formatMonths, gradeColor } from "@/features/simulator/utils/formatters";
import { currencyFormatter, absCurrencyFormatter } from "@/features/simulator/utils/chartHelpers";
import {
  TrendingUp, TrendingDown, Clock, Shield,
  Zap, Target, Users, DollarSign, Activity,
} from "lucide-react";

interface Props {
  result: SimulationResult;
  profile: CompanyProfile;
}

export default function SimDashboard({ result, profile }: Props) {
  const { summary, vitals, monthly, breakeven } = result;

  const chartData12 = monthly.slice(0, 12).map((m) => ({
    label: `${m.month}M`,
    MRR: m.mrr,
    EBITDA: m.ebitda,
    キャッシュ: m.cashBalance,
  }));

  const chartData60 = monthly
    .filter((_, i) => i % 3 === 0 || i === monthly.length - 1)
    .map((m) => ({
      label: `${m.month}M`,
      MRR: m.mrr,
      ARR: m.arr,
    }));

  const vitalItems = [
    { key: "growth", label: "成長力", icon: TrendingUp, data: vitals.growth },
    { key: "stability", label: "安定性", icon: Shield, data: vitals.stability },
    { key: "scalability", label: "拡張性", icon: Zap, data: vitals.scalability },
    { key: "risk", label: "安全性", icon: Activity, data: vitals.risk },
  ];

  return (
    <div className="space-y-6">
      {/* Vital Signs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500">総合スコア</p>
          <p className={`text-4xl font-extrabold ${gradeColor(vitals.overall.grade)}`}>
            {vitals.overall.grade}
          </p>
          <p className="text-lg font-bold text-slate-900">{vitals.overall.score}</p>
          <p className="text-xs text-slate-500">{vitals.overall.label}</p>
        </div>
        {vitalItems.map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.key} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">{v.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${gradeColor(v.data.grade)}`}>{v.data.grade}</span>
                <span className="text-sm text-slate-600">{v.data.score}pt</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-primary-500 transition-all"
                  style={{ width: `${Math.min(100, v.data.score)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiCard label="現在MRR" value={formatCurrency(summary.currentMrr, true)} icon={DollarSign} />
        <KpiCard label="12ヶ月後MRR" value={formatCurrency(summary.projectedMrr12, true)} icon={TrendingUp} accent />
        <KpiCard label="LTV/CAC" value={formatMultiple(summary.ltvCacRatio)} icon={Target}
          status={summary.ltvCacRatio >= 3 ? "good" : summary.ltvCacRatio >= 2 ? "warn" : "bad"} />
        <KpiCard label="回収期間" value={formatMonths(summary.paybackMonths)} icon={Clock}
          status={summary.paybackMonths <= 12 ? "good" : summary.paybackMonths <= 18 ? "warn" : "bad"} />
        <KpiCard label="粗利率" value={formatPercent(summary.grossMargin)} icon={Activity} />
        <KpiCard label="Runway" value={formatMonths(summary.runway)} icon={Shield}
          status={summary.runway >= 18 ? "good" : summary.runway >= 12 ? "warn" : "bad"} />
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <MiniKpi label="NRR" value={`${summary.nrr}%`} />
        <MiniKpi label="Rule of 40" value={`${summary.ruleOf40}%`} good={summary.ruleOf40 >= 40} />
        <MiniKpi label="Quick Ratio" value={`${summary.quickRatio}`} good={summary.quickRatio >= 4} />
        <MiniKpi label="MRR成長率" value={`${summary.mrrGrowthRate}%`} />
        <MiniKpi label="LTV" value={formatCurrency(summary.ltv, true)} />
        <MiniKpi label="CAC" value={formatCurrency(summary.cac, true)} />
      </div>

      {/* Breakeven */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">損益分岐点</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">単月黒字化</p>
            <p className="text-lg font-bold text-slate-900">{breakeven.breakevenMonth}ヶ月目</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">累積BEP</p>
            <p className="text-lg font-bold text-slate-900">{breakeven.cumulativeBreakevenMonth}ヶ月目</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">必要顧客数</p>
            <p className="text-lg font-bold text-slate-900">{breakeven.breakevenCustomers}件</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">必要MRR</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(breakeven.breakevenMrr, true)}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* MRR / EBITDA / Cash 12months */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">12ヶ月推移（MRR・EBITDA・キャッシュ）</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={currencyFormatter} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="MRR" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="EBITDA" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="キャッシュ" stroke="#9333ea" fill="#9333ea" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* MRR / ARR Long-term */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">60ヶ月 MRR・ARR 推移</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData60}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={currencyFormatter} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="MRR" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ARR" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Waterfall - New/Expansion/Churned MRR */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">MRR Waterfall（12ヶ月）</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly.slice(0, 12).map((m) => ({
            label: `${m.month}M`,
            新規MRR: m.newMrr,
            拡張MRR: m.expansionMrr,
            解約MRR: -m.churnedMrr,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
            <Tooltip formatter={absCurrencyFormatter} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="新規MRR" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="拡張MRR" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="解約MRR" fill="#ef4444" radius={[0, 0, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, accent, status,
}: {
  label: string; value: string; icon: React.ElementType; accent?: boolean;
  status?: "good" | "warn" | "bad";
}) {
  const statusColor = status === "good"
    ? "text-success-600" : status === "warn"
    ? "text-warning-600" : status === "bad"
    ? "text-danger-500" : "text-slate-900";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accent ? "border-primary-200 bg-primary-50/50" : "border-slate-200/60 bg-white"}`}>
      <Icon className={`mb-1.5 h-4 w-4 ${accent ? "text-primary-600" : "text-slate-400"}`} />
      <p className={`text-lg font-bold ${status ? statusColor : accent ? "text-primary-700" : "text-slate-900"}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function MiniKpi({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${good !== undefined ? (good ? "text-success-600" : "text-warning-600") : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
