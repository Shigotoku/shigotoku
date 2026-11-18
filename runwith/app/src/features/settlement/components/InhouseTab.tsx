import { CheckCircle2, Circle, ExternalLink, Wallet, Gauge, FileText } from "lucide-react";
import { FREE_SYSTEMS, INHOUSE_QUESTIONS, SOFTWARE } from "../lib/content";
import { yen } from "../lib/dates";
import { Advice, Card, NumField, type Ctx } from "./ui";

export default function InhouseTab({ ctx }: { ctx: Ctx }) {
  const { state, patchRoot } = ctx;
  const answers = state.inhouse;
  const toggle = (id: string) => patchRoot({ inhouse: { ...answers, [id]: !answers[id] } });

  const score = INHOUSE_QUESTIONS.reduce((s, q) => s + (answers[q.id] ? q.weight : 0), 0)
    + (state.txPerMonth > 300 ? 3 : state.txPerMonth > 100 ? 1 : 0);

  const level = score <= 2
    ? { key: "self", label: "完全内製化でOK", color: "emerald", msg: "会計ソフト＋AI＋e-Tax/eLTAXで十分対応できる規模です。税理士は不要、迷ったときだけスポット相談を。" }
    : score <= 6
    ? { key: "spot", label: "内製化＋スポット相談", color: "amber", msg: "基本は内製化し、決算前の論点整理・申告書の最終確認だけ税理士にスポット依頼するのがコストと安心のバランスが良い構成です。" }
    : { key: "advisor", label: "税理士の顧問契約を検討", color: "red", msg: "専門的な判断が多く、ミスのコストが大きい状態です。顧問契約または決算申告のみ依頼を検討しましょう（日々の記帳は内製化して費用を抑える）。" };

  const softYear = 2980 * 12;
  const filingYear = 29800;
  const spotYear = 30000;
  const inhouseCost = softYear + filingYear + (level.key === "self" ? 0 : spotYear);
  const advisorYear = state.advisorMonthly * 12 + state.advisorSettlement;
  const saving = advisorYear - inhouseCost;

  return (
    <div className="space-y-6">
      <Card title="内製化チェック（当てはまるものを選択）" icon={<Gauge className="h-4 w-4 text-primary-600" />}>
        <ul className="space-y-2">
          {INHOUSE_QUESTIONS.map((q) => (
            <li key={q.id}>
              <button onClick={() => toggle(q.id)} className="flex w-full items-start gap-2 rounded-xl border border-slate-100 p-3 text-left hover:border-primary-200">
                {answers[q.id] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                <div>
                  <p className="text-xs font-medium text-slate-800">{q.label}</p>
                  <p className="text-[11px] text-slate-500">{q.hint}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 max-w-xs">
          <NumField label="月間の取引件数（目安）" value={state.txPerMonth} step={10} onChange={(n) => patchRoot({ txPerMonth: n })} />
        </div>
        <div className={`mt-4 rounded-xl border p-4 ${
          level.color === "emerald" ? "border-emerald-200 bg-emerald-50" : level.color === "amber" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
          <p className="text-sm font-bold text-slate-900">判定：{level.label}</p>
          <p className="mt-1 text-xs text-slate-600">{level.msg}</p>
        </div>
      </Card>

      <Card title="年間コストの比較（目安）" icon={<Wallet className="h-4 w-4 text-primary-600" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField label="税理士の月額顧問料（見積）" value={state.advisorMonthly} onChange={(n) => patchRoot({ advisorMonthly: n })} />
          <NumField label="税理士の決算申告料（見積）" value={state.advisorSettlement} onChange={(n) => patchRoot({ advisorSettlement: n })} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] text-slate-500">税理士に全面依頼</p>
            <p className="text-lg font-bold text-slate-900">{yen(advisorYear)}</p>
            <p className="text-[10px] text-slate-400">年額</p>
          </div>
          <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
            <p className="text-[11px] text-slate-500">内製化（会計ソフト＋申告オプション{level.key === "self" ? "" : "＋スポット相談"}）</p>
            <p className="text-lg font-bold text-primary-700">{yen(inhouseCost)}</p>
            <p className="text-[10px] text-slate-400">会計 月2,980円・申告 年29,800円・スポット 年3万円で試算</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-[11px] text-slate-500">年間の削減見込み</p>
            <p className="text-lg font-bold text-emerald-700">{yen(Math.max(saving, 0))}</p>
            <p className="text-[10px] text-slate-400">浮いた時間と費用を事業に投資</p>
          </div>
        </div>
        <Advice kind="tip">
          e-Tax・eLTAXの利用料は無料です。さらに削減するなら、申告書の作成も会計ソフト標準機能の範囲で行い、申告オプションを省く選択肢もあります（作成難度は上がります）。
        </Advice>
        <h3 className="mb-2 mt-5 text-xs font-bold text-slate-800">会計ソフトの目安（価格は変更される可能性があります）</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {SOFTWARE.map((s) => (
            <div key={s.name} className="rounded-xl border border-slate-200 p-3">
              <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
              <p className="text-[11px] font-medium text-primary-600">{s.price}</p>
              <p className="mt-1 text-[11px] text-slate-500">{s.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="活用できる政府・公的システム" icon={<FileText className="h-4 w-4 text-primary-600" />}>
        <div className="grid gap-2 sm:grid-cols-2">
          {FREE_SYSTEMS.map((f) => (
            <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 transition-all hover:border-primary-300 hover:shadow-sm">
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">{f.name}</h4>
                <p className="text-[11px] text-slate-500">{f.desc}</p>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          法人向けには、個人の確定申告のような国税庁の無料申告書作成コーナーはありません。申告書は会計ソフトで作成し、送信・納税を無料のe-Tax／eLTAXで行うのが低コストな基本形です。
        </p>
      </Card>
    </div>
  );
}
