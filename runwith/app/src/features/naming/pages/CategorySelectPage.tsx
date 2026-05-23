import { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  ShoppingCart,
  Trash2,
  ExternalLink,
  Info,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface Question {
  id: string;
  text: string;
  yesCategory: CategoryItem | null;
  description: string;
}

interface CategoryItem {
  classNumber: number;
  name: string;
  description: string;
  examples: string[];
}

const CATEGORIES: CategoryItem[] = [
  {
    classNumber: 9,
    name: "ソフトウェア・電子機器",
    description:
      "ダウンロード可能なソフトウェア、スマートフォンアプリ、電子機器など",
    examples: [
      "ダウンロード可能なアプリケーション",
      "業務用ソフトウェア",
      "電子計算機用プログラム",
    ],
  },
  {
    classNumber: 35,
    name: "広告・経営コンサルティング",
    description: "広告、マーケティング、経営管理、コンサルティングなど",
    examples: [
      "経営コンサルティング",
      "広告業",
      "市場調査",
      "人材派遣・紹介",
    ],
  },
  {
    classNumber: 36,
    name: "金融・保険・不動産",
    description: "金融サービス、保険、不動産取引など",
    examples: [
      "資金の貸付",
      "保険の引受け",
      "不動産の売買・賃貸",
      "電子マネー決済",
    ],
  },
  {
    classNumber: 38,
    name: "電気通信",
    description: "通信サービス、インターネット接続、情報提供など",
    examples: [
      "電子メールの提供",
      "オンラインプラットフォームの提供",
      "通信ネットワークの提供",
    ],
  },
  {
    classNumber: 41,
    name: "教育・エンターテインメント",
    description: "教育サービス、研修、娯楽、出版など",
    examples: [
      "オンライン教育",
      "セミナーの開催",
      "電子書籍の提供",
      "ゲームの提供",
    ],
  },
  {
    classNumber: 42,
    name: "SaaS・クラウドサービス",
    description:
      "クラウドコンピューティング、SaaS、プラットフォーム提供、技術コンサルティングなど",
    examples: [
      "SaaSとしてのソフトウェア提供",
      "クラウドコンピューティング",
      "ウェブサイトの設計・開発",
    ],
  },
  {
    classNumber: 44,
    name: "医療・美容・農業",
    description: "医療サービス、健康管理、美容、農業関連サービスなど",
    examples: [
      "医療情報の提供",
      "健康管理に関する助言",
      "遠隔医療",
      "栄養指導",
    ],
  },
];

const questions: Question[] = [
  {
    id: "q1",
    text: "ユーザーにスマホやPCでアプリ・ソフトをダウンロードさせますか？",
    yesCategory: CATEGORIES.find((c) => c.classNumber === 9)!,
    description:
      "ネイティブアプリやデスクトップソフトとして配布する場合は第9類が必要です",
  },
  {
    id: "q2",
    text: "ブラウザ上で動くクラウドサービス（SaaS）を提供しますか？",
    yesCategory: CATEGORIES.find((c) => c.classNumber === 42)!,
    description:
      "Webアプリやクラウドサービスとして提供する場合は第42類が必要です",
  },
  {
    id: "q3",
    text: "医療・健康に関するサービスや情報を提供しますか？",
    yesCategory: CATEGORIES.find((c) => c.classNumber === 44)!,
    description:
      "医療情報、健康管理、遠隔医療などのサービスを行う場合は第44類が必要です",
  },
  {
    id: "q4",
    text: "経営コンサルティングや広告・マーケティングサービスを提供しますか？",
    yesCategory: CATEGORIES.find((c) => c.classNumber === 35)!,
    description: "経営支援や広告関連のサービスには第35類が必要です",
  },
  {
    id: "q5",
    text: "オンライン教育、研修、セミナーなどの教育サービスを提供しますか？",
    yesCategory: CATEGORIES.find((c) => c.classNumber === 41)!,
    description: "教育コンテンツやeラーニングの提供には第41類が必要です",
  },
  {
    id: "q6",
    text: "決済機能や金融関連のサービスを提供しますか？",
    yesCategory: CATEGORIES.find((c) => c.classNumber === 36)!,
    description: "決済、送金、保険、不動産関連には第36類が必要です",
  },
  {
    id: "q7",
    text: "プラットフォームやSNS等、ユーザー同士の通信・情報交換機能がありますか？",
    yesCategory: CATEGORIES.find((c) => c.classNumber === 38)!,
    description: "コミュニケーションプラットフォームには第38類が必要です",
  },
];

export default function CategorySelectPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [cart, setCart] = useState<CategoryItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const handleAnswer = (answer: boolean) => {
    const q = questions[currentQuestion];
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));

    if (answer && q.yesCategory && !cart.find((c) => c.classNumber === q.yesCategory!.classNumber)) {
      setCart((prev) => [...prev, q.yesCategory!]);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const removeFromCart = (classNumber: number) => {
    setCart((prev) => prev.filter((c) => c.classNumber !== classNumber));
  };

  const reset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setCart([]);
    setIsComplete(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <Link to="/naming" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />商標取得ステップガイドに戻る
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          区分選択ナビ
        </h1>
        <p className="mt-2 text-slate-500">
          YES / NO
          で質問に答えるだけで、あなたのサービスに必要な区分（ジャンル）が分かります
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">区分（くぶん）とは？</p>
            <p className="mt-1 leading-relaxed">
              商標は「名前」＋「どの分野で使うか（区分）」のセットで登録します。
              例えばAppleはパソコン分野で商標を持っていますが、全く別の業種なら同じ「Apple」という名前を使えます。
              IT・SaaSサービスでは
              <strong>第9類（ソフトウェア）</strong>と
              <strong>第42類（SaaS・クラウド）</strong>
              の2つが基本です。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!isComplete ? (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                  <span>
                    質問 {currentQuestion + 1} / {questions.length}
                  </span>
                  <span>
                    {Math.round(
                      ((currentQuestion + 1) / questions.length) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                    style={{
                      width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mb-3 flex items-start gap-3">
                <HelpCircle className="mt-0.5 h-6 w-6 shrink-0 text-primary-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  {questions[currentQuestion].text}
                </h2>
              </div>
              <p className="mb-8 ml-9 text-sm text-slate-500">
                {questions[currentQuestion].description}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 rounded-xl border-2 border-emerald-200 bg-emerald-50 py-4 text-center text-base font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-100"
                >
                  はい（YES）
                </button>
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 py-4 text-center text-base font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100"
                >
                  いいえ（NO）
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 shadow-sm">
              <h2 className="mb-2 text-xl font-bold text-slate-900">
                診断完了！
              </h2>
              <p className="mb-4 text-slate-600">
                {cart.length > 0
                  ? `あなたのサービスには${cart.length}つの区分が推奨されます。`
                  : "特定の区分が推奨されませんでした。下の全区分リストから選択してください。"}
              </p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-700"
              >
                もう一度やり直す
              </button>
            </div>
          )}

          <div className="mt-8">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              全区分リスト（IT・サービス業向け抜粋）
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CATEGORIES.map((cat) => {
                const inCart = cart.some(
                  (c) => c.classNumber === cat.classNumber
                );
                return (
                  <div
                    key={cat.classNumber}
                    className={`rounded-xl border p-4 transition-all ${
                      inCart
                        ? "border-primary-300 bg-primary-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                          第{cat.classNumber}類
                          <span className="font-medium text-slate-500">
                            {cat.name}
                          </span>
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                          {cat.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cat.examples.map((ex) => (
                            <span
                              key={ex}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (inCart) {
                            removeFromCart(cat.classNumber);
                          } else {
                            setCart((prev) => [...prev, cat]);
                          }
                        }}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          inCart
                            ? "bg-primary-600 text-white hover:bg-primary-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {inCart ? "追加済" : "追加"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-24 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary-600" />
              <h3 className="text-base font-bold text-slate-900">
                選択した区分
              </h3>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-slate-400">
                まだ区分が選択されていません
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div
                    key={c.classNumber}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      第{c.classNumber}類 - {c.name}
                    </span>
                    <button
                      onClick={() => removeFromCart(c.classNumber)}
                      className="text-slate-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">出願料（概算）</span>
                  <span className="font-bold text-slate-900">
                    {(3400 + 8600 * cart.length).toLocaleString()}円
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    登録料（10年/概算）
                  </span>
                  <span className="font-bold text-slate-900">
                    {(32900 * cart.length).toLocaleString()}円
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                  <span className="font-medium text-slate-700">合計概算</span>
                  <span className="text-lg font-bold text-primary-700">
                    {(
                      3400 +
                      8600 * cart.length +
                      32900 * cart.length
                    ).toLocaleString()}
                    円
                  </span>
                </div>
                <a
                  href="https://www.jpo.go.jp/system/process/tesuryo/hyou.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-primary-500"
                >
                  <ExternalLink className="h-3 w-3" />
                  特許庁 手数料一覧
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
