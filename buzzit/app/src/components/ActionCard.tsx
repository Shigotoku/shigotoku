import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

type Variant = 'default' | 'warning' | 'danger' | 'success' | 'accent';

const variantStyles: Record<Variant, string> = {
  default: 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md',
  warning: 'border-amber-200 bg-amber-50 hover:border-amber-300',
  danger: 'border-red-200 bg-red-50 hover:border-red-300',
  success: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300',
  accent: 'border-violet-200 bg-violet-50 hover:border-violet-300',
};

const iconStyles: Record<Variant, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  success: 'bg-emerald-100 text-emerald-700',
  accent: 'bg-violet-100 text-violet-700',
};

type Props = {
  icon: LucideIcon;
  title: string;
  count?: number;
  description?: string;
  to: string;
  variant?: Variant;
  actionLabel?: string;
};

export default function ActionCard({
  icon: Icon,
  title,
  count,
  description,
  to,
  variant = 'default',
  actionLabel = '確認する',
}: Props) {
  return (
    <Link
      to={to}
      className={`group flex flex-col rounded-xl border p-4 transition-all duration-200 ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {count !== undefined && (
          <span className="buzz-stat-value text-3xl tabular-nums">{count}</span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-neutral-900">{title}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{description}</p>}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-600 group-hover:text-violet-700">
        {actionLabel}
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
