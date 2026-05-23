import { useState } from "react";
import {
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bot,
  Copy,
  Check,
} from "lucide-react";

interface Question {
  id: string;
  text: string;
  detail: string;
  yesResult: string;
  noResult: string;
}

const questions: Question[] = [
  {
    id: "q1",
    text: "自社製品は、人の疾病の診断・治療・予防に使用されるものですか？",
    detail: "「医療機器」の定義（薬機法第2条第4項）に該当するかの判断基準です。人の身体の構造・機能に影響を及ぼすことが目的のものも含まれます。",
    yesResult: "医療機器に該当する可能性が高いです。クラス分類の確認が必要です。",
    noResult: "医療機器には該当しない可能性がありますが、次の質問も確認してください。",
  },
  {
    id: "q2",
    text: "ソフトウェアとして医師の診断を支援する機能がありますか？（AI診断支援、画像解析等）",
    detail: "2021年の薬機法改正により、SaMD（Software as a Medical Device）として独立したソフトウェアも医療機器に該当します。単なる情報表示・記録ではなく、診断や治療方針の提案を行う場合は該当の可能性あり。",
    yesResult: "SaMD（プログラム医療機器）に該当する可能性があります。PMDAへの事前相談を強く推奨します。",
    noResult: "SaMDには該当しない可能性が高いです。",
  },
  {
    id: "q3",
    text: "製品は体内に挿入・埋め込まれるものですか？",
    detail: "体内に使用される機器はリスクが高く、高度管理医療機器（クラスIII/IV）に分類される可能性があります。",
    yesResult: "高度管理医療機器（クラスIII/IV）に該当する可能性があります。承認申請が必要です。",
    noResult: "体外使用の機器として、クラスI/IIに分類される可能性があります。",
  },
  {
    id: "q4",
    text: "製品はウェルネス・健康管理を目的としていますか？（フィットネストラッカー等）",
    detail: "一般的なウェルネス製品（歩数計、体重計、睡眠管理アプリ等）は医療機器に該当しないことが多いですが、特定の疾病との関連を謳う場合は該当する可能性があります。",
    yesResult: "一般的なウェルネス製品なら医療機器に非該当ですが、疾病への言及があれば要注意です。",
    noResult: "ウェルネスカテゴリには該当しません。他の判断基準で確認してください。",
  },
  {
    id: "q5",
    text: "製品の広告・販売で「治療」「診断」「予防」などの医療用語を使用する予定ですか？",
    detail: "たとえ製品自体が医療機器でなくても、広告表現で医療効果を謳うと薬機法違反（第66条〜第68条）になる可能性があります。",
    yesResult: "広告表現の薬機法チェックが必須です。専門家への相談を推奨します。",
    noResult: "広告表現上のリスクは低いですが、製品説明の表現には引き続き注意が必要です。",
  },
];

type Answer = "yes" | "no" | null;

const CLASS_CARDS = [
  { cls: "I", name: "一般医療機器", risk: "低", process: "届出のみ", examples: "メス、ピンセット、体温計", color: "border-emerald-200 bg-emerald-50" },
  { cls: "II", name: "管理医療機器", risk: "中", process: "第三者認証機関", examples: "電子血圧計、補聴器、MRI", color: "border-teal-200 bg-teal-50" },
  { cls: "III", name: "高度管理医療機器", risk: "高", process: "PMDA承認審査", examples: "透析機器、人工呼吸器", color: "border-cyan-200 bg-cyan-50" },
  { cls: "IV", name: "高度管理医療機器", risk: "最高", process: "PMDA承認審査", examples: "ペースメーカー、人工心臓弁", color: "border-emerald-300 bg-emerald-100/80" },
] as const;

export default function PharmaCheckPage() {
  const [tab, setTab] = useState<"input" | "guide">("input");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [expandedQ, setExpandedQ] = useState<string | null>("q1");
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const answer = (id: string, val: Answer) => {
    setAnswers(p => ({ ...p, [id]: val }));
  };

  const answeredCount = Object.values(answers).filter(v => v !== null).length;

  const riskLevel = (() => {
    const yesCount = Object.values(answers).filter(v => v === "yes").length;
    if (yesCount === 0 && answeredCount > 0) return "low";
    if (yesCount <= 1) return "medium";
    return "high";
  })();

  const hasContent = answeredCount > 0;
  const answeredList = questions
    .filter(q => answers[q.id] != null)
    .map(q => {
      const a = answers[q.id];
      return `- 質問: ${q.text}\n  回答: ${a === "yes" ? "はい" : "いいえ"}\n  判定: ${a === "yes" ? q.yesResult : q.noResult}`;
    })
    .join("\n\n");

  const prompt = `あなたは薬機法（医薬品医療機器等法）の専門家です。以下の簡易チェック結果をもとに、具体的なアドバイスをください。

## 薬機法簡易チェック結果

${answeredList || "（未回答）"}

## 簡易判定
リスクレベル: ${riskLevel === "high" ? "高（規制対象の可能性が高い）" : riskLevel === "medium" ? "中（部分的に該当の可能性あり）" : answeredCount > 0 ? "低（現時点で規制対象の可能性は低い）" : "未判定"}

## フィードバックの依頼

以下の観点でアドバイスしてください：

1. **規制該当性の詳細分析**: 上記の回答内容をもとに、薬機法の具体的にどの条文に該当しうるか？
2. **SaMD（プログラム医療機器）の判断**: ソフトウェア・アプリの場合、SaMDに該当するかどうかの詳細な判断基準は？
3. **必要な手続き**: 該当する場合、どのような申請・届出が必要か？タイムラインとコストの目安は？
4. **広告表現の注意点**: 薬機法に抵触しやすい広告・マーケティング表現と、安全な表現の具体例は？
5. **グレーゾーンの対応**: 該当するかどうか微妙な場合、どのように判断を進めるべきか？
6. **PMDAとの相談**: 事前相談制度の利用方法、申込手順、準備すべき資料は？
7. **回避策**: 規制対象を避けながら事業を進める方法はあるか？（機能の設計変更等）
8. **今後のリスク**: 機能追加や事業展開に伴って将来的に該当する可能性があるケースは？

具体的な法令名・条文番号を交えて回答してください。`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">薬機法チェックツール</h1>
        <p className="mt-1 text-sm text-slate-500">自社製品が医療機器・医薬品に該当するか簡易チェックします。</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("input")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "input" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> チェックする
        </button>
        <button
          type="button"
          onClick={() => setTab("guide")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "guide" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="h-4 w-4" /> 解説を読む
        </button>
      </div>

      {tab === "guide" && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-teal-50/90 to-cyan-50/50 shadow-sm">
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                  そもそも「薬機法」とは？
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-emerald-900/90">
                  <p>
                    <strong className="text-emerald-950">薬機法</strong>
                    （正式名：医薬品、医療機器等の品質、有効性及び安全性の確保等に関する法律）は、
                    <strong>医薬品・医療機器の品質と安全性を国が確認し、国民の健康を守るための法律</strong>
                    です。製造・輸入・販売・広告まで幅広く規制します。
                  </p>
                  <p>
                    医療系スタートアップでは、<strong>自社プロダクトが「医療機器」や「医薬品」に該当するか</strong>
                    が事業設計の分岐点になります。該当すると、開発プロセス（品質管理、リスク管理）、
                    届出・認証・承認、ラベリング、広告表現など、<strong>遵守すべきルールとコストが大きく変わります</strong>。
                  </p>
                  <p>
                    近年はアプリやクラウド上のソフトウェアも、診断・治療の意図を持つと
                    <strong className="text-teal-800"> SaMD（Software as a Medical Device／プログラム医療機器）</strong>
                    として扱われる場面が増えています。まずは「何が規制の対象になり得るか」を押さえておくことが重要です。
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200/60 bg-white/70 p-4 shadow-inner">
                <img
                  src="/images/pharma-class-detail.png"
                  alt="医療機器のクラス分類とリスクのイメージ"
                  className="max-h-64 w-full rounded-lg object-contain lg:max-h-80"
                />
                <p className="mt-3 text-center text-[11px] leading-relaxed text-emerald-800/80">
                  クラスは「想定されるリスクの程度」に応じて区分され、必要な手続き（届出・認証・承認等）が異なります。
                </p>
              </div>
            </div>

            <div className="border-t border-emerald-200/80 bg-emerald-100/40 px-6 py-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-900">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                医療機器のクラス分類（概要）
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CLASS_CARDS.map(c => (
                  <div key={c.cls} className={`rounded-xl border p-3 shadow-sm ${c.color}`}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-900 shadow-sm ring-1 ring-emerald-100">
                        {c.cls}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{c.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-600">
                      リスク：{c.risk} / {c.process}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">例：{c.examples}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50/80 p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-teal-900">
              <BookOpen className="h-4 w-4 text-teal-700" />
              SaMD（プログラム医療機器）とは？
            </h3>
            <div className="space-y-3 text-xs leading-relaxed text-teal-900/90">
              <p>
                <strong>SaMD</strong> は、<strong>ソフトウェア単体で医療機器の目的（診断・治療・予防等）を果たす</strong>
                ものを指します。ハードと一体の機器だけでなく、スマホアプリやクラウド上の解析サービスも対象になり得ます。
              </p>
              <p>
                2021年の薬機法改正でプログラム医療機器の枠組みが明確化され、<strong>AIによる画像解析や診断支援</strong>
                などは、設計・バリデーション・変更管理まで含めて規制上の議論が必要になりやすい領域です。
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-red-200/80 bg-white/90 p-3 shadow-sm">
                  <p className="mb-1.5 text-[10px] font-semibold text-red-700">該当しやすい例</p>
                  <p className="text-[11px] text-slate-700">AI画像診断、心電解析アプリ、治療方針を提案するCDSS など</p>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-white/90 p-3 shadow-sm">
                  <p className="mb-1.5 text-[10px] font-semibold text-emerald-700">該当しにくい例</p>
                  <p className="text-[11px] text-slate-700">健康記録、予約・会計、医学文献の閲覧のみ など（表現や機能次第で変わります）</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-sm font-bold text-emerald-900">規制の対象になりやすいもの</p>
              <ul className="list-inside list-disc space-y-2 text-xs leading-relaxed text-slate-700">
                <li>疾病の診断・治療・予防を目的とする機器・ソフトウェア</li>
                <li>身体の構造・機能に影響を与えることが意図された製品</li>
                <li>医療効果を謳う広告・表示（製品が一般品でも）</li>
                <li>プログラム医療機器として届出・認証・承認が必要なカテゴリ</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
              <p className="mb-2 text-sm font-bold text-slate-800">必ずしも規制対象ではない例</p>
              <ul className="list-inside list-disc space-y-2 text-xs leading-relaxed text-slate-600">
                <li>一般的なウェルネス・生活習慣支援（疾病との結びつきを謳わない場合など）</li>
                <li>病院運営・事務・純粋なコミュニケーション用ソフト（医療目的でない場合）</li>
                <li className="marker:text-slate-500">
                  <span className="font-medium text-slate-700">ただし</span>
                  ：機能追加やマーケ表現の変更で該当し得るため、一度決めたら終わりではありません。
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <p className="mb-3 text-sm font-bold text-emerald-900">役立つ公式情報・相談窓口</p>
            <ul className="space-y-3 text-sm text-slate-800">
              <li>
                <a
                  href="https://www.pmda.go.jp/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                >
                  PMDA（医薬品医療機器総合機構）
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                <p className="mt-0.5 text-[11px] text-slate-600">承認審査・安全情報・各種ガイドライン</p>
              </li>
              <li>
                <a
                  href="https://www.pmda.go.jp/review-services/consultations/0011.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                >
                  PMDA 薬事戦略相談
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                <p className="mt-0.5 text-[11px] text-slate-600">開発早期の方向性確認に。ベンチャー向け低額相談制度の案内もあります</p>
              </li>
              <li>
                <a
                  href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iyakuhin/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                >
                  厚生労働省：薬事関連
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                <p className="mt-0.5 text-[11px] text-slate-600">法令・通知・制度の全体像の把握に</p>
              </li>
            </ul>
          </div>
        </div>
      )}

      {tab === "input" && (
        <div className="space-y-6">
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const ans = answers[q.id] ?? null;
              const isExpanded = expandedQ === q.id;
              return (
                <div
                  key={q.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                    ans === "yes" ? "border-red-200" : ans === "no" ? "border-emerald-200" : "border-slate-200/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        ans === "yes" ? "bg-red-100 text-red-600" : ans === "no" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ans === "yes" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : ans === "no" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-800">{q.text}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="space-y-3 border-t border-slate-100 px-5 py-4">
                      <p className="text-xs leading-relaxed text-slate-600">{q.detail}</p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => answer(q.id, "yes")}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                            ans === "yes" ? "bg-red-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-red-50"
                          }`}
                        >
                          <XCircle className="h-4 w-4" /> はい
                        </button>
                        <button
                          type="button"
                          onClick={() => answer(q.id, "no")}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                            ans === "no" ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-emerald-50"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" /> いいえ
                        </button>
                      </div>
                      {ans && (
                        <div
                          className={`rounded-lg p-3 text-xs ${
                            ans === "yes" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {ans === "yes" ? q.yesResult : q.noResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {answeredCount >= 3 && (
            <div
              className={`rounded-2xl border p-5 ${
                riskLevel === "high"
                  ? "border-red-300 bg-red-50"
                  : riskLevel === "medium"
                    ? "border-amber-300 bg-amber-50"
                    : "border-emerald-300 bg-emerald-50"
              }`}
            >
              <h3
                className={`mb-2 flex items-center gap-2 text-sm font-bold ${
                  riskLevel === "high" ? "text-red-800" : riskLevel === "medium" ? "text-amber-800" : "text-emerald-800"
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                簡易判定結果
              </h3>
              <div
                className={`text-xs leading-relaxed ${
                  riskLevel === "high" ? "text-red-700" : riskLevel === "medium" ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {riskLevel === "high" && (
                  <>
                    <p className="font-semibold">薬機法の規制対象となる可能性が高いです。</p>
                    <p className="mt-1">
                      PMDA（医薬品医療機器総合機構）への事前相談を強く推奨します。承認・認証が必要な場合、申請から取得まで数ヶ月〜数年かかる場合があります。事業計画に織り込んでください。
                    </p>
                  </>
                )}
                {riskLevel === "medium" && (
                  <>
                    <p className="font-semibold">薬機法に部分的に該当する可能性があります。</p>
                    <p className="mt-1">専門家（薬事コンサルタント・弁護士）への相談を推奨します。特に広告表現には注意が必要です。</p>
                  </>
                )}
                {riskLevel === "low" && (
                  <>
                    <p className="font-semibold">現時点では薬機法の規制対象となる可能性は低いです。</p>
                    <p className="mt-1">ただし、今後の機能追加や表現変更で該当する可能性もあるため、定期的なチェックを推奨します。</p>
                  </>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://www.pmda.go.jp/review-services/consultations/0011.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  PMDA 事前面談の申込み <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="mt-3 text-[10px] text-slate-500">※ これは簡易チェックです。正式な判断は薬事専門家にご相談ください。</p>
            </div>
          )}

          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900">
                <Bot className="h-5 w-5 shrink-0" />
                AIで詳細相談する
              </h3>
              <button
                type="button"
                onClick={() => setShowPrompt(!showPrompt)}
                className="shrink-0 text-xs font-medium text-violet-600 hover:text-violet-800"
              >
                {showPrompt ? "プロンプトを閉じる" : "プロンプトを表示"}
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-violet-700">
              チェック結果をもとに、AIに詳細なアドバイスを求めるプロンプトを自動生成します。
              <strong>該当条文・必要手続き・広告表現の注意点</strong>
              などが得られます。
            </p>
            {showPrompt && (
              <pre className="mb-4 max-h-64 overflow-auto rounded-xl border border-violet-200 bg-white p-4 text-xs leading-relaxed text-slate-700">{prompt}</pre>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(prompt);
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
            {!hasContent && <p className="mt-2 text-[11px] text-violet-400">※ 上の質問に回答するとプロンプトが生成されます</p>}
          </div>
        </div>
      )}
    </div>
  );
}
