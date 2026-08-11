import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { LANDING_URL } from "../lib/urls";
import { seedIfEmpty, isOnboardingDone } from "../lib/demoStore";

export default function LoginPage() {
  const { ready, isAuthenticated, signInGoogle, signInEmail, enterDemo, error, mode } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (ready && isAuthenticated) navigate("/capture", { replace: true });
  }, [ready, isAuthenticated, navigate]);

  if (ready && isAuthenticated) return <Navigate to="/capture" replace />;

  const startDemo = (forceOnboarding = false) => {
    enterDemo();
    seedIfEmpty();
    if (forceOnboarding || !isOnboardingDone()) navigate("/onboarding");
    else navigate("/capture");
  };

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4 py-8"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">ShapeIt</p>
        <h1 className="font-display mt-3 text-3xl font-bold">ログイン</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          招待メールのリンクからパスワードを設定したあと、メールアドレスとパスワードでログインできます。
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email.trim() || !password) return;
            setBusy(true);
            await signInEmail(email, password);
            setBusy(false);
          }}
        >
          <label className="block text-xs text-ink/55">
            メールアドレス（ID）
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-xs text-ink/55">
            パスワード
            <input
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? "ログイン中…" : "メールでログイン"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy || !ready}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper disabled:opacity-60"
          onClick={async () => {
            setBusy(true);
            await signInGoogle();
            setBusy(false);
          }}
        >
          <GoogleMark />
          Google で続ける
        </button>

        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-mint py-2.5 text-sm font-semibold text-white hover:bg-mint-bright"
          onClick={() => startDemo(false)}
        >
          ログインなしでデモ開始
        </button>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <a href={LANDING_URL} className="mt-4 block text-center text-sm text-mint hover:underline">
          LPへ戻る
        </a>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.8 39 44 34 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}
