import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { LANDING_URL } from "../lib/urls";
import { seedIfEmpty, isOnboardingDone } from "../lib/demoStore";
import { beginOrgMembership } from "../lib/org";
import { auth, sendPasswordReset, formatAuthError } from "../lib/firebase";
import { t } from "../lib/i18n";

export default function LoginPage() {
  const {
    ready,
    isAuthenticated,
    signInGoogle,
    signInEmail,
    enterDemo,
    error,
    mode,
    membership,
    membershipReady,
    applyMembership,
  } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetInfo, setResetInfo] = useState("");
  const [localError, setLocalError] = useState("");
  const redirect = params.get("redirect");
  const afterLogin = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/capture";

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    if (mode === "demo") {
      navigate(isOnboardingDone() ? "/capture" : "/onboarding", { replace: true });
      return;
    }
    if (!membershipReady) return;
    if (afterLogin.startsWith("/invite/")) {
      navigate(afterLogin, { replace: true });
      return;
    }
    if (membership) {
      navigate(membership.onboardingCompleted ? afterLogin : "/setup", { replace: true });
      return;
    }
    navigate("/signup", { replace: true });
  }, [ready, isAuthenticated, mode, membership, membershipReady, navigate, afterLogin]);

  if (ready && isAuthenticated && mode === "demo") {
    return <Navigate to={isOnboardingDone() ? "/capture" : "/onboarding"} replace />;
  }

  const startDemo = (forceOnboarding = false) => {
    enterDemo();
    seedIfEmpty();
    if (forceOnboarding || !isOnboardingDone()) navigate("/onboarding");
    else navigate("/capture");
  };

  const afterMemberLogin = async () => {
    const u = auth.currentUser;
    if (!u) return;
    const m = await beginOrgMembership(u);
    applyMembership(m);
    if (!m) {
      navigate("/signup", { replace: true });
      return;
    }
    navigate(m.onboardingCompleted ? afterLogin : "/setup", { replace: true });
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
          招待リンクを受け取ったメンバーは、メールアドレスとパスワードでログインできます。
          会社の最初の管理者の方は新規登録から始めてください。
        </p>
        <p className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-xs leading-relaxed text-ink/75">
          {t("google_recommend")}
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email.trim() || !password) return;
            setBusy(true);
            setLocalError("");
            try {
              await signInEmail(email, password);
              await afterMemberLogin();
            } catch (err) {
              setLocalError(formatAuthError(err));
            } finally {
              setBusy(false);
            }
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
          className="mt-2 text-xs text-mint hover:underline"
          onClick={async () => {
            if (!email.trim()) {
              setLocalError("パスワード再設定にはメールアドレスを入力してください。");
              return;
            }
            try {
              await sendPasswordReset(email);
              setResetInfo("再設定メールを送信しました。届かない場合は迷惑メールもご確認ください。");
              setLocalError("");
            } catch (err) {
              setLocalError(formatAuthError(err));
            }
          }}
        >
          パスワードを忘れた方
        </button>

        <button
          type="button"
          disabled={busy || !ready}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper disabled:opacity-60"
          onClick={async () => {
            setBusy(true);
            setLocalError("");
            try {
              await signInGoogle();
              await afterMemberLogin();
            } catch (err) {
              setLocalError(formatAuthError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <GoogleMark />
          Google で続ける（招待済みのみ）
        </button>

        <Link
          to="/signup"
          className="mt-4 flex w-full items-center justify-center rounded-lg border border-mint/30 bg-mint/5 py-2.5 text-sm font-semibold text-mint hover:bg-mint/10"
        >
          会社の管理者として新規登録
        </Link>

        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-mint py-2.5 text-sm font-semibold text-white hover:bg-mint-bright"
          onClick={() => startDemo(false)}
        >
          ログインなしでデモ開始
        </button>

        {(error || localError) && <p className="mt-3 text-sm text-red-700">{localError || error}</p>}
        {resetInfo && <p className="mt-3 text-sm text-mint">{resetInfo}</p>}

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
