import { useState, useEffect } from "react";
import {
  Presentation, Plus, Lightbulb, Target, Users,
  TrendingUp, DollarSign, Zap, CheckCircle2, Circle,
  ChevronRight, Save, FileText, Globe,
} from "lucide-react";

interface Slide {
  id: string;
  title: string;
  icon: typeof FileText;
  description: string;
  completed: boolean;
  tips: string;
  guidePoints: string[];
  content: string;
}

const defaultSlides: Omit<Slide, "content">[] = [
  {
    id: "s1", title: "表紙", icon: Presentation,
    description: "会社名・タグライン・ロゴ・連絡先",
    completed: false,
    tips: "1文でプロダクトの本質を伝えるタグラインを磨きましょう。「〇〇のための〇〇」という形が定番です。",
    guidePoints: ["会社名・ロゴ", "事業のタグライン（1文）", "代表者名・連絡先", "日付・バージョン"],
  },
  {
    id: "s2", title: "課題", icon: Lightbulb,
    description: "解決しようとしている痛み・問題",
    completed: false,
    tips: "ターゲット顧客が「あるある！」と感じる具体的な痛みを描写。数字で規模感を示すとベター。",
    guidePoints: ["誰の問題か（ターゲット顧客）", "現状何が起きているか", "問題の深刻さ（数字）", "なぜ既存解決策で不十分か"],
  },
  {
    id: "s3", title: "ソリューション", icon: Zap,
    description: "提供するソリューション・プロダクト",
    completed: false,
    tips: "スクリーンショット・デモ動画が最も説得力を持ちます。「課題→解決」の流れを明確に。",
    guidePoints: ["プロダクトの概要・スクリーンショット", "主要機能（最大3つ）", "課題との対応関係", "ユーザー体験の改善"],
  },
  {
    id: "s4", title: "市場規模", icon: Target,
    description: "TAM / SAM / SOM の推計",
    completed: false,
    tips: "トップダウン（市場調査）とボトムアップ（顧客数×単価）の両方で推計。合理的な根拠を示すことが重要。",
    guidePoints: ["TAM（全体市場）", "SAM（到達可能市場）", "SOM（取れる市場）", "市場成長率・トレンド"],
  },
  {
    id: "s5", title: "ビジネスモデル", icon: DollarSign,
    description: "収益モデル・価格設定・ユニットエコノミクス",
    completed: false,
    tips: "「誰が」「何に」「いくら」払うかを明確に。LTV/CAC比率が3x以上であることを示せると強い。",
    guidePoints: ["収益モデル（SaaS/取引手数料/広告等）", "価格プランと根拠", "LTV・CAC・Gross Margin", "収益の繰り返し性・スケール性"],
  },
  {
    id: "s6", title: "トラクション", icon: TrendingUp,
    description: "実績・成長指標・顧客の声",
    completed: false,
    tips: "右肩上がりのグラフが最強のエビデンス。MRR成長・顧客数・NPS等を時系列で示しましょう。",
    guidePoints: ["MRR/ARR推移", "顧客数・成長率", "著名顧客・ロゴ", "NPS・顧客の声"],
  },
  {
    id: "s7", title: "競合優位性", icon: Target,
    description: "競合との違い・参入障壁",
    completed: false,
    tips: "2x2マトリクスが定番。「なぜ自社が勝てるか」の構造的な理由（技術・ネットワーク効果・ブランド等）を示す。",
    guidePoints: ["競合マップ（2x2）", "自社の強み・差別化ポイント", "参入障壁（Moat）", "競合が追随できない理由"],
  },
  {
    id: "s8", title: "チーム", icon: Users,
    description: "創業メンバーの経歴・この問題を解く理由",
    completed: false,
    tips: "「なぜこのチームがこの課題を解くべきか」を伝える。業界経験・技術力・過去の実績を前面に。",
    guidePoints: ["創業者のバックグラウンド", "この問題に取り組む理由（Why Us）", "補完的なスキルセット", "アドバイザー・主要メンバー"],
  },
  {
    id: "s9", title: "資金計画", icon: DollarSign,
    description: "調達額・使途・マイルストーン",
    completed: false,
    tips: "「いくら調達して・何に使って・何を達成するか」をセットで伝える。次の調達に向けたKPI目標を示す。",
    guidePoints: ["調達金額・バリュエーション", "資金使途の内訳（%）", "18-24ヶ月のマイルストーン", "次のラウンドへの道筋"],
  },
];

const STORAGE_KEY = "runwith-pitch-slides";

export default function PitchDeckPage() {
  const [slides, setSlides] = useState<Slide[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Slide[];
        return defaultSlides.map((d) => {
          const saved = parsed.find(s => s.id === d.id);
          return { ...d, content: saved?.content ?? "", completed: saved?.completed ?? false };
        });
      }
    } catch { /* ignore */ }
    return defaultSlides.map(d => ({ ...d, content: "", completed: false }));
  });
  const [selected, setSelected] = useState<string>("s1");
  const [saveIndicator, setSaveIndicator] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slides.map(s => ({ id: s.id, content: s.content, completed: s.completed }))));
  }, [slides]);

  const selectedSlide = slides.find(s => s.id === selected)!;
  const completed = slides.filter(s => s.completed).length;

  const updateContent = (content: string) => {
    setSlides(slides.map(s => s.id === selected ? { ...s, content } : s));
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 1500);
  };

  const toggleCompleted = () => {
    setSlides(slides.map(s => s.id === selected ? { ...s, completed: !s.completed } : s));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ピッチ資料作成</h1>
        <p className="mt-1 text-slate-500">9枚構成の投資家向けピッチデッキを作成。内容は自動保存されます。</p>
      </div>

      {/* 進捗サマリー */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">作成進捗</span>
            <span className="font-bold text-slate-900">{completed} / {slides.length} 完了</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completed === slides.length ? "bg-emerald-500" : "bg-gradient-to-r from-primary-500 to-accent-500"}`}
              style={{ width: `${(completed / slides.length) * 100}%` }}
            />
          </div>
        </div>
        {saveIndicator && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Save className="h-3.5 w-3.5" /> 保存済
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* スライドリスト */}
        <div className="space-y-1.5">
          {slides.map((slide, idx) => {
            const Icon = slide.icon;
            const isActive = slide.id === selected;
            return (
              <button
                key={slide.id}
                onClick={() => setSelected(slide.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? "border-primary-300 bg-primary-50 shadow-sm"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-primary-100" : "bg-slate-100"}`}>
                  <span className="text-xs font-bold text-slate-600">{idx + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isActive ? "text-primary-800" : "text-slate-700"}`}>
                    {slide.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{slide.description}</p>
                </div>
                {slide.completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : slide.content ? (
                  <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-200" />
                )}
              </button>
            );
          })}
        </div>

        {/* 編集エリア */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {slides.findIndex(s => s.id === selected) + 1}. {selectedSlide.title}
                </h2>
                <p className="text-sm text-slate-500">{selectedSlide.description}</p>
              </div>
              <button
                onClick={toggleCompleted}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedSlide.completed
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {selectedSlide.completed ? "完了済み" : "完了にする"}
              </button>
            </div>

            {/* ガイドポイント */}
            <div className="mb-4 rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold text-slate-600">このスライドに含めること</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {selectedSlide.guidePoints.map((pt, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                    {pt}
                  </div>
                ))}
              </div>
            </div>

            {/* ヒント */}
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed text-amber-800">{selectedSlide.tips}</p>
            </div>

            {/* テキストエリア */}
            <label className="mb-1.5 block text-sm font-medium text-slate-700">メモ・下書き</label>
            <textarea
              rows={10}
              value={selectedSlide.content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder={`「${selectedSlide.title}」の内容をメモしてください...\n\n例:\n${selectedSlide.guidePoints.map(p => `• ${p}`).join("\n")}`}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-800 placeholder-slate-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <p className="mt-2 text-xs text-slate-400">自動保存されます</p>
          </div>

          {/* プレビュー */}
          <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-sm">
            <div className="flex h-full flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Slide {slides.findIndex(s => s.id === selected) + 1} / {slides.length}
              </p>
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="text-2xl font-extrabold text-white">{selectedSlide.title}</p>
                {selectedSlide.content ? (
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400 line-clamp-4">
                    {selectedSlide.content}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">{selectedSlide.description}</p>
                )}
              </div>
              <div className="flex justify-center gap-1.5">
                {slides.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                    className={`h-1.5 rounded-full transition-all ${s.id === selected ? "w-6 bg-white" : "w-1.5 bg-slate-600"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
