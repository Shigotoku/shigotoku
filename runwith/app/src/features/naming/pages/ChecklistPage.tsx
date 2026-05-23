import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  AlertTriangle,
  PartyPopper,
  RotateCcw,
  ChevronLeft,
} from "lucide-react";

interface CheckItem {
  id: string;
  label: string;
  description: string;
  link?: { label: string; url: string };
  category: string;
}

const checkItems: CheckItem[] = [
  {
    id: "name",
    label: "商標名（サービス名）を決定した",
    description:
      "ネーミング生成ツールやJ-PlatPatで類似商標を確認し、名前を確定させましょう。",
    link: { label: "J-PlatPat", url: "https://www.j-platpat.inpit.go.jp/" },
    category: "事前準備",
  },
  {
    id: "category",
    label: "出願する区分（ジャンル）を決定した",
    description:
      "区分選択ナビを使って、サービスに合った区分を選びましょう。IT系なら第9類・第42類が基本です。",
    category: "事前準備",
  },
  {
    id: "mynumber",
    label: "マイナンバーカードを持っている",
    description:
      "電子出願にはマイナンバーカード（または電子証明書）が必要です。未取得の場合は市区町村の窓口で申請できます。",
    link: {
      label: "マイナンバーカード申請方法",
      url: "https://www.kojinbango-card.go.jp/apprec/",
    },
    category: "必要なもの",
  },
  {
    id: "cardreader",
    label: "ICカードリーダーを持っている（スマホ代用可）",
    description:
      "マイナンバーカードを読み取るためのICカードリーダーが必要です。NFC対応のスマートフォンでも代用できます。",
    category: "必要なもの",
  },
  {
    id: "pc",
    label: "出願用のパソコンを用意した",
    description:
      "インターネット出願ソフトはWindows / Mac両対応です。安定したインターネット接続が必要です。",
    category: "必要なもの",
  },
  {
    id: "software",
    label: "インターネット出願ソフトをインストールした",
    description:
      "特許庁が無料で提供する公式ソフトです。ダウンロードしてPCにインストールします。",
    link: {
      label: "インターネット出願ソフト",
      url: "https://www.pcinfo.jpo.go.jp/site/1_start/step1.html",
    },
    category: "ソフトウェア設定",
  },
  {
    id: "cert",
    label: "電子証明書の設定を完了した",
    description:
      "インターネット出願ソフトにマイナンバーカードの電子証明書を登録します。",
    link: {
      label: "設定手順ガイド",
      url: "https://www.pcinfo.jpo.go.jp/site/1_start/step2.html",
    },
    category: "ソフトウェア設定",
  },
  {
    id: "applicant",
    label: "識別番号を取得した（初めての方のみ）",
    description:
      "特許庁に初めて出願する場合、「申請人利用登録」を行い識別番号を取得する必要があります。",
    link: {
      label: "申請人利用登録",
      url: "https://www.pcinfo.jpo.go.jp/site/2_app/guide2.html",
    },
    category: "ソフトウェア設定",
  },
  {
    id: "document",
    label: "願書（出願書類）を作成した",
    description:
      "出願ソフトのテンプレートに沿って、商標名、区分、出願人情報を入力します。標準文字で出願するのが一番シンプルです。",
    category: "出願",
  },
  {
    id: "payment",
    label: "出願料の支払い方法を確認した",
    description:
      "クレジットカード、Pay-easy（ペイジー）、予納（事前入金）などの方法で支払えます。",
    link: {
      label: "手数料の支払い方法",
      url: "https://www.jpo.go.jp/system/process/tesuryo/index.html",
    },
    category: "出願",
  },
  {
    id: "submit",
    label: "出願を送信した！",
    description:
      "すべての準備が完了したら、出願ソフトから電子署名をして送信ボタンを押します。お疲れ様でした！",
    category: "出願",
  },
  {
    id: "fasttrack",
    label: "早期審査を申し込んだ（任意）",
    description:
      "すでにサービスを提供中またはリリース準備中なら、早期審査で審査期間を2〜3ヶ月に短縮できます。追加費用はかかりません。",
    link: {
      label: "早期審査の詳細",
      url: "https://www.jpo.go.jp/system/trademark/shinsa/soki/index.html",
    },
    category: "出願後",
  },
];

const categories = ["事前準備", "必要なもの", "ソフトウェア設定", "出願", "出願後"];

export default function ChecklistPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const progress = Math.round((checked.size / checkItems.length) * 100);
  const allDone = checked.size === checkItems.length;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/naming" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />商標取得ステップガイドに戻る
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          出願準備チェックリスト
        </h1>
        <p className="mt-2 text-slate-500">
          商標を自力で出願するために必要なものを一つずつ確認していきましょう
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">準備の進捗</span>
            <span className="font-bold text-slate-900">
              {checked.size} / {checkItems.length} 完了
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allDone
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : "bg-gradient-to-r from-primary-400 to-accent-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {checked.size > 0 && (
          <button
            onClick={() => setChecked(new Set())}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="リセット"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {allDone && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-6">
          <div className="flex items-start gap-3">
            <PartyPopper className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-emerald-800">
                準備完了！おめでとうございます！
              </h3>
              <p className="mt-1 text-sm text-emerald-700">
                すべてのチェックが完了しました。あとは審査結果を待ちましょう。
                早期審査を利用した場合は2〜3ヶ月、通常審査は6〜10ヶ月程度かかります。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {categories.map((category) => {
          const items = checkItems.filter((item) => item.category === category);
          const categoryDone = items.every((item) => checked.has(item.id));

          return (
            <div key={category}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  {category}
                </h2>
                {categoryDone && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    完了
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const isDone = checked.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-slate-200/60 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggle(item.id)}
                          className="mt-0.5 shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-300 transition-colors hover:text-primary-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}
                          >
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                          {item.link && (
                            <a
                              href={item.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {item.link.label}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">書面出願の場合の注意点</p>
            <p className="mt-1 leading-relaxed">
              紙（書面）で出願する場合、電子化手数料（2,400円＋800円×ページ数）が別途かかります。
              電子出願の方がコストが安いため、可能な限り電子出願をおすすめします。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
