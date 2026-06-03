import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, QrCode, LayoutTemplate, AlertCircle, Eye, Clock, Users } from "lucide-react";
import PageHeader from "../components/PageHeader";
import OnboardingBanner from "../components/OnboardingBanner";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { listManuals } from "../services/manuals";
import { listRecentReadConfirmations, listManualsWithoutReads } from "../services/readStats";
import { formatRelativeTime } from "../lib/format";
import type { Manual } from "../types";

export default function DashboardPage() {
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentReads, setRecentReads] = useState<{ viewerName: string; manualTitle: string }[]>([]);
  const [unreadPublished, setUnreadPublished] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (demoMode) {
      setManuals([
        { id: "demo-1", organizationId: "demo", title: "新患受付の手順", description: "", category: "", targetAudience: [], status: "published", version: 1, createdBy: "", readCount: 12, updatedAt: undefined },
        { id: "demo-2", organizationId: "demo", title: "電子カルテ 会計入力", description: "", category: "", targetAudience: [], status: "draft", version: 1, createdBy: "", readCount: 0, updatedAt: undefined },
      ] as Manual[]);
      setLoading(false);
      return;
    }
    if (!organization?.id) return;
    listManuals(organization.id)
      .then(setManuals)
      .finally(() => setLoading(false));
    listRecentReadConfirmations(organization.id, 5).then((rows) =>
      setRecentReads(rows.map((r) => ({ viewerName: r.viewerName, manualTitle: r.manualTitle }))),
    );
    listManualsWithoutReads(organization.id).then(setUnreadPublished);
  }, [organization?.id, demoMode]);

  const stale = manuals.filter((m) => {
    const exp = m.expiresAt?.toMillis?.();
    if (exp && exp < Date.now()) return true;
    const t = m.updatedAt?.toMillis?.() ?? 0;
    return t > 0 && Date.now() - t > 180 * 86_400_000;
  });

  const drafts = manuals.filter((m) => m.status === "draft");
  const published = manuals.filter((m) => m.status === "published");
  const topRead = [...manuals].sort((a, b) => (b.readCount ?? 0) - (a.readCount ?? 0))[0];

  const todayTasks = [
    stale.length > 0
      ? { icon: Clock, text: `${stale.length}件が更新期限を過ぎています（180日）`, tone: "text-amber-700" }
      : null,
    unreadPublished.length > 0
      ? { icon: Users, text: `公開中で未確認: ${unreadPublished.map((m) => m.title).join("、")}`, tone: "text-primary-700" }
      : null,
    topRead && (topRead.readCount ?? 0) > 0
      ? { icon: Eye, text: `よく見られている: ${topRead.title}（${topRead.readCount}回）`, tone: "text-slate-600" }
      : null,
    manuals.length === 0
      ? { icon: AlertCircle, text: "まずはマニュアルを1本作成しましょう", tone: "text-danger-600" }
      : null,
  ].filter(Boolean) as { icon: typeof AlertCircle; text: string; tone: string }[];

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description={organization ? `${organization.name}` : ""}
        action={
          <Link
            to="/manuals/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            <FilePlus2 size={16} />
            新しく作る
          </Link>
        }
      />

      <OnboardingBanner />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">すべて</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{manuals.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">下書き</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{drafts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">公開中</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">{published.length}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">今日やること</h2>
          {todayTasks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">特になし — 順調です。</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {todayTasks.map((t, i) => (
                <li key={i} className={`flex items-start gap-2.5 text-sm ${t.tone}`}>
                  <t.icon size={16} className="mt-0.5 shrink-0" />
                  {t.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        {recentReads.length > 0 && (
          <section className="rounded-2xl border border-success-200 bg-success-50/40 p-5">
            <h2 className="text-sm font-bold text-success-800">最近の既読確認</h2>
            <ul className="mt-2 space-y-1 text-sm text-success-900">
              {recentReads.map((r, i) => (
                <li key={i}>
                  {r.viewerName} — {r.manualTitle}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <Link to="/manuals/new" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md">
            <FilePlus2 className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">新しく作る</span>
          </Link>
          <Link to="/templates" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md">
            <LayoutTemplate className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">テンプレート</span>
          </Link>
          <Link to="/team" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md">
            <QrCode className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">スタッフ・招待</span>
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">最近のマニュアル</h2>
          </div>
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">読み込み中…</p>
          ) : manuals.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              まだありません。
              <Link to="/manuals/new" className="ml-1 font-semibold text-primary-600 hover:underline">
                作成する
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {manuals.slice(0, 12).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <Link to={`/manuals/${m.id}/edit`} className="truncate text-sm font-semibold text-slate-900 hover:text-primary-600">
                      {m.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">
                      更新 {formatRelativeTime(m.updatedAt)} · 閲覧 {m.readCount ?? 0}
                      {m.status === "published" ? " · 公開" : " · 下書き"}
                    </p>
                  </div>
                  <Link
                    to={`/manuals/${m.id}/share`}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    共有
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {!demoMode && user && (
          <p className="text-center text-xs text-slate-400">{user.email}</p>
        )}
      </div>
    </>
  );
}
