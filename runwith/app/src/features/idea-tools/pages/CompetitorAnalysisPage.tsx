import { useState, useEffect } from "react";
import {
  Save,
  Check,
  Plus,
  Trash2,
  Swords,
  Star,
  Bot,
  Copy,
  ExternalLink,
  BookOpen,
  PenTool,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";

const STORAGE_KEY = "runwith-competitors";

interface Competitor {
  id: string;
  name: string;
  url: string;
  strength: string;
  weakness: string;
  pricing: string;
  position: string;
}

export default function CompetitorAnalysisPage() {
  const [tab, setTab] = useState<"input" | "guide">("input");
  const [competitors, setCompetitors] = useState<Competitor[]>(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  });
  const [myStrengths, setMyStrengths] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY + "-my");
    return s ? JSON.parse(s) : { strength: "", differentiation: "" };
  });
  const [saved, setSaved] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(competitors));
    localStorage.setItem(STORAGE_KEY + "-my", JSON.stringify(myStrengths));
  }, [competitors, myStrengths]);

  const addCompetitor = () => {
    setCompetitors(p => [...p, {
      id: Date.now().toString(),
      name: "", url: "", strength: "", weakness: "", pricing: "", position: "",
    }]);
  };

  const update = (id: string, field: keyof Competitor, value: string) => {
    setCompetitors(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const remove = (id: string) => {
    setCompetitors(p => p.filter(c => c.id !== id));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasContent = competitors.some(c => c.name) || myStrengths.strength || myStrengths.differentiation;
  const compList = competitors.filter(c => c.name).map((c, i) => `### 競合${i + 1}: ${c.name}
- URL: ${c.url || "不明"}
- 強み: ${c.strength || "（未入力）"}
- 弱み: ${c.weakness || "（未入力）"}
- 価格帯: ${c.pricing || "（未入力）"}
- ポジション: ${c.position || "（未入力）"}`).join("\n\n");

  const prompt = `あなたは競合分析・事業戦略の専門家です。以下の競合分析の内容をレビューし、各項目ごとに具体的なフィードバックをください。

## 競合リスト

${compList || "（競合未登録）"}

## 自社のポジショニング

**自社の強み：**
${myStrengths.strength || "（未入力）"}

**差別化ポイント：**
${myStrengths.differentiation || "（未入力）"}

## フィードバックの依頼

以下の観点で分析・アドバイスしてください：

1. **競合の網羅性**: 見落としている重要な競合はいないか？直接競合・間接競合・代替手段のバランスは取れているか？
2. **各競合の分析の深さ**: 強み・弱みの分析は十分か？もっと調べるべき観点はあるか？
3. **自社の差別化**: 挙げた差別化ポイントは本当に競合が真似しにくいか？持続可能な競争優位性（モート）はあるか？
4. **ポジショニングの有効性**: 顧客にとって自社を選ぶ明確な理由はあるか？
5. **競合の動向予測**: 各競合が今後取りそうな戦略は？それに対する備えは？
6. **参入障壁**: 新規参入者の脅威は？自社が作るべき参入障壁は何か？
7. **具体的なアクション**: 競合に勝つために今すぐ取るべき3つのアクションを提案してください。

各競合ごとに分析し、最後に全体の戦略提言をまとめてください。`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">競合分析ツール</h1>
        <p className="mt-1 text-sm text-slate-500">主要競合をリストアップし、自社のポジショニングを明確にします。</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => setTab("input")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "input" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <PenTool className="h-4 w-4" /> 入力する
        </button>
        <button type="button" onClick={() => setTab("guide")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "guide" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          <BookOpen className="h-4 w-4" /> 解説を読む
        </button>
      </div>

      {tab === "guide" && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100/80">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-rose-900">
                  <Swords className="h-5 w-5" /> 競合分析で何がわかるか
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-rose-900/90">
                  <p>
                    競合分析とは、<strong>同じ顧客の課題を解決しようとしている企業やサービスを調べ、自社との違いを明確にする</strong>
                    プロセスです。誰と「比較されるか」を把握すると、訴求メッセージや価格・機能の優先順位がブレにくくなります。
                  </p>
                  <p>
                    「競合がいません」は投資家が最も嫌う回答のひとつ。競合がいないということは、<strong>市場がないか、見つけられていない</strong>
                    かのどちらかです。競合がいることはむしろ良い兆候 — 市場が存在する証拠です。
                  </p>
                  <p>
                    ポジショニングマップは、顧客が実際に比較する軸（価格・使いやすさ・対応範囲など）で各プレイヤーを可視化する図です。
                    空白地帯や自社の立ち位置が一目でわかるため、ピッチやプロダクトロードマップの議論にそのまま使えます。
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center bg-rose-100/40 p-4 lg:p-6">
                <img
                  src="/images/positioning-map-detail.png"
                  alt="ポジショニングマップの詳細例"
                  className="max-h-72 w-full max-w-lg rounded-xl border border-rose-200/80 bg-white object-contain shadow-sm"
                />
              </div>
            </div>

            <div className="border-t border-rose-200 bg-rose-100/50 px-6 py-4">
              <p className="mb-3 text-xs font-bold text-rose-900">競合の3つのタイプ（業界一般の例）</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
                  <p className="mb-1 text-xs font-bold text-red-700">直接競合</p>
                  <p className="text-[11px] text-slate-600">同じ顧客の、同じ課題を、<strong>同じ方法</strong>で解決する企業・サービス</p>
                  <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] leading-snug text-red-700">例：あなたがAI経理ツール → 他のAI経理サービス</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
                  <p className="mb-1 text-xs font-bold text-amber-700">間接競合</p>
                  <p className="text-[11px] text-slate-600">同じ顧客の、同じ課題を、<strong>別の方法</strong>で解決する企業・サービス</p>
                  <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-700">例：AIではなくテンプレート型の経費精算ツール</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-1 text-xs font-bold text-slate-700">代替手段</p>
                  <p className="text-[11px] text-slate-600">顧客が<strong>今やっている解決法</strong>（ソフトウェアに限らない）</p>
                  <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] leading-snug text-slate-600">例：Excelで手作業管理、税理士に外注</p>
                </div>
              </div>
            </div>

            <div className="border-t border-rose-200 px-6 py-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold text-rose-900">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-200 text-[11px] text-rose-900">5</span>
                ポジショニングマップを作る5ステップ
              </p>
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">1</span>
                  <span>競合を5〜10社ピックアップ（直接・間接・代替のバランスを意識）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">2</span>
                  <span>顧客が選ぶ理由（Key Buying Factors）を洗い出す</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">3</span>
                  <span>互いに独立した2軸を決める（例：価格帯 × 機能の広さ）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">4</span>
                  <span>各社をマップ上にプロットし、ラベルで混同しないようにする</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">5</span>
                  <span>空白地帯（未開拓）と自社の立ち位置を言語化する</span>
                </li>
              </ol>
            </div>

            <div className="border-t border-rose-200 bg-white/60 px-6 py-5">
              <p className="mb-3 text-xs font-bold text-rose-900">調査に使えるリソース</p>
              <ul className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                <li>
                  <a href="https://www.crunchbase.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900">Crunchbase</a>
                  <span className="text-slate-500"> — 海外スタートアップの資金調達・概要</span>
                </li>
                <li>
                  <a href="https://initial.inc/" target="_blank" rel="noopener noreferrer" className="font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900">INITIAL</a>
                  <span className="text-slate-500"> — 日本のスタートアップDB</span>
                </li>
                <li>
                  <a href="https://www.g2.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900">G2</a>
                  <span className="text-slate-500"> — SaaSレビュー・比較（海外）</span>
                </li>
                <li>
                  <a href="https://boxil.jp/" target="_blank" rel="noopener noreferrer" className="font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900">BOXIL</a>
                  <span className="text-slate-500"> — 日本のSaaS比較</span>
                </li>
                <li className="sm:col-span-2">
                  <a href="https://jp.similarweb.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900">SimilarWeb</a>
                  <span className="text-slate-500"> — 競合サイトのトラフィック・流入分析</span>
                </li>
              </ul>
            </div>

            <div className="grid gap-4 border-t border-rose-200 px-6 py-5 sm:grid-cols-2">
              <div className="rounded-xl border border-rose-200 bg-white p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-rose-900">
                  <Lightbulb className="h-4 w-4 text-rose-600" /> うまくいくコツ
                </p>
                <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-700">
                  <li>軸は「自社が勝ちたい軸」ではなく、<strong>顧客が実際に比較する軸</strong>にする</li>
                  <li>大手だけでなく、ニッチに強い新興も入れると地図が現実に近づく</li>
                  <li>半年に一度は見直し — 資金調達や新機能で位置は動く</li>
                </ul>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-rose-900">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> よくある落とし穴
                </p>
                <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-700">
                  <li><strong>類似製品だけ</strong>を競合にして、代替手段（Excel・外注など）を無視する</li>
                  <li>2軸が実質同じことを表しており、図が意味をなさない</li>
                  <li>自社だけ「特別枠」に置き、顧客視点の比較になっていない</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "input" && (
        <div className="space-y-6">
          <div className="space-y-4">
            {competitors.map((comp, idx) => (
              <div key={comp.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">競合 {idx + 1}</h3>
                  <button type="button" onClick={() => remove(comp.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">企業名 / サービス名</label>
                    <input value={comp.name} onChange={e => update(comp.id, "name", e.target.value)} placeholder="例：freee / マネーフォワード" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">URL</label>
                    <input value={comp.url} onChange={e => update(comp.id, "url", e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">強み</label>
                    <textarea value={comp.strength} onChange={e => update(comp.id, "strength", e.target.value)} rows={2} placeholder="例：圧倒的なブランド力と既存顧客基盤" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">弱み</label>
                    <textarea value={comp.weakness} onChange={e => update(comp.id, "weakness", e.target.value)} rows={2} placeholder="例：UIが複雑で導入コストが高い" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">価格帯</label>
                    <input value={comp.pricing} onChange={e => update(comp.id, "pricing", e.target.value)} placeholder="例：月額5万円〜" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">ポジション（直接/間接/代替）</label>
                    <select value={comp.position} onChange={e => update(comp.id, "position", e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200">
                      <option value="">選択...</option>
                      <option>直接競合</option>
                      <option>間接競合</option>
                      <option>代替手段</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addCompetitor} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-500 hover:border-primary-300 hover:text-primary-600">
            <Plus className="h-4 w-4" /> 競合を追加
          </button>

          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary-800">
              <Star className="h-4 w-4" /> 自社のポジショニング
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">自社の強み（競合にない優位性）</label>
                <textarea rows={3} value={myStrengths.strength} onChange={e => setMyStrengths((p: typeof myStrengths) => ({ ...p, strength: e.target.value }))} placeholder="例：業界特化のAIモデルを自社開発、創業者の現場経験10年" className="w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">差別化ポイント（一言で）</label>
                <input value={myStrengths.differentiation} onChange={e => setMyStrengths((p: typeof myStrengths) => ({ ...p, differentiation: e.target.value }))} placeholder="例：中小企業の経理を10分で完了させるAIツール" className="w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
            </div>
          </div>

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
              入力した競合情報をもとに、AIに戦略レビューしてもらうプロンプトを自動生成します。<strong>競合の見落とし・差別化の妥当性・戦略提言</strong>が得られます。
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
            {!hasContent && <p className="mt-2 text-[11px] text-violet-400">※ 競合情報または自社ポジショニングを入力するとプロンプトが生成されます</p>}
          </div>
        </div>
      )}
    </div>
  );
}
