import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { useAuth } from '../store/authContext';
import { acceptInvitation, fetchInvitationByToken } from '../lib/api';
import { ROLE_LABELS, type StoreRole } from '../lib/permissions';
import { BRAND_NAME } from '../constants/brand';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [info, setInfo] = useState<{ storeName: string; role: string; expired: boolean } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetchInvitationByToken(token)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      await acceptInvitation(token);
      setResult('success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '承認に失敗しました');
      setResult('error');
    } finally {
      setAccepting(false);
    }
  };

  const roleLabel = info?.role
    ? ROLE_LABELS[info.role as StoreRole] ?? info.role
    : '';

  if (loadingInfo) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-neutral-50 px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-300 bg-white text-xl font-bold">
          B
        </div>
        <h1 className="text-2xl font-bold">{BRAND_NAME} — 店舗への招待</h1>
      </div>

      <div className="buzz-card-pad">
        {!info || info.expired ? (
          <div className="py-4 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-bold">この招待リンクは無効です</h2>
            <p className="mt-2 text-sm text-neutral-500">
              有効期限切れ、または使用済みの可能性があります。招待者に再発行を依頼してください。
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm font-medium text-neutral-900 underline">
              ログインへ
            </Link>
          </div>
        ) : result === 'success' ? (
          <div className="py-4 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-lg font-bold">参加しました</h2>
            <p className="mt-2 text-sm text-neutral-500">{info.storeName} に参加しました。ダッシュボードへ移動します...</p>
          </div>
        ) : result === 'error' ? (
          <div className="py-4 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-bold">エラー</h2>
            <p className="mt-2 text-sm text-neutral-500">{errorMsg}</p>
            <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-neutral-900 underline">
              ダッシュボードへ
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-900 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">{info.storeName}</p>
                  <p className="text-xs text-neutral-500">店舗への招待</p>
                </div>
              </div>
              <p className="text-sm text-neutral-600">
                あなたの権限: <span className="font-semibold text-neutral-900">{roleLabel}</span>
              </p>
            </div>

            {!user ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-neutral-600">招待を承認するにはログインが必要です</p>
                <Link
                  to={`/login?redirect=/invite/${token}`}
                  className="block w-full bg-neutral-900 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  ログインして参加
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
                    {info.storeName} に参加する
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
