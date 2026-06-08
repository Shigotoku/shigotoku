import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, QrCode, AlertCircle, Eye, Clock, Users, RefreshCw, Bot, Bell, Folder, FolderPlus } from "lucide-react";
import PageHeader from "../components/PageHeader";
import OnboardingBanner from "../components/OnboardingBanner";
import ManualActionsMenu from "../components/ManualActionsMenu";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { listManuals, listSteps } from "../services/manuals";
import { createFolder, listFolders } from "../services/folders";
import { listRecentReadConfirmations, listManualsWithoutReads } from "../services/readStats";
import { scanOrgStaleInfo, type StaleAlert } from "../lib/staleInfoDetection";
import { listOrgNotifications } from "../services/notifications";
import { formatRelativeTime } from "../lib/format";
import type { Manual, ManualFolder } from "../types";

export default function DashboardPage() {
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentReads, setRecentReads] = useState<{ viewerName: string; manualTitle: string }[]>([]);
  const [unreadPublished, setUnreadPublished] = useState<{ id: string; title: string }[]>([]);
  const [staleAlerts, setStaleAlerts] = useState<StaleAlert[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; manualId?: string; type?: string }>>([]);
  const [folders, setFolders] = useState<ManualFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

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
    Promise.all([listManuals(organization.id), listFolders(organization.id)])
      .then(async ([ms, fs]) => {
        setManuals(ms);
        setFolders(fs);
        const alerts = await scanOrgStaleInfo(ms, listSteps);
        setStaleAlerts(alerts.slice(0, 8));
      })
      .finally(() => setLoading(false));
    listOrgNotifications(organization.id)
      .then((r) => setNotifications(r.notifications.slice(0, 5)))
      .catch(() => {});
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

  const countInFolder = (folderId: string) => manuals.filter((m) => m.folderId === folderId).length;
  const uncategorizedCount = manuals.filter((m) => !m.folderId).length;

  const handleCreateFolder = async () => {
    if (!organization?.id || !newFolderName.trim() || demoMode) return;
    setCreatingFolder(true);
    try {
      await createFolder(organization.id, newFolderName.trim());
      setNewFolderName("");
      const fs = await listFolders(organization.id);
      setFolders(fs);
    } finally {
      setCreatingFolder(false);
    }
  };

  const todayTasks = [
    stale.length > 0
      ? { icon: Clock, text: `${stale.length}件が更新期限を過ぎています（180日）`, tone: "text-amber-700", link: "/bulk-update" }
      : null,
    staleAlerts.length > 0
      ? { icon: AlertCircle, text: `古い情報の可能性: ${staleAlerts.length}件 — まとめて修正を検討`, tone: "text-amber-700", link: "/bulk-update" }
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
  ].filter(Boolean) as { icon: typeof AlertCircle; text: string; tone: string; link?: string }[];

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
                  {t.link ? (
                    <Link to={t.link} className="hover:underline">
                      {t.text}
                    </Link>
                  ) : (
                    t.text
                  )}
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

        {notifications.length > 0 && (
          <section className="rounded-2xl border border-primary-200 bg-primary-50/40 p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-primary-900">
              <Bell size={16} /> 更新のお知らせ
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-primary-900">
              {notifications.map((n) => (
                <li key={n.id}>
                  {n.manualId ? (
                    <Link to={`/manuals/${n.manualId}/edit`} className="hover:underline">
                      {n.message}
                    </Link>
                  ) : (
                    n.message
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Folder size={16} className="text-primary-500" />
              マニュアル集（フォルダ）
            </h2>
            <Link to="/manuals" className="text-xs font-semibold text-primary-600 hover:underline">
              一覧で管理 →
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-500">フォルダでマニュアルをまとめ、フォルダ単位で共有できます。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/manuals"
              className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary-200 hover:bg-primary-50/30"
            >
              <p className="text-xs font-semibold text-slate-500">すべて</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{manuals.length} 件</p>
            </Link>
            <Link
              to="/manuals?folder=none"
              className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary-200 hover:bg-primary-50/30"
            >
              <p className="text-xs font-semibold text-slate-500">未分類</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{uncategorizedCount} 件</p>
            </Link>
            {folders.map((f) => (
              <Link
                key={f.id}
                to={`/manuals?folder=${f.id}`}
                className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 transition-colors hover:border-primary-200"
              >
                <p className="flex items-center gap-1 text-xs font-semibold text-primary-700">
                  <Folder size={12} />
                  {f.name}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">{countInFolder(f.id)} 件</p>
              </Link>
            ))}
          </div>
          {!demoMode && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreateFolder()}
                placeholder="新しいフォルダ名"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!newFolderName.trim() || creatingFolder}
                onClick={() => void handleCreateFolder()}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                <FolderPlus size={16} />
                作成
              </button>
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/manuals/new" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md">
            <FilePlus2 className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">新しく作る</span>
          </Link>
          <Link to="/templates" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md">
            <FilePlus2 className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">テンプレートから作る</span>
          </Link>
          <Link to="/bulk-update" className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50/50 p-5 transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
            <RefreshCw className="text-primary-600" size={22} />
            <span className="text-sm font-semibold text-slate-800">まとめて修正</span>
          </Link>
          <Link to="/assistant" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md">
            <Bot className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">アシスタント</span>
          </Link>
          <Link to="/team" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md">
            <QrCode className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">スタッフ・招待</span>
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">最近のマニュアル</h2>
              <Link to="/manuals" className="text-xs font-semibold text-primary-600 hover:underline">
                一覧へ
              </Link>
            </div>
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
                    <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      更新 {formatRelativeTime(m.updatedAt)} · 閲覧 {m.readCount ?? 0}
                      {m.status === "published" ? " · 公開" : " · 下書き"}
                      {m.folderId && folders.find((f) => f.id === m.folderId) && (
                        <> · {folders.find((f) => f.id === m.folderId)!.name}</>
                      )}
                    </p>
                  </div>
                  <ManualActionsMenu manualId={m.id} compact />
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
