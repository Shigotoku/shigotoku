import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { listOrgMembers } from "../services/team";
import { createInvitation, listPendingInvitations, type ClipitInvitation } from "../services/invitations";
import { listManualsWithoutReads, listRecentReadConfirmations } from "../services/readStats";
import type { ClipitMember, MemberRole } from "../types";

export default function TeamPage() {
  const { organization, profile } = useOrg();
  const { user, demoMode } = useAuth();
  const [members, setMembers] = useState<ClipitMember[]>([]);
  const [pending, setPending] = useState<ClipitInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [lastLink, setLastLink] = useState("");
  const [busy, setBusy] = useState(false);
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

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user || !email.trim()) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  const canInvite = profile?.role === "owner" || profile?.role === "admin";

  return (
    <>
      <PageHeader title="スタッフ" description="メンバー一覧と招待" />
      <div className="space-y-6 p-6">
        {canInvite && !demoMode && (
          <form onSubmit={invite} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">スタッフを招待</h2>
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
                disabled={busy}
                className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                招待リンクを発行
              </button>
            </div>
            {lastLink && (
              <p className="mt-3 break-all text-xs text-slate-600">
                招待URL: <a href={lastLink} className="text-primary-600 underline">{lastLink}</a>
              </p>
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
            <h2 className="text-sm font-bold text-slate-900">メンバー</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.uid} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.name || "（名前未設定）"}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{m.role}</span>
              </li>
            ))}
          </ul>
        </section>

        {pending.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h2 className="text-sm font-bold text-amber-900">招待待ち ({pending.length})</h2>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {pending.map((p) => (
                <li key={p.token}>{p.email} — {p.role}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
