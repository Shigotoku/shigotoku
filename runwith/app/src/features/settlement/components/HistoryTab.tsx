import { useMemo } from "react";
import { CalendarPlus, Download, History, Plus, Trash2 } from "lucide-react";
import { STEPS } from "../lib/content";
import { addDays, fmt, shiftWeekend, toIso, twoMonthsAfterEnd, yen } from "../lib/dates";
import { buildIcs, downloadText, type CalEvent } from "../lib/ics";
import { calcTerm, sortedTerms, termMonths } from "../lib/types";
import { Advice, Card, type Ctx } from "./ui";

interface Props {
  ctx: Ctx;
  onSelect: (endIso: string) => void;
  onNext: () => void;
  onDelete: (endIso: string) => void;
}

export default function HistoryTab({ ctx, onSelect, onNext, onDelete }: Props) {
  const { state, capital, term, start, end, deadline, company } = ctx;
  const terms = sortedTerms(state.terms);
  const last = terms[terms.length - 1];
  const isLast = last?.endDate === term.endDate;

  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = [];
    const name = company?.name ?? "会社";
    list.push({ date: end, title: `${name} 第${term.termNo}期 決算日`, note: "期末。帳簿を締める準備を開始" });
    if (termMonths(term) > 6) {
      const sixEnd = addDays(new Date(start.getFullYear(), start.getMonth() + 6, start.getDate()), -1);
      list.push({
        date: shiftWeekend(twoMonthsAfterEnd(sixEnd)),
        title: `${name} 中間申告・納付期限`,
        note: "前期税額が一定額を超える場合に必要（決算・申告ナビの中間申告タブで確認）",
      });
    }
    STEPS.forEach((s) => {
      list.push({ date: addDays(deadline, s.offset), title: `${name} 決算：${s.title}`, note: s.summary });
    });
    list.push({ date: deadline, title: `${name} 第${term.termNo}期 申告・納付期限`, note: "法人税・地方法人税・事業税・住民税の申告と納付" });
    const fixed: { m: number; d: number; title: string; note: string }[] = [
      { m: 1, d: 20, title: "源泉所得税の特例納付（7〜12月分）", note: "納期の特例の承認がある場合" },
      { m: 1, d: 31, title: "法定調書合計表・償却資産申告", note: "市区町村への償却資産申告も1/31" },
      { m: 7, d: 10, title: "源泉所得税の特例納付（1〜6月分）／算定基礎届", note: "社会保険の算定基礎届も7/10まで" },
      { m: 6, d: 1, title: "労働保険の年度更新 開始", note: "6/1〜7/10" },
    ];
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      fixed.forEach((f) => {
        const d = new Date(y, f.m - 1, f.d);
        if (d >= start && d <= end) list.push({ date: d, title: `${name} ${f.title}`, note: f.note });
      });
    }
    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [company?.name, end, start, term, deadline]);

  const exportIcs = () => downloadText(`settlement-term${term.termNo}.ics`, buildIcs(events, `${company?.name ?? ""} 第${term.termNo}期 決算スケジュール`));

  const summary = () => {
    const t = ctx.tax;
    const lines = [
      `${company?.name ?? ""} 第${term.termNo}期 決算・税額サマリー（${term.startDate}〜${term.endDate}）`,
      `課税所得：${yen(t.income)}`,
      `法人税 ${yen(t.corp)} / 地方法人税 ${yen(t.local)} / 事業税 ${yen(t.biz)} / 特別法人事業税 ${yen(t.special)}`,
      `県民税 ${yen(t.pref + t.prefEqual)} / 市民税 ${yen(t.city + t.cityEqual)}`,
      `税額合計：${yen(t.total)}　申告・納付期限：${fmt(deadline)}`,
      `翌期繰越欠損金：${yen(t.nextCarryLoss)}`,
    ];
    downloadText(`settlement-summary-term${term.termNo}.txt`, lines.join("\n"), "text/plain");
  };

  return (
    <div className="space-y-6">
      <Card title="期ごとの履歴" icon={<History className="h-4 w-4 text-primary-600" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">期</th><th className="pr-3">事業年度</th>
                <th className="pr-3 text-right">課税所得</th><th className="pr-3 text-right">税額合計</th>
                <th className="pr-3 text-right">繰越欠損金</th><th className="pr-3">進捗</th><th />
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {terms.map((t) => {
                const r = calcTerm(t, capital, state.rates);
                const doneCnt = STEPS.filter((s) => t.done[s.id]).length;
                return (
                  <tr key={t.endDate} className={`border-b border-slate-100 ${t.endDate === term.endDate ? "bg-primary-50/40" : ""}`}>
                    <td className="py-2 pr-3 font-bold">第{t.termNo}期</td>
                    <td className="pr-3">{t.startDate}〜{t.endDate}</td>
                    <td className="pr-3 text-right tabular-nums">{yen(r.income)}</td>
                    <td className="pr-3 text-right tabular-nums">{yen(r.total)}</td>
                    <td className="pr-3 text-right tabular-nums">{yen(r.nextCarryLoss)}</td>
                    <td className="pr-3">{doneCnt}/{STEPS.length}</td>
                    <td className="space-x-2 whitespace-nowrap text-right">
                      <button onClick={() => onSelect(t.endDate)} className="text-primary-600 hover:underline">開く</button>
                      {terms.length > 1 && (
                        <button onClick={() => onDelete(t.endDate)} title="削除" className="inline-flex align-middle text-slate-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onNext} disabled={!isLast}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            <Plus className="h-3.5 w-3.5" /> 次の期を始める（繰越欠損金・前期税額を引き継ぐ）
          </button>
          <button onClick={summary}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
            <Download className="h-3.5 w-3.5" /> この期のサマリーを保存
          </button>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
            <Download className="h-3.5 w-3.5" /> 印刷／PDFで保存
          </button>
        </div>
        {!isLast && <p className="mt-2 text-[11px] text-slate-400">最新の期を開いている時だけ「次の期を始める」を押せます。</p>}
        <Advice kind="tip">申告が終わったら「次の期を始める」を押すだけで、翌期のスケジュール・中間申告判定・繰越欠損金が自動で準備されます。毎期同じ手順で内製化できます。</Advice>
      </Card>

      <Card title={`第${term.termNo}期の年間カレンダー`} icon={<CalendarPlus className="h-4 w-4 text-primary-600" />}>
        <ul className="divide-y divide-slate-100">
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-3 py-2 text-xs">
              <span className="w-24 shrink-0 font-medium text-slate-500">{toIso(e.date)}</span>
              <span className="text-slate-800">{e.title}</span>
            </li>
          ))}
        </ul>
        <button onClick={exportIcs}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700">
          <Download className="h-3.5 w-3.5" /> カレンダーに書き出す（.ics・7日前に通知）
        </button>
        <p className="mt-2 text-[11px] text-slate-400">Googleカレンダー・Outlook・iPhoneカレンダーに取り込めます。祝日・自治体の独自期限は反映していません。</p>
      </Card>
    </div>
  );
}