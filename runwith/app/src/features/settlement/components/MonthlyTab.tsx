import { useMemo, useState } from "react";
import { Bot, CheckCircle2, Circle, Copy, Check } from "lucide-react";
import { AI_PROMPTS, MONTHLY_TASKS } from "../lib/content";
import { monthKeys, pad } from "../lib/dates";
import { Advice, Card, type Ctx } from "./ui";

export default function MonthlyTab({ ctx, toggleMonthly }: { ctx: Ctx; toggleMonthly: (month: string, id: string) => void }) {
  const { term, start, end, company, today } = ctx;
  const keys = useMemo(() => monthKeys(start, end), [start, end]);
  const nowKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const [month, setMonth] = useState(keys.includes(nowKey) ? nowKey : keys[keys.length - 1]);
  const [promptId, setPromptId] = useState("journal");
  const [copied, setCopied] = useState(false);

  const checks = term.monthly[month] ?? {};
  const doneCount = (k: string) => MONTHLY_TASKS.filter((t) => term.monthly[k]?.[t.id]).length;
  const prompt = AI_PROMPTS.find((p) => p.id === promptId) ?? AI_PROMPTS[0];
  const text = prompt.build({
    company: company?.name ?? "（会社名）",
    industry: company?.industry ?? "",
    period: `${ctx.term.startDate}〜${ctx.term.endDate}`,
    month: month.replace("-", "年") + "月",
    termNo: term.termNo,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard不可の環境では手動コピー */ }
  };

  return (
    <div className="space-y-6">
      <Advice kind="tip">
        毎月の作業を「自動化できるもの（会計ソフトの自動仕訳・OCR）」「AIにチェックさせるもの」「人が判断するもの」に分けると、月1時間程度の確認で回せるようになります。
        月次を整えておけば、決算期の作業は最終確認だけになり、外注せずに内製化しやすくなります。
      </Advice>

      <Card title="月次ルーティン">
        <div className="mb-4 flex flex-wrap gap-1.5">
          {keys.map((k) => {
            const n = doneCount(k);
            const full = n === MONTHLY_TASKS.length;
            return (
              <button key={k} onClick={() => setMonth(k)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                  month === k ? "border-primary-400 bg-primary-50 text-primary-700"
                    : full ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:border-primary-200"}`}>
                {k.slice(5).replace(/^0/, "")}月 <span className="text-[10px] opacity-70">{n}/{MONTHLY_TASKS.length}</span>
              </button>
            );
          })}
        </div>
        <ul className="space-y-2">
          {MONTHLY_TASKS.map((t) => (
            <li key={t.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
              <button onClick={() => toggleMonthly(month, t.id)} className="mt-0.5 shrink-0">
                {checks[t.id] ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${checks[t.id] ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.label}</p>
                <p className="text-[11px] text-slate-500">{t.note}</p>
              </div>
              {t.ai && (
                <button onClick={() => setPromptId(t.ai!)}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100">
                  <Bot className="h-3.5 w-3.5" /> AIで確認
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="AIに任せるプロンプト集（ChatGPT / Claude / Gemini などに貼り付け）" icon={<Bot className="h-4 w-4 text-violet-600" />}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {AI_PROMPTS.map((p) => (
            <button key={p.id} onClick={() => setPromptId(p.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
                promptId === p.id ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:border-violet-200"}`}>
              {p.title}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] text-slate-500">使うタイミング：{prompt.when}（会社名・期間・対象月は自動で入力されています）</p>
        <textarea readOnly value={text} rows={14}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700" />
        <button onClick={copy}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "コピーしました" : "プロンプトをコピー"}
        </button>
        <Advice kind="danger">
          マイナンバー・口座番号・個人名などはマスクしてから貼り付けてください。AIの回答は税務・会計の最終判断ではありません。数字と根拠は必ず会計ソフト・公式情報で確認し、重要な論点は税理士にスポット相談しましょう。
        </Advice>
        <p className="mt-3 text-[11px] text-slate-500">
          推奨フロー：①銀行・カード連携で自動仕訳 → ②例外のみAIにチェックさせる → ③人が承認して月次を締める。会計ソフトのAI自動仕訳・AI-OCR機能も併用すると、手入力はほぼ不要になります。
        </p>
      </Card>
    </div>
  );
}
