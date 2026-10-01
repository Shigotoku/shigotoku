import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  isFirebaseConfigured,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  formatAuthError,
  sendPasswordReset,
  resolveGoogleRedirect,
} from "../../lib/firebase";

type Mode = "login" | "signup" | "reset";

function redirectTarget(params: URLSearchParams): string {
  const r = params.get("redirect");
  if (r && r.startsWith("/") && !r.startsWith("//")) return r;
  return "/dashboard";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const afterLogin = redirectTarget(searchParams);

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    resolveGoogleRedirect()
      .then((cred) => {
        if (cred?.user) navigate(afterLogin, { replace: true });
      })
      .catch(() => undefined);
  }, [afterLogin, navigate]);

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      const cred = await signInWithGoogle();
      if (cred) navigate(afterLogin, { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "reset") {
        await sendPasswordReset(email);
        setInfo("パスワード再設定メールを送信しました。届かない場合は迷惑メールもご確認ください。");
        setMode("login");
        return;
      }
      if (mode === "signup") {
        if (password.length < 8) {
          setError("パスワードは8文字以上で設定してください");
          return;
        }
        await signUpWithEmail(email, password);
        navigate("/setup", { replace: true });
        return;
      }
      await signInWithEmail(email, password);
      navigate(afterLogin, { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = () => navigate("/dashboard");

  const title =
    mode === "signup" ? "無料アカウント作成" : mode === "reset" ? "パスワード再設定" : "ログイン";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center">
          <span className="clipit-icon-frame h-16 w-16 shadow-md shadow-primary-500/20">
            <img src="/icon.png" alt="クリッピット" className="clipit-brand-icon h-full w-full object-contain" />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            {mode === "signup"
              ? "メールアドレスで1分登録。Googleログインも使えます。"
              : "操作するだけで、業務マニュアルが完成。"}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
        )}
        {info && (
          <p className="mt-4 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">{info}</p>
        )}

        {mode !== "reset" && (
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy || !isFirebaseConfigured}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Googleで{mode === "signup" ? "登録" : "ログイン"}
          </button>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="お名前（施設名・会社名でも可）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          )}
          <input
            type="email"
            required
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {mode !== "reset" && (
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              placeholder={mode === "signup" ? "パスワード（8文字以上）" : "パスワード"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          )}
          <button
            type="submit"
            disabled={busy || !isFirebaseConfigured}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {mode === "signup" ? "アカウントを作成" : mode === "reset" ? "再設定メールを送る" : "ログイン"}
                {mode !== "reset" && <ArrowRight size={16} />}
              </>
            )}
          </button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-slate-600">
          {mode === "login" && (
            <>
              <button
                type="button"
                className="font-semibold text-primary-600 hover:underline"
                onClick={() => {
                  setMode("reset");
                  setError("");
                }}
              >
                パスワードを忘れた方
              </button>
              <p>
                アカウントをお持ちでない方は{" "}
                <button
                  type="button"
                  className="font-semibold text-primary-600 hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                >
                  無料で作成
                </button>
              </p>
            </>
          )}
          {mode === "signup" && (
            <p>
              すでにアカウントがある方は{" "}
              <button
                type="button"
                className="font-semibold text-primary-600 hover:underline"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                ログイン
              </button>
            </p>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="font-semibold text-primary-600 hover:underline"
              onClick={() => setMode("login")}
            >
              ログインに戻る
            </button>
          )}
        </div>

        {!isFirebaseConfigured && (
          <button
            type="button"
            onClick={handleDemo}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            デモを見る（Firebase未設定）
          </button>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
          登録すると
          <Link to="https://shigotoku.com/terms/" className="text-primary-600 hover:underline" target="_blank" rel="noreferrer">
            利用規約
          </Link>
          と
          <Link to="https://shigotoku.com/privacy/" className="text-primary-600 hover:underline" target="_blank" rel="noreferrer">
            プライバシーポリシー
          </Link>
          に同意したものとみなします。
        </p>
      </div>
    </div>
  );
}
