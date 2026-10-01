import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { LANDING_URL } from "../lib/urls";
import { createOrganization } from "../lib/org";
import { auth, updateUserDisplayName, formatAuthError } from "../lib/firebase";
import { publishAuthToExtension } from "../lib/extensionBridge";

function afterSignupPath(onboardingCompleted: boolean) {
  return onboardingCompleted ? "/capture" : "/setup";
}

export default function SignupPage() {
  const {
    ready,
    isAuthenticated,
    mode,
    membership,
    membershipReady,
    signInGoogle,
    applyMembership,
    error,
  } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromExtension = params.get("ext") === "1";
  const [ownerName, setOwnerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  if (ready && isAuthenticated && mode === "demo") {
    return <Navigate to="/capture" replace />;
  }
  if (ready && isAuthenticated && membershipReady && membership) {
    return <Navigate to={afterSignupPath(membership.onboardingCompleted)} replace />;
  }

  const finish = async () => {
    const u = auth.currentUser;
    if (!u) throw new Error("ユーザー作成に失敗しました");
    if (ownerName.trim()) await updateUserDisplayName(ownerName.trim());
    const m = await createOrganization(u, {
      name: companyName.trim(),
      billingEmail: (billingEmail || u.email || "").trim(),
      ownerName: ownerName.trim() || u.displayName || undefined,
    });
    applyMembership(m);
    void publishAuthToExtension(true);
    navigate(afterSignupPath(m.onboardingCompleted), { replace: true });
  };

  const signUpWithGoogle = async () => {
    if (!companyName.trim()) {
      setLocalError("会社名を入力してください。");
      return;
    }
    if (!ownerName.trim()) {
      setLocalError("お名前を入力してください。");
      return;
    }
    setBusy(true);
    setLocalError("");
    try {
      const u = await signInGoogle();
      if (!u && !auth.currentUser) return;
      await finish();
    } catch (err) {
      setLocalError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">ShapeIt</p>
        <h1 className="font-display mt-3 text-3xl font-bold">会社を登録</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          最初の管理者だけがここから登録します。会社専用のスペースが作られ、メンバーは招待制になります。
        </p>
        <p className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-xs leading-relaxed text-ink/75">
          {fromExtension
            ? "Chrome でよく使う Google アカウントで登録してください。拡張と Web アプリは同じアカウントで連携します。"
            : "登録は Google アカウントが必須です。普段 Web アプリで使う Google アカウントを選んでください。"}
        </p>

        <div className="mt-5 space-y-3">
          <Field label="お名前">
            <input
              required
              className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="山田 太郎"
            />
          </Field>
          <Field label="会社名">
            <input
              required
              className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="株式会社〇〇"
            />
          </Field>
          <Field label="契約・連絡用メール（任意）">
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="未入力なら Google アカウントのメールを使います"
            />
          </Field>
        </div>

        <button
          type="button"
          disabled={busy || !companyName.trim() || !ownerName.trim() || !ready}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper hover:bg-ink-soft disabled:opacity-60"
          onClick={() => void signUpWithGoogle()}
        >
          <GoogleMark />
          {busy ? "登録中…" : "Google で会社を登録して始める"}
        </button>

        {(error || localError) && <p className="mt-3 text-sm text-red-700">{localError || error}</p>}

        <p className="mt-4 text-center text-sm text-ink/60">
          すでにアカウントがある方は{" "}
          <Link
            to={fromExtension ? "/login?ext=1" : "/login"}
            className="font-semibold text-mint hover:underline"
          >
            ログイン
          </Link>
        </p>
        <a href={LANDING_URL} className="mt-2 block text-center text-sm text-mint hover:underline">
          LPへ戻る
        </a>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-ink/55">
      {label}
      {children}
    </label>
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
