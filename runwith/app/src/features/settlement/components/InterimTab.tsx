import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import {
  INTERIM_KEYS, INTERIM_LABELS, interimFromPrev, interimProvisional, sumAmounts,
  type InterimAmounts, type InterimKey,
} from "../lib/taxEngine";
import { addDays, fmt, shiftWeekend, twoMonthsAfterEnd, yen } from "../lib/dates";
import { Advice, Card, NumField, type Ctx } from "./ui";

export default function InterimTab({ ctx }: { ctx: Ctx }) {
  const { state, term, patchTerm, prev, start, months, capital, today } = ctx;

  const sixEnd = addDays(new Date(start.getFullYear(), start.getMonth() + 6, start.getDate()), -1);
  const deadline = shiftWeekend(twoMonthsAfterEnd(sixEnd));
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / 86400000);
  const applicable = months > 6 && !!prev;

  const byPrev = useMemo(() => (prev ? interimFromPrev(prev) : null), [prev]);
  const prov = useMemo<InterimAmounts | null>(
    () => (term.firstHalfProfit !== 0 || term.carryLoss > 0
      ? interimProvisional(term.firstHalfProfit, term.carryLoss, capital, state.rates)
      : null),
    [term.firstHalfProfit, term.carryLoss, capital, state.rates],
  );

  const prevTotal = byPrev ? sumAmounts(byPrev.amounts) : 0;
  const provTotal = prov && byPrev
    ? INTERIM_KEYS.reduce((s, k) => s + (byPrev.required[k] ? prov[k] : 0), 0)
    : null;
  const recommendProv = provTotal !== null && provTotal < prevTotal;

  const paidTotal = sumAmounts(term.interimPaid);

  const apply = (kind: "prev" | "prov") => {
    if (!byPrev) return;
    const next = {} as InterimAmounts;
    for (const k of INTERIM_KEYS) {
      next[k] = !byPrev.required[k] ? 0 : kind === "prov" && prov ? prov[k] : byPrev.amounts[k];
    }
    patchTerm({ interimPaid: next });
  };

  return (
    <div className="space-y-6">
      <Card title="中間申告（予定申告）の判定" icon={<CalendarClock className="h-4 w-4 text-primary-600" />}>
        {!prev && (
          <Advice kind="info">
            前期の税額データがありません。第1期、または前期データ未入力の場合は、下の「前期の確定税額」を入力すると中間申告の要否を判定できます。
            前期が本アプリに入力済みなら自動で参照されます。
          </Advice>
        )}
        {months <= 6 && <Advice kind="info">事業年度が6か月以下のため、中間申告は不要です。</Advice>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-4 text-sm">
          <div>
            <p className="text-[11px] text-slate-500">中間申告・納付期限（開始から6か月経過後2か月以内）</p>
            <p className="font-bold text-slate-900">{fmt(deadline)}</p>
          </div>
          <p className="text-xs text-slate-500">{daysLeft >= 0 ? `あと${daysLeft}日` : `${-daysLeft}日経過`}</p>
        </div>

        {applicable && byPrev && (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3">税目</th>
                    <th className="pr-3 text-right">前期実績による納付額</th>
                    <th className="pr-3 text-right">仮決算による納付額</th>
                    <th className="text-right">要否</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {INTERIM_KEYS.map((k: InterimKey) => (
                    <tr key={k} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{INTERIM_LABELS[k]}</td>
                      <td className="pr-3 text-right tabular-nums">{yen(byPrev.amounts[k])}</td>
                      <td className="pr-3 text-right tabular-nums">{prov ? yen(byPrev.required[k] ? prov[k] : 0) : "—"}</td>
                      <td className="text-right">
                        {byPrev.required[k]
                          ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">必要</span>
                          : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">不要（10万円以下）</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold text-slate-900">
                    <td className="py-2 pr-3">合計</td>
                    <td className="pr-3 text-right tabular-nums">{yen(prevTotal)}</td>
                    <td className="pr-3 text-right tabular-nums">{provTotal === null ? "—" : yen(provTotal)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            {prevTotal === 0 && <Advice kind="tip">前期の税額が小さいため、今期は中間申告・中間納付は不要の見込みです。</Advice>}
            {recommendProv && (
              <Advice kind="tip">
                仮決算の方が {yen(prevTotal - (provTotal ?? 0))} 少なくなります。資金繰りが厳しい場合は仮決算による中間申告が有利です（申告書の作成は必要）。
              </Advice>
            )}
            {provTotal !== null && !recommendProv && prevTotal > 0 && (
              <Advice kind="info">前期実績による納付の方が手間が少なく、金額も同等以下です（予定申告書は納付書で足りるケースが多い）。</Advice>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <NumField label="期首〜6か月の所得見込（円）" value={term.firstHalfProfit}
                onChange={(n) => patchTerm({ firstHalfProfit: n })} hint="仮決算用。上期の税引前利益を入力" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => apply("prev")}
                className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700">
                前期実績の金額を納付済みとして記録
              </button>
              {prov && (
                <button onClick={() => apply("prov")}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200">
                  仮決算の金額を納付済みとして記録
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              記録した金額は「税額計算」の中間納付済み額として確定申告で差し引かれます（現在の記録合計：{yen(paidTotal)}）。実際の納付額は納付書・申告控えの金額に合わせて修正してください。
            </p>
          </>
        )}

        <Advice kind="warn">
          判定は「前期税額 × 6 ÷ 前期月数」が10万円を超えるかで簡易判定した目安です。地方税（事業税・住民税）の予定申告要件・均等割の予定納付、自治体ごとの取扱いは申告前に確認してください。
        </Advice>
      </Card>

      {!ctx.term.startDate ? null : (
        <Card title="前期の確定税額（前期データが本アプリにない場合に入力）">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumField label="前期の月数" value={term.prevManual.months} step={1}
              onChange={(n) => patchTerm({ prevManual: { ...term.prevManual, months: Math.min(Math.max(n, 1), 12) } })} />
            {INTERIM_KEYS.map((k) => (
              <NumField key={k} label={`${INTERIM_LABELS[k]}（円）`} value={term.prevManual[k]}
                onChange={(n) => patchTerm({ prevManual: { ...term.prevManual, [k]: n } })} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">前期が本アプリに入力されている場合は、こちらの入力より前期データが優先されます。</p>
        </Card>
      )}
    </div>
  );
}
