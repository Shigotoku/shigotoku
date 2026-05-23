import { useState, useEffect } from "react";
import {
  Save,
  Check,
  Plus,
  Trash2,
  Users,
  User,
  Heart,
  Frown,
  MessageSquare,
  Bot,
  Copy,
  ExternalLink,
  BookOpen,
  PenTool,
  X,
} from "lucide-react";

const STORAGE_KEY = "runwith-personas";

interface Persona {
  id: string;
  name: string;
  age: string;
  gender: string;
  occupation: string;
  income: string;
  location: string;
  goals: string;
  pains: string;
  behavior: string;
  quote: string;
}

const emptyPersona = (): Persona => ({
  id: Date.now().toString(),
  name: "",
  age: "",
  gender: "",
  occupation: "",
  income: "",
  location: "",
  goals: "",
  pains: "",
  behavior: "",
  quote: "",
});

export default function PersonaPage() {
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [emptyPersona()];
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [tab, setTab] = useState<"input" | "guide">("input");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
  }, [personas]);

  const current = personas[activeIdx] || emptyPersona();

  const update = (field: keyof Persona, value: string) => {
    setPersonas(p => p.map((ps, i) => (i === activeIdx ? { ...ps, [field]: value } : ps)));
  };

  const addPersona = () => {
    setPersonas(p => [...p, emptyPersona()]);
    setActiveIdx(personas.length);
  };

  const removePersona = (idx: number) => {
    if (personas.length <= 1) return;
    setPersonas(p => p.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, activeIdx - 1));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filledPersonas = personas.filter(p => p.name || p.occupation || p.goals || p.pains);
  const hasContent = filledPersonas.length > 0;
  const personaList = filledPersonas
    .map(
      (p, i) => `### ペルソナ${i + 1}: ${p.name || "名前未設定"}
- 年齢: ${p.age || "（未入力）"}
- 性別: ${p.gender || "（未入力）"}
- 職業・役職: ${p.occupation || "（未入力）"}
- 年収: ${p.income || "（未入力）"}
- 居住地: ${p.location || "（未入力）"}
- 達成したい目標: ${p.goals || "（未入力）"}
- 抱えている課題: ${p.pains || "（未入力）"}
- 行動パターン: ${p.behavior || "（未入力）"}
- 本人の声: ${p.quote ? `「${p.quote}」` : "（未入力）"}`
    )
    .join("\n\n");

  const prompt = `あなたはUXリサーチ・カスタマーリサーチの専門家です。以下のペルソナ設計をレビューし、各項目ごとに具体的なフィードバックをください。

## 作成したペルソナ

${personaList || "（ペルソナ未作成）"}

## フィードバックの依頼

各ペルソナについて、以下の観点で分析・アドバイスしてください：

1. **リアリティ**: このペルソナは実在しそうか？具体性は十分か？追加すべき属性は？
2. **課題の深さ**: 課題は表面的でないか？根本原因（Root Cause）まで掘り下げられているか？
3. **目標と課題の整合性**: 目標と課題がつながっているか？解決策を考えやすい形になっているか？
4. **行動パターンの具体性**: 情報収集〜購買決定のプロセスが見えるか？マーケティング施策に活かせるか？
5. **ターゲットとしての適切さ**: このペルソナは初期ターゲットとして適切か？もっと絞るべきか広げるべきか？
6. **ペルソナ間の差別化**（複数ある場合）: 各ペルソナは十分に差別化されているか？統合すべきものはないか？
7. **インタビュー質問の提案**: このペルソナの仮説を検証するために、実際の顧客に聞くべき質問を5つ提案してください。
8. **改善案**: ペルソナをより実用的にするための具体的なアクションを教えてください。

各ペルソナごとに「良い点」「改善点」「検証アクション」を分けて回答してください。`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ペルソナ設計ツール</h1>
        <p className="mt-1 text-sm text-slate-500">理想の顧客像を具体的に描き、チーム全員の共通認識にします。</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("input")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "input" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <PenTool className="h-4 w-4" /> 入力する
        </button>
        <button
          type="button"
          onClick={() => setTab("guide")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "guide" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <BookOpen className="h-4 w-4" /> 解説を読む
        </button>
      </div>

      {tab === "guide" ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-teal-900">
                  <Users className="h-5 w-5" /> ペルソナとは？
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-teal-800">
                  <p>
                    ペルソナは、<strong>自社の製品やサービスを使う「架空の理想的な顧客」</strong>
                    を、一人の人物として具体化したものです。
                  </p>
                  <p>
                    「BtoB向け」のような粗いセグメントではなく、
                    <strong>「IT企業マーケティング部の課長、37歳、定例レポートに週10時間」</strong>
                    のように、意思決定のシーンまで想像できる粒度を目指します。
                  </p>
                  <p>
                    チーム内の共通言語として、「この人ならこの案をどう受け取るか？」を議論するための<strong>意思決定フィルター</strong>として使います。
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center bg-white/40 p-4 lg:p-6">
                <img
                  src="/images/persona-card-template.png"
                  alt="ペルソナカードのテンプレート例"
                  className="max-h-64 w-full max-w-md rounded-xl border border-teal-100 object-contain shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-bold text-teal-900">作成の5ステップ</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  num: "1",
                  label: "情報収集",
                  desc: "顧客インタビュー、営業メモ、Web行動ログなど実データを集める",
                },
                {
                  num: "2",
                  label: "分析",
                  desc: "共通パターン・頻出課題・購買トリガーを整理し仮説を立てる",
                },
                {
                  num: "3",
                  label: "人物像設定",
                  desc: "名前・役職・日常の業務フローを一人のストーリーにまとめる",
                },
                {
                  num: "4",
                  label: "課題定義",
                  desc: "目標・痛み・障害を一文で言えるレベルまで言語化する",
                },
                {
                  num: "5",
                  label: "チーム共有",
                  desc: "壁出しや定例で参照し、優先順位づけに使い続ける",
                },
              ].map(s => (
                <div
                  key={s.num}
                  className="flex flex-col rounded-xl border border-teal-100 bg-gradient-to-b from-teal-50/80 to-cyan-50/50 p-4 shadow-sm"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                    {s.num}
                  </div>
                  <p className="text-sm font-semibold text-teal-900">{s.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-600">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-teal-200 bg-white p-5">
              <p className="mb-3 text-sm font-bold text-teal-900">良いペルソナの条件</p>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-slate-800">実在しそう</strong>
                    ：名前を呼んで会話できるほど具体（例：部署・KPI・会議の頻度まで）
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-slate-800">課題が明確</strong>
                    ：「何に困り、何を失いたくないか」が一文で言える
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-slate-800">行動が見える</strong>
                    ：情報収集チャネル、稟議、トライアルの進め方が追える
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-slate-800">意思決定に使える</strong>
                    ：機能の優先度やコピーを「この人向けか？」で切れる
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5">
              <p className="mb-3 text-sm font-bold text-rose-900">よくある失敗</p>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    <strong className="text-slate-800">理想だけ詰め込む</strong>
                    例：IT企業マーケ部なのに「毎朝英語でプレゼンし年収2,000万」のように非現実的
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    <strong className="text-slate-800">ターゲットが広すぎる</strong>
                    例：「製造業の担当者全員」→誰の稟議か・導入障壁がバラバラで施策が刺さらない
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    <strong className="text-slate-800">作って終わり</strong>
                    例：半年前の仮説のまま。組織改編やツール導入で現場が変わっているのに未更新
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    <strong className="text-slate-800">根拠のない空想</strong>
                    例：同僚の思い込みだけで「若手はTikTok」と決める。顧客の声やデータとズレる
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50 p-6">
            <p className="mb-2 text-sm font-bold text-cyan-900">実務でのコツ</p>
            <ul className="space-y-2 text-sm leading-relaxed text-cyan-900/90">
              <li>
                <strong>N=1を固定 × AI × 人間</strong>
                ：まず<strong>一人分</strong>を徹底的に書き切り、AIで表現の穴や矛盾を洗い出し、最後はインタビューや営業フィードバックで人間が検証するハイブリッドが強いです。
              </li>
              <li>
                <strong>チームの意思決定フィルターにする</strong>
                ：「このペルソナはこの機能を買うか？」「このLPは刺さるか？」と、会議のたびに参照するとブレません。
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto">
            {personas.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  i === activeIdx ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                {p.name || `ペルソナ ${i + 1}`}
              </button>
            ))}
            <button
              type="button"
              onClick={addPersona}
              className="flex shrink-0 items-center gap-1 rounded-lg border-2 border-dashed border-slate-200 px-3 py-2 text-xs font-medium text-slate-400 hover:border-primary-300 hover:text-primary-600"
            >
              <Plus className="h-3.5 w-3.5" /> 追加
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">ペルソナ詳細</h3>
              {personas.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePersona(activeIdx)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" /> 削除
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "name" as const, label: "名前（架空）", placeholder: "例：田中 真由美" },
                { key: "age" as const, label: "年齢", placeholder: "例：35歳" },
                { key: "gender" as const, label: "性別", placeholder: "例：女性" },
                { key: "occupation" as const, label: "職業・役職", placeholder: "例：IT企業 マーケティング部 課長" },
                { key: "income" as const, label: "年収レンジ", placeholder: "例：600万円" },
                { key: "location" as const, label: "居住地", placeholder: "例：東京都世田谷区" },
              ].map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{f.label}</label>
                  <input
                    value={current[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Heart className="h-3 w-3 text-pink-500" /> 達成したい目標・欲求
                </label>
                <textarea
                  rows={3}
                  value={current.goals}
                  onChange={e => update("goals", e.target.value)}
                  placeholder="例：ルーティン業務を自動化して、企画やクリエイティブな仕事に集中したい"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Frown className="h-3 w-3 text-amber-500" /> 抱えている課題・不満
                </label>
                <textarea
                  rows={3}
                  value={current.pains}
                  onChange={e => update("pains", e.target.value)}
                  placeholder="例：毎月のレポート作成に丸2日かかる。手作業が多くミスが頻発、上司からの指摘が辛い"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-500">情報収集・意思決定の行動パターン</label>
              <textarea
                rows={3}
                value={current.behavior}
                onChange={e => update("behavior", e.target.value)}
                placeholder="例：TwitterやnoteでSaaS情報を収集。同僚の口コミを重視。無料トライアルをまず試す派"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <MessageSquare className="h-3 w-3 text-blue-500" /> 本人の声（一言でペルソナを表す引用）
              </label>
              <input
                value={current.quote}
                onChange={e => update("quote", e.target.value)}
                placeholder='例：「この単純作業を誰か代わりにやってくれないかな…」'
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm italic focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          {current.name && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">プレビュー</h3>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                  {current.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900">{current.name}</p>
                  <p className="text-xs text-slate-500">{[current.age, current.occupation, current.location].filter(Boolean).join(" / ")}</p>
                  {current.quote && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-600">"{current.quote}"</p>
                  )}
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {current.goals && (
                      <div className="rounded-lg bg-pink-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-pink-600">目標</p>
                        <p className="text-xs text-pink-700">{current.goals}</p>
                      </div>
                    )}
                    {current.pains && (
                      <div className="rounded-lg bg-amber-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-amber-600">課題</p>
                        <p className="text-xs text-amber-700">{current.pains}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
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
              <button
                type="button"
                onClick={() => setShowPrompt(!showPrompt)}
                className="text-xs font-medium text-violet-600 hover:text-violet-800"
              >
                {showPrompt ? "プロンプトを閉じる" : "プロンプトを表示"}
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-violet-700">
              作成したペルソナをAIにレビューしてもらうプロンプトを自動生成します。
              <strong>リアリティの検証・課題の深掘り・インタビュー質問の提案</strong>が得られます。
            </p>
            {showPrompt && (
              <pre className="mb-4 max-h-64 overflow-auto rounded-xl border border-violet-200 bg-white p-4 text-xs leading-relaxed text-slate-700">
                {prompt}
              </pre>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(prompt);
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 2000);
                }}
                disabled={!hasContent}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
                  hasContent
                    ? promptCopied
                      ? "bg-emerald-600 text-white"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                {promptCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {promptCopied ? "コピーしました！" : "プロンプトをコピー"}
              </button>
              <a
                href="https://chat.openai.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
              >
                ChatGPTを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
              >
                Geminiを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://claude.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
              >
                Claudeを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {!hasContent && <p className="mt-2 text-[11px] text-violet-400">※ ペルソナ情報を入力するとプロンプトが生成されます</p>}
          </div>
        </div>
      )}
    </div>
  );
}
