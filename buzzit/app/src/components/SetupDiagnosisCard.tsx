import { Link } from 'react-router-dom';
import { ArrowRight, Check, Circle, ListChecks } from 'lucide-react';
import { buildSetupItems, setupProgress, type SetupSignals } from '../lib/setupDiagnosis';

type Props = {
  signals: SetupSignals;
  compact?: boolean;
};

export default function SetupDiagnosisCard({ signals, compact }: Props) {
  const items = buildSetupItems(signals);
  const { doneCount, total, percent, next } = setupProgress(items);

  if (percent >= 100 && compact) {
    return null;
  }

  return (
    <section className="buzz-card overflow-hidden">
      <div className="border-b border-neutral-200 bg-gradient-to-r from-[#f0ebe3] to-white px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="buzz-section-label mb-2 flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5" />
              Setup diagnosis
            </p>
            <h2 className="text-lg font-bold md:text-xl">あと何をすれば使える？</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {doneCount}/{total} 完了 · セットアップ {percent}%
            </p>
          </div>
          {next && (
            <Link to={next.ctaPath} className="buzz-btn-primary shrink-0">
              次: {next.title.length > 16 ? `${next.title.slice(0, 16)}…` : next.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden bg-neutral-200/80">
          <div
            className="h-full bg-neutral-900 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {!compact && (
        <ul className="divide-y divide-neutral-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border ${
                    item.done
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-neutral-300 bg-white text-neutral-300'
                  }`}
                >
                  {item.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      item.done ? 'text-neutral-500 line-through' : 'text-neutral-900'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{item.detail}</p>
                </div>
              </div>
              {!item.done && (
                <Link
                  to={item.ctaPath}
                  className="ml-9 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline sm:ml-0"
                >
                  {item.ctaLabel}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {compact && next && (
        <div className="px-5 py-4 text-sm text-neutral-600 md:px-6">
          次にやること: <span className="font-semibold text-neutral-900">{next.title}</span>
          <span className="text-neutral-500"> — {next.detail}</span>
        </div>
      )}
    </section>
  );
}
