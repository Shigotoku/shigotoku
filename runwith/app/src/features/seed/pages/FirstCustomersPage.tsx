import { useState } from "react";
import {
  Users, Target, MessageSquare, TrendingUp,
  CheckCircle2, Circle, Lightbulb, Zap, ArrowRight,
} from "lucide-react";

const strategies = [
  {
    id: "network",
    title: "1. 身近なネットワークから始める",
    description: "知人・友人・前職の繋がりから最初の顧客を獲得",
    tips: [
      "自分のSNSで「こういうサービスを作っている」と発信",
      "起業家コミュニティやイベントで直接アプローチ",
      "「友人価格」ではなく正規価格で提供（価値の検証のため）",
    ],
  },
  {
    id: "community",
    title: "2. コミュニティに参加する",
    description: "ターゲット顧客が集まるコミュニティで信頼を構築",
    tips: [
      "いきなり売り込まず、まず価値提供（情報共有、質問回答）",
      "Slack、Discord、Facebookグループ等を活用",
      "業界のミートアップやカンファレンスに参加",
    ],
  },
  {
    id: "outbound",
    title: "3. アウトバウンド営業を実施する",
    description: "ターゲット企業にダイレクトにアプローチ",
    tips: [
      "メール、LinkedIn DM、電話等で接触",
      "相手の課題に寄り添ったパーソナライズメッセージ",
      "1日10件以上のアプローチを目標に",
    ],
  },
  {
    id: "content",
    title: "4. コンテンツで集客する",
    description: "ブログ、SNS、動画で見込み客を惹きつける",
    tips: [
      "ターゲット顧客の「困りごと」を解決するコンテンツ",
      "X(Twitter)スレッドやnote記事で専門性をアピール",
      "ウェビナーやオンラインセミナーを開催",
    ],
  },
  {
    id: "pilot",
    title: "5. パイロットプログラムを提供する",
    description: "限定的なパイロット（試用）で実績と信頼を獲得",
    tips: [
      "無料トライアルではなく「パイロットプログラム」として提供",
      "期間と目標を明確に設定（例: 3ヶ月でXXを達成）",
      "成果が出たら事例として公開許可を取得",
    ],
  },
];

const prompts = [
  {
    label: "初期顧客獲得戦略の策定",
    prompt: `以下の情報をもとに、最初の10社の顧客を獲得するための戦略を立ててください。

【製品/サービス】（ここに記入）
【ターゲット顧客】（ここに記入）
【価格帯】（ここに記入）
【現在の状況】（ここに記入）

以下の観点で戦略を提案してください：
1. 最も効果的な顧客獲得チャネル（3つ）
2. 各チャネルでの具体的なアクションプラン
3. 最初の1ヶ月のKPI設定
4. 顧客との初回ミーティングで聞くべき質問リスト`,
  },
];

export default function FirstCustomersPage() {
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
        <h1 className="text-2xl font-bold text-slate-900">初期顧客の獲得</h1>
        <p className="mt-1 text-slate-500">
          最初の10社の顧客を獲得し、PMF（プロダクトマーケットフィット）を検証しましょう。
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">目標: 最初の10社</p>
            <p className="mt-1">
              最初の顧客は「プロダクトの改善パートナー」です。売上よりもフィードバックの質を重視し、
              深い関係を構築することを優先しましょう。
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Users className="h-5 w-5 text-primary-600" />
          顧客獲得戦略
        </h2>
        <div className="space-y-3">
          {strategies.map((s) => {
            const done = completed.has(s.id);
            return (
              <div key={s.id} className={`rounded-xl border p-4 transition-all ${done ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(s.id)} className="mt-0.5 shrink-0">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
                    <div className="mt-2 space-y-1">
                      {s.tips.map((tip, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />{tip}
                        </p>
                      ))}
                    </div>
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
