import { useState } from "react";
import {
  Users, MessageSquare, Handshake, TrendingUp, Shield,
  Bell, Gift, ArrowRight, Star, Building2, Crown,
} from "lucide-react";

interface CommunityFeature {
  icon: typeof Users;
  title: string;
  description: string;
  badge?: string;
  comingSoon?: boolean;
}

const features: CommunityFeature[] = [
  {
    icon: MessageSquare,
    title: "起業家コミュニティ",
    description: "同じフェーズの起業家同士で情報交換。質問・相談・ナレッジ共有ができます。",
  },
  {
    icon: Handshake,
    title: "企業マッチング",
    description: "事業シナジーのある企業同士をマッチング。協業・提携の機会を創出します。",
  },
  {
    icon: TrendingUp,
    title: "投資家コミュニティ",
    description: "投資家が参加できる専用エリア。起業家のプロフィールや事業情報を閲覧できます。",
    badge: "投資家向け",
  },
  {
    icon: Star,
    title: "起業家アピールボード",
    description: "起業家が投資家に向けて事業をアピールできる場。入力した事業情報を安全に共有できます。",
    badge: "NEW",
  },
  {
    icon: Shield,
    title: "安全な情報共有",
    description: "機密性の高い情報は厳重に保護。共有範囲を細かく設定でき、重要事項が漏れることはありません。",
  },
  {
    icon: Gift,
    title: "特典プログラム",
    description: "補助金情報の収集など、コミュニティへの貢献で月額料金の割引特典が受けられます。",
  },
];

export default function CommunityPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">コミュニティ</h1>
        <p className="mt-1 text-slate-500">
          起業家・投資家が集うコミュニティ。情報交換、マッチング、共同成長を実現します。
        </p>
      </div>

      <div className="rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">ランウィズ コミュニティ</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            起業家、投資家、専門家が集まるプラットフォーム。
            あなたのスタートアップの成長を加速させるネットワークを構築しましょう。
          </p>

          {!submitted ? (
            <form onSubmit={handleJoin} className="mx-auto mt-6 flex max-w-md gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                required
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700"
              >
                参加希望
              </button>
            </form>
          ) : (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">
                ありがとうございます！コミュニティの準備が整い次第、ご案内メールをお送りします。
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
                {f.badge && (
                  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
                    {f.badge}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{f.description}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <Crown className="h-5 w-5 text-amber-500" />
          運営との連携
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
            <Bell className="mt-0.5 h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">補助金・助成金の最新情報</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                運営チームが最新の補助金・助成金情報を随時共有します。
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
            <Gift className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">貢献特典プログラム</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                補助金情報の収集など、ユーザーが必要とする情報をまとめて提出いただくと、月額料金が無料になる特典があります。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
