import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Inbox, Wand2, CalendarDays, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'buzzit-tour-done-v1';

const STEPS = [
  {
    icon: Inbox,
    title: 'ネタを投げる',
    description: '施術後の一言や写真を Inbox に送るだけ。スタッフ全員が参加できます。',
    to: '/inbox',
  },
  {
    icon: Wand2,
    title: 'AIで各SNS用に作る',
    description: '1つのネタから Instagram・X・LINE 用の投稿文を一発生成。',
    to: '/magic-creator',
  },
  {
    icon: CalendarDays,
    title: '予約して完了',
    description: 'カレンダーで日時を決めて自動投稿。毎朝承認するだけで運用が回ります。',
    to: '/calendar',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        aria-label="閉じる"
        onClick={dismiss}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl buzz-fade-in">
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">はじめに</p>
              <h2 className="mt-1 text-lg font-bold">BuzzIt 3ステップ</h2>
              <p className="mt-1 text-sm text-violet-100">毎朝5分でSNS運用が回ります</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-neutral-900">{current.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">{current.description}</p>
          <div className="mt-5 flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="buzz-btn-secondary flex-1 py-2.5 text-sm"
              >
                戻る
              </button>
            )}
            {isLast ? (
              <Link to={current.to} onClick={dismiss} className="buzz-btn-accent flex-1 py-2.5 text-sm">
                始める
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="buzz-btn-accent flex-1 py-2.5 text-sm"
              >
                次へ
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-center text-xs text-neutral-400 hover:text-neutral-600"
          >
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
}
