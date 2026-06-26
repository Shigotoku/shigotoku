import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { acceptInvitation, getInvitation, type ClipitInvitation } from "../services/invitations";
import { signInWithGoogle, signInWithEmail, formatAuthError } from "../lib/firebase";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("招待を確認しています…");
  const [invite, setInvite] = useState<ClipitInvitation | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getInvitation(token).then((inv) => {
      if (!inv) setMsg("招待リンクが無効または期限切れです。");
      else {
        setInvite(inv);
        setEmail(inv.email);
        setMsg("");
      }
    });
  }, [token]);

  useEffect(() => {
    if (loading || !user || !token || !invite) return;
    (async () => {
      try {
        await acceptInvitation(
          token,
          user.uid,
          user.email ?? invite.email,
          user.displayName ?? invite.email.split("@")[0] ?? "メンバー",
        );
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setMsg((e as Error).message);
      }
    })();
  }, [user, loading, token, invite, navigate]);

  const loginPath = `/login?redirect=${encodeURIComponent(`/invite/${token}`)}`;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">スタッフ招待</h1>
          {invite ? (
            <p className="mt-2 text-sm text-slate-600">
              <strong>{invite.email}</strong> として参加します。下記のメールアドレスでログインしてください。
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">{msg || "招待を確認中…"}</p>
          )}
          {error && <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>}
          {invite && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Googleでログイン
              </button>
              <form onSubmit={handleEmailLogin} className="mt-3 space-y-2">
                <input
                  type="email"
                  required
                  value={email}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                />
                <input
                  type="password"
                  required
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  ログインして参加
                </button>
              </form>
            </>
          )}
          {!invite && msg.includes("無効") && (
            <Link to="/login" className="mt-4 block text-center text-sm text-primary-600 hover:underline">
              ログインページへ
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-slate-600">{msg || "参加処理中…"}</p>
    </div>
  );
}
