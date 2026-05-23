import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Mail, Copy, Check, Trash2, Loader2, AlertCircle, Crown, Shield, Eye, ChevronDown,
} from "lucide-react";
import { useCompanyStore } from "../../store/company";
import { invitationService } from "../../services/invitations";
import { companyService } from "../../services/companies";
import { isSupabaseConfigured } from "../../lib/supabase";

type Role = "admin" | "member" | "viewer";

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
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [roleOpen, setRoleOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedUrl, setCopiedUrl] = useState("");
  const [inviteLinks, setInviteLinks] = useState<{ email: string; url: string; role: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const loadMembers = async () => {
    if (!company || membersLoaded) return;
    try {
      const data = await companyService.fetchMembers(company.id);
      setMembers(data as Member[]);
      setMembersLoaded(true);
    } catch {}
  };

  useState(() => {
    loadMembers();
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setError("");

    if (!isSupabaseConfigured) {
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
    } catch (err: any) {
      setError(err?.message || "招待の送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(""), 2000);
  };

  const RoleIcon = ROLE_INFO[role].icon;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">チーム管理</h1>
          <p className="mt-1 text-slate-500">
            メンバーを招待して、{company?.name} のデータを共有しましょう。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 招待フォーム */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-bold text-slate-900">メンバーを招待</h2>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                権限
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleOpen(!roleOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition-colors hover:border-slate-400"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${ROLE_INFO[role].color}`}>
                      {ROLE_INFO[role].label}
                    </span>
                    <span className="text-slate-500">{ROLE_INFO[role].desc}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
                </button>
                {roleOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {(Object.entries(ROLE_INFO) as [Role, typeof ROLE_INFO[Role]][]).map(([key, info]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setRole(key); setRoleOpen(false); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50"
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
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  招待リンクを生成
                </>
              )}
            </button>
          </form>

          {/* 生成済み招待リンク */}
          {inviteLinks.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                生成済みリンク
              </p>
              {inviteLinks.map((link, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{link.email}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${ROLE_INFO[link.role as Role]?.color}`}>
                      {ROLE_INFO[link.role as Role]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={link.url}
                      className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500"
                    />
                    <button
                      onClick={() => copyLink(link.url)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      {copiedUrl === link.url ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedUrl === link.url ? "コピー済み" : "コピー"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    このリンクを {link.email} に共有してください。7日間有効です。
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 現在のメンバー一覧 */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-bold text-slate-900">現在のメンバー</h2>
          </div>

          {members.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              <Users className="mx-auto mb-2 h-8 w-8 text-slate-200" />
              メンバー情報を読み込み中...
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {(m.profile?.full_name || m.profile?.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {m.profile?.full_name || m.profile?.email || "メンバー"}
                      </p>
                      <p className="text-xs text-slate-400">{m.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "owner" && (
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      m.role === "owner" ? "bg-amber-50 text-amber-700" :
                      ROLE_INFO[m.role as Role]?.color || "bg-slate-100 text-slate-600"
                    }`}>
                      {m.role === "owner" ? "オーナー" : ROLE_INFO[m.role as Role]?.label || m.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
