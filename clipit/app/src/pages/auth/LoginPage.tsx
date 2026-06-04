import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isFirebaseConfigured, signInWithGoogle, signInWithEmail, formatAuthError } from "../../lib/firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleDemo = () => navigate("/dashboard");

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      const cred = await signInWithGoogle();
      if (cred) navigate("/dashboard");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmail(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center">
          <span className="clipit-icon-frame h-16 w-16 shadow-md shadow-primary-500/20">
            <img src="/icon.png" alt="クリッピット" className="clipit-brand-icon h-full w-full object-contain" />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">クリッピットにログイン</h1>
          <p className="mt-1 text-sm text-slate-500">操作するだけで、業務マニュアルが完成。</p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy || !isFirebaseConfigured}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Googleでログイン
        </button>

        <form onSubmit={handleEmail} className="mt-4 space-y-3">
          <input
            type="email"
            required
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <input
            type="password"
            required
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="submit"
            disabled={busy || !isFirebaseConfigured}
            className="w-full rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            ログイン
          </button>
        </form>

        {!isFirebaseConfigured && (
          <button
            type="button"
            onClick={handleDemo}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            デモを見る（Firebase未設定）
          </button>
        )}
      </div>
    </div>
  );
}
