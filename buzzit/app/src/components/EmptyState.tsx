import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  /** 外部URL（公式登録など） */
  externalLabel?: string;
  externalHref?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
  externalLabel,
  externalHref,
}: Props) {
  return (
    <div className="buzz-card-pad flex flex-col items-start gap-4 sm:items-center sm:text-center">
      <div className="flex h-12 w-12 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-700">
        <Icon className="h-6 w-6" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
        <p className="text-sm leading-relaxed text-neutral-600">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-center">
        <Link to={primaryTo} className="buzz-btn-primary">
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondaryLabel && secondaryTo && (
          <Link to={secondaryTo} className="buzz-btn-secondary">
            {secondaryLabel}
          </Link>
        )}
        {externalLabel && externalHref && (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="buzz-btn-secondary"
          >
            {externalLabel}
          </a>
        )}
      </div>
    </div>
  );
}
