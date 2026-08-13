import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { LANDING_URL } from "../lib/urls";
import { createOrganization } from "../lib/org";
import { auth, updateUserDisplayName, formatAuthError } from "../lib/firebase";
import { t } from "../lib/i18n";

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
    signUpEmail,
    signInEmail,
    signInGoogle,
    applyMembership,
    error,
  } = useAuth();
  const navigate = useNavigate();
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      billingEmail: (billingEmail || email || u.email || "").trim(),
      ownerName: ownerName.trim() || u.displayName || undefined,
    });
    applyMembership(m);
    navigate(afterSignupPath(m.onboardingCompleted), { replace: true });
  };

  const submit = async () => {
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
      if (auth.currentUser) {
        await finish();
        return;
      }
      if (password.length < 8) {
        setLocalError("パスワードは8文字以上で設定してください。");
        return;
      }
      try {
        await signUpEmail(email, password);
        await finish();
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "auth/email-already-in-use") {
          await signInEmail(email, password);
          await finish();
          return;
        }
        throw err;
      }
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
          {t("google_recommend")}
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
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
          <Field label="ログイン用メールアドレス">
            <input
              type="email"
              required={!auth.currentUser}
              className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="契約・連絡用メール（任意）">
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="未入力ならログイン用メールを使います"
            />
          </Field>
          {!auth.currentUser && (
            <Field label="パスワード（8文字以上）">
              <input
                type="password"
                required
                minLength={8}
                className="mt-1 w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          )}
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
          >
            {busy ? "会社を作成しています…" : "会社を作成して始める"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy || !companyName.trim() || !ready}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper disabled:opacity-60"
          onClick={async () => {
            if (!companyName.trim()) {
              setLocalError("Google で登録する場合も会社名は必須です。");
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
          }}
        >
          Google で会社を登録
        </button>

        {(error || localError) && <p className="mt-3 text-sm text-red-700">{localError || error}</p>}

        <p className="mt-4 text-center text-sm text-ink/60">
          すでにアカウントがある方は{" "}
          <Link to="/login" className="font-semibold text-mint hover:underline">
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
