import { useState } from "react";
import {
  Rocket, Code, Paintbrush, TestTubes, Users, ArrowRight,
  CheckCircle2, Circle, Lightbulb, Zap, ExternalLink,
} from "lucide-react";

const steps = [
  {
    id: "define",
    title: "1. コア機能を定義する",
    description: "ユーザーの最も大きな課題を解決する最小限の機能セットを決定",
    tips: [
      "「あったら嬉しい」ではなく「なければ使えない」機能に絞る",
      "1つの課題に対して1つの解決策で十分",
      "ユーザーストーリーマッピングで優先順位を決定",
    ],
  },
  {
    id: "prototype",
    title: "2. プロトタイプを作成する",
    description: "ノーコード/ローコードツールで素早くプロトタイプを構築",
    tips: [
      "Figmaでモックアップ → ユーザーテストの順で進める",
      "ノーコードツール（Bubble, Adalo等）での実装も検討",
      "完璧を求めず、動くものを最優先に",
    ],
    tools: [
      { name: "Figma", url: "https://www.figma.com/" },
      { name: "Bubble", url: "https://bubble.io/" },
      { name: "Vercel", url: "https://vercel.com/" },
    ],
  },
  {
    id: "test",
    title: "3. ユーザーテストを実施する",
    description: "ターゲットユーザーに実際に使ってもらいフィードバックを収集",
    tips: [
      "最低5人のターゲットユーザーでテスト",
      "観察（行動）とインタビュー（感想）の両方を実施",
      "定量データ（完了率、時間）と定性データ（感想）を収集",
    ],
  },
  {
    id: "iterate",
    title: "4. フィードバックを反映して改善",
    description: "テスト結果をもとにMVPを改善し、PMFを目指す",
    tips: [
      "全てのフィードバックに対応しない（優先度をつける）",
      "Build → Measure → Learn のサイクルを2週間単位で回す",
      "リテンション率（継続利用率）をPMFの指標にする",
    ],
  },
];

const prompts = [
  {
    label: "MVPの機能要件定義",
    prompt: `以下のビジネスアイデアに基づいて、MVP（最小限の実用的な製品）の機能要件を整理してください。

【事業概要】（ここに記入）
【ターゲットユーザー】（ここに記入）
【解決する課題】（ここに記入）

以下の形式で出力してください：
1. Must-have（必須機能）：3つまで
2. Should-have（あると望ましい機能）：3つまで
3. Nice-to-have（将来的に追加する機能）：制限なし
4. 推奨する開発アプローチ（ノーコード / ローコード / フルスクラッチ）
5. 想定開発期間`,
  },
];

export default function MvpPage() {
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
        <h1 className="text-2xl font-bold text-slate-900">MVP / プロトタイプ開発</h1>
        <p className="mt-1 text-slate-500">
          最小限の実用的な製品（MVP）を素早く開発し、市場で検証しましょう。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Rocket className="h-5 w-5 text-primary-600" />
          MVP開発ステップ
        </h2>
        <div className="space-y-4">
          {steps.map((step) => {
            const done = completed.has(step.id);
            return (
              <div key={step.id} className={`rounded-xl border p-4 transition-all ${done ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(step.id)} className="mt-0.5 shrink-0">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                  </button>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
                    <div className="mt-2 space-y-1">
                      {step.tips.map((tip, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                          {tip}
                        </p>
                      ))}
                    </div>
                    {"tools" in step && step.tools && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {step.tools.map((tool) => (
                          <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-100">
                            {tool.name} <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
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
