import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LogIn, Mail, Sparkles } from 'lucide-react';
import { BRAND_FULL, BRAND_NAME } from '../constants/brand';
import { landingPath } from '../lib/urls';
import { useAuth } from '../store/authContext';

type AuthMode = 'login' | 'signup' | 'reset';

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    user,
    initializing,
    submitting,
    signInEmail,
    signUpEmail,
    resetPassword,
    signInGoogle,
    isConfigured,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && !initializing) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, initializing, navigate]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setSuccess('');
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess('');
    clearAuthError();

    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setSuccess('パスワード再設定メールを送信しました。メールをご確認ください。');
        return;
      }

      if (mode === 'signup') {
        if (password.length < 6) {
          return;
        }
        await signUpEmail(email, password, displayName || undefined);
        navigate('/dashboard', { replace: true });
        return;
      }

      await signInEmail(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      // authError は context 側で設定
    }
  };

  const title =
    mode === 'signup' ? '新規登録' : mode === 'reset' ? 'パスワード再設定' : 'ログイン';

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
            メールアドレスでログインし、Gemini・Slack・Ayrshare と連携できます。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li>・Gemini AI による Repurpose 生成</li>
            <li>・Slack ネタ会議・戦略的通知</li>
            <li>・Firestore による売上 KPI 管理</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-indigo-950/30">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === 'signup'
              ? 'メールアドレスとパスワードでアカウントを作成します。'
              : mode === 'reset'
                ? '登録メールアドレスに再設定リンクを送ります。'
                : 'メールアドレスとパスワードでログインできます。'}
          </p>

          {!isConfigured && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Firebase Web アプリ未設定です。`.env` に VITE_FIREBASE_* を設定してください。
            </p>
          )}

          {authError && (
            <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              {authError}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              {success}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="mb-1.5 block text-xs font-medium text-slate-400">
                  お名前（任意）
                </label>
                <input
                  id="displayName"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500"
                  placeholder="山田 太郎"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-400">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-400">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signup' ? 6 : undefined}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-3 pl-4 pr-11 text-sm text-white outline-none transition focus:border-indigo-500"
                    placeholder={mode === 'signup' ? '6文字以上' : 'パスワード'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-xs text-indigo-300 hover:text-indigo-200"
                >
                  パスワードをお忘れですか？
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !isConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-70"
            >
              {submitting
                ? '処理中...'
                : mode === 'signup'
                  ? 'アカウントを作成'
                  : mode === 'reset'
                    ? '再設定メールを送信'
                    : 'ログイン'}
              {!submitting && mode === 'login' && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            {mode === 'login' ? (
              <>
                <span>はじめての方は</span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-medium text-indigo-300 hover:text-indigo-200"
                >
                  新規登録
                </button>
              </>
            ) : (
              <>
                <span>アカウントをお持ちの方は</span>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium text-indigo-300 hover:text-indigo-200"
                >
                  ログイン
                </button>
              </>
            )}
          </div>

          {mode !== 'reset' && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-xs text-slate-500">または</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => signInGoogle().catch(() => {})}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-6 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800/60 disabled:opacity-70"
              >
                <LogIn className="h-4 w-4" />
                Google でログイン
              </button>
            </>
          )}

          {initializing && (
            <p className="mt-4 text-center text-xs text-slate-500">ログイン状態を確認しています...</p>
          )}
        </div>
      </main>
    </div>
  );
}
