import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";

/**
 * ログイン画面（ShapeIt と同じ Google ＋ メール/パスワード）。
 * 実際の <form> と autocomplete 属性により、ブラウザがパスワードを保存・自動入力できる。
 */
export default function LoginPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo("");
    try {
      if (mode === "login") await auth.signInEmail(email, password);
      else await auth.signUpEmail(email, password);
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (!email.trim()) {
      setInfo("先にメールアドレスを入力してください。");
      return;
    }
    if (await auth.resetPassword(email)) setInfo("パスワード再設定のメールを送りました。");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">PreDeck</p>
        <h1 className="mt-3 text-3xl font-bold">{mode === "login" ? "ログイン" : "新規登録"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          スライドと音声はこの端末の外に出ません。AI にはテキストだけを送ります。
        </p>

        <button
          type="button"
          disabled={busy || !auth.ready}
          onClick={() => void auth.signInGoogle()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60"
        >
          Google で{mode === "login" ? "ログイン" : "登録"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          または
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3" method="post">
          <label className="block text-sm">
            メールアドレス
            <input
              type="email"
              name="email"
              id="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            パスワード
            <input
              type="password"
              name="password"
              id="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !auth.ready}
            className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>

        {auth.error && <p className="mt-3 text-sm text-red-400">{auth.error}</p>}
        {info && <p className="mt-3 text-sm text-emerald-400">{info}</p>}

        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            className="underline"
            onClick={() => {
              auth.clearError();
              setInfo("");
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login" ? "アカウントを作る" : "ログインに戻る"}
          </button>
          {mode === "login" && (
            <button type="button" className="underline" onClick={() => void onReset()}>
              パスワードを忘れた
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
