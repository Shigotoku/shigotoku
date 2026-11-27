import { useState } from "react";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, ExternalLink, Calculator, FileText, ShieldCheck,
} from "lucide-react";
import { ATTACHMENTS, PREP_ITEMS, STEPS } from "../lib/content";
import { addDays, fmtShort } from "../lib/dates";
import { Advice, Card, NumField, type Ctx } from "./ui";

export default function OverviewTab({ ctx, toggleDone }: { ctx: Ctx; toggleDone: (id: string) => void }) {
  const { state, patchRoot, term, patchTerm, capital, deadline, today, tax } = ctx;
  const [openStep, setOpenStep] = useState<string | null>("books");
  const first = term.termNo === 1;

  const consumption = (() => {
    if (first) {
      const t = capital >= 10_000_000 || state.invoice === "yes";
      return { taxable: t, msg: t
        ? `${capital >= 10_000_000 ? "資本金1,000万円以上のため" : "インボイス登録済みのため"}、第1期から消費税の申告・納付が必要になる可能性が高いです。`
        : "資本金1,000万円未満・インボイス未登録・課税事業者選択なしの設立初年度は、原則消費税が免除されます（届出状況を要確認）。" };
    }
    const t = term.baseSales > 10_000_000 || state.invoice === "yes";
    return { taxable: t, msg: t
      ? "基準期間の課税売上高が1,000万円超、またはインボイス登録済みのため、消費税の申告が必要です。簡易課税の届出有無も確認してください。"
      : "基準期間の課税売上高が1,000万円以下で、インボイス未登録なら免税の可能性があります（特定期間の判定も要確認）。" };
  })();

  return (
    <div className="space-y-6">
      <Card title="あなたの状況" icon={<Calculator className="h-4 w-4 text-primary-600" />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-slate-600">
            インボイス登録
            <select value={state.invoice} onChange={(e) => patchRoot({ invoice: e.target.value as typeof state.invoice })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="unknown">わからない</option>
              <option value="yes">登録している</option>
              <option value="no">登録していない</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            申告の進め方
            <select value={state.filing} onChange={(e) => patchRoot({ filing: e.target.value as typeof state.filing })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="self">自分で（会計ソフト＋e-Tax/eLTAX）</option>
              <option value="freee">会計ソフトの申告オプション</option>
              <option value="taxaccountant">税理士に依頼</option>
            </select>
          </label>
          {!first && (
            <NumField label="基準期間（2期前）の課税売上高（円）" value={term.baseSales}
              onChange={(n) => patchTerm({ baseSales: n })} hint="消費税の課税事業者判定に使用" />
          )}
        </div>
        {state.invoice === "unknown" && (
          <Advice kind="warn">インボイス登録の有無で消費税の扱いが変わります。届出控えまたは国税庁の公表サイトで確認してください。</Advice>
        )}
        <Advice kind={consumption.taxable ? "danger" : "info"}>{consumption.msg}</Advice>
        {tax.rawIncome < 0 && (
          <Advice kind="info">
            今期は欠損（{Math.abs(tax.rawIncome).toLocaleString()}円）の見込みです。青色申告の承認があれば翌期以降に繰り越せます（原則10年）。均等割は赤字でも発生します。
          </Advice>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">決算・申告スケジュール</h2>
        <p className="text-[11px] text-slate-500">日付は余裕を持って終えるための目安です（法定期限とは異なります）</p>
        {STEPS.map((step) => {
          const isOpen = openStep === step.id;
          const isDone = !!term.done[step.id];
          const target = addDays(deadline, step.offset);
          const late = !isDone && target < today && step.offset <= 0;
          return (
            <div key={step.id} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleDone(step.id)} className="shrink-0">
                  {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                </button>
                <button onClick={() => setOpenStep(isOpen ? null : step.id)} className="flex flex-1 items-center gap-3 text-left">
                  <div className="flex-1">
                    <h3 className={`text-sm font-bold ${isDone ? "text-slate-400 line-through" : "text-slate-900"}`}>{step.title}</h3>
                    <p className="text-xs text-slate-500">{step.summary}</p>
                  </div>
                  <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:block ${late ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                    目標 {fmtShort(target)}
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
              </div>
              {isOpen && (
                <div className="space-y-2 border-t border-slate-100 px-5 pb-5 pt-3">
                  <ul className="space-y-1.5">
                    {[...step.details, ...(first ? step.firstTerm ?? [] : [])].map((d, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />{d}
                      </li>
                    ))}
                  </ul>
                  {step.links && (
                    <div className="flex flex-wrap gap-2">
                      {step.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-100">
                          <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                  {step.tips?.map((t, i) => <Advice key={i} kind="tip">{t}</Advice>)}
                  {step.warnings?.map((w, i) => <Advice key={i} kind="danger">{w}</Advice>)}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="電子申告の準備（申告期限の1か月前までに）" icon={<ShieldCheck className="h-4 w-4 text-primary-600" />}>
          <Checklist items={PREP_ITEMS} done={term.done} onToggle={toggleDone} />
          <p className="mt-2 text-[11px] text-slate-400">一度準備すれば翌期以降も使い回せます（期をまたいで再チェックが必要なのは納付手段の確認程度）。</p>
        </Card>
        <Card title="提出・保管する書類" icon={<FileText className="h-4 w-4 text-primary-600" />}>
          <Checklist items={ATTACHMENTS} done={term.done} onToggle={toggleDone} />
        </Card>
      </div>

      <Card title="申告先と主な税金">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">申告先</th><th className="pr-3">主な税金</th><th>赤字の場合</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-100"><td className="py-2 pr-3">税務署</td><td className="pr-3">法人税・地方法人税</td><td>原則、税額0円でも申告が必要</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3">都道府県</td><td className="pr-3">事業税・特別法人事業税・県民税</td><td>均等割が発生</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2 pr-3">市区町村</td><td className="pr-3">法人市民税</td><td>均等割が発生</td></tr>
              <tr><td className="py-2 pr-3">税務署（該当時）</td><td className="pr-3">消費税・地方消費税</td><td>課税事業者かどうかで異なる</td></tr>
            </tbody>
          </table>
        </div>
        <Advice kind="tip">申告期限は原則「決算日から2か月以内」。法人税は事業年度終了後45日以内に申請すれば1か月延長できますが、納付期限は延びません（地方税は別途届出が必要）。</Advice>
      </Card>
    </div>
  );
}

function Checklist({ items, done, onToggle }: {
  items: { id: string; label: string }[]; done: Record<string, boolean>; onToggle: (id: string) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.id}>
          <button onClick={() => onToggle(it.id)} className="flex w-full items-start gap-2 text-left text-xs text-slate-700">
            {done[it.id] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
            <span className={done[it.id] ? "text-slate-400 line-through" : ""}>{it.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
