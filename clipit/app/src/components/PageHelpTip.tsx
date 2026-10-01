import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";

type Props = {
  title: string;
  children: ReactNode;
  docHref?: string;
};

/** 複雑な画面の上部に置く短いヘルプ */
export default function PageHelpTip({ title, children, docHref }: Props) {
  return (
    <div className="mx-6 mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <div className="flex items-center gap-2 font-semibold text-slate-900">
        <HelpCircle size={16} className="text-primary-600" />
        {title}
      </div>
      <div className="mt-1.5 leading-relaxed">{children}</div>
      {docHref && (
        <Link to={docHref} className="mt-2 inline-block text-xs font-semibold text-primary-600 hover:underline">
          詳しい手順を見る →
        </Link>
      )}
    </div>
  );
}
