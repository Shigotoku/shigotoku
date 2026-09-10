import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '../store/authContext';
import { acceptAccountInvitation, fetchAccountInvitationByToken } from '../lib/api';
import { BRAND_NAME } from '../constants/brand';

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  member: 'メンバー',
};

export default function AcceptAccountInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [info, setInfo] = useState<{
    companyName: string;
    role: string;
    email: string;
    inviterName?: string;
    expired: boolean;
  } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchAccountInvitationByToken(token)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setErrorMsg('');
    try {
      await acceptAccountInvitation(token);
      setResult('success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '承認に失敗しました');
      setResult('error');
    } finally {
      setAccepting(false);
    }
  };

  const roleLabel = info?.role ? ROLE_LABELS[info.role] ?? info.role : '';

  if (loadingInfo) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f4f0]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-[#f5f4f0] px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-bold">{BRAND_NAME}</h1>
        <p className="mt-1 text-sm text-neutral-600">会社への招待</p>
      </div>

      <div className="border border-neutral-200 bg-white p-6">
        {!info || info.expired ? (
          <div className="py-4 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-bold">この招待リンクは無効です</h2>
            <p className="mt-2 text-sm text-neutral-500">
              有効期限切れ、または使用済みの可能性があります。招待者に再送を依頼してください。
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm font-medium text-neutral-900 underline">
              ログインへ
            </Link>
          </div>
        ) : result === 'success' ? (
          <div className="py-4 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-bold">参加しました</h2>
            <p className="mt-2 text-sm text-neutral-500">
              {info.companyName} に参加しました。ダッシュボードへ移動します...
            </p>
          </div>
        ) : result === 'error' ? (
          <div className="py-4 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-bold">エラー</h2>
            <p className="mt-2 text-sm text-neutral-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-4 text-sm font-medium text-neutral-900 underline"
            >
              もう一度試す
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-900 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">{info.companyName}</p>
                  <p className="text-xs text-neutral-500">会社アカウントへの招待</p>
                </div>
              </div>
              {info.inviterName && (
                <p className="text-sm text-neutral-600">招待者: {info.inviterName}</p>
              )}
              <p className="mt-1 text-sm text-neutral-600">
                権限: <span className="font-semibold text-neutral-900">{roleLabel}</span>
              </p>
              <p className="mt-2 text-xs text-neutral-500">招待先: {info.email}</p>
            </div>

            {!user ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-neutral-600">
                  <strong>{info.email}</strong> でログインまたは新規登録してください
                </p>
                <Link
                  to={`/login?redirect=/account-invite/${token}`}
                  className="block w-full bg-neutral-900 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  ログインして参加
                </Link>
                <Link
                  to={`/login?redirect=/account-invite/${token}`}
                  className="block w-full border border-neutral-300 py-3 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                >
                  新規登録して参加
                </Link>
              </div>
            ) : user.email?.toLowerCase() !== info.email.toLowerCase() ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-red-600">
                  ログイン中のメール（{user.email}）が招待先と一致しません。
                </p>
                <Link to={`/login?redirect=/account-invite/${token}`} className="text-sm font-medium underline">
                  正しいアカウントでログイン
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="flex w-full items-center justify-center gap-2 bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {info.companyName} に参加する
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
