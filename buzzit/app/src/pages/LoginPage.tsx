import { ArrowRight, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { landingPath } from '../lib/urls';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50">
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/login" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold">
              B
            </div>
            <span className="text-lg font-bold font-['Outfit']">BuzzPilot</span>
          </Link>
          <a
            href={landingPath('/')}
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            サービスサイトへ
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <Sparkles className="h-4 w-4" />
            無料診断デモを公開中
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            SNS運用を、
            <br />
            毎朝5分のルーティンへ。
          </h1>
          <p className="mt-6 text-base leading-relaxed text-slate-400">
            BuzzPilotは、BtoC店舗向けのSNS運用・売上トラッキングOSです。
            まずはデモ環境で、経営コクピットの体験から始められます。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li>・AIが「今日やること」を提案</li>
            <li>・チーム承認フローで運用を標準化</li>
            <li>・売上への貢献を可視化</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-indigo-950/30">
          <h2 className="text-xl font-bold">デモを始める</h2>
          <p className="mt-2 text-sm text-slate-400">
            登録不要。クリックですぐにダッシュボードを体験できます。
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
          >
            デモダッシュボードを開く
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href={landingPath('/')}
            className="mt-4 block text-center text-sm text-slate-500 transition-colors hover:text-indigo-300"
          >
            料金・機能の詳細を見る
          </a>
        </div>
      </main>
    </div>
  );
}
