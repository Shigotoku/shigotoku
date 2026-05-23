import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { SimulationResult } from "@/features/simulator/types/simulation";
import { formatCurrency } from "@/features/simulator/utils/formatters";
import { currencyFormatter } from "@/features/simulator/utils/chartHelpers";

interface Props {
  result: SimulationResult;
}

export default function SimGrowth({ result }: Props) {
  const { monthly } = result;

  const revenueData = monthly.slice(0, 24).map((m) => ({
    label: `${m.month}M`,
    売上: m.revenue,
    原価: m.cogs,
    粗利: m.grossProfit,
  }));

  const customerData = monthly.slice(0, 24).map((m) => ({
    label: `${m.month}M`,
    顧客数: m.totalCustomers,
    新規: m.newCustomers,
    解約: m.churnedCustomers,
  }));

  const profitData = monthly.slice(0, 24).map((m) => ({
    label: `${m.month}M`,
    EBITDA: m.ebitda,
    営業利益: m.operatingProfit,
    固定費: m.fixedCost,
    変動費: m.variableCost,
  }));

  const unitEconData = monthly.slice(0, 24).map((m) => ({
    label: `${m.month}M`,
    ARPU: m.arpu,
    LTV: m.ltv / 100,
    CAC: m.cac,
  }));

  const cashData = monthly.slice(0, 36).map((m) => ({
    label: `${m.month}M`,
    キャッシュ残高: m.cashBalance,
    Burn: m.burnRate,
    Runway: Math.min(m.runway, 60),
  }));

  return (
    <div className="space-y-6">
      {/* Revenue breakdown */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">売上・原価・粗利（24ヶ月）</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
            <Tooltip formatter={currencyFormatter} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="売上" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="粗利" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="原価" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer lifecycle */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">顧客推移</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={customerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="顧客数" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="新規" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="解約" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* P&L */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">損益推移</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={currencyFormatter} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="EBITDA" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="固定費" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="変動費" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Unit Economics */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">ユニットエコノミクス</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={unitEconData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={currencyFormatter} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ARPU" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="CAC" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cash / Runway */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">キャッシュ・Runway（36ヶ月）</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cashData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip formatter={currencyFormatter} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="キャッシュ残高" stroke="#9333ea" fill="#9333ea" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="Burn" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly table (first 12 months) */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">月次データテーブル（12ヶ月）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {["月", "MRR", "ARR", "顧客数", "売上", "粗利", "EBITDA", "キャッシュ", "LTV/CAC", "NRR", "Runway"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-right font-medium text-slate-500 first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthly.slice(0, 12).map((m) => (
                <tr key={m.month} className="border-b border-slate-50">
                  <td className="px-2 py-1.5 text-slate-700">{m.month}M</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">{formatCurrency(m.mrr, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">{formatCurrency(m.arr, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">{m.totalCustomers}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">{formatCurrency(m.revenue, true)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">{formatCurrency(m.grossProfit, true)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${m.ebitda >= 0 ? "text-success-600" : "text-danger-500"}`}>
                    {formatCurrency(m.ebitda, true)}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${m.cashBalance >= 0 ? "text-slate-800" : "text-danger-500"}`}>
                    {formatCurrency(m.cashBalance, true)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">{m.ltvCacRatio}x</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">{m.nrr}%</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${m.runway < 12 ? "text-danger-500" : "text-slate-800"}`}>
                    {m.runway >= 999 ? "∞" : `${m.runway}M`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
