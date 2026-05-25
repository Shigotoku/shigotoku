import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";
import {
  CheckCircle2, Circle, CreditCard, ExternalLink,
  ArrowRight, Lightbulb, Info, AlertCircle,
  Stamp, Globe, Calculator, ChevronDown, ChevronUp,
} from "lucide-react";

const STORAGE_KEY = "post-registration-done";

interface StepItem {
  id: string;
  title: string;
  icon: typeof Stamp;
  summary: string;
  link?: string;
  linkLabel?: string;
  externalLink?: string;
  externalLabel?: string;
  details: string[];
  tips: string[];
  warnings?: string[];
  estimatedTime: string;
}

const steps: StepItem[] = [
  {
    id: "seal-card",
    title: "印鑑カード交付申請",
    icon: Stamp,
    summary: "法務局で印鑑カードを取得（登記事項証明書の取得に必要）",
    estimatedTime: "即日〜1日",
    details: [
      "法人登記完了後、登記した法務局の窓口で申請",
      "「印鑑カード交付申請書」に記入して提出",
      "印鑑届出時に届出した代表者印を持参",
      "印鑑カードがあれば、証明書自動交付機で登記事項証明書を取得可能",
      "オンラインでの登記事項証明書請求にも印鑑カード番号が必要",
    ],
    tips: [
      "登記完了後すぐに取得しましょう。銀行口座開設に登記事項証明書が必要です",
      "登記事項証明書（履歴事項全部証明書）は複数枚取得しておくと便利（銀行、税務署、年金事務所等で必要）",
    ],
  },
  {
    id: "gbizid",
    title: "GBizIDプライムを取得する",
    icon: Globe,
    summary: "補助金申請に必須の法人認証ID",
    externalLink: "https://gbiz-id.go.jp/top/",
    externalLabel: "GBizID公式サイト",
    estimatedTime: "1〜2週間",
    details: [
      "GBizIDプライムは法人代表者のみが取得できるアカウント",
      "jGrants（補助金申請システム）の利用に必須",
      "e-Gov（電子政府）での届出にも利用可能",
      "申請後、印鑑証明書の郵送が必要（審査に1〜2週間）",
    ],
    tips: [
      "補助金申請を予定している場合は早めに取得開始しましょう。審査に時間がかかります",
      "法人の印鑑証明書が必要なので、印鑑カードを先に取得してください",
      "GBizIDエントリー（簡易版）もありますが、補助金申請にはプライムが必要です",
    ],
    warnings: [
      "申請から取得まで1〜2週間かかるため、補助金の締切に間に合わなくならないよう早めに申請してください",
    ],
  },
  {
    id: "accounting",
    title: "会計ソフトを導入する",
    icon: Calculator,
    summary: "日々の記帳と確定申告の準備",
    estimatedTime: "即日",
    details: [
      "法人設立後すぐに導入し、設立日からの取引を記帳開始",
      "銀行口座・クレジットカードと連携して自動仕訳",
      "決算書・確定申告書の作成をサポート",
    ],
    tips: [
      "設立初日から経費が発生します。早めの導入が記帳漏れを防ぎます",
      "クラウド会計ソフトなら税理士との共有も簡単です",
      "スタートアップ向けの無料プランがあるサービスもあります",
    ],
  },
];

const accountingSoftware = [
  { name: "freee会計", url: "https://www.freee.co.jp/", desc: "スタートアップに人気。直感的なUI", price: "月額2,380円〜" },
  { name: "マネーフォワードクラウド", url: "https://biz.moneyforward.com/", desc: "機能が豊富。税理士利用率が高い", price: "月額2,980円〜" },
  { name: "弥生会計オンライン", url: "https://www.yayoi-kk.co.jp/", desc: "老舗の信頼感。サポートが手厚い", price: "月額2,200円〜" },
];

export default function PostRegistrationPage() {
  const location = useLocation();
  const [doneItems, setDoneItems] = useCompanyStorageState<Record<string, boolean>>(STORAGE_KEY, {});
  const [openStep, setOpenStep] = useState<string | null>("seal-card");

  useEffect(() => {
    const state = location.state as { openStep?: string } | null;
    if (state?.openStep) {
      setOpenStep(state.openStep);
    }
  }, [location.state]);

  const toggleDone = (id: string) => {
    setDoneItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const doneCount = Object.values(doneItems).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">登記後の手続き</h1>
        <p className="mt-1 text-sm text-slate-500">
          法人登記が完了したら、以下の手続きを進めましょう
        </p>
      </div>

      {/* 進捗 */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">手続き進捗</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">
              <span className="text-blue-600">{doneCount}</span> / {steps.length} 完了
            </p>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ステップ一覧 */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isOpen = openStep === step.id;
          const isDone = !!doneItems[step.id];

          return (
            <div key={step.id} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
              <button
                onClick={() => setOpenStep(isOpen ? null : step.id)}
                className="flex w-full items-center gap-3 p-5 text-left"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {idx + 1}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleDone(step.id); }}
                  className="shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                </button>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold ${isDone ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500">{step.summary}</p>
                </div>
                <span className="hidden text-[11px] text-slate-400 sm:block">{step.estimatedTime}</span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-slate-100 px-5 pb-5 pt-3">
                  <ul className="space-y-1.5">
                    {step.details.map((d, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-600">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        {d}
                      </li>
                    ))}
                  </ul>

                  {step.externalLink && (
                    <a
                      href={step.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {step.externalLabel}
                    </a>
                  )}

                  {step.link && (
                    <Link
                      to={step.link}
                      state={{ fromJourney: true }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                    >
                      {step.linkLabel} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}

                  {step.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      {tip}
                    </div>
                  ))}

                  {step.warnings?.map((w, i) => (
                    <div key={i} className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      {w}
                    </div>
                  ))}

                  {step.id === "accounting" && (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {accountingSoftware.map((sw) => (
                        <a
                          key={sw.name}
                          href={sw.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-slate-200 p-3 transition-all hover:border-primary-300 hover:shadow-sm"
                        >
                          <h4 className="text-sm font-bold text-slate-900">{sw.name}</h4>
                          <p className="text-[11px] text-slate-500">{sw.desc}</p>
                          <p className="mt-1 text-[11px] font-medium text-primary-600">{sw.price}</p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 次のステップ */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/bank"
          state={{ fromJourney: true }}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">法人口座を開設する</h3>
            <p className="text-xs text-slate-500">ネット銀行は審査が速い</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
        <Link
          to="/credit"
          state={{ fromJourney: true }}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <CreditCard className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">法人カードを作成する</h3>
            <p className="text-xs text-slate-500">設立直後でも作れるカードを選定</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
