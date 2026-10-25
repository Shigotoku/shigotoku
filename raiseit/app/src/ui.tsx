import { createContext, useContext, type ReactNode } from "react";
import type { ActionState, Summary } from "./lib";

export type Ctx = {
  summary: Summary | null; state: ActionState; error: string; loading: boolean; role: string; email: string;
  reload: () => Promise<void>;
  setStatus: (a: { id: string; title: string; url?: string }, status: string, note?: string) => Promise<void>;
};
export const C = createContext<Ctx>(null as never);
export const useData = () => useContext(C);

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white rounded-2xl shadow-sm p-4 ${className}`}>{children}</section>;
}

export function Delta({ cur, prev, unit = "" }: { cur: number; prev: number; unit?: string }) {
  if (!prev) return <span className="text-xs text-slate-400">前期間 {prev}{unit}</span>;
  const d = Math.round(((cur - prev) / prev) * 100);
  const color = d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-slate-500";
  return <span className={`text-xs ${color}`}>{d > 0 ? "+" : ""}{d}%(前期間 {prev}{unit})</span>;
}

export function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1 h-24">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-slate-500">{v}</span>
          <div className="w-full rounded-t bg-mint/80" style={{ height: `${(v / max) * 100}%`, minHeight: 2 }} title={labels[i]} />
        </div>
      ))}
    </div>
  );
}
