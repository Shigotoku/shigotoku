import { Link } from 'react-router-dom';
import { ArrowRight, Check, Circle, Map, Target, Zap } from 'lucide-react';
import { journeyPhases } from '../../data/growthRoadmap';
import { useRoadmap } from './RoadmapContext';

export default function JourneyTab() {
  const { autoIds, setActivePhase, industry, done, toggle, phase, openCompanion, phaseProgress } = useRoadmap();
  return (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            {journeyPhases.map((p, idx) => {
              const pct = phaseProgress(p.id);
              const active = p.id === phase.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePhase(p.id)}
                  className={`w-full border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-neutral-900 bg-white'
                      : 'border-neutral-200 bg-white/60 hover:border-neutral-400'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-neutral-400">
                      STEP {idx + 1} · {p.dayLabel}
                    </span>
                    <span className="text-[11px] tabular-nums text-neutral-500">{pct}%</span>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">{p.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{p.subtitle}</p>
                </button>
              );
            })}
          </aside>

          <section className="buzz-card-pad space-y-6">
            <div>
              <p className="buzz-section-label mb-2 flex items-center gap-2">
                <Map className="h-3.5 w-3.5" />
                {phase.dayLabel}
              </p>
              <h3 className="text-xl font-bold">{phase.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{phase.subtitle}</p>
              <div className="mt-4 flex gap-3 border border-neutral-200 bg-neutral-50 p-4">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#6b4a3a]" />
                <p className="text-sm leading-relaxed text-neutral-700">
                  <span className="font-semibold text-neutral-900">このフェーズのゴール: </span>
                  {phase.goal}
                </p>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                業種ヒント（{industry.label}）: {industry.funnel}
              </p>
            </div>

            <ul className="space-y-3">
              {phase.items.map((item) => {
                const checked = done.has(item.id);
                const isAuto = autoIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={`border p-4 transition-colors md:p-5 ${
                      checked ? 'border-emerald-200 bg-emerald-50/40' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        disabled={isAuto}
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-neutral-300 bg-white disabled:cursor-default"
                        aria-pressed={checked}
                        aria-label={
                          isAuto ? '連携状態から自動完了' : checked ? '完了を解除' : '完了にする'
                        }
                        title={isAuto ? '設定の連携状態から自動完了しています' : undefined}
                      >
                        {checked ? (
                          <Check className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Circle className="h-4 w-4 text-neutral-300" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-sm font-semibold md:text-base ${
                              checked ? 'text-neutral-500 line-through' : 'text-neutral-900'
                            }`}
                          >
                            {item.title}
                          </p>
                          {isAuto && (
                            <span className="inline-flex items-center gap-1 border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
                              <Zap className="h-3 w-3" />
                              自動
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">{item.detail}</p>
                        {item.tip && (
                          <p className="mt-2 text-xs leading-relaxed text-[#6b4a3a]">
                            Tip: {item.tip}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3">
                          {item.link && (
                            <Link
                              to={item.link.path}
                              className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
                            >
                              {item.link.label}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {item.id.startsWith('c') && (
                            <button
                              type="button"
                              onClick={() => openCompanion()}
                              className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-[#6b4a3a] underline-offset-4 hover:underline"
                            >
                              SNS伴走ガイドを開く
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
  );
}
