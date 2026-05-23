import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2, Users } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useCompanyStore } from "../../store/company";
import { invitationService } from "../../services/invitations";
import { isSupabaseConfigured } from "../../lib/supabase";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, isDemo } = useAuthStore();
  const { fetchCompanies } = useCompanyStore();

  const [info, setInfo] = useState<{
    companyName: string;
    inviterEmail: string;
    role: string;
    expired: boolean;
  } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const ROLE_LABELS: Record<string, string> = {
    admin: "管理者",
    member: "メンバー",
    viewer: "閲覧者",
  };

  useEffect(() => {
    if (!token) return;

    if (!isSupabaseConfigured) {
      setInfo({
        companyName: "デモ会社",
        inviterEmail: "demo@example.com",
        role: "member",
        expired: false,
      });
      setLoadingInfo(false);
      return;
    }

    invitationService.fetchByToken(token).then((data) => {
      setInfo(data);
      setLoadingInfo(false);
    });
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);

    if (!isSupabaseConfigured || isDemo) {
      setTimeout(() => {
        setResult("success");
        if (user) fetchCompanies(user.id);
        setTimeout(() => navigate("/dashboard"), 1500);
      }, 800);
      return;
    }

    try {
      const { companyId } = await invitationService.accept(token);
      if (user) {
        await fetchCompanies(user.id);
      }
      setResult("success");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "承認に失敗しました");
      setResult("error");
    } finally {
      setAccepting(false);
    }
  };

  if (loadingInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
          <img src="/icon.png" alt="ランウィズ" className="h-14 w-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">チームへの招待</h1>
      </div>

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        {!info || info.expired ? (
          <div className="text-center py-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              この招待リンクは無効です
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              リンクの有効期限が切れているか、既に使用済みの可能性があります。
              招待者に再度リンクの発行を依頼してください。
            </p>
            <Link
              to="/"
              className="mt-6 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              トップページへ
            </Link>
          </div>
        ) : result === "success" ? (
          <div className="text-center py-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">参加しました！</h2>
            <p className="mt-2 text-sm text-slate-500">
              {info.companyName} のチームに参加しました。ダッシュボードに移動します...
            </p>
          </div>
        ) : result === "error" ? (
          <div className="text-center py-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">エラー</h2>
            <p className="mt-2 text-sm text-slate-500">{errorMsg}</p>
            <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary-600">
              ダッシュボードへ
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{info.companyName}</p>
                  <p className="text-xs text-slate-500">{info.inviterEmail} からの招待</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">あなたの権限：</span>
                <span className="rounded-lg bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                  {ROLE_LABELS[info.role] || info.role}
                </span>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 text-center">
                  招待を承認するにはログインが必要です
                </p>
                <Link
                  to={`/login?redirect=/invite/${token}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700"
                >
                  ログインして参加
                </Link>
                <Link
                  to={`/login?signup=1&redirect=/invite/${token}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-200 px-6 py-3 text-sm font-semibold text-primary-600 transition-all hover:bg-primary-50"
                >
                  新規登録して参加
                </Link>
              </div>
            ) : (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
              >
                {accepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {info.companyName} のチームに参加する
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
