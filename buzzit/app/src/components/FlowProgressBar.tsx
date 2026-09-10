import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export type FlowStep = 'inbox' | 'create' | 'schedule' | 'done';

const STEPS: { id: FlowStep; label: string; path: string }[] = [
  { id: 'inbox', label: 'ネタ', path: '/inbox' },
  { id: 'create', label: '作成', path: '/magic-creator' },
  { id: 'schedule', label: '予約', path: '/calendar' },
  { id: 'done', label: '完了', path: '/dashboard' },
];

const ORDER: FlowStep[] = ['inbox', 'create', 'schedule', 'done'];

type Props = {
  current: FlowStep;
  className?: string;
};

export default function FlowProgressBar({ current, className = '' }: Props) {
  const currentIdx = ORDER.indexOf(current);

  return (
    <nav aria-label="投稿フロー" className={`buzz-flow-bar buzz-flow-bar-compact ${className}`}>
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <Link
                to={step.path}
                className={`group flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 transition-colors ${
                  active ? 'text-violet-700' : done ? 'text-neutral-700' : 'text-neutral-400'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    active
                      ? 'bg-violet-600 text-white'
                      : done
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : idx + 1}
                </span>
                <span className={`text-[10px] font-medium sm:text-xs ${active ? 'font-semibold' : ''}`}>
                  {step.label}
                </span>
              </Link>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-0.5 h-0.5 flex-1 rounded-full transition-colors ${
                    idx < currentIdx ? 'bg-emerald-300' : 'bg-neutral-200'
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
