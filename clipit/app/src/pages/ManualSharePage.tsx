import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Check, Printer, ExternalLink } from "lucide-react";
import PageHeader from "../components/PageHeader";
import PublishSafetyCheck from "../components/PublishSafetyCheck";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { getManual, listSteps } from "../services/manuals";
import { PLAN_LIMITS } from "../lib/plans";
import type { PlanId } from "../types";
import {
  buildQrUrl,
  buildShareUrl,
  getLatestShareTokenForManual,
  publishShareToken,
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

  useEffect(() => {
    if (!id) return;
    (async () => {
      const m = await getManual(id);
      if (m) {
        setTitle(m.title);
        const steps = await listSteps(id);
        setStepCount(steps.length);
      }
      const existing = await getLatestShareTokenForManual(id);
      if (existing) setToken(existing);
    })();
  }, [id]);

  const shareUrl = token ? buildShareUrl(token) : "";
  const watermark = organization ? PLAN_LIMITS[organization.plan as PlanId].watermark : true;

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
      });
      setToken(t);
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

  const openPrint = () => {
    if (!shareUrl) return;
    window.open(shareUrl, "_blank", "noopener");
    setTimeout(() => {
      /* 閲覧ページ側で印刷 */
    }, 500);
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-900">{title || "マニュアル"}</h2>
          <p className="mt-1 text-sm text-slate-500">手順 {stepCount} 件</p>
          {watermark && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              フリープランでは共有ページに「ClipIt」透かしが表示されます。アップグレードで非表示になります。
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
                <p className="mb-2 text-xs font-semibold text-slate-500">QRコード（印刷して現場に貼付）</p>
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
                  onClick={openPrint}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  <Printer size={16} /> A4で印刷
                </button>
              </div>
              <p className="text-xs text-slate-400">
                印刷は閲覧ページの「印刷（A4）」から。ブラウザの印刷設定で余白を「なし」にすると見やすくなります。
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
