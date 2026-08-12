import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addIssueCommentRemote,
  getFeedbackRemote,
  getIssueRemote,
  linkIssuesRemote,
  listIssueActivitiesRemote,
  listIssueCommentsRemote,
  listIssuesRemote,
  updateIssueRemote,
  updateIssueStatusRemote,
} from "../lib/cloudStore";
import { loadSettings, suggestAssignees, listCorrections } from "../lib/demoStore";
import { buildGithubIssueMarkdown, githubNewIssueUrl } from "../lib/github";
import { canonicalizePageKey, encodePackId } from "../lib/pageKey";
import { canEditIssue } from "../lib/roles";
import type { Feedback, Issue, IssueComment, IssueStatus } from "../lib/types";

export default function IssueDetailPage() {
  const { id = "" } = useParams();
  const [issue, setIssue] = useState<Issue | undefined>();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [activities, setActivities] = useState<{ id: string; body: string; createdAt: string }[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [comment, setComment] = useState("");
  const [override, setOverride] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const iss = await getIssueRemote(id);
    setIssue(iss);
    if (!iss) return;
    const fbs: Feedback[] = [];
    for (const fid of iss.feedbackIds) {
      const f = await getFeedbackRemote(fid);
      if (f) fbs.push(f);
    }
    setFeedbacks(fbs);
    setComments(await listIssueCommentsRemote(id));
    setActivities(await listIssueActivitiesRemote(id));
    setAllIssues(await listIssuesRemote());
    setOverride(iss.priorityOverride != null ? String(iss.priorityOverride) : "");
    setOverrideReason(iss.priorityOverrideReason ?? "");
  };

  useEffect(() => {
    void reload();
  }, [id]);

  if (!issue) {
    return (
      <div className="text-sm text-ink/60">
        Issue が見つかりません。<Link to="/board" className="text-mint hover:underline">Boardへ</Link>
      </div>
    );
  }

  const effectivePriority = issue.priorityOverride ?? issue.priorityScore;
  const editable = canEditIssue();
  const assigneeHints = suggestAssignees(issue.productArea);
  const githubRepo = loadSettings().githubRepo;

  return (
    <div className="w-full space-y-6">
      <div>
        <Link to="/board" className="text-xs text-mint hover:underline">← Board</Link>
        <input
          className="font-display mt-2 w-full border-0 bg-transparent text-3xl font-bold outline-none"
          value={issue.title}
          disabled={!editable}
          onChange={(e) => setIssue({ ...issue, title: e.target.value })}
          onBlur={() => editable && void updateIssueRemote(issue.id, { title: issue.title })}
        />
        <textarea
          className="mt-2 w-full rounded-xl border border-ink/10 bg-white p-3 text-sm text-ink/70"
          rows={3}
          value={issue.summary}
          disabled={!editable}
          onChange={(e) => setIssue({ ...issue, summary: e.target.value })}
          onBlur={() => editable && void updateIssueRemote(issue.id, { summary: issue.summary })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {editable && (
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={async () => {
              await updateIssueStatusRemote(issue.id, "archived");
              await reload();
            }}
          >
            Archive
          </button>
        )}
        {editable && issue.status === "archived" && (
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={async () => {
              await updateIssueStatusRemote(issue.id, "todo");
              await reload();
            }}
          >
            Restore → Todo
          </button>
        )}
        {githubRepo && (
          <button
            type="button"
            className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper"
            onClick={() => {
              const body = buildGithubIssueMarkdown(
                issue,
                feedbacks.map((f) => f.rawText.slice(0, 120)),
              );
              const url = githubNewIssueUrl(githubRepo, issue.title, body);
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            GitHub Issue を開く
          </button>
        )}
        <button
          type="button"
          className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
          onClick={async () => {
            const { buildFixWithAiPrompt } = await import("../lib/fixAgent");
            const prompt = buildFixWithAiPrompt(issue, feedbacks);
            await navigator.clipboard.writeText(prompt);
            alert("Fix with AI プロンプトをコピーしました（Human Review 必須）");
          }}
        >
          Fix with AI（コピー）
        </button>
        {(() => {
          const url = feedbacks.find((f) => f.pageUrl)?.pageUrl;
          const key = canonicalizePageKey(url);
          if (!key) return null;
          return (
            <Link
              to={`/fix-packs/${encodePackId(key)}`}
              className="rounded-lg border border-mint/30 bg-mint/5 px-3 py-2 text-xs font-semibold text-mint"
            >
              同じ画面の修正パック
            </Link>
          );
        })()}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Category">
          <select
            className="w-full rounded-lg border border-ink/10 bg-white px-2 py-2 text-sm"
            value={issue.category}
            onChange={(e) => {
              const category = e.target.value as Issue["category"];
              setIssue({ ...issue, category });
              void updateIssueRemote(issue.id, { category });
            }}
          >
            {["BUG", "UX", "UI", "FEATURE", "COPY", "PERFORMANCE", "SECURITY", "OTHER"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Severity">
          <select
            className="w-full rounded-lg border border-ink/10 bg-white px-2 py-2 text-sm"
            value={issue.severity}
            onChange={(e) => {
              const severity = e.target.value as Issue["severity"];
              setIssue({ ...issue, severity });
              void updateIssueRemote(issue.id, { severity });
            }}
          >
            {["S0", "S1", "S2", "S3"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className="w-full rounded-lg border border-ink/10 bg-white px-2 py-2 text-sm"
            value={issue.status}
            onChange={(e) => {
              const status = e.target.value as IssueStatus;
              setIssue({ ...issue, status });
              void updateIssueStatusRemote(issue.id, status).then(reload);
            }}
          >
            {["todo", "in_progress", "review", "verify", "done", "archived"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority (effective)">
          <p className="text-lg font-semibold tabular-nums">{effectivePriority}</p>
          <p className="text-xs text-ink/45">AI: {issue.priorityScore}</p>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Product Area">
          <input
            className="w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
            value={issue.productArea}
            onChange={(e) => setIssue({ ...issue, productArea: e.target.value })}
            onBlur={() => void updateIssueRemote(issue.id, { productArea: issue.productArea })}
          />
        </Field>
        <Field label="Assignee">
          <input
            className="w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
            value={issue.assignee ?? ""}
            disabled={!editable}
            onChange={(e) => setIssue({ ...issue, assignee: e.target.value })}
            onBlur={() => editable && void updateIssueRemote(issue.id, { assignee: issue.assignee ?? "" })}
          />
          {assigneeHints.length > 0 && editable && (
            <div className="mt-1 flex flex-wrap gap-1">
              {assigneeHints.map((a) => (
                <button
                  key={a}
                  type="button"
                  className="rounded bg-sand px-1.5 py-0.5 text-[10px] font-medium"
                  onClick={() => {
                    setIssue({ ...issue, assignee: a });
                    void updateIssueRemote(issue.id, { assignee: a });
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field label="Due / Release">
          <input
            type="date"
            className="mb-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
            value={issue.dueDate ?? ""}
            onChange={(e) => {
              setIssue({ ...issue, dueDate: e.target.value });
              void updateIssueRemote(issue.id, { dueDate: e.target.value });
            }}
          />
          <input
            className="w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
            placeholder="Release (e.g. 1.2.0)"
            value={issue.release ?? ""}
            onChange={(e) => setIssue({ ...issue, release: e.target.value })}
            onBlur={() => void updateIssueRemote(issue.id, { release: issue.release ?? "" })}
          />
        </Field>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">Priority Override</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            className="w-24 rounded-lg border border-ink/10 px-2 py-2 text-sm"
            placeholder="0-100"
          />
          <input
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-ink/10 px-2 py-2 text-sm"
            placeholder="上書き理由（必須）"
          />
          <button
            type="button"
            disabled={saving || !overrideReason.trim() || override === ""}
            className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper disabled:opacity-50"
            onClick={async () => {
              setSaving(true);
              await updateIssueRemote(issue.id, {
                priorityOverride: Number(override),
                priorityOverrideReason: overrideReason.trim(),
              });
              setSaving(false);
              await reload();
            }}
          >
            保存
          </button>
        </div>
      </section>

      {feedbacks[0]?.analysis && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <h2 className="font-semibold">AI Developer Summary</h2>
          <p className="mt-2 text-ink/70">{feedbacks[0].analysis.developerSummary}</p>
          <h3 className="mt-4 font-semibold">Reproduction Steps</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink/70">
            {feedbacks[0].analysis.reproductionSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">紐づく Feedback（{feedbacks.length}）</h2>
        <ul className="mt-3 space-y-3">
          {feedbacks.map((fb) => (
            <li key={fb.id} className="rounded-xl bg-paper p-3 text-sm">
              <p className="font-medium">{fb.authorName}</p>
              <p className="mt-1 text-ink/70">{fb.rawText}</p>
              {fb.pageUrl && <p className="mt-1 text-xs text-ink/45 break-all">{fb.pageUrl}</p>}
              {fb.browser && (
                <p className="mt-1 text-xs text-ink/40">
                  {fb.os} · {fb.viewport} · {fb.browser.slice(0, 60)}
                  {fb.appVersion ? ` · app ${fb.appVersion}` : ""}
                  {fb.environment ? ` · ${fb.environment}` : ""}
                  {fb.source ? ` · ${fb.source}` : ""}
                </p>
              )}
              {fb.screenshotDataUrl && (
                <img src={fb.screenshotDataUrl} alt="" className="mt-2 max-h-40 rounded-lg border border-ink/10" />
              )}
              {fb.audioDataUrl && <audio controls src={fb.audioDataUrl} className="mt-2 w-full" />}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">Product Intelligence</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs">
            Segment
            <input
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={issue.segment ?? ""}
              disabled={!editable}
              onChange={(e) => setIssue({ ...issue, segment: e.target.value })}
              onBlur={() => editable && void updateIssueRemote(issue.id, { segment: issue.segment ?? "" })}
            />
          </label>
          <label className="text-xs">
            Initiative / OKR
            <input
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={issue.initiative ?? ""}
              disabled={!editable}
              onChange={(e) => setIssue({ ...issue, initiative: e.target.value })}
              onBlur={() =>
                editable && void updateIssueRemote(issue.id, { initiative: issue.initiative ?? "" })
              }
            />
          </label>
          <label className="text-xs">
            Branch
            <input
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={issue.branchName ?? ""}
              disabled={!editable}
              onChange={(e) => setIssue({ ...issue, branchName: e.target.value })}
              onBlur={() =>
                editable && void updateIssueRemote(issue.id, { branchName: issue.branchName ?? "" })
              }
            />
          </label>
          <label className="text-xs">
            PR URL
            <input
              className="mt-1 w-full rounded-lg border border-ink/10 px-2 py-2 text-sm"
              value={issue.prUrl ?? ""}
              disabled={!editable}
              onChange={(e) => setIssue({ ...issue, prUrl: e.target.value })}
              onBlur={() => editable && void updateIssueRemote(issue.id, { prUrl: issue.prUrl ?? "" })}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">Relations</h2>
        <ul className="mt-2 space-y-1 text-xs">
          {(issue.relations ?? []).map((r) => {
            const target = allIssues.find((i) => i.id === r.issueId);
            return (
              <li key={`${r.type}-${r.issueId}`}>
                <span className="text-ink/45">{r.type}</span>{" "}
                <Link to={`/issues/${r.issueId}`} className="text-mint hover:underline">
                  {target?.title ?? r.issueId}
                </Link>
              </li>
            );
          })}
          {(issue.relations ?? []).length === 0 && (
            <li className="text-ink/45">関連なし</li>
          )}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            id={`rel-${issue.id}`}
            className="rounded-lg border border-ink/10 px-2 py-2 text-xs"
            defaultValue=""
          >
            <option value="" disabled>
              相手 Issue を選択
            </option>
            {allIssues
              .filter((i) => i.id !== issue.id)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
          </select>
          {(["related", "duplicate", "blocks", "blocked_by"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className="rounded-lg border border-ink/15 px-2 py-2 text-xs font-semibold"
              onClick={async () => {
                const sel = document.getElementById(`rel-${issue.id}`) as HTMLSelectElement | null;
                const toId = sel?.value;
                if (!toId) return;
                await linkIssuesRemote(issue.id, toId, type);
                await reload();
              }}
            >
              + {type}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">コメント</h2>
        <ul className="mt-3 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-paper px-3 py-2 text-sm">
              <p className="text-xs text-ink/45">
                {c.authorName} · {c.createdAt ? new Date(c.createdAt).toLocaleString("ja-JP") : ""}
              </p>
              <p className="mt-1">{c.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm"
            placeholder="コメント（@名前 でメンション）"
          />
          {["デモユーザー", "tokunaga"].map((name) => (
            <button
              key={name}
              type="button"
              className="rounded bg-sand px-2 py-1 text-[10px] font-medium"
              onClick={() => setComment((c) => `${c}${c ? " " : ""}@${name} `)}
            >
              @{name}
            </button>
          ))}
          <button
            type="button"
            className="rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-white"
            onClick={async () => {
              await addIssueCommentRemote(issue.id, comment);
              setComment("");
              await reload();
            }}
          >
            投稿
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-sm font-semibold">Activity / Audit</h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {activities.length === 0 ? (
            <li className="text-xs text-ink/45">まだ履歴がありません</li>
          ) : (
            activities.map((a) => (
              <li key={a.id} className="rounded-lg bg-paper px-3 py-2 text-xs">
                <p className="text-ink/40">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString("ja-JP") : ""}
                </p>
                <p className="mt-0.5 text-ink/75">{a.body}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      {listCorrections().filter((c) => c.issueId === issue.id).length > 0 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="text-sm font-semibold">AI → 人間 修正シグナル</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {listCorrections()
              .filter((c) => c.issueId === issue.id)
              .map((c) => (
                <li key={c.id} className="rounded-lg bg-paper px-3 py-2">
                  <span className="font-medium">{c.field}</span>: {c.before} → {c.after}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-3">
      <p className="mb-1 text-xs text-ink/50">{label}</p>
      {children}
    </div>
  );
}
