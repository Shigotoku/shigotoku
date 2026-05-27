import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users, Mail, Copy, Check, Loader2, AlertCircle, Crown, Shield, Eye, ChevronDown,
  Trash2, UserCog, X,
} from "lucide-react";
import { useCompanyStore } from "../../store/company";
import { useAuthStore } from "../../store/auth";
import { invitationService } from "../../services/invitations";
import { companyService } from "../../services/companies";
import { isFirebaseConfigured } from "../../lib/firebase";
import { useSubscriptionStore, PLAN_LABELS } from "../../store/subscription";
import {
  EXTRA_SEAT_MONTHLY,
  INCLUDED_SEATS,
  formatYen,
  canAddSeat,
  inviteAddsExtraSeatCharge,
  computeMonthlyTotal,
} from "../../lib/billing";
import {
  canManageMembers,
  canRemoveMember,
  canChangeMemberRole,
  canTransferOwnership,
  assignableRoles,
} from "../../lib/permissions";
import type { Database } from "../../lib/database.types";

type Role = "admin" | "member" | "viewer";
type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

const ROLE_INFO: Record<Role, { label: string; desc: string; icon: React.ElementType; color: string }> = {
  admin: { label: "管理者", desc: "会社情報の編集、メンバー招待が可能", icon: Shield, color: "text-blue-600 bg-blue-50" },
  member: { label: "メンバー", desc: "全機能を利用可能（編集権限あり）", icon: Users, color: "text-green-600 bg-green-50" },
  viewer: { label: "閲覧者", desc: "データの閲覧のみ", icon: Eye, color: "text-slate-600 bg-slate-50" },
};

interface Member {
  id: string;
  user_id: string;
  role: string;
  profile?: { full_name: string | null; email: string };
}

export default function InvitePage() {
  const { company } = useCompanyStore();
  const { user } = useAuthStore();
  const { plan, seatUsage, monthlyTotal, fetchSubscription } = useSubscriptionStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [roleOpen, setRoleOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedUrl, setCopiedUrl] = useState("");
  const [inviteLinks, setInviteLinks] = useState<{ email: string; url: string; role: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InvitationRow[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showInviteConfirm, setShowInviteConfirm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canInvite = canManageMembers(userRole);
  const occupied = seatUsage?.occupiedSeats ?? members.length;
  const seatAllowed = canAddSeat(plan, occupied);
  const extraChargeOnInvite = inviteAddsExtraSeatCharge(occupied);
  const nextMonthlyTotal = computeMonthlyTotal(plan, occupied + 1, false);

  const reload = useCallback(async () => {
    if (!company) return;
    const [memberData, invites] = await Promise.all([
      companyService.fetchMembers(company.id),
      invitationService.fetchByCompany(company.id),
    ]);
    setMembers(memberData as Member[]);
    setPendingInvites(invites.filter((inv) => !inv.accepted_at));
    await fetchSubscription(company.id);
  }, [company, fetchSubscription]);

  useEffect(() => {
    if (!company?.id) return;
    reload().catch(() => {});
  }, [company?.id, reload]);

  useEffect(() => {
    if (!company?.id || !user?.id) return;
    companyService.getUserRole(company.id, user.id).then(setUserRole);
  }, [company?.id, user?.id]);

  const submitInvite = async () => {
    if (!company || !canInvite) return;
    setError("");
    setShowInviteConfirm(false);

    if (!seatAllowed) {
      setError(
        `Freeプランは${INCLUDED_SEATS}人までです。設定画面からGrowth以上にアップグレードしてください。`,
      );
      return;
    }

    if (!isFirebaseConfigured) {
      const demoUrl = `${window.location.origin}/invite/demo-token-123`;
      setInviteLinks((prev) => [{ email, url: demoUrl, role }, ...prev]);
      setEmail("");
      return;
    }

    setLoading(true);
    try {
      const { inviteUrl } = await invitationService.invite(company.id, email, role);
      setInviteLinks((prev) => [{ email, url: inviteUrl, role }, ...prev]);
      setEmail("");
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "招待の送信に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !canInvite) return;
    if (extraChargeOnInvite && plan !== "free") {
      setShowInviteConfirm(true);
      return;
    }
    if (!seatAllowed) {
      setError(
        `Freeプランは${INCLUDED_SEATS}人までです。設定画面からGrowth以上にアップグレードしてください。`,
      );
      return;
    }
    submitInvite();
  };

  const handleRemoveMember = async () => {
    if (!company || !removeTarget || !user) return;
    setActionLoading(true);
    setError("");
    try {
      await companyService.removeMember(company.id, removeTarget.user_id);
      setRemoveTarget(null);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (member: Member, newRole: Role) => {
    if (!company || !user) return;
    if (!canChangeMemberRole(userRole, member.role, user.id, member.user_id)) return;

    setActionLoading(true);
    setError("");
    try {
      await companyService.updateMemberRole(company.id, member.user_id, newRole);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ロール変更に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!company || !transferTarget || !user) return;
    setActionLoading(true);
    setError("");
    try {
      await companyService.transferOwnership(company.id, user.id, transferTarget.user_id);
      setTransferTarget(null);
      const newRole = await companyService.getUserRole(company.id, user.id);
      setUserRole(newRole);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "オーナー移譲に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvite = async (inv: InvitationRow) => {
    if (!company) return;
    setActionLoading(true);
    setError("");
    try {
      await invitationService.revoke(inv.id, company.id, inv.token);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "招待の取消に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(""), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">チーム管理</h1>
        <p className="mt-1 text-slate-500">
          メンバーを招待して、{company?.name} のデータを共有しましょう。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          <strong className="text-slate-800">{company?.name}</strong> の料金:
          {" "}{PLAN_LABELS[plan]} {formatYen(monthlyTotal)}/月
          （{INCLUDED_SEATS}人まで無料、3人目以降 +{formatYen(EXTRA_SEAT_MONTHLY)}/人）
        </p>
        <p className="mt-1 text-xs text-slate-500">
          現在 {occupied}人利用中
          {seatUsage?.pendingInviteCount ? `（招待待ち ${seatUsage.pendingInviteCount}件）` : ""}
          {" · "}
          <Link to="/settings" className="font-medium text-primary-600 underline underline-offset-2">
            プラン・請求の変更
          </Link>
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!canInvite && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            メンバーの招待は<strong>オーナー</strong>または<strong>管理者</strong>のみ可能です。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-bold text-slate-900">メンバーを招待</h2>
          </div>

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                disabled={!canInvite}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">権限</label>
              <div className="relative">
                <button
                  type="button"
                  disabled={!canInvite}
                  onClick={() => setRoleOpen(!roleOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition-colors hover:border-slate-400 disabled:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${ROLE_INFO[role].color}`}>
                      {ROLE_INFO[role].label}
                    </span>
                    <span className="text-slate-500">{ROLE_INFO[role].desc}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
                </button>
                {roleOpen && canInvite && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {(Object.entries(ROLE_INFO) as [Role, typeof ROLE_INFO[Role]][]).map(([key, info]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setRole(key); setRoleOpen(false); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                      >
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${info.color}`}>
                          {info.label}
                        </span>
                        <span className="text-slate-500">{info.desc}</span>
                        {role === key && <Check className="ml-auto h-4 w-4 text-primary-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !canInvite || !seatAllowed}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4" />招待リンクを生成</>}
            </button>

            {!seatAllowed && canInvite && (
              <p className="text-xs text-amber-700">
                席数上限に達しています。
                <Link to="/settings" className="ml-1 font-semibold underline">Growth以上にアップグレード</Link>
              </p>
            )}
          </form>

          {inviteLinks.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">今回生成したリンク</p>
              {inviteLinks.map((link, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{link.email}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${ROLE_INFO[link.role as Role]?.color}`}>
                      {ROLE_INFO[link.role as Role]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={link.url} className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500" />
                    <button type="button" onClick={() => copyLink(link.url)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                      {copiedUrl === link.url ? "コピー済み" : "コピー"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingInvites.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">招待待ち</p>
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm text-slate-700">{inv.email}</p>
                    <p className="text-xs text-slate-400">{ROLE_INFO[inv.role as Role]?.label ?? inv.role}</p>
                  </div>
                  {canInvite && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleRevokeInvite(inv)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      取消
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">現在のメンバー</h2>
          </div>

          {members.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">読み込み中...</div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const canEdit = user && canChangeMemberRole(userRole, m.role, user.id, m.user_id);
                const canRemove = user && canRemoveMember(userRole, m.role, user.id, m.user_id);
                const canTransfer = canTransferOwnership(userRole) && m.role !== "owner" && m.user_id !== user?.id;

                return (
                  <div key={m.id} className="rounded-xl border border-slate-100 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                          {(m.profile?.full_name || m.profile?.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {m.profile?.full_name || m.profile?.email || "メンバー"}
                            {m.user_id === user?.id && <span className="ml-1 text-xs text-slate-400">（あなた）</span>}
                          </p>
                          <p className="truncate text-xs text-slate-400">{m.profile?.email}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        {canEdit && m.role !== "owner" ? (
                          <select
                            value={m.role}
                            disabled={actionLoading}
                            onChange={(e) => handleRoleChange(m, e.target.value as Role)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
                          >
                            {assignableRoles(userRole).map((r) => (
                              <option key={r} value={r}>{ROLE_INFO[r as Role]?.label ?? r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            m.role === "owner" ? "bg-amber-50 text-amber-700" :
                            ROLE_INFO[m.role as Role]?.color || "bg-slate-100 text-slate-600"
                          }`}>
                            {m.role === "owner" ? "オーナー" : ROLE_INFO[m.role as Role]?.label || m.role}
                          </span>
                        )}
                      </div>
                    </div>
                    {(canRemove || canTransfer) && (
                      <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-50 pt-2">
                        {canTransfer && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setTransferTarget(m)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            オーナーに移譲
                          </button>
                        )}
                        {canRemove && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setRemoveTarget(m)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            削除
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            <p className="font-semibold text-slate-700">権限の目安</p>
            <ul className="mt-2 space-y-1">
              <li><strong>オーナー</strong> — 請求・プラン変更・オーナー移譲</li>
              <li><strong>管理者</strong> — メンバー招待・削除・ロール変更</li>
              <li><strong>メンバー</strong> — 日常業務の編集</li>
              <li><strong>閲覧者</strong> — 閲覧のみ</li>
            </ul>
          </div>
        </div>
      </div>

      {showInviteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">追加料金の確認</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              この招待を受け入れると<strong>3人目以降</strong>となり、月額に
              <strong className="text-slate-900"> {formatYen(EXTRA_SEAT_MONTHLY)}</strong>
              が加算されます。
            </p>
            <p className="mt-2 text-sm text-slate-600">
              招待後の月額目安: <strong>{formatYen(nextMonthlyTotal)}/月</strong>
              （現在 {formatYen(monthlyTotal)}/月）
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowInviteConfirm(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={submitInvite}
                disabled={loading}
                className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "送信中..." : "招待する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button type="button" onClick={() => setRemoveTarget(null)} className="absolute right-4 top-4 text-slate-400">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900">メンバーを削除</h3>
            <p className="mt-3 text-sm text-slate-600">
              <strong>{removeTarget.profile?.full_name || removeTarget.profile?.email}</strong>
              を {company?.name} から削除しますか？この操作は取り消せません。
            </p>
            {seatUsage && seatUsage.extraSeats > 0 && (
              <p className="mt-2 text-xs text-emerald-700">削除すると月額料金が下がる場合があります。</p>
            )}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setRemoveTarget(null)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700">
                キャンセル
              </button>
              <button type="button" onClick={handleRemoveMember} disabled={actionLoading} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">オーナー権限の移譲</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              <strong>{transferTarget.profile?.full_name || transferTarget.profile?.email}</strong>
              を新しいオーナーにします。あなたは管理者ロールになり、請求・プラン変更はできなくなります。
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setTransferTarget(null)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700">
                キャンセル
              </button>
              <button type="button" onClick={handleTransferOwnership} disabled={actionLoading} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                {actionLoading ? "移譲中..." : "移譲する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
