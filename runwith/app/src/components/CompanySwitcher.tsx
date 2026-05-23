import { useState, useRef, useEffect } from "react";
import { ChevronDown, Building2, Plus, Check } from "lucide-react";
import { useCompanyStore } from "../store/company";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

interface Props {
  collapsed?: boolean;
}

export default function CompanySwitcher({ collapsed = false }: Props) {
  const { company, companies, setCompany } = useCompanyStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!company) return null;

  const initials = company.name
    .replace(/株式会社|合同会社|有限会社/g, "")
    .trim()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-all hover:border-slate-300 hover:bg-slate-50",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">
                {company.name}
              </p>
              <p className="text-xs text-slate-400">
                {companies.length > 1
                  ? `${companies.length}社`
                  : company.phase === "idea"
                  ? "アイデア段階"
                  : company.phase}
              </p>
            </div>
            <ChevronDown
              className={clsx(
                "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                open && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            参加中の会社
          </p>

          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCompany(c);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
                {c.name.replace(/株式会社|合同会社|有限会社/g, "").trim().slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-400">{c.industry || "業種未設定"}</p>
              </div>
              {c.id === company.id && (
                <Check className="h-4 w-4 shrink-0 text-primary-600" />
              )}
            </button>
          ))}

          <div className="mx-3 my-1 h-px bg-slate-100" />

          <button
            onClick={() => {
              setOpen(false);
              navigate("/company/new");
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
          >
            <Plus className="h-4 w-4" />
            新しい会社を追加
          </button>
        </div>
      )}
    </div>
  );
}
