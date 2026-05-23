import { useState } from "react";
import {
  Megaphone, Target, TrendingUp, Users, BarChart3,
  Globe, Mail, Share2, Search, Zap, ArrowRight,
  CheckCircle2, Circle, Lightbulb,
} from "lucide-react";

interface MarketingChannel {
  id: string;
  name: string;
  icon: typeof Globe;
  description: string;
  difficulty: "低" | "中" | "高";
  cost: "無料" | "低コスト" | "中コスト" | "高コスト";
  timeToResult: string;
  tips: string[];
  tools: { name: string; url: string }[];
}

const channels: MarketingChannel[] = [
  {
    id: "seo",
    name: "SEO / コンテンツマーケティング",
    icon: Search,
    description: "検索エンジンからの自然流入を獲得。長期的な資産になるが時間がかかる",
    difficulty: "中",
    cost: "低コスト",
    timeToResult: "3〜6ヶ月",
    tips: [
      "ターゲットキーワードを選定し、記事を定期的に公開",
      "ロングテールキーワードから攻める",
      "競合サイトの上位記事を分析して差別化",
    ],
    tools: [
      { name: "Google Search Console", url: "https://search.google.com/search-console" },
      { name: "Ubersuggest", url: "https://neilpatel.com/ubersuggest/" },
    ],
  },
  {
    id: "sns",
    name: "SNSマーケティング",
    icon: Share2,
    description: "X(Twitter)、Instagram、LinkedIn等でのブランド認知拡大",
    difficulty: "低",
    cost: "無料",
    timeToResult: "1〜3ヶ月",
    tips: [
      "ターゲット層が多いプラットフォームに集中",
      "投稿頻度を週3回以上に設定",
      "エンゲージメント率を重視（いいね・RT・コメント）",
    ],
    tools: [
      { name: "Buffer", url: "https://buffer.com/" },
      { name: "Canva", url: "https://www.canva.com/" },
    ],
  },
  {
    id: "ads",
    name: "Web広告（リスティング・SNS広告）",
    icon: Zap,
    description: "即効性のある有料広告。テスト→最適化のPDCAが重要",
    difficulty: "中",
    cost: "中コスト",
    timeToResult: "即日〜1ヶ月",
    tips: [
      "まずは少額（月5万円程度）でテスト",
      "CPAとLTVのバランスを常にチェック",
      "A/Bテストでクリエイティブを改善",
    ],
    tools: [
      { name: "Google Ads", url: "https://ads.google.com/" },
      { name: "Meta広告", url: "https://www.facebook.com/business/ads" },
    ],
  },
  {
    id: "email",
    name: "メールマーケティング",
    icon: Mail,
    description: "既存リード・顧客への継続的なコミュニケーション",
    difficulty: "低",
    cost: "低コスト",
    timeToResult: "1〜2ヶ月",
    tips: [
      "リードマグネット（無料資料等）でメールアドレスを獲得",
      "セグメント別にパーソナライズしたメールを送信",
      "開封率・クリック率をKPIとして追跡",
    ],
    tools: [
      { name: "Mailchimp", url: "https://mailchimp.com/" },
      { name: "SendGrid", url: "https://sendgrid.com/" },
    ],
  },
  {
    id: "pr",
    name: "PR・プレスリリース",
    icon: Megaphone,
    description: "メディア掲載による信頼性向上と認知拡大",
    difficulty: "中",
    cost: "低コスト",
    timeToResult: "1〜2ヶ月",
    tips: [
      "プレスリリースは「ニュース性」が重要",
      "記者との関係構築を継続的に行う",
      "業界メディアからアプローチ",
    ],
    tools: [
      { name: "PR TIMES", url: "https://prtimes.jp/" },
      { name: "BRIDGE", url: "https://thebridge.jp/" },
    ],
  },
  {
    id: "referral",
    name: "リファラル / 口コミ",
    icon: Users,
    description: "既存顧客からの紹介。最もCACが低い施策",
    difficulty: "低",
    cost: "無料",
    timeToResult: "1〜3ヶ月",
    tips: [
      "紹介プログラム（インセンティブ）を設計",
      "NPS（推奨度）を定期的に計測",
      "紹介しやすい仕組み（シェアリンク等）を整備",
    ],
    tools: [],
  },
];

const prompts = [
  {
    label: "マーケティング戦略の策定",
    prompt: `以下の情報をもとに、スタートアップのマーケティング戦略を提案してください。

【事業概要】（ここに記入）
【ターゲット顧客】（ここに記入）
【予算（月額）】（ここに記入）
【現在の課題】（ここに記入）

以下の観点で戦略を提案してください：
1. 優先すべきマーケティングチャネル（理由付き）
2. 最初の3ヶ月のアクションプラン
3. KPI設定の提案
4. 競合との差別化ポイント`,
  },
  {
    label: "ペルソナに基づく訴求文の作成",
    prompt: `以下のペルソナに対して、効果的な訴求文（キャッチコピー＋説明文）を5パターン作成してください。

【製品/サービス名】（ここに記入）
【ペルソナ】
- 年齢・性別：
- 職業：
- 課題・悩み：
- 求めている解決策：

【トーン】（専門的 / カジュアル / 信頼感重視 など）`,
  },
];

export default function MarketingPage() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyPrompt = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">マーケティング</h1>
        <p className="mt-1 text-slate-500">
          スタートアップに最適なマーケティングチャネルを選定し、効率的に顧客を獲得しましょう。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Target className="h-5 w-5 text-primary-600" />
          マーケティングチャネル一覧
        </h2>
        <div className="space-y-3">
          {channels.map((ch) => {
            const Icon = ch.icon;
            const done = completed.has(ch.id);
            return (
              <div key={ch.id} className={`rounded-xl border p-4 transition-all ${done ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 hover:border-primary-200"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(ch.id)} className="mt-0.5 shrink-0">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="h-4 w-4 text-primary-600" />
                      <h3 className="text-sm font-bold text-slate-900">{ch.name}</h3>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ch.cost === "無料" ? "bg-emerald-100 text-emerald-700" : ch.cost === "低コスト" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {ch.cost}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        効果: {ch.timeToResult}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{ch.description}</p>
                    <div className="mt-2 space-y-1">
                      {ch.tips.map((tip, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                          {tip}
                        </p>
                      ))}
                    </div>
                    {ch.tools.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ch.tools.map((tool) => (
                          <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-100">
                            {tool.name} <ArrowRight className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Zap className="h-5 w-5 text-amber-500" />
          AIプロンプトテンプレート
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          以下のプロンプトをコピーして、ChatGPT・Claude・Gemini等のAIに貼り付けてご利用ください。
        </p>
        <div className="space-y-4">
          {prompts.map((p, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{p.label}</h3>
                <button
                  onClick={() => copyPrompt(p.prompt, idx)}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {copiedIdx === idx ? "コピーしました！" : "コピー"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                {p.prompt}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
