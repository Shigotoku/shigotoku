import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listIssuesRemote,
  listNotificationsRemote,
  listOrgFeedbackRemote,
  listChangelogRemote,
  markWeeklyDigestNotificationsReadRemote,
} from "../lib/cloudStore";
import {
  computeDigestFromData,
  generateWeeklyReviewTextFromDigest,
  type DigestData,
} from "../lib/digest";
import { formatInTz } from "../lib/demoStore";
import { canManageSettings } from "../lib/roles";
import { t } from "../lib/i18n";
import {
  computeWeeklyResponseDigest,
  generateWeeklyResponseSummaryText,
  type WeeklyResponseDigest,
} from "../lib/weeklyDigest";
import { fetchWeeklyResponseDigest, publishWeeklyDigestRemote } from "../lib/weeklyDigestRunner";
import { useAuth } from "../components/AuthProvider";

type Tab = "weekly" | "product";

export default function DigestPage() {
  const { mode, user } = useAuth();
  const [tab, setTab] = useState<Tab>("weekly");
  const [weekly, setWeekly] = useState<WeeklyResponseDigest | null>(null);
  const [weeklyText, setWeeklyText] = useState("");
  const [product, setProduct] = useState<DigestData | null>(null);
  const [productReview, setProductReview] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  useEffect(() => {
    void markWeeklyDigestNotificationsReadRemote();
    void (async () => {
      const [feedback, issues, notifications, changelog] = await Promise.all([
        listOrgFeedbackRemote(),
        listIssuesRemote(),
        listNotificationsRemote(),
        listChangelogRemote(),
      ]);
      const uid = mode === "demo" ? "demo" : user?.uid;
      const w = computeWeeklyResponseDigest({
        feedback,
        issues,
        changelog,
        currentUid: uid,
      });
      setWeekly(w);
      setWeeklyText(generateWeeklyResponseSummaryText(w));

      const digest = computeDigestFromData(feedback, issues, notifications);
      setProduct(digest);
      setProductReview(generateWeeklyReviewTextFromDigest(digest));
    })();
  }, [mode, user]);

  const loadWeekly = async () => {
    const w = await fetchWeeklyResponseDigest();
    setWeekly(w);
    setWeeklyText(generateWeeklyResponseSummaryText(w));
  };

  const runPublish = async (force = false) => {
    setPublishing(true);
    setPublishMsg("");
    try {
      const result = await publishWeeklyDigestRemote(force);
      setPublishMsg(
        result.published
          ? `配信しました（${result.weekKey} · メンバー ${result.memberCount}人 · Slack ${result.slackSent ? "送信" : "未送信"}）`
          : `今週は既に配信済みです（${result.weekKey}）`,
      );
      await loadWeekly();
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : "配信に失敗しました");
    } finally {
      setPublishing(false);
    }
  };

  if (!weekly || !product) {
    return <p className="text-sm text-ink/50">集計中…</p>;
  }

  return (
    <div className="w-full space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_digest")}</p>
          <h1 className="font-display mt-1 text-3xl font-bold">{t("page_digest")}</h1>
          <p className="mt-2 text-sm text-ink/60">直近7日 · {weekly.periodLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              tab === "weekly" ? "bg-mint text-white" : "border border-ink/15"
            }`}
            onClick={() => setTab("weekly")}
          >
            今週の改善
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              tab === "product" ? "bg-mint text-white" : "border border-ink/15"
            }`}
            onClick={() => setTab("product")}
          >
            PM レビュー
          </button>
          <Link
            to="/fix-packs"
            className="rounded-lg border border-mint/30 bg-mint/5 px-3 py-2 text-xs font-semibold text-mint"
          >
            修正パック
          </Link>
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
            onClick={() => window.print()}
          >
            印刷 / PDF
          </button>
        </div>
      </div>

      {tab === "weekly" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="新規の声" value={weekly.newFeedbackCount} />
            <Card label="今週完了" value={weekly.completedCount} />
            <Card label="対応中" value={weekly.inProgressCount} />
            <Card label="週" value={weekly.weekKey} />
          </div>

          {canManageSettings() && (
            <section className="rounded-2xl border border-mint/20 bg-mint/5 p-4 print:hidden">
              <p className="text-xs font-semibold text-mint">管理者: 週次配信</p>
              <p className="mt-1 text-xs text-ink/55">
                全メンバーへアプリ内通知を送り、Slack Webhook が設定されていれば週次投稿します。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={publishing}
                  className="rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  onClick={() => void runPublish(false)}
                >
                  今週のサマリーを配信
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold"
                  onClick={() => void runPublish(true)}
                >
                  強制再配信
                </button>
              </div>
              {publishMsg && <p className="mt-2 text-xs text-ink/60">{publishMsg}</p>}
            </section>
          )}

          {weekly.personalItems.length > 0 && (
            <section className="rounded-2xl border border-ink/10 bg-white p-5">
              <h2 className="text-sm font-semibold">あなたへの返事</h2>
              <ul className="mt-3 space-y-2">
                {weekly.personalItems.map((p) => (
                  <li key={p.feedbackId} className="text-sm">
                    <Link to="/my-feedback" className="text-mint hover:underline">
                      {p.rawText}
                    </Link>
                    <span className="ml-2 text-xs text-ink/45">
                      {p.verification === "solved"
                        ? "解決済み"
                        : p.verification === "unsolved"
                          ? "未解決"
                          : p.issueTitle ?? p.triageStatus}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-ink/10 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">チームで直したこと</h2>
              <button
                type="button"
                className="text-xs text-mint print:hidden"
                onClick={() => void navigator.clipboard.writeText(weeklyText)}
              >
                コピー
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {weekly.completedItems.length === 0 ? (
                <li className="text-xs text-ink/45">今週の完了はまだありません</li>
              ) : (
                weekly.completedItems.map((c) => (
                  <li key={c.id} className="text-sm">
                    {c.issueId ? (
                      <Link to={`/issues/${c.issueId}`} className="text-mint hover:underline">
                        {c.title}
                      </Link>
                    ) : (
                      <span>{c.title}</span>
                    )}
                    {c.summary && <p className="mt-0.5 text-xs text-ink/50">{c.summary}</p>}
                  </li>
                ))
              )}
            </ul>
          </section>

          {weekly.inProgressItems.length > 0 && (
            <section className="rounded-2xl border border-ink/10 bg-white p-5">
              <h2 className="text-sm font-semibold">対応中</h2>
              <ul className="mt-3 space-y-2">
                {weekly.inProgressItems.map((i) => (
                  <li key={i.id} className="flex justify-between text-sm">
                    <Link to={`/issues/${i.id}`} className="text-mint hover:underline">
                      {i.title}
                    </Link>
                    <span className="text-xs text-ink/45">{i.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-ink/10 bg-white p-5">
            <h2 className="text-sm font-semibold">Slack 用テキスト</h2>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs text-ink/75">
              {weeklyText}
            </pre>
          </section>
        </>
      )}

      {tab === "product" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="新規 Feedback" value={product.newFeedbackCount} />
            <Card label="未 Triage" value={product.pendingTriage} />
            <Card label="Critical (S0/S1)" value={product.criticalCount} />
            <Card label="SLA超過" value={product.slaBreaches} />
            <Card label="再燃アラート" value={product.reopened} />
            <Card label="Auto-triage率" value={`${(product.autoTriageRate * 100).toFixed(0)}%`} />
          </div>

          <section className="rounded-2xl border border-ink/10 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Weekly Product Review</h2>
              <button
                type="button"
                className="text-xs text-mint print:hidden"
                onClick={() => void navigator.clipboard.writeText(productReview)}
              >
                コピー
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-paper p-3 text-xs text-ink/75">
              {productReview}
            </pre>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-5">
            <h2 className="text-sm font-semibold">急増 Issue（報告数）</h2>
            <ul className="mt-3 space-y-2">
              {product.surging.length === 0 ? (
                <li className="text-xs text-ink/45">該当なし</li>
              ) : (
                product.surging.map((i) => (
                  <li key={i.id} className="flex justify-between text-sm">
                    <Link to={`/issues/${i.id}`} className="text-mint hover:underline">
                      {i.title}
                    </Link>
                    <span className="tabular-nums text-ink/50">{i.feedbackIds.length}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-5">
            <h2 className="text-sm font-semibold">再燃アラート（未解決報告）</h2>
            <ul className="mt-3 space-y-2">
              {product.reopenedItems.length === 0 ? (
                <li className="text-xs text-ink/45">なし</li>
              ) : (
                product.reopenedItems.map((f) => (
                  <li key={f.id} className="text-sm">
                    <Link to="/my-feedback" className="text-mint hover:underline">
                      {f.rawText.slice(0, 80)}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-5">
            <h2 className="text-sm font-semibold">Critical Issues</h2>
            <ul className="mt-3 space-y-2">
              {product.critical.length === 0 ? (
                <li className="text-xs text-ink/45">なし</li>
              ) : (
                product.critical.map((i) => (
                  <li key={i.id} className="text-sm">
                    <span className="mr-2 rounded bg-sand px-1.5 py-0.5 text-[10px] font-bold">
                      {i.severity}
                    </span>
                    <Link to={`/issues/${i.id}`} className="text-mint hover:underline">
                      {i.title}
                    </Link>
                    <span className="ml-2 text-xs text-ink/40">{formatInTz(i.updatedAt)}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
