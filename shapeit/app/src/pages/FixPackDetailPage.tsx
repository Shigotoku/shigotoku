import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  listIssuesRemote,
  listOrgFeedbackRemote,
  updateIssueStatusRemote,
} from "../lib/cloudStore";
import { buildFixPackPrompt, buildPackDoneSummary } from "../lib/fixAgent";
import {
  buildFixPacks,
  clusterAsPack,
  findFixPack,
  splitPackIntoClusters,
  type FixPackCluster,
} from "../lib/fixPacks";
import { decodePackId } from "../lib/pageKey";
import {
  getPackMeta,
  upsertPackMeta,
  type FixPackMeta,
  type PackWorkStatus,
} from "../lib/packMeta";
import { suggestAssignees } from "../lib/demoStore";
import type { Feedback, Issue } from "../lib/types";

export default function FixPackDetailPage() {
  const { packId = "" } = useParams();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [meta, setMeta] = useState<FixPackMeta | undefined>();

  const reload = async () => {
    setLoading(true);
    try {
      const [i, f] = await Promise.all([listIssuesRemote(), listOrgFeedbackRemote()]);
      setIssues(i);
      setFeedback(f);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [packId]);

  const pack = useMemo(() => {
    const packs = buildFixPacks(issues, feedback);
    return findFixPack(packs, packId) ?? findFixPack(packs, decodePackId(packId));
  }, [issues, feedback, packId]);

  useEffect(() => {
    if (pack) setMeta(getPackMeta(pack.pageKey));
  }, [pack?.pageKey]);

  const clusters = useMemo(() => (pack ? splitPackIntoClusters(pack) : []), [pack]);
  const assigneeHints = pack
    ? suggestAssignees(pack.productAreas[0] ?? "")
    : [];

  if (loading) {
    return <p className="text-sm text-ink/50">読み込み中…</p>;
  }

  if (!pack) {
    return (
      <div className="text-sm text-ink/60">
        パックが見つかりません（すべて Done か、URL が付いていない可能性があります）。
        <Link to="/fix-packs" className="ml-2 text-mint hover:underline">
          一覧へ
        </Link>
      </div>
    );
  }

  const patchMeta = (patch: Parameters<typeof upsertPackMeta>[1]) => {
    setMeta(upsertPackMeta(pack.pageKey, patch));
  };

  const copyPrompt = async (label?: string, cluster?: FixPackCluster) => {
    const target = cluster ? clusterAsPack(pack, cluster) : pack;
    const prompt = buildFixPackPrompt(target, {
      clusterLabel: cluster ? `${cluster.label}（${cluster.reason}）` : undefined,
    });
    await navigator.clipboard.writeText(prompt);
    setCopied(label ?? "all");
    window.setTimeout(() => setCopied(null), 2000);
  };

  const markDone = async (issueIds: string[]) => {
    if (
      !window.confirm(
        `${issueIds.length} 件を Done にします。各投稿者へ確認依頼が送られます。よろしいですか？`,
      )
    ) {
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      for (const id of issueIds) {
        await updateIssueStatusRemote(id, "done");
      }
      if (issueIds.length === pack.openIssueCount) {
        patchMeta({ workStatus: "shipped" });
      }
      setBanner(buildPackDoneSummary(pack, issueIds.length));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <Link to="/fix-packs" className="text-xs text-mint hover:underline">
          ← 修正パック
        </Link>
        <h1 className="font-display mt-2 break-all text-3xl font-bold">{pack.label}</h1>
        <p className="mt-1 break-all text-sm text-ink/55">{pack.sampleUrl}</p>
        <p className="mt-3 text-sm text-ink/60">
          この画面で直すべきこと:{" "}
          <strong className="text-ink">{pack.openIssueCount}</strong> 件（報告{" "}
          {pack.reportCount}
          {clusters.length > 1 ? ` · ${clusters.length} サブパック` : ""}）
        </p>
      </div>

      {banner && (
        <div className="rounded-xl border border-mint/30 bg-mint/5 px-4 py-3 text-sm text-ink/80">
          {banner}{" "}
          <Link to="/my-feedback" className="font-semibold text-mint hover:underline">
            投稿者の確認画面
          </Link>
        </div>
      )}

      <section className="rounded-xl border border-ink/10 bg-white p-4">
        <h2 className="text-sm font-semibold">作業メタ</h2>
        <p className="mt-1 text-[11px] text-ink/45">
          担当・PR はこの端末に保存されます（組織共有は今後）
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="text-ink/55">担当</span>
            <input
              list="pack-assignees"
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={meta?.assignee ?? ""}
              onChange={(e) => patchMeta({ assignee: e.target.value })}
              placeholder="名前"
            />
            <datalist id="pack-assignees">
              {assigneeHints.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label className="block text-xs">
            <span className="text-ink/55">作業ステータス</span>
            <select
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={meta?.workStatus ?? "open"}
              onChange={(e) => patchMeta({ workStatus: e.target.value as PackWorkStatus })}
            >
              <option value="open">未着手</option>
              <option value="in_progress">作業中</option>
              <option value="shipped">出荷済</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-ink/55">Branch</span>
            <input
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={meta?.branchName ?? ""}
              onChange={(e) => patchMeta({ branchName: e.target.value })}
              placeholder="fix/settings-pack"
            />
          </label>
          <label className="block text-xs">
            <span className="text-ink/55">PR URL</span>
            <input
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={meta?.prUrl ?? ""}
              onChange={(e) => patchMeta({ prUrl: e.target.value })}
              placeholder="https://github.com/..."
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            <span className="text-ink/55">メモ</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              rows={2}
              value={meta?.note ?? ""}
              onChange={(e) => patchMeta({ note: e.target.value })}
              placeholder="この画面で一緒に直す方針など"
            />
          </label>
        </div>
        {meta?.prUrl && (
          <a
            href={meta.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-mint hover:underline"
          >
            PR を開く
          </a>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
          onClick={() => {
            patchMeta({ workStatus: "in_progress" });
            void copyPrompt("all");
          }}
        >
          {copied === "all" ? "コピーしました" : "一括修正プロンプトをコピー"}
        </button>
        <button
          type="button"
          disabled={busy || pack.openIssueCount === 0}
          className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold disabled:opacity-40"
          onClick={() => void markDone(pack.issues.map((i) => i.issue.id))}
        >
          {busy ? "更新中…" : "パックをまとめて Done"}
        </button>
        <a
          href={pack.sampleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
        >
          画面を開く
        </a>
      </div>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold">
          {clusters.length > 1 ? "サブパック（自動分割）" : "この画面の問題リスト"}
        </h2>
        {clusters.map((cluster) => (
          <div key={cluster.id} className="space-y-2">
            {clusters.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{cluster.label}</p>
                  <p className="text-[11px] text-ink/45">
                    {cluster.reason} · {cluster.issues.length} 件
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border border-ink/15 px-2 py-1 text-[10px] font-semibold"
                    onClick={() => void copyPrompt(cluster.id, cluster)}
                  >
                    {copied === cluster.id ? "コピー済" : "この塊のプロンプト"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-ink/15 px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                    onClick={() => void markDone(cluster.issues.map((i) => i.issue.id))}
                  >
                    この塊を Done
                  </button>
                </div>
              </div>
            )}
            <ol className="space-y-2">
              {cluster.issues.map((item, idx) => (
                <li
                  key={item.issue.id}
                  className="rounded-xl border border-ink/10 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-ink/45">
                        {idx + 1}. {item.issue.severity} · {item.issue.category} · 報告{" "}
                        {item.reportCount}
                      </p>
                      <Link
                        to={`/issues/${item.issue.id}`}
                        className="mt-0.5 block text-sm font-semibold text-ink hover:text-mint"
                      >
                        {item.issue.title}
                      </Link>
                      <p className="mt-1 text-xs text-ink/60 line-clamp-2">{item.issue.summary}</p>
                      {item.feedbacks[0] && (
                        <p className="mt-2 text-[11px] text-ink/45 line-clamp-2">
                          「{item.feedbacks[0].rawText.slice(0, 140)}
                          {item.feedbacks[0].rawText.length > 140 ? "…" : ""}」
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <span className="rounded border border-ink/10 px-2 py-0.5 text-[10px] text-ink/55">
                        {item.issue.status}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded border border-ink/15 px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                        onClick={() => void markDone([item.issue.id])}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <details className="rounded-xl border border-ink/10 bg-paper/60 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink/70">
          プロンプトプレビュー（全件）
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-ink/70">
          {buildFixPackPrompt(pack)}
        </pre>
      </details>
    </div>
  );
}
