import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "../components/AuthProvider";
import { updateOrganizationName, updateOrganizationLogo } from "../services/bootstrap";
import { uploadOrganizationLogo } from "../lib/uploadLogo";
import { PLAN_LIMITS, planLabel, PLAN_PRICE_JPY } from "../lib/plans";
import { countManualsCreatedThisMonth } from "../services/usage";
import type { PlanId } from "../types";

const PLAN_LABELS: Record<string, string> = {
  free: "フリー",
  light: "ライト",
  standard: "スタンダード",
  business: "ビジネス",
};

export default function SettingsPage() {
  const { organization, profile, refresh } = useOrg();
  const { demoMode } = useAuth();
  const [name, setName] = useState(organization?.name ?? "");

  useEffect(() => {
    setName(organization?.name ?? "");
  }, [organization?.name]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [manualsThisMonth, setManualsThisMonth] = useState<number | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    if (!organization?.id || demoMode) return;
    countManualsCreatedThisMonth(organization.id)
      .then(setManualsThisMonth)
      .catch(() => setManualsThisMonth(null));
  }, [organization?.id, demoMode]);

  const save = async () => {
    if (!organization || demoMode) return;
    setBusy(true);
    setMsg("");
    try {
      await updateOrganizationName(organization.id, name);
      await refresh();
      setMsg("保存しました");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="設定" description="組織名・プラン・プロフィール" />
      <div className="mx-auto max-w-xl space-y-6 p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">組織・施設名</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
          <button
            type="button"
            disabled={busy || demoMode}
            onClick={save}
            className="mt-4 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            保存
          </button>
          {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">ロゴ（PDF・共有に表示予定）</h2>
          {organization?.logoUrl && (
            <img src={organization.logoUrl} alt="" className="mt-3 h-12 object-contain" />
          )}
          <input
            type="file"
            accept="image/*"
            disabled={demoMode || logoBusy}
            className="mt-3 block w-full text-sm text-slate-600"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !organization) return;
              setLogoBusy(true);
              setMsg("");
              try {
                const url = await uploadOrganizationLogo(organization.id, file);
                await updateOrganizationLogo(organization.id, url);
                await refresh();
                setMsg("ロゴを保存しました");
              } catch (err) {
                setMsg((err as Error).message);
              } finally {
                setLogoBusy(false);
              }
            }}
          />
          <p className="mt-2 text-xs text-slate-500">2MB以下の PNG / JPG / WebP</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">プラン</h2>
          <p className="mt-2 text-2xl font-bold text-primary-600">
            {PLAN_LABELS[organization?.plan ?? "free"] ?? organization?.plan}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            月額 {PLAN_PRICE_JPY[(organization?.plan ?? "free") as PlanId].toLocaleString("ja-JP")}円
            （税込表示は Stripe 連携時に統一）
          </p>
          {manualsThisMonth !== null && organization && (
            <p className="mt-3 text-sm text-slate-600">
              今月のマニュアル作成:{" "}
              <span className="font-semibold">
                {manualsThisMonth} / {PLAN_LIMITS[organization.plan as PlanId].manualsPerMonth}
              </span>
              本（{planLabel(organization.plan as PlanId)}）
            </p>
          )}
          <p className="mt-2 text-sm text-slate-500">Stripe 課金連携は今後追加予定です。</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">ログインユーザー:</span> {profile?.name}（{profile?.email}）
          </p>
          <p className="mt-1">
            <span className="font-semibold text-slate-800">権限:</span> {profile?.role}
          </p>
        </section>
      </div>
    </>
  );
}
