import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Check, Circle, Compass, Link2, Loader2, Sparkles } from 'lucide-react';
import { quickStartRules } from '../data/growthRoadmap';
import { industryTemplates } from '../data/industryTemplates';
import { mainTabs } from './roadmap/roadmapHelpers';
import { RoadmapContext } from './roadmap/RoadmapContext';
import { useRoadmapState } from './roadmap/useRoadmapState';
import JourneyTab from './roadmap/JourneyTab';

const IndustryTab = lazy(() => import('./roadmap/IndustryTab'));
const PlatformsTab = lazy(() => import('./roadmap/PlatformsTab'));
const PlaybookTab = lazy(() => import('./roadmap/PlaybookTab'));
const RhythmTab = lazy(() => import('./roadmap/RhythmTab'));

export default function RoadmapPage() {
  const state = useRoadmapState();
  const { tab, setTab, industryId, setIndustryId, progress, done, ids, autoIds, syncing, connectionChips } = state;

  return (
    <RoadmapContext.Provider value={state}>
    <div className="buzz-page">
      <section className="buzz-card overflow-hidden">
        <div className="relative border-b border-neutral-200 bg-gradient-to-br from-[#f0ebe3] via-white to-[#e8f0ec] px-6 py-8 md:px-8 md:py-10">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#6b4a3a]/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-48 rounded-full bg-emerald-200/30 blur-2xl" />
          <p className="buzz-section-label mb-3 flex items-center gap-2">
            <Compass className="h-3.5 w-3.5" />
            Growth Roadmap
          </p>
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-neutral-500">あなたの業種</p>
            <div className="flex flex-wrap gap-2">
              {industryTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setIndustryId(t.id);
                    setTab('industry');
                  }}
                  className={`min-h-[40px] border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm ${
                    industryId === t.id
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                <span>チェック完了率</span>
                <span className="buzz-stat-value text-sm text-neutral-800">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden bg-neutral-200/80">
                <div
                  className="h-full bg-neutral-900 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                {done.size} / {ids.length} 項目完了
                {autoIds.size > 0 && (
                  <span className="text-emerald-700">· 連携から {autoIds.size} 件を自動反映</span>
                )}
                {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </p>
            </div>
            <Link to="/magic-creator" className="buzz-btn-primary shrink-0">
              <Sparkles className="h-4 w-4" />
              今すぐ台本を作る
            </Link>
          </div>
        </div>

        <div className="border-b border-neutral-200 bg-white px-4 py-3 md:px-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            <Link2 className="h-3.5 w-3.5" />
            連携ステータス（自動チェック連動）
          </div>
          <div className="flex flex-wrap gap-2">
            {connectionChips.map((chip) => (
              <Link
                key={chip.label}
                to={chip.path}
                className={`inline-flex min-h-[36px] items-center gap-1.5 border px-3 py-1 text-xs font-medium ${
                  chip.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {chip.ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-px bg-neutral-200 sm:grid-cols-5">
          {quickStartRules.map((rule, i) => (
            <div key={rule} className="bg-white px-4 py-4">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-neutral-400">
                RULE {i + 1}
              </p>
              <p className="text-xs leading-relaxed text-neutral-700 md:text-sm">{rule}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-1">
        {mainTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`min-h-[44px] px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? 'border-b-2 border-neutral-900 font-semibold text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'journey' && <JourneyTab />}
      <Suspense fallback={<p className="text-sm text-neutral-500">読み込み中…</p>}>
        {tab === 'industry' && <IndustryTab />}
        {tab === 'platforms' && <PlatformsTab />}
        {tab === 'playbook' && <PlaybookTab />}
        {tab === 'rhythm' && <RhythmTab />}
      </Suspense>
    </div>
    </RoadmapContext.Provider>
  );
}
