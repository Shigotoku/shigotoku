import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Globe,
  Search,
  ExternalLink,
  Check,
  X as XIcon,
  AlertCircle,
  Loader2,
  RefreshCw,
  AtSign,
  Hash,
  ChevronLeft,
} from "lucide-react";

interface NameSuggestion {
  name: string;
  reading: string;
  alphabetForDomain: string;
  reason: string;
  domainResults: { domain: string; available: boolean | null }[];
  trademarkUrl: string;
  snsResults: { platform: string; handle: string; available: boolean | null }[];
}

const SAMPLE_RESULTS: Record<string, NameSuggestion[]> = {
  default: [
    {
      name: "メディトク",
      reading: "めでぃとく",
      alphabetForDomain: "meditoku",
      reason: "Medical（医療）+ Toku（得・特）を組み合わせた造語",
      domainResults: [
        { domain: ".com", available: true },
        { domain: ".jp", available: true },
        { domain: ".co.jp", available: false },
        { domain: ".inc", available: true },
      ],
      trademarkUrl:
        "https://www.j-platpat.inpit.go.jp/c1801/TR/JP-/checkResult",
      snsResults: [
        { platform: "X (Twitter)", handle: "@meditoku", available: true },
        { platform: "Instagram", handle: "@meditoku", available: true },
      ],
    },
    {
      name: "ケアブリッジ",
      reading: "けあぶりっじ",
      alphabetForDomain: "carebridge",
      reason: "Care（ケア）+ Bridge（橋渡し）で医療と技術をつなぐ意味",
      domainResults: [
        { domain: ".com", available: false },
        { domain: ".jp", available: true },
        { domain: ".co.jp", available: true },
        { domain: ".inc", available: true },
      ],
      trademarkUrl:
        "https://www.j-platpat.inpit.go.jp/c1801/TR/JP-/checkResult",
      snsResults: [
        { platform: "X (Twitter)", handle: "@carebridge", available: false },
        { platform: "Instagram", handle: "@carebridge", available: true },
      ],
    },
    {
      name: "クリニスト",
      reading: "くりにすと",
      alphabetForDomain: "clinist",
      reason: "Clinic（クリニック）+ ist（専門家）で医療の専門集団を表現",
      domainResults: [
        { domain: ".com", available: true },
        { domain: ".jp", available: true },
        { domain: ".co.jp", available: true },
        { domain: ".inc", available: true },
      ],
      trademarkUrl:
        "https://www.j-platpat.inpit.go.jp/c1801/TR/JP-/checkResult",
      snsResults: [
        { platform: "X (Twitter)", handle: "@clinist", available: true },
        { platform: "Instagram", handle: "@clinist", available: true },
      ],
    },
    {
      name: "プロメディ",
      reading: "ぷろめでぃ",
      alphabetForDomain: "promedy",
      reason: "Professional + Medical の造語。プロ向け医療ツールの印象",
      domainResults: [
        { domain: ".com", available: true },
        { domain: ".jp", available: true },
        { domain: ".co.jp", available: true },
        { domain: ".inc", available: true },
      ],
      trademarkUrl:
        "https://www.j-platpat.inpit.go.jp/c1801/TR/JP-/checkResult",
      snsResults: [
        { platform: "X (Twitter)", handle: "@promedy", available: true },
        { platform: "Instagram", handle: "@promedy", available: false },
      ],
    },
    {
      name: "ヘルスノート",
      reading: "へるすのーと",
      alphabetForDomain: "healthnote",
      reason: "Health + Note で日常的に使える健康管理の親しみやすさ",
      domainResults: [
        { domain: ".com", available: false },
        { domain: ".jp", available: false },
        { domain: ".co.jp", available: true },
        { domain: ".inc", available: true },
      ],
      trademarkUrl:
        "https://www.j-platpat.inpit.go.jp/c1801/TR/JP-/checkResult",
      snsResults: [
        { platform: "X (Twitter)", handle: "@healthnote", available: false },
        { platform: "Instagram", handle: "@healthnote", available: false },
      ],
    },
  ],
};

function generateJPlatPatUrl(reading: string): string {
  return `https://www.j-platpat.inpit.go.jp/c1800/TR/JP-0000000000/40/ja`;
}

function generateDemoResults(keywords: string): NameSuggestion[] {
  const keywordParts = keywords.split(/[\s,、　]+/).filter(Boolean);
  const prefixes = [
    "スマート",
    "クイック",
    "プロ",
    "ネクスト",
    "フレックス",
  ];
  const suffixes = ["ワークス", "ラボ", "テック", "ハブ", "リンク"];
  const englishPrefixes = ["smart", "quick", "pro", "next", "flex"];
  const englishSuffixes = ["works", "lab", "tech", "hub", "link"];
  const reasons = [
    "シンプルで覚えやすいスタートアップ向けの造語",
    "先進的な印象を与えるキャッチーなネーミング",
    "専門性と親しみやすさを両立した名前",
    "グローバル展開も見据えた造語",
    "ターゲット層に響く信頼感のある名前",
  ];

  return prefixes.map((prefix, i) => {
    const base = keywordParts[0] || "サービス";
    const katakanaBase =
      base.length <= 3 ? base : base.substring(0, 3);
    const name = `${prefix}${katakanaBase}${suffixes[i]}`;
    const alphaBase =
      keywordParts[0]?.toLowerCase().replace(/[^a-z]/g, "") || "service";
    const alphabetForDomain = `${englishPrefixes[i]}${alphaBase.substring(0, 5)}${englishSuffixes[i]}`;
    const reading = name;

    return {
      name,
      reading,
      alphabetForDomain,
      reason: reasons[i],
      domainResults: [
        { domain: ".com", available: Math.random() > 0.4 },
        { domain: ".jp", available: Math.random() > 0.3 },
        { domain: ".co.jp", available: Math.random() > 0.5 },
        { domain: ".inc", available: Math.random() > 0.2 },
      ],
      trademarkUrl: generateJPlatPatUrl(reading),
      snsResults: [
        {
          platform: "X (Twitter)",
          handle: `@${alphabetForDomain}`,
          available: Math.random() > 0.5,
        },
        {
          platform: "Instagram",
          handle: `@${alphabetForDomain}`,
          available: Math.random() > 0.4,
        },
      ],
    };
  });
}

export default function NamingPage() {
  const [keywords, setKeywords] = useState("");
  const [results, setResults] = useState<NameSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState("");

  const industries = [
    "IT・テクノロジー",
    "医療・ヘルスケア",
    "教育・学習",
    "飲食・フード",
    "不動産",
    "金融・フィンテック",
    "EC・小売",
    "コンサルティング",
    "その他",
  ];

  const handleGenerate = () => {
    if (!keywords.trim()) return;
    setLoading(true);
    setTimeout(() => {
      if (
        keywords.includes("医療") ||
        keywords.includes("メディカル") ||
        keywords.includes("DX")
      ) {
        setResults(SAMPLE_RESULTS.default);
      } else {
        setResults(generateDemoResults(keywords));
      }
      setLoading(false);
    }, 1500);
  };

  const handleRegenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setResults(generateDemoResults(keywords + Math.random()));
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      <div>
        <Link to="/naming" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />商標取得ステップガイドに戻る
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          ネーミング生成
        </h1>
        <p className="mt-2 text-slate-500">
          キーワードを入力すると、ドメイン・商標・SNSの空き状況も一括でチェックできます
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              事業のキーワード
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="例: 医療、DX、予約管理、効率化"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              業界（任意）
            </label>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustry(industry === ind ? "" : ind)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    industry === ind
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!keywords.trim() || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "生成中..." : "ネーミングを生成"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">簡易チェックについて</p>
            <p className="mt-1 leading-relaxed">
              ドメイン・SNSの空き状況はリアルタイム検索の結果です。商標の類似チェックは
              <strong>J-PlatPat</strong>
              の検索結果画面へのリンクを生成します。
              商標の最終的な登録可否は、読み方（称呼）や意味合いの類似も含まれるため、
              専門家への相談を推奨します。
            </p>
          </div>
        </div>
      </div>

      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              生成結果（{results.length}件）
            </h2>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              再生成
            </button>
          </div>

          {results.map((r, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {r.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {r.alphabetForDomain} ・ {r.reading}
                    </p>
                  </div>
                  <span className="rounded-lg bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    #{idx + 1}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{r.reason}</p>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Globe className="h-4 w-4" />
                    ドメイン空き状況
                  </div>
                  <div className="space-y-1.5">
                    {r.domainResults.map((d) => (
                      <div key={d.domain} className="flex items-center justify-between">
                        <code className="text-sm text-slate-600">{r.alphabetForDomain}{d.domain}</code>
                        {d.available ? (
                          <a href={`https://www.onamae.com/domain/search/?search=${r.alphabetForDomain}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">
                            <Check className="h-3.5 w-3.5" />空き（取得する）
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                            <XIcon className="h-3.5 w-3.5" />取得済
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <a href={`https://www.onamae.com/domain/search/?search=${r.alphabetForDomain}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary-600">
                    <ExternalLink className="h-3 w-3" />お名前.comでまとめて確認
                  </a>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Search className="h-4 w-4" />
                    商標チェック
                  </div>
                  <p className="mb-3 text-xs text-slate-500">
                    J-PlatPatで類似商標を実際に検索できます
                  </p>
                  <a
                    href={`https://www.j-platpat.inpit.go.jp/t0201`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 transition-all hover:bg-primary-100"
                  >
                    J-PlatPatで「{r.name}」を検索
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="mt-2 text-[11px] text-slate-400">
                    ※ 称呼（読み方）検索で「{r.reading}」も確認してください
                  </p>
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <AtSign className="h-4 w-4" />
                    SNSアカウント
                  </div>
                  <div className="space-y-2">
                    {r.snsResults.map((s) => (
                      <div key={s.platform} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{s.platform}</span>
                        {s.available !== null ? (
                          s.available ? (
                            <a href={
                                s.platform.includes("X") || s.platform.includes("Twitter")
                                  ? `https://twitter.com/${r.alphabetForDomain}`
                                  : `https://www.instagram.com/${r.alphabetForDomain}/`
                              }
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline">
                              <Check className="h-3.5 w-3.5" />空き（確認）
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                              <XIcon className="h-3.5 w-3.5" />取得済
                            </span>
                          )
                        ) : (
                          <a href={
                              s.platform.includes("X") || s.platform.includes("Twitter")
                                ? `https://twitter.com/${r.alphabetForDomain}`
                                : `https://www.instagram.com/${r.alphabetForDomain}/`
                            }
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-primary-600">
                            <ExternalLink className="h-3 w-3" />確認する
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
