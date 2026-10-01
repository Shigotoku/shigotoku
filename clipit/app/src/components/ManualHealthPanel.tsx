import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Stethoscope } from "lucide-react";
import { runManualHealthCheck } from "../lib/manualHealthCheck";
import type { Manual, ManualStep } from "../types";

export default function ManualHealthPanel({ manual, steps }: { manual: Manual; steps: ManualStep[] }) {
  const [open, setOpen] = useState(false);
  const issues = useMemo(() => runManualHealthCheck(manual, steps), [manual, steps]);
  const alertCount = issues.filter((i) => i.level === "alert").length;
  const warnCount = issues.filter((i) => i.level === "warn").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Stethoscope size={16} className="text-primary-600" />
          マニュアル健康診断
          {alertCount > 0 && (
            <span className="rounded-full bg-danger-100 px-2 py-0.5 text-[10px] font-bold text-danger-700">
              要確認 {alertCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              改善 {warnCount}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <ul className="space-y-2 border-t border-slate-100 px-4 py-3">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              {issue.level === "ok" ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle
                  size={16}
                  className={`mt-0.5 shrink-0 ${issue.level === "alert" ? "text-danger-600" : "text-amber-600"}`}
                />
              )}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
