import { createContext, useContext, type ReactNode } from "react";
import type { ActionState, Detail, Summary } from "./lib";

export type Ctx = {
  summary: Summary | null; detail: Detail | null; site: string; state: ActionState; error: string; loading: boolean; role: string; email: string;
  reload: () => Promise<void>;
  setStatus: (a: { id: string; title: string; url?: string }, status: string, note?: string) => Promise<void>;
};
export const C = createContext<Ctx>(null as never);
export const useData = () => useContext(C);

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white rounded-2xl shadow-sm p-4 ${className}`}>{children}</section>;
}

export function Delta({ cur, prev, unit = "", invert = false }: { cur: number; prev: number; unit?: string; invert?: boolean }) {
  if (!prev) return <span className="text-xs text-slate-400">前期間 {prev}{unit}</span>;
  const d = Math.round(((cur - prev) / prev) * 100);
  const good = invert ? d < 0 : d > 0;
  const bad = invert ? d > 0 : d < 0;
  const color = good ? "text-emerald-600" : bad ? "text-rose-600" : "text-slate-500";
  return <span className={`text-xs ${color}`}>{d > 0 ? "+" : ""}{d}%<span className="text-slate-400">(前 {prev.toLocaleString()}{unit})</span></span>;
}

export function Spark({ series, labels, height = 90 }: { series: { values: number[]; color: string; name: string }[]; labels: string[]; height?: number }) {
  const W = 600;
  const n = Math.max(...series.map((s) => s.values.length), 2);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {series.map((s) => {
        const max = Math.max(1, ...s.values);
        const pts = s.values.map((v, i) => `${(i / (n - 1)) * W},${height - 14 - (v / max) * (height - 24)}`).join(" ");
        return <polyline key={s.name} points={pts} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{s.name}</title></polyline>;
      })}
      <text x="2" y={height - 2} fontSize="10" fill="#94a3b8">{labels[0]}</text>
      <text x={W - 2} y={height - 2} fontSize="10" fill="#94a3b8" textAnchor="end">{labels[labels.length - 1]}</text>
    </svg>
  );
}

export function Bars({ values, labels, height = 96 }: { values: number[]; labels: string[]; height?: number }) {
  const max = Math.max(1, ...values);
  const usable = height - 18;
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
          <span className="text-[10px] text-slate-500 leading-none">{v}</span>
          <div className="w-full rounded-t bg-mint/80" style={{ height: Math.max(2, Math.round((v / max) * usable)) }} title={labels[i]} />
        </div>
      ))}
    </div>
  );
}
