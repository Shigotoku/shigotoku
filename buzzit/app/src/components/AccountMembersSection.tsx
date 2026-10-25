import { useCallback, useEffect, useState } from 'react';
import { Building2, Copy, Loader2, Mail, Trash2, UserPlus, Users, Clock } from 'lucide-react';
import { useAuth } from '../store/authContext';
import {
  fetchAccountMembers,
  inviteAccountMember,
  removeAccountMember,
  revokeAccountInvitation,
  type AccountMemberRow,
  type AccountInvitationRow,
} from '../lib/api';

const ROLE_LABELS: Record<string, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
};

export default function AccountMembersSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [data, setData] = useState<{
    members: AccountMemberRow[];
    invitations: AccountInvitationRow[];
    mailConfigured: boolean;
    accountType: string;
    companyName?: string;
    seatCount: number;
    includedSeats: number;
    extraSeats: number;
    extraSeatMonthly: number;
    extraSeatsCost: number;
    canManage: boolean;
    myRole?: string;
  } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAccountMembers();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        会社メンバー情報を読み込み中...
      </div>
    );
  }

  if (!data || data.accountType !== 'business') {
    return null;
  }

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    setCopiedUrl('');
    try {
      const result = await inviteAccountMember(email.trim(), role);
      setEmail('');
      if (result.kind === 'member') {
        setMessage(`${email.trim()} を会社メンバーに追加しました。`);
      } else {
        setCopiedUrl(result.inviteUrl);
        try {
          await navigator.clipboard.writeText(result.inviteUrl);
          setMessage(
            `招待リンクをコピーしました。Slack・LINEなどで ${email.trim()} に共有してください（有効期限7日）。`,
          );
        } catch {
          setMessage(
            `招待リンクを作成しました。下のリンクを Slack・LINEなどで ${email.trim()} に共有してください（有効期限7日）。`,
          );
        }
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (member: AccountMemberRow) => {
    if (!confirm(`${member.email ?? member.userId} を会社から削除しますか？`)) return;
    setSubmitting(true);
    setError('');
    try {
      await removeAccountMember(member.userId);
      setMessage('メンバーを削除しました');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inv: AccountInvitationRow) => {
    if (!confirm(`${inv.email} への招待を取り消しますか？`)) return;
    setSubmitting(true);
    setError('');
    try {
      await revokeAccountInvitation(inv.id, inv.token);
      setMessage('招待を取り消しました');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取り消しに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('招待リンクをコピーしました');
      setCopiedUrl(url);
    } catch {
      setError('コピーに失敗しました');
    }
  };

  return (
    <section className="mb-10 border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-neutral-500">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">会社アカウント</span>
          </div>
          <h2 className="mt-1 text-lg font-bold">{data.companyName ?? '法人アカウント'}</h2>
          <p className="mt-2 text-sm text-neutral-600">
            未登録の方には招待リンクを作成し、Slack・LINEなどで共有できます。承認後、同じ店舗データにアクセスできます。
            2人目以降は <strong>+¥{data.extraSeatMonthly.toLocaleString()}/月</strong>（1席あたり）。
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{data.seatCount} 席利用中</p>
          {data.extraSeats > 0 && (
            <p className="text-neutral-500">
              追加 {data.extraSeats} 席 → +¥{data.extraSeatsCost.toLocaleString()}/月
            </p>
          )}
        </div>
      </div>

      {error && <p className="buzz-alert buzz-alert-error mt-4">{error}</p>}
      {message && <p className="buzz-alert buzz-alert-success mt-4">{message}</p>}
      {copiedUrl && (
        <div className="mt-4 flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 p-3 text-xs">
          <code className="flex-1 truncate text-neutral-700">{copiedUrl}</code>
          <button type="button" className="buzz-btn-secondary shrink-0 px-2 py-1" onClick={() => copyInviteUrl(copiedUrl)}>
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <ul className="mt-6 divide-y divide-neutral-100 border border-neutral-100">
        {data.members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold">
                {(m.displayName ?? m.email ?? '?').slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{m.displayName ?? '（名前未設定）'}</p>
                <p className="truncate text-xs text-neutral-500">{m.email ?? m.userId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">{ROLE_LABELS[m.role] ?? m.role}</span>
              {data.canManage && m.role !== 'owner' && m.userId !== user?.uid && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRemove(m)}
                  className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  title="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
        {data.invitations.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50/50">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{inv.email}</p>
                <p className="truncate text-xs text-amber-700">招待リンク共有済み・承認待ち</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100"
                title="リンクをコピー"
                onClick={() => copyInviteUrl(`${window.location.origin}/account-invite/${inv.token}`)}
              >
                <Copy className="h-4 w-4" />
              </button>
              {data.canManage && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRevokeInvite(inv)}
                  className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  title="招待を取り消す"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {data.canManage && (
        <div className="mt-6 border-t border-neutral-100 pt-6">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <UserPlus className="h-4 w-4" />
            メンバーを招待
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            未登録の方には招待リンクを作成します。コピーして Slack・LINEなどで共有してください（有効期限7日）。
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="buzz-label">メールアドレス</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="buzz-input pl-10"
                  placeholder="member@example.com"
                />
              </div>
            </div>
            <div className="sm:w-36">
              <label className="buzz-label">権限</label>
              <select className="buzz-input" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')}>
                <option value="member">メンバー</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <button
              type="button"
              disabled={submitting || !email.trim()}
              onClick={handleInvite}
              className="buzz-btn-primary shrink-0"
            >
              {submitting ? '作成中...' : '招待リンクを作成'}
            </button>
          </div>
        </div>
      )}

      {!data.canManage && (
        <p className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
          <Users className="h-3.5 w-3.5" />
          メンバー招待はオーナー・管理者のみ可能です（あなたの権限: {ROLE_LABELS[data.myRole ?? ''] ?? data.myRole}）
        </p>
      )}
    </section>
  );
}
