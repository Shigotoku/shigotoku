import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { BRAND_FULL, BRAND_NAME } from '../constants/brand';
import { landingPath } from '../lib/urls';
import { useAuth } from '../store/authContext';

export default function LoginPage() {
  const { signInGoogle, signInDemo, loading, isConfigured } = useAuth();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50">
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/login" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold">
              B
            </div>
            <span className="text-lg font-bold font-['Outfit']">{BRAND_NAME}</span>
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
            GCP 連携版を公開中
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            SNS運用を、
            <br />
            毎朝5分のルーティンへ。
          </h1>
          <p className="mt-6 text-base leading-relaxed text-slate-400">
            {BRAND_FULL}は、BtoC店舗向けのSNS運用・売上トラッキングOSです。
            Firebase 認証でログインし、Gemini・Slack・Ayrshare と連携できます。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li>・Gemini AI による Repurpose 生成</li>
            <li>・Slack ネタ会議・戦略的通知</li>
            <li>・Firestore による売上 KPI 管理</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-indigo-950/30">
          <h2 className="text-xl font-bold">ログイン</h2>
          <p className="mt-2 text-sm text-slate-400">
            Google アカウントまたはデモ（匿名）で開始できます。
          </p>

          {!isConfigured && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Firebase Web アプリ未設定です。`.env` に VITE_FIREBASE_* を設定してください。
            </p>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => signInGoogle().catch(console.error)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100 disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" />
            Google でログイン
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => signInDemo().catch(console.error)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-70"
          >
            デモで始める（匿名）
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
