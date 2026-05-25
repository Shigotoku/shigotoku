import { useState } from "react";
import { Save, Check, LayoutGrid, Info, Bot, Copy, ExternalLink, BookOpen, PenTool } from "lucide-react";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

const STORAGE_KEY = "runwith-bmc";

interface BmcData {
  keyPartners: string;
  keyActivities: string;
  keyResources: string;
  valuePropositions: string;
  customerRelationships: string;
  channels: string;
  customerSegments: string;
  costStructure: string;
  revenueStreams: string;
}

const emptyBmc: BmcData = {
  keyPartners: "", keyActivities: "", keyResources: "",
  valuePropositions: "", customerRelationships: "", channels: "",
  customerSegments: "", costStructure: "", revenueStreams: "",
};

const blocks: { key: keyof BmcData; label: string; hint: string; color: string }[] = [
  { key: "customerSegments", label: "顧客セグメント", hint: "誰に価値を提供するか？最も重要な顧客は？", color: "bg-blue-50 border-blue-200" },
  { key: "valuePropositions", label: "価値提案", hint: "顧客のどんな課題を解決するか？どんな価値を提供するか？", color: "bg-emerald-50 border-emerald-200" },
  { key: "channels", label: "チャネル", hint: "どうやって顧客にリーチするか？販売経路は？", color: "bg-violet-50 border-violet-200" },
  { key: "customerRelationships", label: "顧客との関係", hint: "顧客とどのような関係を構築・維持するか？", color: "bg-pink-50 border-pink-200" },
  { key: "revenueStreams", label: "収益の流れ", hint: "顧客はどのような価値にお金を払うか？", color: "bg-amber-50 border-amber-200" },
  { key: "keyResources", label: "主要リソース", hint: "価値提案に必要な資産（人材・技術・資金・IP）", color: "bg-sky-50 border-sky-200" },
  { key: "keyActivities", label: "主要活動", hint: "ビジネスモデルを実行するために必要な活動", color: "bg-orange-50 border-orange-200" },
  { key: "keyPartners", label: "主要パートナー", hint: "外部の協力者・提携先・サプライヤー", color: "bg-teal-50 border-teal-200" },
  { key: "costStructure", label: "コスト構造", hint: "主なコスト要因（固定費・変動費）", color: "bg-red-50 border-red-200" },
];

const guideElements: { label: string; emoji: string; desc: string }[] = [
  { label: "顧客セグメント", emoji: "👥", desc: "誰のために価値を作る？最も重要な顧客は誰か？" },
  { label: "価値提案", emoji: "🎁", desc: "顧客のどんな悩みを解決し、どんな価値を届けるか？" },
  { label: "チャネル", emoji: "📢", desc: "どの経路で顧客にリーチし、価値を届けるか？" },
  { label: "顧客との関係", emoji: "🤝", desc: "獲得・維持・拡大のためにどんな関係を築くか？" },
  { label: "収益の流れ", emoji: "💰", desc: "顧客はどの価値に対して、どのように支払うか？" },
  { label: "主要リソース", emoji: "🏗️", desc: "価値提案を実現するために必要な資産（人・物・金・IP）" },
  { label: "主要活動", emoji: "⚙️", desc: "ビジネスモデルを動かすために不可欠な活動は？" },
  { label: "主要パートナー", emoji: "🤲", desc: "誰と協力し、何を外部に任せるか？" },
  { label: "コスト構造", emoji: "📊", desc: "固定費・変動費を含む、主なコストの内訳は？" },
];

export default function BmcPage() {
  const [tab, setTab] = useState<"input" | "guide">("input");
  const [data, setData] = useCompanyStorageState(STORAGE_KEY, emptyBmc);
  const [saved, setSaved] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const hasContent = Object.values(data).some(v => v.trim());
  const bmcEntries = blocks.map(b => `**${b.label}：**\n${data[b.key] || "（未入力）"}`).join("\n\n");

  const prompt = `あなたはビジネスモデル設計の専門家です。以下のビジネスモデルキャンバス（BMC）をレビューし、各要素ごとに具体的なフィードバックをください。

## ビジネスモデルキャンバス

${bmcEntries}

## フィードバックの依頼

9つの要素それぞれについて、以下の観点で分析・アドバイスしてください：

1. **顧客セグメント**: ターゲットは十分に具体的か？複数セグメントがある場合、優先順位は明確か？
2. **価値提案**: 顧客が「今すぐ欲しい」と感じるレベルか？競合との差別化は明確か？
3. **チャネル**: 選んだチャネルはターゲット顧客にリーチできるか？コスト効率は良いか？
4. **顧客との関係**: 顧客獲得コスト（CAC）と顧客生涯価値（LTV）のバランスは？
5. **収益の流れ**: 価格設定は妥当か？顧客の支払い意思はあるか？
6. **主要リソース**: 本当に必要なリソースは揃っているか？不足しているものは？
7. **主要活動**: 注力すべき活動に集中できているか？不要な活動はないか？
8. **主要パートナー**: 内製 vs 外部パートナーのバランスは適切か？
9. **コスト構造**: 固定費と変動費の比率は？スケーラビリティはあるか？

**全体の整合性も評価してください：**
- 9つの要素が矛盾なくつながっているか？
- ビジネスとして持続可能か？（収益 > コスト）
- 最も弱い要素（ボトルネック）はどこか？
- スケールするために最初に改善すべき要素は？

各要素ごとに「良い点」「改善点」「具体的なアクション」を分けて回答してください。`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ビジネスモデルキャンバス</h1>
        <p className="mt-1 text-sm text-slate-500">9つの要素でビジネスモデルを可視化します。Alexander Osterwalder のフレームワーク。</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => setTab("input")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "input" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <PenTool className="h-4 w-4" /> 入力する
        </button>
        <button type="button" onClick={() => setTab("guide")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "guide" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <BookOpen className="h-4 w-4" /> 解説を読む
        </button>
      </div>

      {tab === "guide" && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-violet-50 to-indigo-100/80">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6 lg:p-8">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-indigo-950">
                  <LayoutGrid className="h-6 w-6 text-indigo-600" /> ビジネスモデルキャンバス（BMC）って何？
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-indigo-900/90">
                  <p>ビジネスモデルキャンバス（BMC）は、アレックス・オスターワルダーが開発した、<strong>ビジネスの全体像を1枚で可視化</strong>するフレームワークです。</p>
                  <p>世界中のスタートアップ、大企業、MBAプログラムで使われています。9つの要素を埋めるだけで、あなたのビジネスが「<strong>誰に、何を、どうやって提供し、どう稼ぐか</strong>」が一目で分かるようになります。</p>
                  <p>下の図は、9要素がキャンバス上でどう配置されるかのイメージです。実際の入力は「入力する」タブから行えます。</p>
                </div>
              </div>
              <div className="flex items-center justify-center border-t border-indigo-200/60 bg-white/40 p-6 lg:border-l lg:border-t-0">
                <img
                  src="/images/bmc-9elements.png"
                  alt="ビジネスモデルキャンバスの9要素レイアウト"
                  className="max-h-72 w-full max-w-lg rounded-xl object-contain shadow-sm ring-1 ring-indigo-100"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-indigo-950">9つの要素</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guideElements.map(item => (
                <div
                  key={item.label}
                  className="rounded-xl border border-indigo-200/70 bg-white p-4 shadow-sm ring-1 ring-indigo-50 transition-shadow hover:shadow-md"
                >
                  <p className="text-sm font-bold text-slate-800">
                    <span className="mr-1.5" aria-hidden>{item.emoji}</span>
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
            <h3 className="mb-3 text-sm font-bold text-indigo-900">おすすめの記入順（右側から顧客視点で）</h3>
            <p className="mb-2 text-xs leading-relaxed text-indigo-800/90">
              迷ったら次の順で埋めると、論理のつながりが作りやすいです。
            </p>
            <p className="rounded-lg border border-indigo-200/80 bg-white/80 px-4 py-3 font-mono text-xs font-semibold tracking-wide text-indigo-800">
              CS → VP → CH → CR → RS → KR → KA → KP → Cost
            </p>
            <p className="mt-2 text-[11px] text-indigo-700/85">
              顧客セグメント → 価値提案 → チャネル → 顧客との関係 → 収益の流れ → 主要リソース → 主要活動 → 主要パートナー → コスト構造
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-indigo-900">書き方のコツ</h3>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2"><span className="font-semibold text-indigo-600">1.</span><span><strong>右側から</strong>始める（顧客 → 価値 → 収益の流れが見えやすい）</span></li>
              <li className="flex items-start gap-2"><span className="font-semibold text-indigo-600">2.</span><span><strong>箇条書き</strong>で短く。1ブロック1行でもOK</span></li>
              <li className="flex items-start gap-2"><span className="font-semibold text-indigo-600">3.</span><span><strong>完璧を求めない</strong>。何度も書き直す前提でラフに</span></li>
              <li className="flex items-start gap-2"><span className="font-semibold text-indigo-600">4.</span><span>チームで<strong>付箋ワークショップ</strong>すると抜け漏れが減る</span></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5">
            <h3 className="mb-2 text-sm font-bold text-amber-900">BMC vs リーンキャンバス</h3>
            <p className="text-xs leading-relaxed text-amber-950/85">
              <strong>BMC</strong>は既存ビジネスの分析・整理・共有に強く、ステークホルダー向けの説明にも向いています。
              <strong className="font-bold"> リーンキャンバス</strong>はスタートアップの仮説検証（課題・解決策・主要指標）に寄せた設計です。目的に合わせて使い分けるか、両方を並行して更新するのも有効です。
            </p>
          </div>
        </div>
      )}

      {tab === "input" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {blocks.map(b => (
              <div key={b.key} className={`rounded-2xl border p-4 ${b.color} ${
                b.key === "costStructure" || b.key === "revenueStreams" ? "sm:col-span-2 lg:col-span-1" : ""
              }`}>
                <h3 className="mb-1 text-xs font-bold text-slate-800">{b.label}</h3>
                <p className="mb-2 text-[11px] text-slate-500">{b.hint}</p>
                <textarea
                  rows={4}
                  value={data[b.key]}
                  onChange={e => setData(p => ({ ...p, [b.key]: e.target.value }))}
                  placeholder="箇条書きで記入..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            ))}
          </div>

          {Object.values(data).some(v => v.trim()) && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Info className="h-4 w-4 text-primary-600" /> ビジネスモデルサマリー
              </h3>
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                {blocks.filter(b => data[b.key].trim()).map(b => (
                  <div key={b.key} className={`rounded-lg border p-3 ${b.color}`}>
                    <p className="mb-1 font-bold text-slate-700">{b.label}</p>
                    <p className="whitespace-pre-line text-slate-600">{data[b.key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "保存しました！" : "保存する"}
            </button>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900">
                <Bot className="h-5 w-5" />
                AIで壁打ちする
              </h3>
              <button type="button" onClick={() => setShowPrompt(!showPrompt)} className="text-xs font-medium text-violet-600 hover:text-violet-800">
                {showPrompt ? "プロンプトを閉じる" : "プロンプトを表示"}
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-violet-700">
              作成したBMCをAIにレビューしてもらうプロンプトを自動生成します。<strong>各要素の評価・整合性チェック・ボトルネックの特定</strong>が得られます。
            </p>
            {showPrompt && (
              <pre className="mb-4 max-h-64 overflow-auto rounded-xl border border-violet-200 bg-white p-4 text-xs leading-relaxed text-slate-700">{prompt}</pre>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(prompt); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }}
                disabled={!hasContent}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${hasContent ? promptCopied ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}
              >
                {promptCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {promptCopied ? "コピーしました！" : "プロンプトをコピー"}
              </button>
              <a href="https://chat.openai.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50">
                ChatGPTを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50">
                Claudeを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50">
                Geminiを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {!hasContent && <p className="mt-2 text-[11px] text-violet-400">※ BMCの各要素を入力するとプロンプトが生成されます</p>}
          </div>
        </div>
      )}
    </div>
  );
}
