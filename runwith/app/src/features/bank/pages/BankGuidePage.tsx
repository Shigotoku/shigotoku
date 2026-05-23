import { useState } from "react";
import {
  Check,
  ExternalLink,
  Info,
  Clock,
  CheckCircle2,
  TrendingUp,
  Banknote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useProgressStore, TASK_IDS } from "../../../store/progress";

interface Bank {
  name: string;
  type: "ネット銀行" | "メガバンク" | "地方銀行・その他";
  difficulty: "easy" | "medium" | "hard";
  openingTime: string;
  monthlyFee: string;
  transferFee: string;
  features: string[];
  requirements: string[];
  url: string;
  recommended: boolean;
  tag?: string;
  tagColor?: string;
  notes?: string;
}

const banks: Bank[] = [
  {
    name: "GMOあおぞらネット銀行",
    type: "ネット銀行",
    difficulty: "easy",
    openingTime: "最短即日",
    monthlyFee: "無料",
    transferFee: "145円〜（GMO系は無料）",
    features: ["振込手数料が業界最安クラス", "API連携・freee/MF対応", "バーチャルオフィスOK", "設立直後OK"],
    requirements: ["登記簿謄本", "代表者の本人確認書類", "法人番号"],
    url: "https://gmo-aozora.com/",
    recommended: true,
    tag: "スタートアップ最適",
    tagColor: "bg-primary-100 text-primary-700",
    notes: "スタートアップの第1口座として最も選ばれている銀行。APIでの会計連携が充実。",
  },
  {
    name: "住信SBIネット銀行",
    type: "ネット銀行",
    difficulty: "easy",
    openingTime: "約1週間",
    monthlyFee: "無料",
    transferFee: "157円（月3回無料）",
    features: ["他行宛振込が月3回無料", "スマート認証NEO対応", "デビットカード付帯", "バーチャルオフィスOK"],
    requirements: ["登記簿謄本", "代表者の本人確認書類"],
    url: "https://www.netbk.co.jp/",
    recommended: true,
    tag: "手数料お得",
    tagColor: "bg-emerald-100 text-emerald-700",
    notes: "月3回の他行宛振込無料が魅力。SBI証券との連携でIPO準備にも有利。",
  },
  {
    name: "楽天銀行（法人）",
    type: "ネット銀行",
    difficulty: "easy",
    openingTime: "約1〜2週間",
    monthlyFee: "無料",
    transferFee: "145円〜（楽天銀行間は52円）",
    features: ["楽天ビジネスカード連携", "楽天市場出店に必須", "振込手数料が安い", "法人デビットカード対応"],
    requirements: ["登記簿謄本", "代表者の本人確認書類"],
    url: "https://www.rakuten-bank.co.jp/corp/",
    recommended: false,
    tag: "EC事業者向け",
    tagColor: "bg-red-100 text-red-700",
    notes: "楽天市場に出店予定の企業やEC事業者に特にメリットが大きい。",
  },
  {
    name: "PayPay銀行（法人）",
    type: "ネット銀行",
    difficulty: "easy",
    openingTime: "約1週間",
    monthlyFee: "無料",
    transferFee: "176円",
    features: ["Visaデビットカード付帯", "創業間もない法人もOK", "ヤフーショッピング連携", "Yahoo!ビジネスセンター連携"],
    requirements: ["登記簿謄本", "代表者の本人確認書類"],
    url: "https://www.paypay-bank.co.jp/business/",
    recommended: false,
    notes: "Yahoo!・PayPayサービスを活用したビジネスに有利。",
  },
  {
    name: "三菱UFJ銀行",
    type: "メガバンク",
    difficulty: "hard",
    openingTime: "2〜4週間",
    monthlyFee: "550円〜（一定条件で無料）",
    transferFee: "330円〜",
    features: ["日本最大の信用力", "海外送金・貿易金融に強い", "融資・VC紹介に繋がりやすい", "法人向け各種サービス充実"],
    requirements: ["登記簿謄本", "定款", "代表者の本人確認書類", "事業計画書", "賃貸借契約書"],
    url: "https://www.bk.mufg.jp/",
    recommended: false,
    tag: "信用力最高",
    tagColor: "bg-slate-100 text-slate-600",
    notes: "設立後1〜2年経過し、売上実績が出てから申し込むのが現実的。",
  },
  {
    name: "三井住友銀行",
    type: "メガバンク",
    difficulty: "hard",
    openingTime: "2〜4週間",
    monthlyFee: "550円〜",
    transferFee: "330円〜",
    features: ["法人向けサービスが充実", "スタートアップ支援プログラム", "融資審査のフットワーク軽", "SMBCグループの力"],
    requirements: ["登記簿謄本", "定款", "代表者の本人確認書類", "事業計画書"],
    url: "https://www.smbc.co.jp/",
    recommended: false,
    notes: "SMBCベンチャーキャピタルとの繋がりも。IPO準備段階での口座は持っておきたい。",
  },
  {
    name: "みずほ銀行",
    type: "メガバンク",
    difficulty: "medium",
    openingTime: "2〜3週間",
    monthlyFee: "無料（条件あり）",
    transferFee: "220円〜",
    features: ["スタートアップ支援に積極的", "みずほ銀行スタートアップ窓口あり", "海外展開サポート", "デジタル口座"],
    requirements: ["登記簿謄本", "定款", "代表者の本人確認書類", "事業概要書"],
    url: "https://www.mizuhobank.co.jp/corporate/",
    recommended: false,
    tag: "スタートアップに積極的",
    tagColor: "bg-teal-100 text-teal-700",
    notes: "3メガバンクの中では比較的スタートアップに対して柔軟な姿勢。",
  },
  {
    name: "ゆうちょ銀行（振替口座）",
    type: "地方銀行・その他",
    difficulty: "easy",
    openingTime: "約2週間",
    monthlyFee: "無料",
    transferFee: "定額（振替は安い）",
    features: ["全国に郵便局・ATM", "振替口座で口座振替に強い", "加入者払込に対応", "設立直後もOK"],
    requirements: ["登記簿謄本", "代表者の本人確認書類", "法人印鑑"],
    url: "https://www.jp-bank.japanpost.jp/",
    recommended: false,
    notes: "会員費・年会費等の集金や口座振替サービスを行う場合に便利。",
  },
];

const difficultyConfig = {
  easy: { label: "開設しやすい", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "やや難しい", color: "bg-amber-50 text-amber-700 border-amber-200" },
  hard: { label: "審査厳しめ", color: "bg-red-50 text-red-600 border-red-200" },
};

const typeFilters = ["すべて", "ネット銀行", "メガバンク", "地方銀行・その他"] as const;

export default function BankGuidePage() {
  const [filter, setFilter] = useState<typeof typeFilters[number]>("すべて");
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const { isDone, toggleTask } = useProgressStore();

  const filtered = banks.filter((b) => filter === "すべて" || b.type === filter);
  const easyCount = banks.filter(b => b.difficulty === "easy").length;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">銀行口座開設ガイド</h1>
          <p className="mt-1 text-sm text-slate-500">
            法人口座の開設手順と{banks.length}行の比較。スタートアップに最適な口座を見つけましょう。
          </p>
        </div>
        <button
          onClick={() => toggleTask(TASK_IDS.BANK_OPENED)}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            isDone(TASK_IDS.BANK_OPENED)
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isDone(TASK_IDS.BANK_OPENED) ? "口座開設済み ✓" : "開設完了にする"}
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "比較対象", value: `${banks.length}行`, icon: Banknote, color: "text-primary-600 bg-primary-50" },
          { label: "設立直後OK", value: `${easyCount}行`, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { label: "推奨口座", value: `${banks.filter(b => b.recommended).length}行`, icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
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

      {/* ガイダンス */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">スタートアップの口座開設戦略</p>
            <p className="mt-1 leading-relaxed">
              <strong>Step 1：</strong>まずGMOあおぞらか住信SBIでネット銀行口座を開設（設立直後でもOK）。
              <strong> Step 2：</strong>売上実績を6ヶ月〜1年積んでからメガバンクに申し込む。
              ネット銀行は振込手数料が安く、API連携も充実しているので、普段使いはネット銀行がベスト。
            </p>
          </div>
        </div>
      </div>

      {/* 開設の流れ */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-900">法人口座開設の一般的な流れ</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { step: "01", title: "必要書類を準備", desc: "登記簿謄本・代表者本人確認書類・定款（コピー可）" },
            { step: "02", title: "オンライン申込", desc: "各銀行のWebサイトから申込フォームを入力" },
            { step: "03", title: "審査・確認", desc: "銀行側で書類審査。追加書類を求められる場合も" },
            { step: "04", title: "口座開設完了", desc: "キャッシュカード・通帳が郵送で届く（ネット銀行はアプリ）" },
          ].map((item) => (
            <div key={item.step} className="rounded-xl bg-slate-50 p-3">
              <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                {item.step}
              </div>
              <p className="text-xs font-semibold text-slate-800">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === f
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f}
            {f !== "すべて" && (
              <span className="ml-1.5 text-[10px] opacity-70">
                {banks.filter(b => b.type === f).length}行
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 比較ヘッダー */}
      <div className="hidden grid-cols-5 gap-2 px-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
        <div className="col-span-2">銀行名</div>
        <div>開設期間</div>
        <div>月額手数料</div>
        <div>振込手数料</div>
      </div>

      {/* 銀行カードリスト */}
      <div className="space-y-3">
        {filtered.map((bank) => {
          const diff = difficultyConfig[bank.difficulty];
          const isExpanded = expandedBank === bank.name;
          return (
            <div
              key={bank.name}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                bank.recommended ? "border-primary-200 ring-1 ring-primary-100" : "border-slate-200/60"
              }`}
            >
              {/* 概要行（クリックで展開） */}
              <button
                onClick={() => setExpandedBank(isExpanded ? null : bank.name)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50/50"
              >
                <div className="min-w-0 flex-1 sm:grid sm:grid-cols-5 sm:gap-3 sm:items-center">
                  {/* 銀行名 */}
                  <div className="col-span-2 mb-2 sm:mb-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900">{bank.name}</h3>
                      {bank.recommended && (
                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[9px] font-bold text-primary-700">おすすめ</span>
                      )}
                      {bank.tag && (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${bank.tagColor}`}>{bank.tag}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{bank.type}</p>
                  </div>
                  {/* 開設期間 */}
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1 text-sm text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {bank.openingTime}
                    </div>
                  </div>
                  {/* 月額 */}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-slate-700">{bank.monthlyFee}</p>
                    <p className="text-[10px] text-slate-400">月額</p>
                  </div>
                  {/* 振込手数料 */}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-slate-700">{bank.transferFee}</p>
                    <p className="text-[10px] text-slate-400">振込手数料</p>
                  </div>
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
              </button>

              {/* 展開コンテンツ */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                  {/* モバイル向け基本情報 */}
                  <div className="grid grid-cols-2 gap-3 sm:hidden text-sm">
                    <div>
                      <p className="text-xs text-slate-400">開設期間</p>
                      <p className="font-medium text-slate-800">{bank.openingTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">月額手数料</p>
                      <p className="font-medium text-slate-800">{bank.monthlyFee}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">振込手数料</p>
                      <p className="font-medium text-slate-800">{bank.transferFee}</p>
                    </div>
                  </div>

                  {bank.notes && (
                    <div className="rounded-lg bg-primary-50 p-3 text-xs text-primary-800">
                      {bank.notes}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500">特徴</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bank.features.map((f) => (
                          <span key={f} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500">必要書類</p>
                      <ul className="space-y-1">
                        {bank.requirements.map((r) => (
                          <li key={r} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <a
                    href={bank.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-700"
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

      {/* 注記 */}
      <div className="rounded-xl bg-slate-50 p-4 text-[11px] text-slate-500">
        ※ 手数料・審査基準は各金融機関の判断で変更される場合があります。最新情報は必ず各公式サイトでご確認ください。
        ※ 表示の手数料は2026年3月時点の目安です。
      </div>
    </div>
  );
}
