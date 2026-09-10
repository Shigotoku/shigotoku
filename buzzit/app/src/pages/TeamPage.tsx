import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Mail, Copy, Check, Loader2, AlertCircle, Crown, Shield, ChevronDown, Trash2, UserCog, X,
} from 'lucide-react';
import { useAuth } from '../store/authContext';
import { useStore } from '../store/storeContext';
import {
  fetchStoreMembers,
  inviteStoreMember,
  revokeStoreInvitation,
  removeStoreMember,
  updateStoreMemberRole,
  transferStoreOwnership,
  fetchBilling,
  type StoreMember,
  type StoreInvitation,
} from '../lib/api';
import {
  canManageMembers,
  canRemoveMember,
  canChangeMemberRole,
  canTransferOwnership,
  assignableRoles,
  ROLE_LABELS,
  type StoreRole,
} from '../lib/permissions';
import { canAddStaff, staffLimitLabel } from '../lib/billing';
import type { PlanTier } from '../types';

const ROLE_INFO: Record<Exclude<StoreRole, 'owner'>, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  manager: { label: '管理者', desc: 'スタッフ招待・設定変更が可能', icon: Shield, color: 'text-blue-700 bg-blue-50' },
  staff: { label: 'スタッフ', desc: '日常業務の利用（招待不可）', icon: Users, color: 'text-neutral-700 bg-neutral-100' },
};

type TeamPageProps = {
  /** 設定タブ内に埋め込むとき true（外側のページ枠を外す） */
  embedded?: boolean;
};

export default function TeamPage({ embedded }: TeamPageProps = {}) {
  const { user } = useAuth();
  const { activeStoreId, userRole, setUserRole, refreshStores } = useStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('staff');
  const [roleOpen, setRoleOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const [inviteLinks, setInviteLinks] = useState<{ email: string; url: string; role: string }[]>([]);
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<StoreInvitation[]>([]);
  const [plan, setPlan] = useState<PlanTier>('starter');
  const [removeTarget, setRemoveTarget] = useState<StoreMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<StoreMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canInvite = canManageMembers(userRole);
  const staffAllowed = canAddStaff(plan, members.length, pendingInvites.length);

  const reload = useCallback(async () => {
    if (!activeStoreId) return;
    const [memberData, billing] = await Promise.all([
      fetchStoreMembers(activeStoreId),
      fetchBilling(),
    ]);
    setMembers(memberData.members);
    setPendingInvites(memberData.invitations);
    setPlan(billing.plan as PlanTier);
    const me = memberData.members.find((m) => m.userId === user?.uid);
    setUserRole((me?.role as StoreRole) ?? null);
  }, [activeStoreId, user?.uid, setUserRole]);

  useEffect(() => {
    refreshStores().catch(() => {});
  }, [refreshStores]);

  useEffect(() => {
    if (!activeStoreId) return;
    reload().catch(() => setError('メンバー情報の取得に失敗しました'));
  }, [activeStoreId, reload]);

  const submitInvite = async () => {
    if (!activeStoreId || !canInvite) return;
    setError('');
    if (!staffAllowed) {
      setError(`現在のプランではスタッフ上限（${staffLimitLabel(plan)}）に達しています。設定画面からプランをアップグレードしてください。`);
      return;
    }
    setLoading(true);
    try {
      const { inviteUrl } = await inviteStoreMember(activeStoreId, email, role);
      setInviteLinks((prev) => [{ email, url: inviteUrl, role }, ...prev]);
      setEmail('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStoreId || !canInvite) return;
    submitInvite();
  };

  const handleRemoveMember = async () => {
    if (!activeStoreId || !removeTarget) return;
    setActionLoading(true);
    setError('');
    try {
      await removeStoreMember(activeStoreId, removeTarget.userId);
      setRemoveTarget(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (member: StoreMember, newRole: 'manager' | 'staff') => {
    if (!activeStoreId || !user) return;
    if (!canChangeMemberRole(userRole, member.role, user.uid, member.userId)) return;
    setActionLoading(true);
    setError('');
    try {
      await updateStoreMemberRole(activeStoreId, member.userId, newRole);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロール変更に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!activeStoreId || !transferTarget) return;
    setActionLoading(true);
    setError('');
    try {
      await transferStoreOwnership(activeStoreId, transferTarget.userId);
      setTransferTarget(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'オーナー移譲に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvite = async (inv: StoreInvitation) => {
    if (!activeStoreId) return;
    setActionLoading(true);
    setError('');
    try {
      await revokeStoreInvitation(activeStoreId, inv.id, inv.token);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待の取消に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  if (!activeStoreId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-6' : 'buzz-page-narrow space-y-6'}>
      <p className="text-sm text-neutral-600">
          店舗にスタッフを招待します。プランごとにスタッフ上限があります（現在: {staffLimitLabel(plan)}）。
          <Link to="/settings" className="ml-1 font-medium text-neutral-900 underline underline-offset-2">
            設定
          </Link>
        </p>

      {error && (
        <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {canInvite ? (
        <section className="buzz-card-pad">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Mail className="h-5 w-5" />
            メンバーを招待
          </h3>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="buzz-input flex-1"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleOpen((v) => !v)}
                  className="flex min-h-[44px] w-full items-center justify-between gap-2 border border-neutral-200 bg-white px-3 text-sm sm:w-40"
                >
                  {ROLE_INFO[role].label}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {roleOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full border border-neutral-200 bg-white py-1 shadow-lg">
                    {assignableRoles(userRole).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRole(r); setRoleOpen(false); }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      >
                        {ROLE_INFO[r].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading || !staffAllowed} className="buzz-btn-primary whitespace-nowrap disabled:opacity-50">
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : '招待を送信'}
              </button>
            </div>
            {!staffAllowed && (
              <p className="text-xs text-amber-700">スタッフ上限に達しています。プランをアップグレードしてください。</p>
            )}
          </form>

          {inviteLinks.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-neutral-500">招待リンク（コピーして共有）</p>
              {inviteLinks.map((link) => (
                <div key={link.url} className="flex items-center gap-2 border border-neutral-200 bg-neutral-50 p-3 text-xs">
                  <span className="min-w-0 flex-1 truncate">{link.email} — {link.url}</span>
                  <button type="button" onClick={() => copyUrl(link.url)} className="shrink-0 text-neutral-600 hover:text-neutral-900">
                    {copiedUrl === link.url ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          メンバー招待はオーナーまたは管理者のみ可能です。
        </div>
      )}

      <section className="buzz-card-pad">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5" />
          メンバー（{members.length}人）
        </h3>
        <ul className="divide-y divide-neutral-100">
          {members.map((member) => {
            const isMe = member.userId === user?.uid;
            const roleLabel = ROLE_LABELS[member.role as StoreRole] ?? member.role;
            return (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {member.displayName ?? member.email ?? member.userId.slice(0, 8)}
                    {isMe && <span className="ml-2 text-xs text-neutral-500">（あなた）</span>}
                  </p>
                  <p className="text-xs text-neutral-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'owner' ? (
                    <span className="flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                      <Crown className="h-3 w-3" />
                      {roleLabel}
                    </span>
                  ) : canChangeMemberRole(userRole, member.role, user?.uid ?? '', member.userId) ? (
                    <select
                      value={member.role}
                      disabled={actionLoading}
                      onChange={(e) => handleRoleChange(member, e.target.value as 'manager' | 'staff')}
                      className="border border-neutral-200 bg-white px-2 py-1 text-xs"
                    >
                      {assignableRoles(userRole).concat(member.role === 'manager' ? ['manager' as const] : []).filter((v, i, a) => a.indexOf(v) === i).map((r) => (
                        <option key={r} value={r}>{ROLE_INFO[r].label}</option>
                      ))}
                      {member.role === 'manager' && userRole === 'owner' && <option value="manager">管理者</option>}
                    </select>
                  ) : (
                    <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">{roleLabel}</span>
                  )}
                  {canTransferOwnership(userRole) && member.role !== 'owner' && !isMe && (
                    <button
                      type="button"
                      title="オーナー移譲"
                      onClick={() => setTransferTarget(member)}
                      className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <UserCog className="h-4 w-4" />
                    </button>
                  )}
                  {canRemoveMember(userRole, member.role, user?.uid ?? '', member.userId) && (
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(member)}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {pendingInvites.length > 0 && (
        <section className="buzz-card-pad">
          <h3 className="mb-4 text-lg font-bold">保留中の招待</h3>
          <ul className="space-y-2">
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
                <div>
                  <p>{inv.email}</p>
                  <p className="text-xs text-neutral-500">{ROLE_INFO[inv.role].label} · 期限 {new Date(inv.expiresAt).toLocaleDateString('ja-JP')}</p>
                </div>
                {canInvite && (
                  <button type="button" onClick={() => handleRevokeInvite(inv)} disabled={actionLoading} className="text-xs text-red-600 hover:underline">
                    取消
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {removeTarget && (
        <div className="buzz-modal-overlay">
          <div className="w-full max-w-md border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-bold">メンバーを削除</h3>
            <p className="mt-2 text-sm text-neutral-600">
              {removeTarget.displayName ?? removeTarget.email} を店舗から削除しますか？
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRemoveTarget(null)} className="buzz-btn-secondary">キャンセル</button>
              <button type="button" onClick={handleRemoveMember} disabled={actionLoading} className="border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {transferTarget && (
        <div className="buzz-modal-overlay">
          <div className="w-full max-w-md border border-neutral-200 bg-white p-6">
            <button type="button" onClick={() => setTransferTarget(null)} className="absolute right-4 top-4 text-neutral-400">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold">オーナー権限の移譲</h3>
            <p className="mt-2 text-sm text-neutral-600">
              {transferTarget.displayName ?? transferTarget.email} にオーナー権限を移譲します。あなたは管理者になります。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setTransferTarget(null)} className="buzz-btn-secondary">キャンセル</button>
              <button type="button" onClick={handleTransferOwnership} disabled={actionLoading} className="buzz-btn-primary">
                移譲する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
