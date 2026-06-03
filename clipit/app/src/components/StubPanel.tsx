import type { ReactNode } from "react";

/** 雛形用のプレースホルダー。実装は要件定義書 §7 を参照。 */
export default function StubPanel({ children }: { children: ReactNode }) {
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        {children}
      </div>
    </div>
  );
}
