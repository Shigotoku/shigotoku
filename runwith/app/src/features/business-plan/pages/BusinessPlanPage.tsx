import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText, ArrowRight, Download, Zap,
  CheckCircle2, Circle, Lightbulb, BarChart3,
} from "lucide-react";

const sections = [
  {
    id: "summary",
    title: "1. エグゼクティブサマリー",
    description: "事業全体の要約（1〜2ページ）",
    tips: ["最後に書くが、一番最初に読まれる部分", "課題→解決策→市場→収益モデル→チームを簡潔に"],
  },
  {
    id: "problem",
    title: "2. 課題と解決策",
    description: "ターゲット顧客が抱える課題と、それに対するソリューション",
    tips: ["具体的なデータや事例で課題の深刻さを示す", "解決策のユニークさ（差別化ポイント）を明確に"],
  },
  {
    id: "market",
    title: "3. 市場分析",
    description: "TAM/SAM/SOMと市場トレンド",
    tips: ["トップダウンとボトムアップの両方で算出", "市場の成長率と参入タイミングの根拠"],
    link: { path: "/journey/market-size", label: "市場規模算定ツールを使う" },
  },
  {
    id: "business-model",
    title: "4. ビジネスモデル",
    description: "収益モデル、価格戦略、顧客獲得戦略",
    tips: ["ユニットエコノミクス（LTV/CAC）を示す", "スケーラビリティを説明する"],
    link: { path: "/journey/bmc", label: "ビジネスモデルキャンバスを使う" },
  },
  {
    id: "financial",
    title: "5. 財務計画",
    description: "3〜5年間の収支予測、資金計画",
    tips: ["保守的・標準・楽観の3パターンを用意", "月次レベルの詳細な計画（最初の1年）"],
    link: { path: "/simulator", label: "事業シミュレーションを使う" },
  },
  {
    id: "team",
    title: "6. チーム",
    description: "経営メンバーの経歴と強み",
    tips: ["なぜこのチームが適任かを示す", "不足しているスキルと採用計画も記載"],
  },
  {
    id: "milestone",
    title: "7. マイルストーン",
    description: "今後12〜18ヶ月の主要な目標と達成時期",
    tips: ["具体的で測定可能な目標を設定", "資金調達後の使途と紐づける"],
  },
];

const prompts = [
  {
    label: "事業計画書のドラフト作成",
    prompt: `以下の情報をもとに、投資家向け事業計画書のドラフトを作成してください。

【事業名】（ここに記入）
【事業概要】（ここに記入）
【ターゲット顧客】（ここに記入）
【収益モデル】（ここに記入）
【市場規模（概算）】（ここに記入）
【チーム構成】（ここに記入）
【調達希望額】（ここに記入）

以下のセクションを含めてください：
1. エグゼクティブサマリー
2. 課題と解決策
3. 市場分析
4. ビジネスモデルと収益計画
5. 競合優位性
6. チーム紹介
7. 財務予測（3年間）
8. 資金使途
9. マイルストーン`,
  },
];

export default function BusinessPlanPage() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyPrompt = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const doneCount = completed.size;
  const totalCount = sections.length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">事業計画書</h1>
          <p className="mt-1 text-slate-500">
            投資家や金融機関向けの事業計画書を作成しましょう。
          </p>
        </div>
        <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-700">
          {doneCount}/{totalCount}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <FileText className="h-5 w-5 text-primary-600" />
          事業計画書の構成
        </h2>
        <div className="space-y-3">
          {sections.map((sec) => {
            const done = completed.has(sec.id);
            return (
              <div key={sec.id} className={`rounded-xl border p-4 transition-all ${done ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(sec.id)} className="mt-0.5 shrink-0">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                  </button>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{sec.description}</p>
                    <div className="mt-2 space-y-1">
                      {sec.tips.map((tip, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />{tip}
                        </p>
                      ))}
                    </div>
                    {"link" in sec && sec.link && (
                      <Link to={sec.link.path}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-[11px] font-medium text-primary-700 hover:bg-primary-100">
                        {sec.link.label} <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Zap className="h-5 w-5 text-amber-500" />
          AIプロンプトテンプレート
        </h2>
        <div className="space-y-4">
          {prompts.map((p, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{p.label}</h3>
                <button onClick={() => copyPrompt(p.prompt, idx)}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                  {copiedIdx === idx ? "コピーしました！" : "コピー"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{p.prompt}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
