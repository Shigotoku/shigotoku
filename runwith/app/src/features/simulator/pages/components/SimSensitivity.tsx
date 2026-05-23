import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import type { SimulationResult, CompanyProfile } from "@/features/simulator/types/simulation";
import { formatCurrency } from "@/features/simulator/utils/formatters";
import { currencyFormatter } from "@/features/simulator/utils/chartHelpers";

interface Props {
  result: SimulationResult;
  profile: CompanyProfile;
}

export default function SimSensitivity({ result, profile }: Props) {
  const { sensitivity, benchmarks, checklist } = result;

  const sensitivityData = sensitivity.scenarios.map((s) => ({
    name: s.label,
    "上方MRR(12M)": s.resultMrr12,
    "下方MRR(12M)": s.resultMrr36,
    "上方EBITDA(12M)": s.resultEbitda12,
  }));

  const benchmarkRadar = benchmarks.map((b) => {
    const normalizedMy = b.isHigherBetter ? b.myValue : (b.industryAvg > 0 ? (b.industryAvg / Math.max(b.myValue, 0.01)) * 100 : 100);
    const normalizedIndustry = b.isHigherBetter ? b.industryAvg : 100;
    return {
      metric: b.label,
      自社: Math.min(normalizedMy, 200),
      業界平均: Math.min(normalizedIndustry, 200),
    };
  });

  return (
    <div className="space-y-6">
      {/* Sensitivity Analysis */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">感度分析</h3>
        <p className="mb-4 text-xs text-slate-500">各パラメータを変動させた場合の12ヶ月後MRR・EBITDAへの影響</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sensitivityData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={100} />
            <Tooltip formatter={currencyFormatter} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="上方MRR(12M)" fill="#2563eb" radius={[0, 4, 4, 0]} />
            <Bar dataKey="下方MRR(12M)" fill="#ef4444" radius={[0, 4, 4, 0]} />
            <Bar dataKey="上方EBITDA(12M)" fill="#16a34a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-2 py-2 text-left font-medium text-slate-500">パラメータ</th>
                <th className="px-2 py-2 text-right font-medium text-slate-500">ベース値</th>
                <th className="px-2 py-2 text-right font-medium text-slate-500">変動幅</th>
                <th className="px-2 py-2 text-right font-medium text-slate-500">上方MRR(12M)</th>
                <th className="px-2 py-2 text-right font-medium text-slate-500">下方MRR(12M)</th>
                <th className="px-2 py-2 text-right font-medium text-slate-500">上方EBITDA(12M)</th>
                <th className="px-2 py-2 text-right font-medium text-slate-500">下方Cash(36M)</th>
              </tr>
            </thead>
            <tbody>
              {sensitivity.scenarios.map((s, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-2 py-1.5 font-medium text-slate-700">{s.label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{s.baseValue.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">±{(s.variation * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-primary-700">{formatCurrency(s.resultMrr12, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-danger-500">{formatCurrency(s.resultMrr36, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-success-600">{formatCurrency(s.resultEbitda12, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">{formatCurrency(s.resultCash36, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Benchmark Radar */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">ベンチマーク比較</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={benchmarkRadar}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 8 }} />
              <Radar name="自社" dataKey="自社" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
              <Radar name="業界平均" dataKey="業界平均" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Benchmark Table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">ベンチマーク詳細</h3>
          <div className="space-y-3">
            {benchmarks.map((b, i) => {
              const isGood = b.isHigherBetter ? b.myValue >= b.industryAvg : b.myValue <= b.industryAvg;
              return (
                <div key={i} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">{b.label}</span>
                    <span className={`text-xs font-bold ${isGood ? "text-success-600" : "text-warning-600"}`}>
                      {isGood ? "Good" : "要改善"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>自社: {b.myValue}{b.unit}</span>
                        <span>業界平均: {b.industryAvg}{b.unit}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${isGood ? "bg-success-500" : "bg-warning-500"}`}
                          style={{ width: `${Math.min(100, (b.myValue / Math.max(b.industryAvg, 1)) * 50)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">経営チェックリスト</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <div key={item.id} className={`rounded-xl border p-3 ${
              item.status === "good" ? "border-success-200 bg-success-50/50" :
              item.status === "warning" ? "border-warning-200 bg-warning-50/50" :
              "border-danger-200 bg-danger-50/50"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  item.status === "good" ? "bg-success-500" :
                  item.status === "warning" ? "bg-warning-500" :
                  "bg-danger-500"
                }`} />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                <span className="ml-auto text-[10px] text-slate-400">{item.category}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">{item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
