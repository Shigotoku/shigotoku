import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Check, Printer, ExternalLink, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PublishSafetyCheck from "../components/PublishSafetyCheck";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { getManual, listSteps } from "../services/manuals";
import { effectivePlanId } from "../lib/internalAccess";
import { PLAN_LIMITS } from "../lib/plans";
import type { PlanId } from "../types";
import {
  buildQrUrl,
  buildShareUrl,
  getLatestShareTokenForManual,
  publishShareToken,
  refreshShareSnapshot,
} from "../services/share";

export default function ManualSharePage() {
  const { id } = useParams<{ id: string }>();
  const { profile, organization } = useOrg();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [stepCount, setStepCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(365);
  const [refreshMsg, setRefreshMsg] = useState("");

  const loadMeta = async () => {
    if (!id) return;
    const m = await getManual(id);
    if (m) {
      setTitle(m.title);
      const steps = await listSteps(id);
      setStepCount(steps.length);
    }
    const existing = await getLatestShareTokenForManual(id);
    if (existing) setToken(existing);
  };

  useEffect(() => {
    void loadMeta();
  }, [id]);

  const shareUrl = token ? buildShareUrl(token) : "";
  const effectivePlan = organization
    ? effectivePlanId(organization.plan as PlanId, user?.email)
    : ("free" as PlanId);
  const watermark = organization ? PLAN_LIMITS[effectivePlan].watermark : true;

  const publish = async () => {
    if (!id || !profile || !organization || !user || !checked) return;
    setBusy(true);
    try {
      const t = await publishShareToken({
        manualId: id,
        organizationId: organization.id,
        title,
        createdBy: user.uid,
        expiresInDays,
        userEmail: user.email,
      });
      setToken(t);
      setRefreshMsg("");
    } finally {
      setBusy(false);
    }
  };

  const refreshShare = async () => {
    if (!id || !token) return;
    setBusy(true);
    setRefreshMsg("");
    try {
      await refreshShareSnapshot(token, id, title, organization?.id);
      const steps = await listSteps(id);
      setStepCount(steps.length);
      setRefreshMsg(`共有内容を更新しました（全 ${steps.length} 手順）。同じURLのまま閲覧・印刷できます。`);
    } catch {
      setRefreshMsg("更新に失敗しました。再度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <PageHeader
        title="共有する"
        description="印刷・QR・URL。閲覧者はログイン不要です。"
        action={
          <Link to={`/manuals/${id}/edit`} className="text-sm font-semibold text-primary-600 hover:underline">
            編集に戻る
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <PublishSafetyCheck checked={checked} onChange={setChecked} />

        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <strong>共有URLは発行時のスナップショット</strong>です。手順を増やした・編集したあとは、下の
          <strong>「共有内容を最新に反映」</strong>を押してください（URLは変わりません）。
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-900">{title || "マニュアル"}</h2>
          <p className="mt-1 text-sm text-slate-500">編集データ: 手順 {stepCount} 件</p>
          {watermark && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              フリープランでは共有ページに「ClipIt」透かしが表示されます。
            </p>
          )}

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-600">共有リンクの有効期限</label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={Boolean(token)}
            >
              <option value={30}>30日</option>
              <option value={90}>90日</option>
              <option value={365}>1年</option>
              <option value={0}>無期限</option>
            </select>
          </div>

          {!token ? (
            <button
              type="button"
              disabled={!checked || stepCount === 0 || busy}
              onClick={publish}
              className="mt-6 w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {busy ? "発行中…" : "共有URLを発行"}
            </button>
          ) : (
            <div className="mt-6 space-y-4">
              <button
                type="button"
                disabled={busy || stepCount === 0}
                onClick={refreshShare}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-300 bg-primary-50 py-3 text-sm font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-50"
              >
                <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
                共有内容を最新に反映（全手順をURLに反映）
              </button>
              {refreshMsg && <p className="text-xs text-slate-600">{refreshMsg}</p>}

              <div>
                <p className="text-xs font-semibold text-slate-500">共有URL</p>
                <div className="mt-2 flex gap-2">
                  <input readOnly value={shareUrl} className="flex-1 rounded-lg border px-3 py-2 text-sm" />
                  <button type="button" onClick={copy} className="rounded-lg border px-3 hover:bg-slate-50" aria-label="コピー">
                    {copied ? <Check size={18} className="text-success-600" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              <div className="text-center">
                <p className="mb-2 text-xs font-semibold text-slate-500">QRコード</p>
                <img src={buildQrUrl(shareUrl)} alt="QRコード" className="mx-auto rounded-lg border" width={220} height={220} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink size={16} /> 閲覧ページを開く
                </button>
                <button
                  type="button"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  <Printer size={16} /> A4で印刷
                </button>
              </div>
              <p className="text-xs text-slate-400">
                閲覧ページで「印刷（A4）」を押すか、ブラウザの印刷で全手順が出力されます。
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
