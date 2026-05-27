import { Loader2, CreditCard, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useSubscriptionStore,
  PLAN_LABELS,
  type PlanTier,
} from "../store/subscription";
import { useCompanyStore } from "../store/company";
import { useAuthStore } from "../store/auth";
import {
  EXTRA_SEAT_MONTHLY,
  INCLUDED_SEATS,
  PLAN_BASE_MONTHLY,
  MEDICAL_ADDON_MONTHLY,
  formatYen,
} from "../lib/billing";
import { canManageBilling } from "../lib/permissions";
import { companyService } from "../services/companies";
import { useEffect, useState } from "react";

const PLAN_OPTIONS: PlanTier[] = ["free", "growth", "pro"];

export default function CompanyBillingSection() {
  const { company } = useCompanyStore();
  const { user, isDemo } = useAuthStore();
  const {
    plan,
    medicalAddon,
    seatUsage,
    monthlyTotal,
    loading,
    fetchSubscription,
    changePlan,
    toggleMedical,
  } = useSubscriptionStore();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    fetchSubscription(company.id);
  }, [company?.id, fetchSubscription]);

  useEffect(() => {
    if (!company?.id || !user?.id) return;
    companyService.getUserRole(company.id, user.id).then(setUserRole);
  }, [company?.id, user?.id]);

  if (!company) return null;

  const canBill = canManageBilling(userRole);
  const occupied = seatUsage?.occupiedSeats ?? 1;
  const extraSeats = seatUsage?.extraSeats ?? 0;
  const basePrice = PLAN_BASE_MONTHLY[plan];
  const seatPrice = extraSeats * EXTRA_SEAT_MONTHLY;
  const medicalPrice =
    medicalAddon && plan !== "free" ? MEDICAL_ADDON_MONTHLY : 0;

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-slate-600" />
        <h2 className="text-base font-bold text-slate-900">
          会社の料金プラン
        </h2>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        料金は<strong className="font-semibold text-slate-700">{company.name}</strong>
        ごとに請求されます。1アカウントで複数の会社に所属していても、切り替えた会社のプランが適用されます。
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            基本料（会社1件）
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatYen(basePrice)}
            <span className="text-sm font-normal text-slate-500">/月</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            現在: {PLAN_LABELS[plan]}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            ユーザー数
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-slate-900">
            <Users className="h-5 w-5 text-slate-500" />
            {occupied}人
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {INCLUDED_SEATS}人まで無料
            {extraSeats > 0 && ` ／ 追加 ${extraSeats}人 × ${formatYen(EXTRA_SEAT_MONTHLY)}`}
          </p>
        </div>
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            月額合計（目安）
          </p>
          <p className="mt-1 text-xl font-bold text-primary-700">
            {formatYen(monthlyTotal)}
            <span className="text-sm font-normal text-primary-600">/月</span>
          </p>
          <p className="mt-1 text-xs text-primary-600">
            基本 {formatYen(basePrice)}
            {seatPrice > 0 && ` + 追加席 ${formatYen(seatPrice)}`}
            {medicalPrice > 0 && ` + 医療 ${formatYen(medicalPrice)}`}
          </p>
        </div>
      </div>

      {canBill ? (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              プランを選択
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PLAN_OPTIONS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={loading || plan === tier}
                  onClick={() => changePlan(company.id, tier)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 ${
                    plan === tier
                      ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{PLAN_LABELS[tier]}</p>
                  <p className="text-xs text-slate-500">
                    {formatYen(PLAN_BASE_MONTHLY[tier])}/月 + {INCLUDED_SEATS}人無料
                  </p>
                </button>
              ))}
            </div>
          </div>

          {plan !== "free" && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <input
                type="checkbox"
                checked={medicalAddon}
                disabled={loading}
                onChange={(e) => toggleMedical(company.id, e.target.checked)}
                className="rounded accent-emerald-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  医療モード（+{formatYen(MEDICAL_ADDON_MONTHLY)}/月）
                </p>
                <p className="text-xs text-slate-500">
                  薬機法ナビ・臨床研究ロードマップなど
                </p>
              </div>
            </label>
          )}

          {loading && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              保存中...
            </p>
          )}

          <p className="text-xs text-slate-400">
            ※ 現在は管理画面からプラン変更できます。Stripe 連携後はここから請求書・カード管理も行えます。
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          プランの変更は<strong>オーナー</strong>のみ可能です。管理者は
          <Link to="/team/invite" className="mx-1 font-semibold underline underline-offset-2">
            チーム管理
          </Link>
          からメンバーを招待できます。
        </div>
      )}

      {!isDemo && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Link
            to="/team/invite"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            メンバー管理・招待へ →
          </Link>
        </div>
      )}
    </div>
  );
}
