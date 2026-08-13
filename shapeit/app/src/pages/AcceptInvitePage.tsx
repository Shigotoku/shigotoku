import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { acceptInviteByToken, fetchInviteByToken } from "../lib/org";
import { formatAuthError, signInWithEmail, signUpWithEmail, signInWithGoogle } from "../lib/firebase";

export default function AcceptInvitePage() {
  const { token = "" } = useParams();
  const { user, ready, refreshMembership } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ email: string; orgName: string; expired?: boolean } | null>(null);
  const [msg, setMsg] = useState("招待を確認しています…");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    void fetchInviteByToken(token).then((inv) => {
      if (!inv || inv.expired) {
        setInvite(null);
        setMsg("招待リンクが無効または期限切れです。管理者に新しいリンクの発行を依頼してください。");
      } else {
        setInvite(inv);
        setMsg("");
      }
    });
  }, [token]);

  useEffect(() => {
    if (!ready || !user || !invite || !token) return;
    const email = (user.email ?? "").toLowerCase();
    if (email && email !== invite.email.toLowerCase()) {
      setError(`この招待は ${invite.email} 向けです。現在 ${user.email} でログインしています。`);
      return;
    }
    void (async () => {
      try {
        await acceptInviteByToken(token);
        await refreshMembership();
        navigate("/capture", { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "参加に失敗しました");
      }
    })();
  }, [ready, user, invite, token, navigate, refreshMembership]);

  const joinWithPassword = async (mode: "signup" | "login") => {
    if (!invite) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        if (password.length < 8) {
          setError("パスワードは8文字以上で設定してください。");
          return;
        }
        try {
          await signUpWithEmail(invite.email, password);
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code === "auth/email-already-in-use") {
            await signInWithEmail(invite.email, password);
          } else {
            throw err;
          }
        }
      } else {
        await signInWithEmail(invite.email, password);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">ShapeIt</p>
        <h1 className="font-display mt-3 text-3xl font-bold">招待に参加</h1>
        {invite ? (
          <p className="mt-3 text-sm text-ink/65">
            <strong>{invite.orgName}</strong> から <strong>{invite.email}</strong> 宛の招待です。
            このメールアドレスでパスワードを設定して参加してください。
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink/65">{msg}</p>
        )}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        {invite && !user && (
          <>
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void joinWithPassword("signup");
              }}
            >
              <input
                type="email"
                readOnly
                value={invite.email}
                className="w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm text-ink/70"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="パスワード（8文字以上）"
                className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
              >
                {busy ? "処理中…" : "パスワードを設定して参加"}
              </button>
            </form>
            <button
              type="button"
              disabled={busy}
              className="mt-2 w-full text-xs text-mint hover:underline"
              onClick={() => void joinWithPassword("login")}
            >
              すでにパスワードがある方はログインして参加
            </button>
            <button
              type="button"
              disabled={busy}
              className="mt-3 w-full rounded-lg border border-ink/15 py-2.5 text-sm"
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setError(formatAuthError(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Google で参加（同じメールのみ）
            </button>
          </>
        )}

        {user && !error && <p className="mt-4 text-sm text-ink/60">参加処理中…</p>}

        {!invite && (
          <Link to="/login" className="mt-4 block text-center text-sm text-mint hover:underline">
            ログインへ
          </Link>
        )}
      </div>
    </div>
  );
}
