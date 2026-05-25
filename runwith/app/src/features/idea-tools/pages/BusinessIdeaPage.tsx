import { useState } from "react";
import {
  Save, Lightbulb, Target, Users, Zap,
  TrendingUp, AlertTriangle, Check, Trash2, Plus,
  Bot, Copy, ExternalLink, BookOpen, PenTool,
} from "lucide-react";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

const STORAGE_KEY = "runwith-business-idea";

interface IdeaData {
  problem: string;
  solution: string;
  targetCustomer: string;
  valueProposition: string;
  uniqueAdvantage: string;
  revenue: string;
  risks: string[];
  assumptions: string[];
}

const emptyIdea: IdeaData = {
  problem: "", solution: "", targetCustomer: "",
  valueProposition: "", uniqueAdvantage: "", revenue: "",
  risks: [], assumptions: [],
};

export default function BusinessIdeaPage() {
  const [idea, setIdea] = useCompanyStorageState(STORAGE_KEY, emptyIdea);
  const [saved, setSaved] = useState(false);
  const [newRisk, setNewRisk] = useState("");
  const [newAssumption, setNewAssumption] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [tab, setTab] = useState<"input" | "guide">("input");

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const addRisk = () => { if (!newRisk.trim()) return; setIdea(p => ({ ...p, risks: [...p.risks, newRisk.trim()] })); setNewRisk(""); };
  const addAssumption = () => { if (!newAssumption.trim()) return; setIdea(p => ({ ...p, assumptions: [...p.assumptions, newAssumption.trim()] })); setNewAssumption(""); };

  const fields: { key: keyof IdeaData; label: string; icon: typeof Lightbulb; placeholder: string; hint: string }[] = [
    { key: "problem", label: "解決したい課題", icon: AlertTriangle, placeholder: "例：中小企業の経理担当者が月末の請求書処理に1週間もかかっている", hint: "顧客が本当に困っていることは何ですか？具体的な数字を添えると説得力が増します。" },
    { key: "solution", label: "提供するソリューション", icon: Lightbulb, placeholder: "例：AIで請求書を自動読み取り・仕訳するクラウド経理ツール", hint: "課題をどのように解決しますか？技術やアプローチを簡潔に。" },
    { key: "targetCustomer", label: "ターゲット顧客", icon: Users, placeholder: "例：従業員10〜50名の中小企業の経理部門", hint: "最初に狙う顧客セグメントを具体的に。全員に売ろうとしないことが重要。" },
    { key: "valueProposition", label: "提供価値（バリュープロポジション）", icon: Zap, placeholder: "例：請求書処理時間を80%削減し、月末の残業をゼロにする", hint: "顧客にとっての価値を定量的に表現できると最高です。" },
    { key: "uniqueAdvantage", label: "競合優位性", icon: Target, placeholder: "例：日本の商慣習に特化したAIモデルを自社開発済み", hint: "競合がすぐには真似できない強みは何ですか？" },
    { key: "revenue", label: "収益モデル", icon: TrendingUp, placeholder: "例：月額SaaS（1ユーザー5,000円/月）+ 初期導入費", hint: "どのようにお金を稼ぎますか？価格帯の目安も。" },
  ];

  const prompt = `あなたはスタートアップのメンターです。以下のビジネスアイデアを分析し、それぞれの項目ごとに具体的なフィードバックをください。

## 現在のビジネスアイデア

**解決したい課題：** ${idea.problem || "（未入力）"}
**提供するソリューション：** ${idea.solution || "（未入力）"}
**ターゲット顧客：** ${idea.targetCustomer || "（未入力）"}
**提供価値：** ${idea.valueProposition || "（未入力）"}
**競合優位性：** ${idea.uniqueAdvantage || "（未入力）"}
**収益モデル：** ${idea.revenue || "（未入力）"}
${idea.risks.length > 0 ? `**想定リスク：**\n${idea.risks.map(r => `- ${r}`).join("\n")}` : ""}
${idea.assumptions.length > 0 ? `**前提条件：**\n${idea.assumptions.map(a => `- ${a}`).join("\n")}` : ""}

## フィードバック依頼
上記の各項目について以下の観点で分析してください：
1. **課題の深さ**: 顧客が対価を払う課題か？深掘りすべき点は？
2. **ソリューションの妥当性**: 課題に対して適切か？よりシンプルな方法は？
3. **ターゲットの明確さ**: セグメントは十分に絞れているか？
4. **価値提案の強さ**: 「今すぐ欲しい」レベルか？定量的に示せるか？
5. **競合優位性の持続性**: 競合が真似しにくいモート（堀）はあるか？
6. **収益モデルの実現性**: 顧客はこの金額を払うか？
7. **全体の一貫性**: 各要素が矛盾なくつながっているか？
8. **見落とし**: 他に考慮すべきリスクや前提条件は？

各項目ごとに「良い点」「改善点」「具体的なアクション案」を分けて回答してください。`;
  const hasContent = idea.problem || idea.solution || idea.targetCustomer;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ビジネスアイデア整理ツール</h1>
        <p className="mt-1 text-sm text-slate-500">リーンキャンバスの考え方で、アイデアを構造化します。</p>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button onClick={() => setTab("input")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "input" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <PenTool className="h-4 w-4" /> 入力する
        </button>
        <button onClick={() => setTab("guide")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "guide" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <BookOpen className="h-4 w-4" /> 解説を読む
        </button>
      </div>

      {tab === "guide" ? (
        /* ===== 解説タブ ===== */
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-amber-900">
              <Lightbulb className="h-5 w-5" /> ビジネスアイデアの整理とは？
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-amber-800">「いいアイデアがある！」だけでは事業は始められません。投資家・チームメンバー・顧客の誰に対しても、<strong>「誰の」「どんな困りごとを」「どう解決するか」</strong>をクリアに言えることが最初の一歩です。</p>
            <img src="/images/lean-canvas-framework.png" alt="リーンキャンバスフレームワーク" className="w-full rounded-xl border border-amber-200" />
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-6">
            <h3 className="mb-4 text-base font-bold text-amber-900">リーンキャンバスとは？</h3>
            <p className="mb-3 text-sm leading-relaxed text-slate-700">アッシュ・マウリャが開発した、<strong>スタートアップ向けの仮説検証フレームワーク</strong>です。ビジネスモデルキャンバスをスタートアップ向けに改良し、「課題」と「ソリューション」に焦点を当てています。</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { num: "①", title: "課題（Problem）", desc: "顧客が直面する上位3つの課題を特定" },
                { num: "②", title: "顧客セグメント", desc: "ターゲット層を具体的に1つに絞る" },
                { num: "③", title: "独自の価値提案（UVP）", desc: "競合にない「使いたくなる理由」" },
                { num: "④", title: "ソリューション", desc: "課題を解決する機能・サービス" },
                { num: "⑤", title: "チャネル", desc: "顧客に届ける方法（SNS、広告等）" },
                { num: "⑥", title: "収益の流れ", desc: "課金モデル・価格設定" },
                { num: "⑦", title: "コスト構造", desc: "固定費・変動費の洗い出し" },
                { num: "⑧", title: "主要指標（KPI）", desc: "成功を測る数字（DAU、MRR等）" },
                { num: "⑨", title: "圧倒的優位性", desc: "コピーできない強み（特許、ネットワーク効果等）" },
              ].map(item => (
                <div key={item.num} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <span className="text-xs font-bold text-amber-600">{item.num}</span>
                  <p className="text-xs font-bold text-slate-800">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-3xl font-bold text-red-500">42%</p>
              <p className="mt-1 text-xs text-slate-600">スタートアップ失敗原因No.1は<strong>「市場ニーズがなかった」</strong>（CB Insights調べ）</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-3xl font-bold text-amber-500">30秒</p>
              <p className="mt-1 text-xs text-slate-600">エレベーターピッチ（30秒で説明）<strong>できないアイデアは磨き不足</strong>のサイン</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-3xl font-bold text-emerald-500">3要素</p>
              <p className="mt-1 text-xs text-slate-600">成功するスタートアップが必ず持つ：<strong>課題・解決策・対価を払う顧客</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-white p-5">
              <p className="mb-3 text-sm font-bold text-amber-800">整理のコツ</p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" /><strong>「困っている人」から始める</strong> — 「作りたいもの」起点だと市場ニーズとズレがち</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" /><strong>数字で語る</strong> — 「多い」→「70%の担当者が」のように定量化</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" /><strong>1文で説明できるか？</strong> — できない = まだ絞り込み不足</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" /><strong>完璧を求めない</strong> — 仮説 → 検証 → 修正のサイクルが大事</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" /><strong>N1に聞く</strong> — 実際の見込み顧客5〜10人にインタビュー</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-red-200 bg-white p-5">
              <p className="mb-3 text-sm font-bold text-red-800">よくある失敗パターン</p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2"><span className="mt-1 text-red-400 font-bold">✕</span><strong>「全員が使える」</strong> → 誰にも刺さらない。まず1セグメントに集中</li>
                <li className="flex items-start gap-2"><span className="mt-1 text-red-400 font-bold">✕</span><strong>「技術がすごい」</strong> → 顧客課題が見えない。技術は手段であり目的ではない</li>
                <li className="flex items-start gap-2"><span className="mt-1 text-red-400 font-bold">✕</span><strong>「競合がいない」</strong> → 市場がないかも。競合がいるのは市場がある証拠</li>
                <li className="flex items-start gap-2"><span className="mt-1 text-red-400 font-bold">✕</span><strong>「市場の1%取れば」</strong> → 投資家が最も嫌う表現。ボトムアップで積み上げる</li>
                <li className="flex items-start gap-2"><span className="mt-1 text-emerald-500 font-bold">○</span><strong>「中小企業の経理担当の請求書処理を80%自動化する」</strong></li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="mb-2 text-sm font-bold text-blue-800">リーンキャンバス vs ビジネスモデルキャンバス</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-bold text-amber-700">リーンキャンバス</p>
                <p className="mt-1 text-[11px] text-slate-600">スタートアップの<strong>初期仮説検証</strong>に特化。「課題」「ソリューション」「主要指標」がある。個人起業家・アーリーステージ向き。</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-bold text-indigo-700">ビジネスモデルキャンバス</p>
                <p className="mt-1 text-[11px] text-slate-600"><strong>既存事業の構造化</strong>に適している。「パートナー」「リソース」がある。成長期以降や大企業の新規事業向き。</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== 入力タブ ===== */
        <div className="space-y-6">
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.key} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <f.icon className="h-4 w-4 text-primary-600" />
                  <h3 className="text-sm font-bold text-slate-800">{f.label}</h3>
                </div>
                <p className="mb-3 text-xs text-slate-400">{f.hint}</p>
                <textarea rows={3} placeholder={f.placeholder} value={idea[f.key] as string} onChange={e => setIdea(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">想定リスク</h3>
              <div className="space-y-2">
                {idea.risks.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="h-3 w-3 shrink-0" /><span className="flex-1">{r}</span>
                    <button onClick={() => setIdea(p => ({ ...p, risks: p.risks.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input placeholder="リスクを追加..." value={newRisk} onChange={e => setNewRisk(e.target.value)} onKeyDown={e => e.key === "Enter" && addRisk()} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200" />
                <button onClick={addRisk} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">検証すべき前提条件</h3>
              <div className="space-y-2">
                {idea.assumptions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <Target className="h-3 w-3 shrink-0" /><span className="flex-1">{a}</span>
                    <button onClick={() => setIdea(p => ({ ...p, assumptions: p.assumptions.filter((_, j) => j !== i) }))} className="text-blue-400 hover:text-blue-600"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input placeholder="前提条件を追加..." value={newAssumption} onChange={e => setNewAssumption(e.target.value)} onKeyDown={e => e.key === "Enter" && addAssumption()} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200" />
                <button onClick={addAssumption} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "保存しました！" : "保存する"}
            </button>
          </div>

          {/* AI壁打ち */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900"><Bot className="h-5 w-5" /> AIで壁打ちする</h3>
              <button onClick={() => setShowPrompt(!showPrompt)} className="text-xs font-medium text-violet-600 hover:text-violet-800">{showPrompt ? "閉じる" : "プロンプトを表示"}</button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-violet-700">入力内容をもとにAI壁打ち用プロンプトを自動生成。コピーして貼り付けると<strong>各項目ごとに具体的なフィードバック</strong>が返ってきます。</p>
            {showPrompt && <pre className="mb-4 max-h-64 overflow-auto rounded-xl border border-violet-200 bg-white p-4 text-xs leading-relaxed text-slate-700">{prompt}</pre>}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { navigator.clipboard.writeText(prompt); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }} disabled={!hasContent}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${hasContent ? promptCopied ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}>
                {promptCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {promptCopied ? "コピーしました！" : "プロンプトをコピー"}
              </button>
              <a href="https://chat.openai.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50">ChatGPTを開く <ExternalLink className="h-3.5 w-3.5" /></a>
              <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50">Claudeを開く <ExternalLink className="h-3.5 w-3.5" /></a>
              <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50">Geminiを開く <ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
            {!hasContent && <p className="mt-2 text-[11px] text-violet-400">※ 上のフォームに内容を入力するとプロンプトが生成されます</p>}
          </div>
        </div>
      )}
    </div>
  );
}
