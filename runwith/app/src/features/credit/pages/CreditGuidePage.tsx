import { useState } from "react";
import {
  CreditCard,
  Check,
  ExternalLink,
  Info,
  Percent,
  Shield,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Building2,
  Globe,
} from "lucide-react";
import { useProgressStore, TASK_IDS } from "../../../store/progress";

interface Card {
  name: string;
  issuer: string;
  annualFee: string;
  pointRate: string;
  limit: string;
  features: string[];
  url: string;
  recommended: boolean;
  color: string;
  category: "スタートアップ向け" | "一般向け" | "プレミアム";
  applicationDifficulty: "easy" | "medium" | "hard";
  notes?: string;
}

const cards: Card[] = [
  {
    name: "freee カード Unlimited",
    issuer: "freee finance lab",
    annualFee: "永年無料",
    pointRate: "0.5%",
    limit: "最大5,000万円",
    features: ["設立直後でも申請可能", "freee会計と自動連携", "限度額が大きい", "リアルタイム明細通知"],
    url: "https://www.freee.co.jp/corp-card/",
    recommended: true,
    color: "from-blue-500 to-blue-600",
    category: "スタートアップ向け",
    applicationDifficulty: "easy",
    notes: "freee会計ユーザーなら経費が自動仕訳される。設立直後から高限度額が強み。",
  },
  {
    name: "UPSIDER",
    issuer: "UPSIDER株式会社",
    annualFee: "永年無料",
    pointRate: "1.0%",
    limit: "最大数億円",
    features: ["還元率1%（業界最高水準）", "バーチャルカード即時発行", "スタートアップ向け設計", "会計ソフト全般と連携", "追加カード無制限"],
    url: "https://up-sider.com/",
    recommended: true,
    color: "from-violet-500 to-purple-600",
    category: "スタートアップ向け",
    applicationDifficulty: "easy",
    notes: "還元率1%は法人カードとして最高水準。成長中のスタートアップにとって支出が多いほど得。",
  },
  {
    name: "マネーフォワード ビジネスカード",
    issuer: "マネーフォワード",
    annualFee: "永年無料",
    pointRate: "1.0%",
    limit: "最大3,000万円",
    features: ["MFクラウド会計と自動連携", "還元率1%", "設立直後OK", "リアルタイム明細", "チームカード発行可"],
    url: "https://biz.moneyforward.com/card/",
    recommended: true,
    color: "from-teal-500 to-emerald-600",
    category: "スタートアップ向け",
    applicationDifficulty: "easy",
    notes: "マネーフォワード会計ユーザーに最適。全経費が自動仕訳される。",
  },
  {
    name: "PAILD（ペイルド）",
    issuer: "Handii株式会社",
    annualFee: "月1,000円〜",
    pointRate: "-",
    limit: "チャージ式（上限設定可）",
    features: ["プリペイド式で使いすぎ防止", "カード枚数無制限", "リアルタイム明細", "部門別管理が可能", "即日発行"],
    url: "https://paild.io/",
    recommended: false,
    color: "from-emerald-500 to-teal-600",
    category: "スタートアップ向け",
    applicationDifficulty: "easy",
    notes: "複数の従業員や部門にカードを配布し、使いすぎを管理したい場合に最適。",
  },
  {
    name: "三井住友カード ビジネスオーナーズ",
    issuer: "三井住友カード",
    annualFee: "永年無料",
    pointRate: "0.5%〜1.5%",
    limit: "最大500万円",
    features: ["ETCカード年会費無料", "海外旅行傷害保険付帯", "Apple Pay / Google Pay対応", "ポイント還元が高い"],
    url: "https://www.smbc-card.com/hojin/",
    recommended: false,
    color: "from-green-500 to-green-600",
    category: "一般向け",
    applicationDifficulty: "medium",
    notes: "個人事業主・設立間もない法人向けのポジション。通常の法人カードより審査が通りやすい。",
  },
  {
    name: "JCBビジネスプラスカード",
    issuer: "ジェーシービー",
    annualFee: "1,375円（初年度無料）",
    pointRate: "0.5%",
    limit: "最大300万円",
    features: ["国内外でポイント還元", "ビジネスサポートサービス", "クラウドサービス優待", "国内旅行傷害保険"],
    url: "https://www.jcb.co.jp/corporate/",
    recommended: false,
    color: "from-blue-600 to-blue-700",
    category: "一般向け",
    applicationDifficulty: "medium",
    notes: "JCBの法人カード入門版。国内での利用に特化。",
  },
  {
    name: "アメックス ビジネス・ゴールド",
    issuer: "アメリカン・エキスプレス",
    annualFee: "36,300円",
    pointRate: "1.0%",
    limit: "一律の制限なし（利用状況で変動）",
    features: ["プレミアム空港ラウンジ", "海外旅行傷害保険が手厚い", "ビジネス特典多数", "コンシェルジュサービス"],
    url: "https://www.americanexpress.com/ja-jp/business/",
    recommended: false,
    color: "from-amber-500 to-yellow-600",
    category: "プレミアム",
    applicationDifficulty: "hard",
    notes: "出張・接待が多い成長期〜シリーズA以降の企業に。限度額上限なしが最大の強み。",
  },
  {
    name: "ダイナースクラブ ビジネスカード",
    issuer: "三井住友トラストクラブ",
    annualFee: "27,500円",
    pointRate: "0.5%",
    limit: "一律の制限なし",
    features: ["ダイナースラウンジ利用可", "接待・会食に信用力", "国際ブランド最高峰", "ゴルフ特典・旅行特典"],
    url: "https://www.diners.co.jp/",
    recommended: false,
    color: "from-slate-600 to-slate-700",
    category: "プレミアム",
    applicationDifficulty: "hard",
    notes: "シリーズB以降、接待や海外出張が多い経営者向け。信用力のアピールにもなる。",
  },
];

const categoryFilters = ["すべて", "スタートアップ向け", "一般向け", "プレミアム"] as const;

const difficultyConfig = {
  easy: { label: "申込みやすい", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "標準審査", color: "bg-amber-50 text-amber-700 border-amber-200" },
  hard: { label: "審査厳しめ", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function CreditGuidePage() {
  const [activeCategory, setActiveCategory] = useState<typeof categoryFilters[number]>("すべて");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { isDone, toggleTask } = useProgressStore();

  const filtered = cards.filter((c) => activeCategory === "すべて" || c.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">法人カードガイド</h1>
          <p className="mt-1 text-sm text-slate-500">
            スタートアップに最適な法人カード{cards.length}枚を比較。設立直後から使えるカードも紹介します。
          </p>
        </div>
        <button
          onClick={() => toggleTask(TASK_IDS.CREDIT_APPLIED)}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            isDone(TASK_IDS.CREDIT_APPLIED)
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isDone(TASK_IDS.CREDIT_APPLIED) ? "申込済み ✓" : "申込完了にする"}
        </button>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "比較対象", value: `${cards.length}枚`, icon: CreditCard, color: "text-primary-600 bg-primary-50" },
          { label: "設立直後OK", value: `${cards.filter(c => c.applicationDifficulty === "easy").length}枚`, icon: Zap, color: "text-emerald-600 bg-emerald-50" },
          { label: "年会費無料", value: `${cards.filter(c => c.annualFee.includes("無料")).length}枚`, icon: CheckCircle2, color: "text-violet-600 bg-violet-50" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-slate-900">{item.value}</p>
              <p className="text-[11px] text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </div>

      {/* アドバイス */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">フェーズ別の選び方</p>
            <div className="mt-2 space-y-1.5">
              {[
                { phase: "設立直後〜シードまで", rec: "UPSIDER・freeeカード・MFビジネスカードの中から会計ソフトに合わせて1枚" },
                { phase: "アーリー〜シリーズAまで", rec: "上記に加えて三井住友ビジネスオーナーズを補助カードとして追加" },
                { phase: "シリーズB以降・出張多い場合", rec: "アメックス・ゴールドやダイナースで信用力をアピール" },
              ].map((item) => (
                <p key={item.phase} className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0 text-blue-600 font-medium">▸</span>
                  <span><strong>{item.phase}：</strong>{item.rec}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        {categoryFilters.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
            {cat !== "すべて" && (
              <span className="ml-1.5 text-[10px] opacity-70">
                {cards.filter(c => c.category === cat).length}枚
              </span>
            )}
          </button>
        ))}
      </div>

      {/* カードリスト */}
      <div className="space-y-3">
        {filtered.map((card) => {
          const diff = difficultyConfig[card.applicationDifficulty];
          const isExpanded = expandedCard === card.name;

          return (
            <div
              key={card.name}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
                card.recommended ? "border-primary-200 ring-1 ring-primary-100" : "border-slate-200/60"
              }`}
            >
              {/* カードヘッダー */}
              <div className={`bg-gradient-to-r ${card.color} px-5 py-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/70">{card.issuer}</p>
                    <h3 className="text-base font-bold text-white">{card.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {card.recommended && (
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                        おすすめ
                      </span>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium bg-white/10 border-white/20 text-white`}>
                      {card.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* 基本情報 */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : card.name)}
                className="w-full p-5 text-left hover:bg-slate-50/50"
              >
                <div className="mb-3 grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <CreditCard className="h-3 w-3" /> 年会費
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{card.annualFee}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Percent className="h-3 w-3" /> 還元率
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{card.pointRate}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Shield className="h-3 w-3" /> 限度額
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{card.limit}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {card.features.slice(0, 3).map((f) => (
                      <span key={f} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        <Check className="h-2.5 w-2.5 text-emerald-500" />
                        {f}
                      </span>
                    ))}
                    {card.features.length > 3 && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400">
                        +{card.features.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium ${diff.color}`}>
                      {diff.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* 展開コンテンツ */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                  {card.notes && (
                    <div className="rounded-lg bg-primary-50 p-3 text-xs text-primary-800">
                      {card.notes}
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">全ての特徴</p>
                    <div className="flex flex-wrap gap-1.5">
                      {card.features.map((f) => (
                        <span key={f} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                          <Check className="h-3 w-3 text-emerald-500" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <a
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-700"
                  >
                    公式サイトで申し込む
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 比較のポイント */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-900">法人カード選びの重要ポイント</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "審査通過率を優先",
              desc: "設立直後はUPSIDER・freeeカード・MFビジネスカードがベスト。個人信用スコア不問のケースも。",
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              icon: Building2,
              title: "会計ソフトとの連携",
              desc: "freee会計→freeeカード、マネーフォワード→MFカードと合わせると経費処理が完全自動化。",
              color: "bg-blue-50 text-blue-600",
            },
            {
              icon: Globe,
              title: "海外利用・出張",
              desc: "海外出張が多い場合はアメックスかダイナース。空港ラウンジや旅行保険が充実している。",
              color: "bg-violet-50 text-violet-600",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl bg-slate-50 p-3">
                <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-slate-800">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 注記 */}
      <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-500">
        ※ 年会費・還元率・限度額は各カード会社の判断で変更される場合があります。最新情報は必ず各公式サイトでご確認ください。
        ※ 審査結果は申込者の状況により異なります。掲載情報は2026年3月時点の目安です。
      </div>
    </div>
  );
}
