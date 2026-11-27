import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Plus } from "lucide-react";
import { useCompanyStore } from "../../../store/company";
import { useProgressStore, TASK_IDS } from "../../../store/progress";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";
import { useFiscalEndMonth } from "../../../hooks/useFiscalEndMonth";
import { STEPS } from "../lib/content";
import { addDays, fmt, parseIso, shiftWeekend, toIso, twoMonthsAfterEnd, WEEK } from "../lib/dates";
import {
  buildTerm, calcTerm, DEFAULT_STATE, firstEndDate, nextTermOf, prevTaxOf, termMonths,
  type SettlementState, type TermData,
} from "../lib/types";
import type { Ctx } from "../components/ui";
import OverviewTab from "../components/OverviewTab";
import CompanionTab from "../components/CompanionTab";
import TaxTab from "../components/TaxTab";
import InterimTab from "../components/InterimTab";
import MonthlyTab from "../components/MonthlyTab";
import InhouseTab from "../components/InhouseTab";
import HistoryTab from "../components/HistoryTab";

const STORAGE_KEY = "settlement-v2";

const TABS = [
  { id: "companion", label: "伴走（今日やること）" },
  { id: "overview", label: "進め方" },
  { id: "tax", label: "税額計算" },
  { id: "interim", label: "中間申告" },
  { id: "monthly", label: "月次・AI" },
  { id: "inhouse", label: "内製化・費用" },
  { id: "history", label: "履歴・カレンダー" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function SettlementPage() {
  const company = useCompanyStore((s) => s.company);
  const { markDone, markUndone } = useProgressStore();
  const [state, setState, ready] = useCompanyStorageState<SettlementState>(STORAGE_KEY, DEFAULT_STATE);
  const [tab, setTab] = useState<TabId>("companion");

  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);
  const founded = company?.foundedDate ? parseIso(company.foundedDate.slice(0, 10)) : null;
  const capital = company?.capitalAmount ?? 0;

  /* 初回：設立日と決算月から第1期を自動作成 */
  const [fiscalEnd, setFiscalEnd] = useFiscalEndMonth();
  const [setupMonth, setSetupMonth] = useState<number | null>(null);
  const hasTerms = Object.keys(state.terms).length > 0;
  const createFirst = (endMonth: number) => {
    const end = firstEndDate(founded, endMonth, today);
    const start = founded ?? addDays(new Date(end.getFullYear() - 1, end.getMonth() + 1, 0), 1);
    const t = buildTerm(toIso(start), toIso(end), 1, 0);
    setFiscalEnd(endMonth);
    setState((p) => ({ ...p, fiscalEndMonth: endMonth, terms: { [t.endDate]: t }, currentEnd: t.endDate }));
  };

  const currentEnd = state.terms[state.currentEnd] ? state.currentEnd : Object.keys(state.terms).sort().pop() ?? "";
  const term: TermData | undefined = state.terms[currentEnd];

  const patchRoot = (p: Partial<SettlementState>) => setState((prev) => ({ ...prev, ...p }));
  const patchTerm = (p: Partial<TermData>) =>
    setState((prev) => {
      const t = prev.terms[currentEnd];
      if (!t) return prev;
      return { ...prev, terms: { ...prev.terms, [currentEnd]: { ...t, ...p } } };
    });

  const toggleDone = (id: string) =>
    setState((prev) => {
      const t = prev.terms[currentEnd];
      if (!t) return prev;
      const nowDone = !t.done[id];
      const step = STEPS.find((s) => s.id === id);
      const journal = step
        ? [...(t.journal ?? []), { id: Math.random().toString(36).slice(2, 9), at: new Date().toISOString(), text: `${step.title}：${nowDone ? "完了" : "未完了に戻した"}`, tag: (nowDone ? "完了" : "進捗") as "完了" | "進捗", auto: true }]
        : t.journal;
      return { ...prev, terms: { ...prev.terms, [currentEnd]: { ...t, done: { ...t.done, [id]: nowDone }, journal } } };
    });

  const toggleMonthly = (month: string, id: string) =>
    setState((prev) => {
      const t = prev.terms[currentEnd];
      if (!t) return prev;
      const m = { ...(t.monthly[month] ?? {}) };
      m[id] = !m[id];
      return { ...prev, terms: { ...prev.terms, [currentEnd]: { ...t, monthly: { ...t.monthly, [month]: m } } } };
    });

  const addNextTerm = () => {
    setState((prev) => {
      const sorted = Object.values(prev.terms).sort((a, b) => a.endDate.localeCompare(b.endDate));
      const last = sorted[sorted.length - 1];
      if (!last) return prev;
      const next = nextTermOf(last, parseIso(last.endDate).getMonth() + 1, capital, prev.rates);
      return { ...prev, terms: { ...prev.terms, [next.endDate]: next }, currentEnd: next.endDate };
    });
    setTab("overview");
  };

  const deleteTerm = (endIso: string) => {
    if (!window.confirm("この期のデータを削除します。よろしいですか？")) return;
    setState((prev) => {
      const terms = { ...prev.terms };
      delete terms[endIso];
      const rest = Object.keys(terms).sort();
      return { ...prev, terms, currentEnd: prev.currentEnd === endIso ? rest[rest.length - 1] ?? "" : prev.currentEnd };
    });
  };

  /* ジャーニー連携：第1期の全ステップ完了でタスク完了 */
  const firstDone = !!term && term.termNo === 1 && STEPS.every((s) => term.done[s.id]);
  useEffect(() => {
    if (!term || term.termNo !== 1) return;
    if (firstDone) markDone(TASK_IDS.SEED_FIRST_SETTLEMENT);
    else markUndone(TASK_IDS.SEED_FIRST_SETTLEMENT);
  }, [firstDone, term?.termNo, markDone, markUndone]);

  /* 決算月を税務カレンダー等と共有（既存の期があればその期末月を正とする） */
  const termEndMonth = term ? parseIso(term.endDate).getMonth() + 1 : null;
  useEffect(() => {
    if (termEndMonth && termEndMonth !== fiscalEnd) setFiscalEnd(termEndMonth);
  }, [termEndMonth, fiscalEnd, setFiscalEnd]);

  if (!ready) return <div className="p-6 text-sm text-slate-500">読み込み中…</div>;

  if (!term) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">決算・申告ナビ</h1>
          <p className="mt-1 text-sm text-slate-500">会計ソフトと政府の無料システム（e-Tax・eLTAX）で、決算・申告を内製化しましょう</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">最初の事業年度を設定します</h2>
          <p className="mt-1 text-xs text-slate-500">
            {founded ? `設立日（${fmt(founded)}）から最初の決算日を自動計算します。` : "設立日が未設定のため、直近の決算日を基準にします（会社設定で設立日を入力するとより正確になります）。"}
          </p>
          <label className="mt-4 block max-w-xs text-xs text-slate-600">
            決算月
            <select value={setupMonth ?? fiscalEnd} onChange={(e) => setSetupMonth(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}月</option>)}
            </select>
          </label>
          <button onClick={() => createFirst(setupMonth ?? fiscalEnd)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" /> 第1期を始める
          </button>
        </div>
      </div>
    );
  }

  const start = parseIso(term.startDate);
  const end = parseIso(term.endDate);
  const months = termMonths(term);
  const rawDeadline = twoMonthsAfterEnd(end);
  const deadline = shiftWeekend(rawDeadline);
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / 86400000);
  const tax = calcTerm(term, capital, state.rates);
  const prev = prevTaxOf(state.terms, term, capital, state.rates);

  const ctx: Ctx = {
    state, patchRoot, term, patchTerm, company, capital, today,
    start, end, months, deadline, rawDeadline, daysLeft, tax, prev,
  };

  const stepsDone = STEPS.filter((s) => term.done[s.id]).length;
  const allDone = stepsDone === STEPS.length;
  const urgency = allDone ? "done" : daysLeft < 0 ? "over" : daysLeft <= 14 ? "danger" : daysLeft <= 30 ? "warn" : "ok";
  const urgencyStyle = {
    done: "border-emerald-200 from-emerald-50 to-teal-50",
    over: "border-red-300 from-red-50 to-rose-50",
    danger: "border-red-200 from-red-50 to-orange-50",
    warn: "border-amber-200 from-amber-50 to-yellow-50",
    ok: "border-blue-200 from-blue-50 to-cyan-50",
  }[urgency];
  const sortedKeys = Object.keys(state.terms).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">決算・申告ナビ</h1>
          <p className="mt-1 text-sm text-slate-500">
            会計ソフト＋AI＋政府の無料システム（e-Tax・eLTAX）で、毎期の決算・申告を内製化
          </p>
        </div>
        <label className="text-xs text-slate-600">
          対象の期
          <select value={currentEnd} onChange={(e) => patchRoot({ currentEnd: e.target.value })}
            className="ml-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {sortedKeys.map((k) => <option key={k} value={k}>第{state.terms[k].termNo}期（〜{k}）</option>)}
          </select>
        </label>
      </div>

      <div className={`rounded-2xl border bg-gradient-to-r p-5 ${urgencyStyle}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">
              {company?.name ?? "会社"} 第{term.termNo}期 ／ {fmt(start)} 〜 {fmt(end)}（{months}か月）
            </p>
            <p className="text-lg font-bold text-slate-900">
              申告・納付期限：{fmt(deadline)}（{WEEK[deadline.getDay()]}）
            </p>
            {rawDeadline.getTime() !== deadline.getTime() && (
              <p className="text-[11px] text-slate-500">原則の期限 {fmt(rawDeadline)} が土日のため翌営業日に繰り延べ。祝日は別途確認してください</p>
            )}
            <p className="text-[11px] text-slate-500">税額見込み {tax.total.toLocaleString()}円（税額計算タブ）</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${urgency === "danger" || urgency === "over" ? "text-red-600" : "text-slate-900"}`}>
              {allDone ? "完了" : daysLeft >= 0 ? `あと${daysLeft}日` : `${-daysLeft}日超過`}
            </p>
            <p className="text-[11px] text-slate-500">{stepsDone} / {STEPS.length} ステップ完了</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
            style={{ width: `${(stepsDone / STEPS.length) * 100}%` }} />
        </div>
        {(urgency === "danger" || urgency === "over") && (
          <p className="mt-3 flex gap-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            期限が迫っています。「申告期限の延長の特例」は事業年度終了後45日以内の申請が必要で、納付期限は延びません。「伴走」タブの計画に沿って進めましょう。
          </p>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "companion" && <CompanionTab ctx={ctx} />}
      {tab === "overview" && <OverviewTab ctx={ctx} toggleDone={toggleDone} />}
      {tab === "tax" && <TaxTab ctx={ctx} />}
      {tab === "interim" && <InterimTab ctx={ctx} />}
      {tab === "monthly" && <MonthlyTab ctx={ctx} toggleMonthly={toggleMonthly} />}
      {tab === "inhouse" && <InhouseTab ctx={ctx} />}
      {tab === "history" && <HistoryTab ctx={ctx} onSelect={(k) => patchRoot({ currentEnd: k })} onNext={addNextTerm} onDelete={deleteTerm} />}

      <div className="flex flex-wrap gap-2">
        <Link to="/tax-calendar" state={{ fromJourney: true }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700">
          税務カレンダー <ArrowRight className="h-3 w-3" />
        </Link>
        <Link to="/journey" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
          ジャーニーマップに戻る
        </Link>
      </div>

      <p className="text-[11px] text-slate-400">
        本ページは一般的な情報提供であり、税務・法務上の助言ではありません。税率・期限・料金は変更される場合があるため、最新情報は国税庁・各自治体・各社公式サイトで確認してください。
      </p>
    </div>
  );
}
