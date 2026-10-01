import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { listOrgMembers, updateMemberRole, removeMember, MEMBER_ROLE_LABELS } from "../services/team";
import { cancelInvitation, createInvitation, listPendingInvitations, type ClipitInvitation } from "../services/invitations";
import { listManualsWithoutReads, listRecentReadConfirmations } from "../services/readStats";
import { effectivePlanId } from "../lib/internalAccess";
import { planFeatures } from "../lib/plans";
import type { ClipitMember, MemberRole, PlanId } from "../types";

export default function TeamPage() {
  const { organization, profile } = useOrg();
  const { user, demoMode } = useAuth();
  const [members, setMembers] = useState<ClipitMember[]>([]);
  const [pending, setPending] = useState<ClipitInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [lastLink, setLastLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [memberError, setMemberError] = useState("");
  const [noReads, setNoReads] = useState<{ id: string; title: string }[]>([]);
  const [recentReads, setRecentReads] = useState<{ viewerName: string; manualTitle: string }[]>([]);

  const refresh = () => {
    if (!organization?.id || demoMode) return;
    listOrgMembers(organization.id).then(setMembers);
    listPendingInvitations(organization.id).then(setPending);
    listManualsWithoutReads(organization.id).then(setNoReads);
    listRecentReadConfirmations(organization.id, 10).then((rows) =>
      setRecentReads(rows.map((r) => ({ viewerName: r.viewerName, manualTitle: r.manualTitle }))),
    );
  };

  useEffect(() => {
    if (demoMode) {
      setMembers([
        { uid: "1", name: "院長", email: "owner@example.com", role: "owner" },
        { uid: "2", name: "事務長", email: "admin@example.com", role: "admin" },
      ]);
      return;
    }
    refresh();
  }, [organization?.id, demoMode]);

  const canManage = profile?.role === "owner" || profile?.role === "admin";
  const planId = organization
    ? effectivePlanId(organization.plan as PlanId, user?.email)
    : ("free" as PlanId);
  const staffInviteEnabled = planFeatures(planId).staffInvite;

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user || !email.trim()) return;
    setBusy(true);
    setInviteError("");
    try {
      const { url } = await createInvitation({
        organizationId: organization.id,
        email,
        role,
        createdBy: user.uid,
      });
      setLastLink(url);
      setEmail("");
      refresh();
    } catch (err) {
      setInviteError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (memberUid: string, nextRole: MemberRole) => {
    if (!organization) return;
    setMemberError("");
    try {
      await updateMemberRole(organization.id, memberUid, nextRole);
      refresh();
    } catch (err) {
      setMemberError((err as Error).message);
    }
  };

  const remove = async (member: ClipitMember) => {
    if (!organization) return;
    if (!confirm(`${member.name || member.email} を組織から外しますか？`)) return;
    setMemberError("");
    try {
      await removeMember(organization.id, member.uid);
      refresh();
    } catch (err) {
      setMemberError((err as Error).message);
    }
  };

  const revokeInvite = async (inv: ClipitInvitation) => {
    if (!confirm(`${inv.email} への招待を取り消しますか？`)) return;
    setMemberError("");
    try {
      await cancelInvitation(inv.token);
      refresh();
    } catch (err) {
      setMemberError((err as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="スタッフ" description="メンバー一覧と招待" />
      <div className="space-y-6 p-6">
        {memberError && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700">{memberError}</p>
        )}

        {canManage && !demoMode && (
          <form onSubmit={invite} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">スタッフを招待</h2>
            {!staffInviteEnabled && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                スタッフ招待はスタンダードプラン以上で利用できます。設定 → プランをご確認ください。
              </p>
            )}
            {inviteError && (
              <p className="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700">{inviteError}</p>
            )}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="editor">編集者</option>
                <option value="admin">管理者</option>
                <option value="viewer">閲覧のみ</option>
              </select>
              <button
                type="submit"
                disabled={busy || !staffInviteEnabled}
                className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                招待リンクを発行
              </button>
            </div>
            {lastLink && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">招待URL（このリンクをメールやチャットで送ってください）</p>
                <p className="mt-1 break-all text-xs text-slate-600">
                  <a href={lastLink} className="text-primary-600 underline">{lastLink}</a>
                </p>
              </div>
            )}
          </form>
        )}

        {noReads.length > 0 && (
          <section className="rounded-2xl border border-primary-200 bg-primary-50/50 p-5">
            <h2 className="text-sm font-bold text-primary-900">未確認のマニュアル（公開中・既読0件）</h2>
            <ul className="mt-2 space-y-1 text-sm text-primary-800">
              {noReads.map((m) => (
                <li key={m.id}>
                  <a href={`/manuals/${m.id}/share`} className="font-semibold hover:underline">
                    {m.title}
                  </a>
                  — 共有URLを送って確認してもらいましょう
                </li>
              ))}
            </ul>
          </section>
        )}

        {recentReads.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">既読の履歴</h2>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {recentReads.map((r, i) => (
                <li key={i} className="py-2 text-slate-600">
                  <span className="font-medium text-slate-800">{r.viewerName}</span> — {r.manualTitle}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-bold text-slate-900">メンバー ({members.length})</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.uid} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {m.name || "（名前未設定）"}
                    {m.uid === user?.uid && <span className="ml-2 text-xs text-slate-400">（あなた）</span>}
                  </p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canManage && m.role !== "owner" && m.uid !== user?.uid ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => void changeRole(m.uid, e.target.value as MemberRole)}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold"
                      >
                        <option value="admin">管理者</option>
                        <option value="editor">編集者</option>
                        <option value="viewer">閲覧のみ</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void remove(m)}
                        className="rounded-lg border border-danger-200 px-3 py-1.5 text-xs font-semibold text-danger-700 hover:bg-danger-50"
                      >
                        削除
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {MEMBER_ROLE_LABELS[m.role]}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {pending.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h2 className="text-sm font-bold text-amber-900">招待待ち ({pending.length})</h2>
            <ul className="mt-2 space-y-2 text-sm text-amber-800">
              {pending.map((p) => (
                <li key={p.token} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {p.email} — {MEMBER_ROLE_LABELS[p.role]}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => void revokeInvite(p)}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      取り消す
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
