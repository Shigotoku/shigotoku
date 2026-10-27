import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import { BRAND_FULL, BRAND_NAME } from '../constants/brand';
import { landingPath } from '../lib/urls';
import { useAuth } from '../store/authContext';
import BrandMark from '../components/BrandMark';

type AuthMode = 'login' | 'signup' | 'reset';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';
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
    loginHint,
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
      navigate(redirectTo, { replace: true });
    }
  }, [user, initializing, navigate, redirectTo]);

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
        navigate(redirectTo, { replace: true });
        return;
      }

      await signInEmail(email, password);
      navigate(redirectTo, { replace: true });
    } catch {
      // authError は context 側で設定
    }
  };

  const title =
    mode === 'signup' ? '新規登録' : mode === 'reset' ? 'パスワード再設定' : 'ログイン';

  return (
    <div className="buzz-auth-page min-h-screen">
      <header className="border-b border-neutral-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/login" className="flex items-center gap-3">
            <BrandMark className="buzz-logo-mark" size={32} />
            <span className="font-display text-lg font-bold">{BRAND_NAME}</span>
          </Link>
          <a
            href={landingPath('/')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
          >
            サービスサイトへ
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="buzz-section-label mb-4">BtoC店舗のための SNS 経営OS</p>
          <div className="headline-fit-wrap">
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl" data-headline-fit-off>
              <span className="block" data-headline-fit data-headline-max="36">
                SNS運用を、
              </span>
              <span className="block" data-headline-fit data-headline-max="36">
                毎朝5分のルーティンへ。
              </span>
            </h1>
          </div>
          <p className="mt-6 text-base leading-relaxed text-neutral-600">
            {BRAND_FULL}は、BtoC店舗向けのSNS運用・売上トラッキングOSです。
            メールアドレスでログインし、Gemini・Slack・Ayrshare と連携できます。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-neutral-700">
            <li>・Gemini AI による Repurpose 生成</li>
            <li>・Slack ネタ会議・戦略的通知</li>
            <li>・Firestore による売上 KPI 管理</li>
          </ul>
        </div>

        <div className="buzz-auth-card">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-neutral-600">
            {mode === 'signup'
              ? 'メールアドレスとパスワードでアカウントを作成します。Google で登録した方は「Google でログイン」をご利用ください。'
              : mode === 'reset'
                ? '登録メールアドレスに再設定リンクを送ります。'
                : 'メールアドレスとパスワードでログインできます。Google で登録した方は「Google でログイン」をご利用ください。'}
          </p>

          {!isConfigured && (
            <p className="buzz-alert buzz-alert-warning mt-4">
              Firebase Web アプリ未設定です。`.env` に VITE_FIREBASE_* を設定してください。
            </p>
          )}

          {authError && <p className="buzz-alert buzz-alert-error mt-4">{authError}</p>}

          {success && <p className="buzz-alert buzz-alert-success mt-4">{success}</p>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="buzz-label">
                  お名前（任意）
                </label>
                <input
                  id="displayName"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="buzz-input"
                  placeholder="山田 太郎"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="buzz-label">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="buzz-input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="buzz-label">
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
                    className="buzz-input pr-11"
                    placeholder={mode === 'signup' ? '6文字以上' : 'パスワード'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
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
                  className="text-xs text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
                >
                  パスワードをお忘れですか？
                </button>
              </div>
            )}

            <button type="submit" disabled={submitting || !isConfigured} className="buzz-btn-primary w-full py-3.5">
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

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
            {mode === 'login' ? (
              <>
                <span>はじめての方は</span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-medium text-neutral-900 underline-offset-2 hover:underline"
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
                  className="font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  ログイン
                </button>
              </>
            )}
          </div>

          {mode !== 'reset' && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs text-neutral-400">または</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => signInGoogle().catch(() => {})}
                className={`buzz-btn-secondary w-full ${
                  loginHint === 'google'
                    ? 'ring-2 ring-violet-500 ring-offset-2'
                    : ''
                }`}
              >
                <LogIn className="h-4 w-4" />
                Google でログイン
              </button>
              {loginHint === 'google' && (
                <p className="mt-2 text-center text-xs text-violet-700">
                  このアカウントは Google で登録されています
                </p>
              )}
            </>
          )}

          {initializing && (
            <p className="mt-4 text-center text-xs text-neutral-500">ログイン状態を確認しています...</p>
          )}
        </div>
      </main>
    </div>
  );
}
