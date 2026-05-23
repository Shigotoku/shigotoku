import { useState, useEffect } from "react";
import {
  Save,
  Check,
  TrendingUp,
  Info,
  Calculator,
  Bot,
  Copy,
  ExternalLink,
  BookOpen,
  PenTool,
  BarChart3,
  Lightbulb,
  AlertCircle,
} from "lucide-react";

const STORAGE_KEY = "runwith-market-size";

interface MarketData {
  tamLabel: string;
  tamValue: string;
  tamBasis: string;
  samLabel: string;
  samValue: string;
  samBasis: string;
  somLabel: string;
  somValue: string;
  somBasis: string;
  topDownSource: string;
  bottomUpCalc: string;
  bottomUpPrice: string;
  bottomUpCustomers: string;
  bottomUpFrequency: string;
}

const emptyData: MarketData = {
  tamLabel: "",
  tamValue: "",
  tamBasis: "",
  samLabel: "",
  samValue: "",
  samBasis: "",
  somLabel: "",
  somValue: "",
  somBasis: "",
  topDownSource: "",
  bottomUpCalc: "",
  bottomUpPrice: "",
  bottomUpCustomers: "",
  bottomUpFrequency: "12",
};

export default function MarketSizePage() {
  const [data, setData] = useState<MarketData>(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : emptyData;
  });
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"input" | "guide">("input");
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const bottomUpTotal = (() => {
    const p = parseFloat(data.bottomUpPrice) || 0;
    const c = parseFloat(data.bottomUpCustomers) || 0;
    const f = parseFloat(data.bottomUpFrequency) || 0;
    return p * c * f;
  })();

  const fmt = (n: number) => {
    if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}億円`;
    if (n >= 1_0000) return `${(n / 1_0000).toFixed(0)}万円`;
    return `${n.toLocaleString()}円`;
  };

  const hasContent = !!(data.tamLabel || data.tamValue || data.samLabel || data.bottomUpPrice);

  const prompt = `あなたは市場分析の専門家です。以下の市場規模の算定内容を分析し、各項目ごとに具体的なフィードバックをください。

## TAM/SAM/SOM 算定結果

**TAM（全体市場）：**
- 定義：${data.tamLabel || "（未入力）"}
- 規模：${data.tamValue ? `${data.tamValue}億円` : "（未入力）"}
- 根拠：${data.tamBasis || "（未入力）"}

**SAM（獲得可能市場）：**
- 定義：${data.samLabel || "（未入力）"}
- 規模：${data.samValue ? `${data.samValue}億円` : "（未入力）"}
- 根拠：${data.samBasis || "（未入力）"}

**SOM（実現可能市場）：**
- 定義：${data.somLabel || "（未入力）"}
- 規模：${data.somValue ? `${data.somValue}億円` : "（未入力）"}
- 根拠：${data.somBasis || "（未入力）"}

**ボトムアップ算出：**
- 顧客単価：${data.bottomUpPrice ? `${Number(data.bottomUpPrice).toLocaleString()}円` : "（未入力）"}
- 想定顧客数：${data.bottomUpCustomers ? `${Number(data.bottomUpCustomers).toLocaleString()}社/人` : "（未入力）"}
- 年間利用回数：${data.bottomUpFrequency || "（未入力）"}回
${bottomUpTotal > 0 ? `- ボトムアップ合計：${fmt(bottomUpTotal)}` : ""}

## フィードバックの依頼

以下の観点で各項目を分析・アドバイスしてください：

1. **TAMの妥当性**: 市場の定義は適切か？広すぎ/狭すぎないか？使用した出典は信頼できるか？
2. **SAMの絞り込み**: TAMからSAMへの絞り込みロジックは合理的か？見落としているセグメントはないか？
3. **SOMの現実性**: 1〜3年で本当に達成可能な数字か？楽観的すぎないか？
4. **トップダウンとボトムアップの整合性**: 両方の数字は矛盾していないか？乖離がある場合の理由は？
5. **根拠の強さ**: 出典やロジックは投資家を納得させられるか？追加で調べるべき情報源は？
6. **市場の成長性**: この市場は今後成長するか？成長ドライバーは何か？
7. **改善提案**: より説得力のある市場規模算定にするための具体的なアクションは？

各項目ごとに「現状の評価」「改善ポイント」「調査すべき追加情報」を分けて回答してください。`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">市場規模算定ツール（TAM/SAM/SOM）</h1>
        <p className="mt-1 text-sm text-slate-500">トップダウンとボトムアップの2つのアプローチで市場規模を算出します。</p>
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
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${tab === "guide" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <BookOpen className="h-4 w-4" /> 解説を読む
        </button>
      </div>

      {tab === "guide" ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-6">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-blue-900">
                  <TrendingUp className="h-5 w-5" /> TAM / SAM / SOM とは？
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-blue-900/90">
                  <p>
                    ピッチでは必ず聞かれるのが「<strong>市場規模はどれくらいか</strong>」です。TAM・SAM・SOMは、抽象的な「大きい市場」を<strong>定義・絞り込み・現実的な獲得幅</strong>まで落とし込むための共通言語です。
                  </p>
                  <p>
                    「市場全体（TAM）」→「自社がサービスできる範囲（SAM）」→「競争とリソースを踏まえた短期で取りにいける規模（SOM）」の3層で示すことで、夢と実行計画のバランスが伝わりやすくなります。
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center border-t border-blue-100 bg-white/40 p-4 lg:border-l lg:border-t-0">
                <img
                  src="/images/tam-sam-som-detail.png"
                  alt="TAM・SAM・SOMの関係を示す詳細図"
                  className="max-h-72 w-full max-w-lg rounded-xl object-contain"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">T</div>
                <span className="text-sm font-bold text-blue-900">TAM — Total Addressable Market</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                自社の製品カテゴリが<strong>理論上フルシェア</strong>を取れたときの市場規模。国・業界など、まず「どの箱の話か」を示すレイヤーです。
              </p>
              <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">
                <span className="font-semibold">例：</span>
                国内のBtoB向けクラウド会計・経費精算ソフト市場全体（調査会社の業界レポートの売上ベース）
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">S</div>
                <span className="text-sm font-bold text-blue-900">SAM — Serviceable Available Market</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                TAMのうち、<strong>地理・顧客セグメント・販路・規制</strong>などで「実際に届けられる」市場。事業計画のターゲット像とセットで語ります。
              </p>
              <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900">
                <span className="font-semibold">例：</span>
                従業員20〜300名の製造業に限った、関東エリア向けのクラウド経費管理（直販・パートナー経由の到達範囲内）
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">S</div>
                <span className="text-sm font-bold text-blue-900">SOM — Serviceable Obtainable Market</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                SAMのうち、<strong>競合・ブランド・営業キャパ・資金</strong>を踏まえ、1〜3年程度で現実的に獲得を狙える規模。
              </p>
              <p className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-900">
                <span className="font-semibold">例：</span>
                初年度は意思決定が早い中小向けに絞り、導入支援つきで年間120社のアカウント獲得を目標とする売上レンジ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-900">
                <BarChart3 className="h-4 w-4" /> トップダウン（Top-down）
              </h3>
              <p className="text-sm leading-relaxed text-blue-900/85">
                既存の業界レポートや統計の<strong>総額から出発</strong>し、セグメント比率や浸透率を掛け合わせて自社に関係する規模へ落とす方法です。第三者の数字があるため<strong>説明の土台</strong>になりやすい反面、自社への当てはめが粗くなりがちです。
              </p>
              <ul className="mt-3 space-y-2 text-xs text-blue-900/80">
                <li className="flex gap-2"><span className="text-blue-500">•</span> 業界団体・調査会社・政府統計などの出典を明示する</li>
                <li className="flex gap-2"><span className="text-blue-500">•</span> 「どの定義の売上か（流通・メーカー出荷など）」を揃える</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-900">
                <Calculator className="h-4 w-4" /> ボトムアップ（Bottom-up）
              </h3>
              <p className="text-sm leading-relaxed text-slate-700">
                <strong>顧客単価 × 顧客数 × 購入頻度</strong>など、現場の単位から積み上げる方法です。営業計画や単価設定と接続しやすく、投資家はトップダウンとの<strong>整合性</strong>をよく見ます。
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex gap-2"><span className="text-blue-500">•</span> 想定顧客数の根拠（リスト・商談パイプライン・類似事例）を用意</li>
                <li className="flex gap-2"><span className="text-blue-500">•</span> 解約・単価圧力を織り込んだ「ネット」の議論にする</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-900">
              <Lightbulb className="h-4 w-4" /> 投資家が見るポイント
            </h3>
            <ul className="space-y-2.5 text-sm text-amber-950/90">
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-amber-600">1.</span>
                <span>
                  <strong>定義の一貫性</strong> — TAMで言っている「市場」と、SAM/SOMの顧客像が矛盾していないか。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-amber-600">2.</span>
                <span>
                  <strong>出典と更新頻度</strong> — 数字の年次・調査対象（売上か台数か）が明確か。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-amber-600">3.</span>
                <span>
                  <strong>トップダウンとボトムアップの突合</strong> — オーダーがズレる場合、その理由（狙う層の違いなど）を説明できるか。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-amber-600">4.</span>
                <span>
                  <strong>SOMの実行可能性</strong> — 「市場の1%」のような根拠薄い割り算ではなく、営業・マーケの打ち手とつながっているか。
                </span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "デジタル広告支出",
                value: "世界で年間数千億ドル規模",
                note: "チャネル・フォーマット別に伸び率が異なる",
              },
              {
                label: "BtoB SaaS",
                value: "成長市場として報告が多い",
                note: "セグメント（SMB/Enterprise）で単価が分かれる",
              },
              {
                label: "製造DX・IoT",
                value: "設備投資・省人化ニーズと連動",
                note: "導入サイクルが長くSOMは年度別に示すと説得力UP",
              },
              {
                label: "小売のオムニチャネル",
                value: "EC比率・店舗数がSAMのレバーに",
                note: "地域・カテゴリでTAM定義を揃える",
              },
            ].map(card => (
              <div key={card.label} className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">{card.label}</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{card.value}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{card.note}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-900">
                <Info className="h-4 w-4" /> うまくいくコツ
              </h3>
              <ul className="space-y-2 text-sm text-blue-900/85">
                <li className="flex gap-2"><span className="text-blue-500">✓</span> 同じスライド内で用語（例：「売上」「導入社数」）を統一する</li>
                <li className="flex gap-2"><span className="text-blue-500">✓</span> SAMは「誰に・どのチャネルで・どの地域まで」と一文で言い切れるようにする</li>
                <li className="flex gap-2"><span className="text-blue-500">✓</span> ボトムアップの前提を変えたとき、どの数字がどう動くか感度を1行メモする</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/90 p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-900">
                <AlertCircle className="h-4 w-4" /> よくある落とし穴
              </h3>
              <ul className="space-y-2 text-sm text-red-950/90">
                <li className="flex gap-2"><span className="text-red-400">!</span> 出典のない巨大なTAMだけを並べ、自社との接続がない</li>
                <li className="flex gap-2"><span className="text-red-400">!</span> SAMを「国内全体」にしつつ、SOMだけ極端に小さい（論理の飛躍）</li>
                <li className="flex gap-2"><span className="text-red-400">!</span> 成長率を二重に掛けてしまう（業界成長 × 自社成長の取り方ミス）</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {[
              { prefix: "tam" as const, label: "TAM", color: "border-violet-200 bg-violet-50", textColor: "text-violet-800", desc: "獲得し得る最大の市場規模" },
              { prefix: "sam" as const, label: "SAM", color: "border-sky-200 bg-sky-50", textColor: "text-sky-800", desc: "実際にアプローチ可能な市場" },
              { prefix: "som" as const, label: "SOM", color: "border-emerald-200 bg-emerald-50", textColor: "text-emerald-800", desc: "短期的に獲得を目指す市場" },
            ].map(item => (
              <div key={item.prefix} className={`rounded-2xl border p-5 ${item.color}`}>
                <h3 className={`mb-1 text-sm font-bold ${item.textColor}`}>
                  {item.label} — {item.desc}
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">市場の定義</label>
                    <input
                      placeholder="例：日本のクラウド会計ソフト市場"
                      value={data[`${item.prefix}Label`]}
                      onChange={e => setData(p => ({ ...p, [`${item.prefix}Label`]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">市場規模（億円）</label>
                    <input
                      type="number"
                      placeholder="例：5000"
                      value={data[`${item.prefix}Value`]}
                      onChange={e => setData(p => ({ ...p, [`${item.prefix}Value`]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">根拠・出典</label>
                    <input
                      placeholder="例：矢野経済研究所 2025年レポート"
                      value={data[`${item.prefix}Basis`]}
                      onChange={e => setData(p => ({ ...p, [`${item.prefix}Basis`]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Calculator className="h-4 w-4 text-primary-600" />
              ボトムアップ計算
            </h3>
            <p className="mb-4 text-xs text-slate-400">「顧客単価 × 顧客数 × 年間利用頻度」で算出。投資家はトップダウンとの整合性を見ます。</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">顧客単価（円/回）</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={data.bottomUpPrice}
                  onChange={e => setData(p => ({ ...p, bottomUpPrice: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">想定顧客数</label>
                <input
                  type="number"
                  placeholder="500"
                  value={data.bottomUpCustomers}
                  onChange={e => setData(p => ({ ...p, bottomUpCustomers: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">年間利用回数</label>
                <input
                  type="number"
                  placeholder="12"
                  value={data.bottomUpFrequency}
                  onChange={e => setData(p => ({ ...p, bottomUpFrequency: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>
            {bottomUpTotal > 0 && (
              <div className="mt-4 rounded-xl bg-primary-50 p-4 text-center">
                <p className="text-xs text-primary-600">ボトムアップ年間市場規模</p>
                <p className="mt-1 text-2xl font-bold text-primary-800">{fmt(bottomUpTotal)}</p>
              </div>
            )}
          </div>

          {(data.tamValue || data.samValue || data.somValue) && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-center text-sm font-bold text-slate-700">市場規模のイメージ</h3>
              <div className="flex flex-col items-center gap-2">
                {[
                  { label: "TAM", value: data.tamValue, bg: "bg-violet-100 border-violet-300", text: "text-violet-700" },
                  { label: "SAM", value: data.samValue, bg: "bg-sky-100 border-sky-300", text: "text-sky-700" },
                  { label: "SOM", value: data.somValue, bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-700" },
                ].map((m, i) => {
                  const w = i === 0 ? "w-full" : i === 1 ? "w-3/4" : "w-1/2";
                  return (
                    <div key={m.label} className={`${w} rounded-xl border p-3 text-center ${m.bg}`}>
                      <span className={`text-xs font-bold ${m.text}`}>{m.label}</span>
                      {m.value && <span className={`ml-2 text-sm font-semibold ${m.text}`}>{m.value}億円</span>}
                    </div>
                  );
                })}
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
              <button type="button" onClick={() => setShowPrompt(!showPrompt)} className="text-xs font-medium text-violet-600 hover:text-violet-800">
                {showPrompt ? "プロンプトを閉じる" : "プロンプトを表示"}
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-violet-700">
              入力した市場規模データをもとに、AIにレビューしてもらうプロンプトを自動生成します。<strong>TAM/SAM/SOMの妥当性や整合性</strong>について具体的なフィードバックが得られます。
            </p>
            {showPrompt && (
              <pre className="mb-4 max-h-64 overflow-auto rounded-xl border border-violet-200 bg-white p-4 text-xs leading-relaxed text-slate-700">{prompt}</pre>
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
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${hasContent ? (promptCopied ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700") : "cursor-not-allowed bg-slate-200 text-slate-400"}`}
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
                href="https://claude.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
              >
                Claudeを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://gemini.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
              >
                Geminiを開く <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {!hasContent && <p className="mt-2 text-[11px] text-violet-400">※ 上のフォームに内容を入力するとプロンプトが生成されます</p>}
          </div>
        </div>
      )}
    </div>
  );
}
