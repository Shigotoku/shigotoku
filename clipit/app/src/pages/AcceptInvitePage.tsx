import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { acceptInvitation, getInvitation } from "../services/invitations";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("招待を確認しています…");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!token) return;
    getInvitation(token).then((inv) => {
      if (!inv) setMsg("招待リンクが無効または期限切れです。");
      else setInviteEmail(inv.email);
    });
  }, [token]);

  useEffect(() => {
    if (loading || !user || !token) return;
    (async () => {
      try {
        await acceptInvitation(
          token,
          user.uid,
          user.email ?? inviteEmail,
          user.displayName ?? user.email ?? "メンバー",
        );
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setMsg((e as Error).message);
      }
    })();
  }, [user, loading, token, inviteEmail, navigate]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">スタッフ招待を受け取るにはログインが必要です。</p>
          <a
            href={`/login?redirect=/invite/${token}`}
            className="mt-4 inline-block rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white"
          >
            ログインする
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-600">{msg}</p>
    </div>
  );
}
