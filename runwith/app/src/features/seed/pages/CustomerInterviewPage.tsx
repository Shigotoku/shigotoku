import { useState } from "react";
import {
  MessageSquare, ClipboardList, Target, Lightbulb,
  CheckCircle2, Circle, Zap, Users,
} from "lucide-react";

const phases = [
  {
    id: "prepare",
    title: "1. インタビューを準備する",
    items: [
      "インタビュー対象者を5〜10名リストアップ",
      "質問リストを作成（10問程度）",
      "録音・メモの準備（許可を取ること）",
      "所要時間30〜45分と伝えてアポイント設定",
    ],
  },
  {
    id: "execute",
    title: "2. インタビューを実施する",
    items: [
      "オープンな質問から始める（「最近どんなことに困っていますか？」）",
      "「なぜ？」を5回繰り返して深掘りする",
      "ソリューションを売り込まない（聞くことに集中）",
      "具体的なエピソードを引き出す（「最後にXXしたのはいつですか？」）",
    ],
  },
  {
    id: "analyze",
    title: "3. 結果を分析する",
    items: [
      "インタビュー結果をスプレッドシートに整理",
      "共通するペインポイントを抽出（3つ以上で有意）",
      "想定と異なる発見を特に重視する",
      "次のアクション（機能追加、ピボット等）を決定",
    ],
  },
];

const questionTemplates = [
  {
    category: "課題の深掘り",
    questions: [
      "現在、XXに関して一番困っていることは何ですか？",
      "その課題を解決するために、今はどうしていますか？",
      "その方法の不満な点はどこですか？",
      "理想的な解決策はどのようなものですか？",
    ],
  },
  {
    category: "行動パターン",
    questions: [
      "普段、XXをする頻度はどのくらいですか？",
      "最後にXXで困ったエピソードを教えてください",
      "その問題を解決するために、いくらまでなら払いますか？",
      "どのようなツールやサービスを使っていますか？",
    ],
  },
  {
    category: "製品フィードバック",
    questions: [
      "このプロダクトの第一印象はどうですか？",
      "最も役立ちそうな機能はどれですか？",
      "逆に不要だと感じる機能はありますか？",
      "友人や同僚に勧めたいと思いますか？その理由は？",
    ],
  },
];

const prompts = [
  {
    label: "インタビュー質問リストの生成",
    prompt: `以下の情報をもとに、顧客インタビューの質問リストを作成してください。

【製品/サービス概要】（ここに記入）
【インタビュー対象者】（ここに記入）
【検証したい仮説】（ここに記入）

以下の形式で出力してください：
1. アイスブレイク質問（2問）
2. 課題に関する質問（5問）
3. 現在の解決策に関する質問（3問）
4. 製品に関する質問（3問）
5. クロージング質問（2問）

各質問には「この質問で何を検証するか」も併記してください。`,
  },
];

export default function CustomerInterviewPage() {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">顧客インタビュー</h1>
        <p className="mt-1 text-slate-500">
          顧客の声を直接聞き、プロダクトの改善ポイントとPMFへの道筋を見つけましょう。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          インタビューの進め方
        </h2>
        <div className="space-y-4">
          {phases.map((phase) => {
            const done = completed.has(phase.id);
            return (
              <div key={phase.id} className={`rounded-xl border p-4 transition-all ${done ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(phase.id)} className="mt-0.5 shrink-0">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{phase.title}</h3>
                    <ul className="mt-2 space-y-1.5">
                      {phase.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <MessageSquare className="h-5 w-5 text-primary-600" />
          質問テンプレート
        </h2>
        <div className="space-y-4">
          {questionTemplates.map((cat) => (
            <div key={cat.category} className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">{cat.category}</h3>
              <ul className="space-y-1.5">
                {cat.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-1 shrink-0 text-primary-500">Q{i + 1}.</span>{q}
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
