import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Target,
  Zap, Plus, X, Edit3, Check, AlertCircle, BarChart3, Upload, Download,
} from "lucide-react";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

type Trend = "up" | "down" | "flat";

interface MonthlyEntry {
  month: string;
  mrr: number;
  arr: number;
  customers: number;
  churn: number;
  cac: number;
  ltv: number;
  burnRate: number;
  runway: number;
  grossMargin: number;
  nrr: number;
}

const formatMonthLabel = (offset: number): string => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const defaultData: MonthlyEntry[] = Array.from({ length: 6 }, (_, i) => ({
  month: formatMonthLabel(5 - i),
  mrr: 0, arr: 0, customers: 0, churn: 0,
  cac: 0, ltv: 0, burnRate: 0, runway: 0,
  grossMargin: 0, nrr: 100,
}));

const STORAGE_KEY = "runwith-kpi-data";

function usePersistentKpi() {
  const [entries, setEntries] = useCompanyStorageState(STORAGE_KEY, defaultData);
  return { entries, setEntries };
}

const trendOf = (data: number[], higherIsBetter = true): { trend: Trend; pct: number } => {
  if (data.length < 2) return { trend: "flat", pct: 0 };
  const prev = data[data.length - 2];
  const curr = data[data.length - 1];
  if (prev === 0) return { trend: "flat", pct: 0 };
  const pct = Math.round(((curr - prev) / prev) * 100 * 10) / 10;
  const isGood = higherIsBetter ? pct >= 0 : pct <= 0;
  const trend: Trend = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return { trend, pct };
};

function KpiMiniCard({
  label, value, unit, data, higherIsBetter = true,
}: {
  label: string; value: number | string; unit?: string;
  data: number[]; higherIsBetter?: boolean;
}) {
  const { trend, pct } = trendOf(data.map(Number), higherIsBetter);
  const trendColor = trend === "up"
    ? higherIsBetter ? "text-emerald-600" : "text-red-500"
    : trend === "down"
    ? higherIsBetter ? "text-red-500" : "text-emerald-600"
    : "text-slate-400";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          {pct > 0 ? "+" : ""}{pct}%
        </span>
      </div>
      <p className="mb-2 text-xl font-bold text-slate-900">
        {typeof value === "number" && value > 0 ? value.toLocaleString() : value || "—"}
        {unit && <span className="ml-0.5 text-sm font-normal text-slate-500">{unit}</span>}
      </p>
      <div className="h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#475569" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#475569" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#475569" strokeWidth={1.5} fill={`url(#g-${label})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const scoreConfig = [
  { key: "churn", label: "Churn Rate", unit: "%", goodThreshold: 3, okThreshold: 5, higherIsBetter: false },
  { key: "nrr", label: "NRR", unit: "%", goodThreshold: 100, okThreshold: 90, higherIsBetter: true },
  { key: "grossMargin", label: "Gross Margin", unit: "%", goodThreshold: 70, okThreshold: 50, higherIsBetter: true },
  { key: "runway", label: "Runway", unit: "ヶ月", goodThreshold: 18, okThreshold: 12, higherIsBetter: true },
];

export default function KpiTrackerPage() {
  const { entries, setEntries } = usePersistentKpi();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<MonthlyEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"saas" | "growth" | "financial">("saas");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const latest = entries[entries.length - 1];

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const imported: MonthlyEntry[] = lines.slice(1).map((line) => {
        const values = line.split(",").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || "0"; });
        return {
          month: row["month"] || row["月"] || formatMonthLabel(0),
          mrr: parseFloat(row["mrr"] || "0"),
          arr: parseFloat(row["arr"] || "0"),
          customers: parseFloat(row["customers"] || row["顧客数"] || "0"),
          churn: parseFloat(row["churn"] || row["churn rate"] || "0"),
          cac: parseFloat(row["cac"] || "0"),
          ltv: parseFloat(row["ltv"] || "0"),
          burnRate: parseFloat(row["burnrate"] || row["burn rate"] || row["burn_rate"] || "0"),
          runway: parseFloat(row["runway"] || "0"),
          grossMargin: parseFloat(row["grossmargin"] || row["gross margin"] || row["gross_margin"] || "0"),
          nrr: parseFloat(row["nrr"] || "100"),
        };
      });
      if (imported.length > 0) setEntries(imported);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCsvExport = () => {
    const headers = "month,mrr,arr,customers,churn,cac,ltv,burnRate,runway,grossMargin,nrr";
    const rows = entries.map(e =>
      `${e.month},${e.mrr},${e.arr},${e.customers},${e.churn},${e.cac},${e.ltv},${e.burnRate},${e.runway},${e.grossMargin},${e.nrr}`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kpi-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreItems = scoreConfig.map((cfg) => {
    const value = (latest as never)[cfg.key] as number;
    const good = cfg.higherIsBetter ? value >= cfg.goodThreshold : value <= cfg.goodThreshold;
    const ok = cfg.higherIsBetter ? value >= cfg.okThreshold : value <= cfg.okThreshold;
    const status = good ? "green" : ok ? "yellow" : "red";
    return { ...cfg, value, status };
  });

  const ltvCac = latest.cac > 0 ? Math.round((latest.ltv / latest.cac) * 10) / 10 : 0;

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setDraft({ ...entries[idx] });
  };

  const saveEdit = () => {
    if (draft === null || editingIdx === null) return;
    setEntries(entries.map((e, i) => (i === editingIdx ? { ...draft } : e)));
    setEditingIdx(null);
    setDraft(null);
  };

  const addNextMonth = () => {
    const lastMonth = entries[entries.length - 1].month;
    const [y, m] = lastMonth.split("/").map(Number);
    const next = new Date(y, m, 1);
    const newMonth = `${next.getFullYear()}/${String(next.getMonth() + 1).padStart(2, "0")}`;
    setEntries([...entries, {
      month: newMonth, mrr: 0, arr: 0, customers: 0, churn: 0,
      cac: 0, ltv: 0, burnRate: 0, runway: 0, grossMargin: 0, nrr: 100,
    }]);
  };

  const field = (k: keyof Omit<MonthlyEntry, "month">, label: string, unit?: string) => (
    <div key={k}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}{unit ? `（${unit}）` : ""}</label>
      <input
        type="number"
        value={draft ? (draft as never)[k] : ""}
        onChange={(e) => draft && setDraft({ ...draft, [k]: parseFloat(e.target.value) || 0 })}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-100"
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KPIトラッカー</h1>
          <p className="mt-1 text-slate-500">月次KPIを入力して推移を可視化。投資家向け数値管理に。</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 transition-all hover:bg-primary-100"
          >
            <Upload className="h-4 w-4" /> CSV取込
          </button>
          <button
            onClick={handleCsvExport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> CSV出力
          </button>
          <button
            onClick={addNextMonth}
            className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" /> 月追加
          </button>
        </div>
      </div>

      {/* スコアカード */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Target className="h-5 w-5 text-slate-500" /> ヘルスチェック（最新月）
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {scoreItems.map((item) => (
            <div key={item.key} className={`rounded-xl border p-4 ${
              item.status === "green" ? "border-emerald-200 bg-emerald-50" :
              item.status === "yellow" ? "border-amber-200 bg-amber-50" :
              "border-red-200 bg-red-50"
            }`}>
              <p className="text-xs font-medium text-slate-600">{item.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{item.value > 0 ? item.value : "—"}{item.unit}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                item.status === "green" ? "bg-emerald-200 text-emerald-800" :
                item.status === "yellow" ? "bg-amber-200 text-amber-800" :
                item.value > 0 ? "bg-red-200 text-red-800" : "bg-slate-200 text-slate-600"
              }`}>
                {item.value > 0 ? (item.status === "green" ? "良好" : item.status === "yellow" ? "要改善" : "要対応") : "未入力"}
              </span>
            </div>
          ))}
        </div>
        {ltvCac > 0 && (
          <p className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${ltvCac >= 3 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            LTV/CAC比率: <strong>{ltvCac}x</strong> {ltvCac >= 3 ? "✓ 目標値（3x以上）達成" : "目標は3x以上"}
          </p>
        )}
      </div>

      {/* タブ切替 */}
      <div>
        <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {([["saas", "SaaS KPI"], ["growth", "成長指標"], ["financial", "財務指標"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "saas" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiMiniCard label="MRR" value={latest.mrr} unit="万円" data={entries.map(e => e.mrr)} />
            <KpiMiniCard label="ARR" value={latest.arr} unit="万円" data={entries.map(e => e.arr)} />
            <KpiMiniCard label="顧客数" value={latest.customers} unit="社" data={entries.map(e => e.customers)} />
            <KpiMiniCard label="Churn Rate" value={latest.churn} unit="%" data={entries.map(e => e.churn)} higherIsBetter={false} />
            <KpiMiniCard label="NRR" value={latest.nrr} unit="%" data={entries.map(e => e.nrr)} />
            <KpiMiniCard label="LTV/CAC" value={ltvCac > 0 ? `${ltvCac}x` : "—"} data={entries.map(e => e.cac > 0 ? Math.round(e.ltv / e.cac * 10) / 10 : 0)} />
          </div>
        )}
        {activeTab === "growth" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiMiniCard label="MRR" value={latest.mrr} unit="万円" data={entries.map(e => e.mrr)} />
            <KpiMiniCard label="顧客数" value={latest.customers} unit="社" data={entries.map(e => e.customers)} />
            <KpiMiniCard label="LTV" value={latest.ltv} unit="円" data={entries.map(e => e.ltv)} />
            <KpiMiniCard label="CAC" value={latest.cac} unit="円" data={entries.map(e => e.cac)} higherIsBetter={false} />
          </div>
        )}
        {activeTab === "financial" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiMiniCard label="Gross Margin" value={latest.grossMargin} unit="%" data={entries.map(e => e.grossMargin)} />
            <KpiMiniCard label="Burn Rate" value={latest.burnRate} unit="万円/月" data={entries.map(e => e.burnRate)} higherIsBetter={false} />
            <KpiMiniCard label="Runway" value={latest.runway} unit="ヶ月" data={entries.map(e => e.runway)} />
          </div>
        )}
      </div>

      {/* MRR推移グラフ */}
      {entries.some(e => e.mrr > 0) && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">MRR推移</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={entries.map(e => ({ month: e.month, MRR: e.mrr }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `${v}万`} />
                <Tooltip formatter={(v) => [`${v}万円`, "MRR"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="MRR" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 月次データ入力テーブル */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <BarChart3 className="h-5 w-5 text-slate-500" />
          月次データ入力
        </h2>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">「月追加」ボタンで月を追加してください</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="pb-3 font-medium">月</th>
                  <th className="pb-3 font-medium">MRR<br/><span className="font-normal">（万円）</span></th>
                  <th className="pb-3 font-medium">顧客数</th>
                  <th className="pb-3 font-medium">Churn<br/><span className="font-normal">（%）</span></th>
                  <th className="pb-3 font-medium">Burn Rate<br/><span className="font-normal">（万円）</span></th>
                  <th className="pb-3 font-medium">Runway<br/><span className="font-normal">（月）</span></th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, idx) => (
                  <tr key={entry.month} className={idx === editingIdx ? "bg-primary-50/30" : "hover:bg-slate-50"}>
                    <td className="py-3 font-medium text-slate-800">{entry.month}</td>
                    {(["mrr", "customers", "churn", "burnRate", "runway"] as const).map(key => (
                      <td key={key} className="py-3">
                        {idx === editingIdx && draft ? (
                          <input
                            type="number"
                            value={(draft as never)[key]}
                            onChange={(e) => setDraft({ ...draft, [key]: parseFloat(e.target.value) || 0 })}
                            className="w-24 rounded-lg border border-primary-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                          />
                        ) : (
                          <span className={`${entry[key] === 0 ? "text-slate-300" : "text-slate-800"}`}>
                            {entry[key] || "—"}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="py-3">
                      {idx === editingIdx ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="rounded-lg bg-primary-600 p-1.5 text-white hover:bg-primary-700">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { setEditingIdx(null); setDraft(null); }} className="rounded-lg bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(idx)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <AlertCircle className="h-3.5 w-3.5" />
          鉛筆アイコンをクリックして各月のデータを編集できます。CSVファイルから一括取込も可能です。データはブラウザに保存されます。
        </p>
      </div>
    </div>
  );
}
