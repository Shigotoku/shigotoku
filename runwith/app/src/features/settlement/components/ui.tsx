import type { ReactNode } from "react";
import { Lightbulb, AlertCircle } from "lucide-react";
import type { SettlementState, TermData } from "../lib/types";
import type { PrevTax, TaxResult } from "../lib/taxEngine";
import type { Company } from "../../../store/company";

export interface Ctx {
  state: SettlementState;
  patchRoot: (p: Partial<SettlementState>) => void;
  term: TermData;
  patchTerm: (p: Partial<TermData>) => void;
  company: Company | null;
  capital: number;
  today: Date;
  start: Date;
  end: Date;
  months: number;
  deadline: Date;
  rawDeadline: Date;
  daysLeft: number;
  tax: TaxResult;
  prev: PrevTax | null;
}

export function Advice({ kind, children }: { kind: "tip" | "info" | "warn" | "danger"; children: ReactNode }) {
  const style = {
    tip: "bg-amber-50 text-amber-800",
    info: "bg-blue-50 text-blue-800",
    warn: "bg-orange-50 text-orange-800",
    danger: "bg-red-50 text-red-700",
  }[kind];
  const Icon = kind === "tip" ? Lightbulb : AlertCircle;
  return (
    <div className={`mt-2 flex gap-2 rounded-xl p-3 text-xs leading-relaxed ${style}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Card({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

export function NumField({
  label, value, onChange, hint, step = 1000,
}: { label: string; value: number; onChange: (n: number) => void; hint?: string; step?: number }) {
  return (
    <label className="text-xs text-slate-600">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function Row({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-xs ${sub ? "pl-4 text-slate-500" : "text-slate-700"} ${strong ? "font-bold text-slate-900" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
