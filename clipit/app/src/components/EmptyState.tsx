import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Action = { label: string; to: string; primary?: boolean };

type Props = {
  icon?: ReactNode;
  title: string;
  description: string;
  actions?: Action[];
};

export default function EmptyState({ icon, title, description, actions }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
      {icon && <div className="mb-4 flex justify-center text-primary-500">{icon}</div>}
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{description}</p>
      {actions && actions.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className={
                a.primary
                  ? "rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
                  : "rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              }
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
