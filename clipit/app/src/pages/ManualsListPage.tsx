import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Copy,
  Check,
  Folder,
  FolderPlus,
  FolderOpen,
  Pencil,
  Trash2,
  Share2,
  ExternalLink,
  RefreshCw,
  FileText,
  Eye,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import PublishSafetyCheck from "../components/PublishSafetyCheck";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { listManuals } from "../services/manuals";
import {
  createFolder,
  deleteFolder,
  listFolders,
  moveManualToFolder,
  renameFolder,
} from "../services/folders";
import {
  buildFolderQrUrl,
  buildFolderShareUrl,
  getLatestFolderShareToken,
  publishFolderShareToken,
  refreshFolderShareSnapshot,
} from "../services/folderShare";
import { formatRelativeTime } from "../lib/format";
import { manualWorkStatus, WORK_STATUS_LABEL } from "../lib/manualWorkStatus";
import type { Manual, ManualFolder } from "../types";

type FolderFilter = "all" | "none" | string;

export default function ManualsListPage() {
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [manuals, setManuals] = useState<Manual[]>([]);
  const [folders, setFolders] = useState<ManualFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareChecked, setShareChecked] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(365);

  const folderFilter: FolderFilter = (searchParams.get("folder") as FolderFilter) || "all";

  const setFolderFilter = (f: FolderFilter) => {
    if (f === "all") {
      searchParams.delete("folder");
    } else {
      searchParams.set("folder", f);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const reload = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const [ms, fs] = await Promise.all([listManuals(organization.id), listFolders(organization.id)]);
      setManuals(ms);
      setFolders(fs);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (demoMode) {
      setManuals([
        {
          id: "demo-1",
          organizationId: "demo",
          title: "新患受付の手順",
          description: "",
          category: "",
          targetAudience: [],
          status: "published",
          version: 1,
          createdBy: "",
          folderId: "demo-f1",
          readCount: 12,
        },
        {
          id: "demo-2",
          organizationId: "demo",
          title: "電子カルテ 会計入力",
          description: "",
          category: "",
          targetAudience: [],
          status: "draft",
          version: 1,
          createdBy: "",
          readCount: 0,
        },
      ] as Manual[]);
      setFolders([{ id: "demo-f1", organizationId: "demo", name: "受付・会計", sortOrder: 0 }] as ManualFolder[]);
      setLoading(false);
      return;
    }
    void reload();
  }, [organization?.id, demoMode, reload]);

  const activeFolder = useMemo(
    () => (folderFilter !== "all" && folderFilter !== "none" ? folders.find((f) => f.id === folderFilter) : null),
    [folderFilter, folders],
  );

  const filteredManuals = useMemo(() => {
    if (folderFilter === "all") return manuals;
    if (folderFilter === "none") return manuals.filter((m) => !m.folderId);
    return manuals.filter((m) => m.folderId === folderFilter);
  }, [manuals, folderFilter]);

  const countInFolder = (folderId: string) => manuals.filter((m) => m.folderId === folderId).length;
  const uncategorizedCount = manuals.filter((m) => !m.folderId).length;

  useEffect(() => {
    if (!activeFolder?.id || demoMode) {
      setShareToken(null);
      return;
    }
    getLatestFolderShareToken(activeFolder.id).then(setShareToken);
  }, [activeFolder?.id, demoMode]);

  const handleCreateFolder = async () => {
    if (!organization?.id || !newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const id = await createFolder(organization.id, newFolderName);
      setNewFolderName("");
      await reload();
      setFolderFilter(id);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!renameValue.trim()) return;
    await renameFolder(folderId, renameValue);
    setRenamingId(null);
    await reload();
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!organization?.id) return;
    if (!confirm("フォルダを削除しますか？中のマニュアルは「未分類」に移動します。")) return;
    await deleteFolder(folderId, organization.id);
    if (folderFilter === folderId) setFolderFilter("all");
    await reload();
  };

  const handleMoveManual = async (manualId: string, folderId: string | null) => {
    await moveManualToFolder(manualId, folderId);
    await reload();
  };

  const publishFolderShare = async () => {
    if (!activeFolder || !organization || !user || !shareChecked) return;
    setShareBusy(true);
    setShareMsg("");
    try {
      const t = await publishFolderShareToken({
        folderId: activeFolder.id,
        folderName: activeFolder.name,
        organizationId: organization.id,
        createdBy: user.uid,
        expiresInDays,
      });
      setShareToken(t);
      setShareMsg("フォルダ共有URLを発行しました。");
    } catch (e) {
      setShareMsg((e as Error).message ?? "発行に失敗しました");
    } finally {
      setShareBusy(false);
    }
  };

  const refreshFolderShare = async () => {
    if (!activeFolder || !organization || !shareToken) return;
    setShareBusy(true);
    setShareMsg("");
    try {
      await refreshFolderShareSnapshot(shareToken, activeFolder.id, organization.id);
      setShareMsg(`フォルダ内 ${filteredManuals.length} 件の内容を共有URLに反映しました。`);
    } catch {
      setShareMsg("更新に失敗しました");
    } finally {
      setShareBusy(false);
    }
  };

  const shareUrl = shareToken ? buildFolderShareUrl(shareToken) : "";

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const listTitle =
    folderFilter === "all"
      ? "すべてのマニュアル"
      : folderFilter === "none"
        ? "未分類"
        : activeFolder?.name ?? "フォルダ";

  return (
    <>
      <PageHeader
        title="マニュアル一覧"
        description="フォルダで整理し、フォルダ単位で共有できます"
        action={
          <Link
            to={folderFilter !== "all" && folderFilter !== "none" ? `/manuals/new?folder=${folderFilter}` : "/manuals/new"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
          >
            <FileText size={16} />
            新規作成
          </Link>
        }
      />

      <div className="flex flex-col gap-6 p-6 lg:flex-row">
        {/* フォルダサイドバー */}
        <aside className="w-full shrink-0 lg:w-56">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-400">フォルダ</p>
            <ul className="mt-1 space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => setFolderFilter("all")}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    folderFilter === "all" ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FolderOpen size={16} />
                  すべて
                  <span className="ml-auto text-xs text-slate-400">{manuals.length}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setFolderFilter("none")}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    folderFilter === "none" ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Folder size={16} />
                  未分類
                  <span className="ml-auto text-xs text-slate-400">{uncategorizedCount}</span>
                </button>
              </li>
              {folders.map((f) => (
                <li key={f.id}>
                  {renamingId === f.id ? (
                    <div className="flex gap-1 px-2 py-1">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleRenameFolder(f.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleRenameFolder(f.id)}
                        className="rounded bg-primary-500 px-2 text-xs text-white"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="group flex items-center">
                      <button
                        type="button"
                        onClick={() => setFolderFilter(f.id)}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                          folderFilter === f.id ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Folder size={16} className="shrink-0 text-primary-500" />
                        <span className="truncate">{f.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-slate-400">{countInFolder(f.id)}</span>
                      </button>
                      {!demoMode && (
                        <div className="flex opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            title="名前変更"
                            onClick={() => {
                              setRenamingId(f.id);
                              setRenameValue(f.name);
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            title="削除"
                            onClick={() => void handleDeleteFolder(f.id)}
                            className="rounded p-1 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {!demoMode && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="新しいフォルダ"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleCreateFolder()}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={!newFolderName.trim() || creatingFolder}
                    onClick={() => void handleCreateFolder()}
                    className="rounded-lg bg-slate-100 px-2 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    title="フォルダを作成"
                  >
                    <FolderPlus size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* メイン一覧 */}
        <div className="min-w-0 flex-1 space-y-4">
          {activeFolder && !demoMode && (
            <section className="rounded-2xl border border-primary-200 bg-primary-50/40 p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-primary-900">
                <Share2 size={16} />
                フォルダを共有 — {activeFolder.name}
              </h2>
              <p className="mt-1 text-xs text-primary-800/80">
                このフォルダ内のマニュアルを1つのURLでまとめて公開します（閲覧者はログイン不要）。
              </p>
              <div className="mt-4">
                <PublishSafetyCheck checked={shareChecked} onChange={setShareChecked} compact />
              </div>
              {!shareToken ? (
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">有効期限</label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value={30}>30日</option>
                      <option value={90}>90日</option>
                      <option value={365}>1年</option>
                      <option value={0}>無期限</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!shareChecked || shareBusy || filteredManuals.length === 0}
                    onClick={() => void publishFolderShare()}
                    className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    {shareBusy ? "発行中…" : "フォルダ共有URLを発行"}
                  </button>
                  {filteredManuals.length === 0 && (
                    <p className="text-xs text-slate-500">フォルダにマニュアルを入れてから共有してください。</p>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={() => void refreshFolderShare()}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-white px-3 py-2 text-xs font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={shareBusy ? "animate-spin" : ""} />
                    共有内容を最新に反映
                  </button>
                  <div className="flex gap-2">
                    <input readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
                    <button type="button" onClick={() => void copyShareUrl()} className="rounded-lg border px-3 hover:bg-white">
                      {copied ? <Check size={18} className="text-success-600" /> : <Copy size={18} />}
                    </button>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg border px-3 hover:bg-white"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                  <img
                    src={buildFolderQrUrl(shareUrl)}
                    alt="QR"
                    className="rounded-lg border bg-white"
                    width={160}
                    height={160}
                  />
                </div>
              )}
              {shareMsg && <p className="mt-2 text-xs text-slate-600">{shareMsg}</p>}
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">{listTitle}</h2>
              <span className="text-xs text-slate-400">{filteredManuals.length} 件</span>
            </div>

            {loading ? (
              <p className="px-5 py-12 text-center text-sm text-slate-400">読み込み中…</p>
            ) : filteredManuals.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                マニュアルがありません。
                <Link to="/manuals/new" className="ml-1 font-semibold text-primary-600 hover:underline">
                  作成する
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredManuals.map((m) => (
                  <li key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{m.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        更新 {formatRelativeTime(m.updatedAt)} · 手順 {m.stepCount ?? 0} · 閲覧 {m.readCount ?? 0}
                        {m.status === "published" ? " · 公開" : " · 下書き"} · {WORK_STATUS_LABEL[manualWorkStatus(m)]}
                      </p>
                    </div>

                    {!demoMode && folders.length > 0 && (
                      <select
                        value={m.folderId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          void handleMoveManual(m.id, v || null);
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600"
                        aria-label="フォルダを変更"
                      >
                        <option value="">未分類</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Link
                        to={`/manuals/${m.id}/preview`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye size={14} />
                        プレビュー
                      </Link>
                      <Link
                        to={`/manuals/${m.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                      >
                        <Pencil size={14} />
                        編集
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
