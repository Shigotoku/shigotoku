import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useOrg } from "../context/OrgContext";
import { useAuth } from "./AuthProvider";
import { effectivePlanId } from "../lib/internalAccess";
import { PLAN_LIMITS, planLabel, pricingPageUrl } from "../lib/plans";
import type { PlanId } from "../types";
import { countManualsCreatedThisMonth, getAiUsageThisMonth } from "../services/usage";

/** 月間上限の 80% 以上で表示 */
export default function UsageNearLimitBanner() {
  const { organization } = useOrg();
  const { user, demoMode } = useAuth();
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (demoMode || !organization?.id) return;
    const plan = effectivePlanId(organization.plan as PlanId, user?.email);
    const limits = PLAN_LIMITS[plan];
    Promise.all([
      countManualsCreatedThisMonth(organization.id),
      getAiUsageThisMonth(organization.id),
    ]).then(([manuals, ai]) => {
      const msgs: string[] = [];
      if (manuals / limits.manualsPerMonth >= 0.8) {
        msgs.push(
          `今月のマニュアル作成: ${manuals} / ${limits.manualsPerMonth} 本（${planLabel(plan)}）`,
        );
      }
      if (ai / limits.aiCallsPerMonth >= 0.8) {
        msgs.push(`今月のAI文案: ${ai} / ${limits.aiCallsPerMonth} 回`);
      }
      setWarnings(msgs);
    });
  }, [organization?.id, organization?.plan, user?.email, demoMode]);

  if (warnings.length === 0) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 text-sm text-amber-900">
        <AlertTriangle size={16} className="shrink-0" />
        <span>{warnings.join(" · ")}</span>
        <Link to="/settings" className="font-semibold underline hover:text-amber-950">
          設定で確認
        </Link>
        <a href={pricingPageUrl()} target="_blank" rel="noreferrer" className="font-semibold underline hover:text-amber-950">
          プランを見る
        </a>
      </div>
    </div>
  );
}
