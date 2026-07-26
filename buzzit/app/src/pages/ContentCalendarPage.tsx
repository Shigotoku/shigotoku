import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { buildFirst30Calendar } from '../data/first30Calendar';
import { loadOnboarding } from '../lib/onboarding';
import type { IndustryId } from '../data/industryTemplates';

export default function ContentCalendarPage() {
  const industry = (loadOnboarding().industryId as IndustryId) || 'general';
  const [week, setWeek] = useState(0);
  const slots = useMemo(() => buildFirst30Calendar(industry), [industry]);
  const weekSlots = slots.slice(week * 7, week * 7 + 7);

  return (
    <div className="buzz-page">
      <div>
        <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          <CalendarRange className="h-6 w-6" />
          最初の30本カレンダー
        </h2>
        <p className="text-neutral-600">業種テンプレから4週間分を自動展開。貼るだけで回り始めます。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeek(w)}
            className={`min-h-[44px] border px-4 text-sm ${
              week === w ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white'
            }`}
          >
            第{w + 1}週
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {weekSlots.map((slot) => (
          <div key={slot.day} className="border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                Day {slot.day} · {slot.platform}
              </p>
              <span className="text-xs text-neutral-500">{slot.pillar}</span>
            </div>
            <p className="mt-2 text-sm">{slot.title}</p>
            <p className="mt-1 text-xs text-neutral-600">フック: {slot.hook}</p>
            <p className="mt-1 text-xs text-neutral-500">CTA: {slot.cta}</p>
            <Link
              to={`/magic-creator?idea=${encodeURIComponent(`${slot.title} / ${slot.hook} / CTA:${slot.cta}`)}`}
              className="mt-3 inline-block text-xs font-medium underline-offset-2 hover:underline"
            >
              このネタで台本を作る →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
