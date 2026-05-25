import { useState, useMemo } from "react";
import {
  Calendar, AlertCircle, FileText, Banknote, Building2,
  CheckCircle2, Circle, Bell, ChevronDown, ChevronUp,
} from "lucide-react";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

interface DeadlineItem {
  id: string;
  label: string;
  description: string;
  type: "fiscal" | "fixed" | "monthly";
  getMonths?: (fiscalEndMonth: number) => number[];
  fixedMonth?: number;
  fixedDay?: number;
  icon: typeof FileText;
  category: "tax" | "insurance" | "hr";
}

const deadlines: DeadlineItem[] = [
  {
    id: "corporate-tax", label: "法人税確定申告", category: "tax",
    description: "決算日から2ヶ月以内", type: "fiscal",
    getMonths: (m) => [(m % 12) + 1], icon: FileText,
  },
  {
    id: "local-tax", label: "法人住民税・事業税", category: "tax",
    description: "決算日から2ヶ月以内", type: "fiscal",
    getMonths: (m) => [(m % 12) + 1], icon: Banknote,
  },
  {
    id: "consumption-tax", label: "消費税申告", category: "tax",
    description: "決算日から2ヶ月以内", type: "fiscal",
    getMonths: (m) => [(m % 12) + 1], icon: FileText,
  },
  {
    id: "interim-tax", label: "中間申告（法人税）", category: "tax",
    description: "事業年度開始から6ヶ月後2ヶ月以内", type: "fiscal",
    getMonths: (m) => [((m + 7) % 12) + 1], icon: FileText,
  },
  {
    id: "withholding-jan", label: "源泉所得税特例納付（1〜6月分）", category: "tax",
    description: "7月10日まで", type: "fixed", fixedMonth: 7, fixedDay: 10, icon: Banknote,
  },
  {
    id: "withholding-jul", label: "源泉所得税特例納付（7〜12月分）", category: "tax",
    description: "翌年1月20日まで", type: "fixed", fixedMonth: 1, fixedDay: 20, icon: Banknote,
  },
  {
    id: "year-end", label: "年末調整", category: "hr",
    description: "12月給与支払い時", type: "fixed", fixedMonth: 12, icon: Building2,
  },
  {
    id: "legal-report", label: "法定調書合計表", category: "hr",
    description: "1月31日まで", type: "fixed", fixedMonth: 1, fixedDay: 31, icon: FileText,
  },
  {
    id: "depreciation", label: "償却資産申告", category: "tax",
    description: "1月31日まで", type: "fixed", fixedMonth: 1, fixedDay: 31, icon: FileText,
  },
  {
    id: "fixed-asset-1", label: "固定資産税（第1期）", category: "tax",
    description: "4月末日まで（自治体による）", type: "fixed", fixedMonth: 4, icon: Banknote,
  },
  {
    id: "fixed-asset-2", label: "固定資産税（第2期）", category: "tax",
    description: "7月末日まで（自治体による）", type: "fixed", fixedMonth: 7, icon: Banknote,
  },
  {
    id: "fixed-asset-3", label: "固定資産税（第3期）", category: "tax",
    description: "12月末日まで（自治体による）", type: "fixed", fixedMonth: 12, icon: Banknote,
  },
  {
    id: "fixed-asset-4", label: "固定資産税（第4期）", category: "tax",
    description: "2月末日まで（自治体による）", type: "fixed", fixedMonth: 2, icon: Banknote,
  },
  {
    id: "social-insurance-report", label: "社会保険算定基礎届", category: "insurance",
    description: "7月10日まで", type: "fixed", fixedMonth: 7, fixedDay: 10, icon: Building2,
  },
  {
    id: "social-insurance-change", label: "月額変更届（随時改定）", category: "insurance",
    description: "昇給・降給が連続3ヶ月で2等級以上変動時", type: "monthly", icon: Building2,
  },
  {
    id: "employment-insurance", label: "雇用保険年度更新", category: "insurance",
    description: "6月1日〜7月10日", type: "fixed", fixedMonth: 6, icon: Building2,
  },
  {
    id: "workers-comp", label: "労働保険年度更新", category: "insurance",
    description: "6月1日〜7月10日", type: "fixed", fixedMonth: 6, icon: Building2,
  },
];

function getDeadlinesForMonth(month: number, fiscalEnd: number) {
  return deadlines.filter(d => {
    if (d.type === "monthly") return true;
    if (d.type === "fixed") return d.fixedMonth === month;
    if (d.type === "fiscal" && d.getMonths) return d.getMonths(fiscalEnd).includes(month);
    return false;
  });
}

const categoryColors: Record<string, string> = {
  tax: "bg-blue-50 text-blue-700",
  insurance: "bg-emerald-50 text-emerald-700",
  hr: "bg-violet-50 text-violet-700",
};

const categoryLabels: Record<string, string> = {
  tax: "税務", insurance: "社会保険", hr: "労務",
};

const STORAGE_KEY = "runwith-tax-done";

export default function TaxCalendarPage() {
  const [fiscalEndMonth, setFiscalEndMonth] = useState(3);
  const [showFiscalSelector, setShowFiscalSelector] = useState(false);
  const [doneArr, setDoneArr] = useCompanyStorageState<string[]>(STORAGE_KEY, []);
  const doneItems = useMemo(() => new Set(doneArr), [doneArr]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const monthCards = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => i + 1).map(month => ({
      month,
      items: getDeadlinesForMonth(month, fiscalEndMonth),
      isCurrent: month === currentMonth,
      isPast: month < currentMonth,
    })),
    [fiscalEndMonth, currentMonth]
  );

  const nextDeadlineMonth = useMemo(() => {
    for (let i = 0; i < 12; i++) {
      const m = ((currentMonth - 1 + i) % 12) + 1;
      const items = getDeadlinesForMonth(m, fiscalEndMonth).filter(d => d.type !== "monthly");
      if (items.length > 0) return { month: m, items };
    }
    return null;
  }, [currentMonth, fiscalEndMonth]);

  const toggleDone = (deadlineId: string, month: number) => {
    const key = `${month}-${deadlineId}`;
    setDoneArr((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return [...next];
    });
  };

  const totalThisMonth = monthCards.find(m => m.isCurrent)?.items.length ?? 0;
  const doneThisMonth = monthCards.find(m => m.isCurrent)?.items.filter(
    d => doneItems.has(`${currentMonth}-${d.id}`)
  ).length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">税務カレンダー</h1>
        <p className="mt-1 text-slate-500">法人の年間税務・社会保険・労務スケジュールを一覧で管理します。</p>
      </div>

      {/* 今月のサマリー */}
      {totalThisMonth > 0 && (
        <div className={`rounded-2xl border p-5 ${doneThisMonth === totalThisMonth ? "border-emerald-200 bg-emerald-50" : "border-primary-200 bg-primary-50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${doneThisMonth === totalThisMonth ? "text-emerald-600" : "text-primary-600"}`} />
              <div>
                <p className="font-semibold text-slate-900">今月（{currentMonth}月）の期限</p>
                <p className="text-sm text-slate-600">
                  {doneThisMonth === totalThisMonth
                    ? `${totalThisMonth}件すべて対応済み ✓`
                    : `${totalThisMonth}件中 ${doneThisMonth}件対応済み`}
                </p>
              </div>
            </div>
            {totalThisMonth > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{Math.round((doneThisMonth / totalThisMonth) * 100)}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 次回期限 */}
      {nextDeadlineMonth && nextDeadlineMonth.month !== currentMonth && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium text-slate-700">
              次回の期限: <span className="font-bold text-slate-900">{nextDeadlineMonth.month}月</span> — {nextDeadlineMonth.items.map(i => i.label).slice(0, 2).join("、")}{nextDeadlineMonth.items.length > 2 ? `他${nextDeadlineMonth.items.length - 2}件` : ""}
            </p>
          </div>
        </div>
      )}

      {/* 決算月選択 */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <button
          onClick={() => setShowFiscalSelector(!showFiscalSelector)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">決算月: <span className="text-primary-600">{fiscalEndMonth}月</span></p>
              <p className="text-xs text-slate-500">クリックして変更</p>
            </div>
          </div>
          {showFiscalSelector ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>
        {showFiscalSelector && (
          <div className="mt-4 flex flex-wrap gap-2">
            {monthNames.map((name, i) => {
              const month = i + 1;
              return (
                <button key={month} onClick={() => { setFiscalEndMonth(month); setShowFiscalSelector(false); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${fiscalEndMonth === month ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* カテゴリ凡例 */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryLabels).map(([k, v]) => (
          <span key={k} className={`rounded-lg px-3 py-1 text-xs font-medium ${categoryColors[k]}`}>{v}</span>
        ))}
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">毎月</span>
      </div>

      {/* 12ヶ月グリッド */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {monthCards.map(({ month, items, isCurrent, isPast }) => {
          const doneCount = items.filter(d => doneItems.has(`${month}-${d.id}`)).length;
          const allDone = items.length > 0 && doneCount === items.length;

          return (
            <div key={month} className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
              isCurrent ? "border-primary-300 bg-primary-50/30 ring-2 ring-primary-200" :
              allDone ? "border-emerald-200 bg-emerald-50/30" :
              isPast ? "border-slate-200 bg-slate-50/50 opacity-75" :
              "border-slate-200/60 bg-white"
            }`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">
                  {month}月
                  {isCurrent && <span className="ml-2 rounded bg-primary-500 px-2 py-0.5 text-xs text-white">今月</span>}
                  {allDone && !isCurrent && <span className="ml-2 rounded bg-emerald-500 px-2 py-0.5 text-xs text-white">完了</span>}
                </h3>
                {items.length > 0 && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {items.length}件
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400">期限なし</p>
                ) : items.map(item => {
                  const Icon = item.icon;
                  const key = `${month}-${item.id}`;
                  const isDone = doneItems.has(key);

                  return (
                    <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors hover:bg-white/70">
                      <button type="button" onClick={() => toggleDone(item.id, month)} className="mt-0.5 shrink-0">
                        {isDone
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <Circle className="h-4 w-4 text-slate-300" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-medium ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
                            {item.label}
                          </p>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            item.type === "monthly" ? "bg-slate-100 text-slate-500" : categoryColors[item.category]
                          }`}>
                            {item.type === "monthly" ? "毎月" : categoryLabels[item.category]}
                          </span>
                        </div>
                        {item.fixedDay && (
                          <p className={`text-[10px] ${isDone ? "text-slate-300" : "text-slate-500"}`}>{item.fixedDay}日まで</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {items.length > 0 && doneCount > 0 && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-primary-500"}`}
                    style={{ width: `${(doneCount / items.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
