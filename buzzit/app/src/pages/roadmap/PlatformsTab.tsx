import { Link } from 'react-router-dom';
import { Check, ChevronRight, ExternalLink, Sparkles, Users } from 'lucide-react';
import { platformCompanions } from '../../data/platformCompanions';
import PlatformShowcasePanel from '../../components/PlatformShowcasePanel';
import { isRecommendedPlatform, GuideBlock } from './RoadmapParts';
import { useRoadmap } from './RoadmapContext';

export default function PlatformsTab() {
  const { platformId, setPlatformId, setCompanionStageId, industry, companion, platformShowcase, companionStage, companionDoneSet, companionProgress, toggleCompanionStep } = useRoadmap();
  return (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-neutral-600">
                {industry.label}の優先媒体は{' '}
                <span className="font-semibold text-neutral-900">
                  {industry.primaryPlatforms.join('・')}
                </span>
                。公式登録サイトへ誘導し、初投稿→自動投稿→伸ばし方まで順番に伴走します。
              </p>
            </div>
            <div className="text-right text-xs text-neutral-500">
              この媒体の進捗{' '}
              <span className="buzz-stat-value text-sm text-neutral-800">{companionProgress}%</span>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {platformCompanions.map((p) => {
              const recommended = isRecommendedPlatform(p.id, p.name, industry.primaryPlatforms);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlatformId(p.id);
                    setCompanionStageId(p.stages[0]?.id ?? '');
                  }}
                  className={`shrink-0 border px-4 py-2.5 text-sm transition-colors ${
                    platformId === p.id
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                  }`}
                >
                  {p.name}
                  {recommended && (
                    <span
                      className={`ml-1.5 text-[10px] ${
                        platformId === p.id ? 'text-neutral-300' : 'text-[#6b4a3a]'
                      }`}
                    >
                      推奨
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <section className="buzz-card-pad space-y-5">
            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div>
                <h3 className="text-xl font-bold">{companion.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{companion.priorityNote}</p>
              </div>
              <div className="flex flex-col gap-2 border border-neutral-200 bg-neutral-50 p-4">
                <p className="buzz-section-label">まずは公式サイトへ</p>
                <a
                  href={companion.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buzz-btn-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  {companion.signupLabel}
                </a>
                {companion.helpUrl && (
                  <a
                    href={companion.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 underline-offset-2 hover:underline"
                  >
                    {companion.helpLabel ?? '公式ヘルプ'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="border border-[#6b4a3a]/20 bg-[#faf6f2] p-4 md:p-5">
              <p className="buzz-section-label mb-2">おすすめの最初の投稿</p>
              <h4 className="font-bold text-neutral-900">{companion.firstPostIdea.title}</h4>
              <p className="mt-2 text-sm text-neutral-800">
                <span className="font-semibold">フック: </span>
                {companion.firstPostIdea.hook}
              </p>
              <p className="mt-1 text-sm text-neutral-600">{companion.firstPostIdea.body}</p>
              <p className="mt-1 text-sm text-[#6b4a3a]">
                <span className="font-semibold">CTA: </span>
                {companion.firstPostIdea.cta}
              </p>
              <Link to="/magic-creator" className="buzz-btn-secondary mt-4">
                <Sparkles className="h-4 w-4" />
                この内容で台本を作る
              </Link>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-2">
              {companion.stages.map((stage, idx) => {
                const stageIds = stage.steps.map((s) => s.id);
                const doneCount = stageIds.filter((id) => companionDoneSet.has(id)).length;
                const active = stage.id === companionStage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setCompanionStageId(stage.id)}
                    className={`w-full border px-3 py-3 text-left transition-colors ${
                      active
                        ? 'border-neutral-900 bg-white'
                        : 'border-neutral-200 bg-white/60 hover:border-neutral-400'
                    }`}
                  >
                    <p className="text-[11px] font-semibold tracking-wider text-neutral-400">
                      STAGE {idx + 1} · {stage.eta}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{stage.title.replace(/^\d+\.\s*/, '')}</p>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {doneCount}/{stageIds.length} 完了
                    </p>
                  </button>
                );
              })}
            </aside>

            <section className="buzz-card-pad space-y-5">
              <div>
                <h3 className="text-lg font-bold">{companionStage.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{companionStage.subtitle}</p>
              </div>
              <ul className="space-y-3">
                {companionStage.steps.map((step, stepIdx) => {
                  const checked = companionDoneSet.has(step.id);
                  return (
                    <li
                      key={step.id}
                      className={`border p-4 ${
                        checked ? 'border-emerald-200 bg-emerald-50/40' : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => toggleCompanionStep(step.id)}
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-neutral-300 bg-white"
                          aria-pressed={checked}
                        >
                          {checked ? (
                            <Check className="h-4 w-4 text-emerald-700" />
                          ) : (
                            <span className="text-[11px] font-semibold text-neutral-400">
                              {stepIdx + 1}
                            </span>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              checked ? 'text-neutral-500 line-through' : 'text-neutral-900'
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-neutral-600">{step.detail}</p>
                          {step.tip && (
                            <p className="mt-2 text-xs leading-relaxed text-[#6b4a3a]">Tip: {step.tip}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {step.externalUrl && (
                              <a
                                href={step.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="buzz-btn-primary !px-4 !py-2 text-xs"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {step.externalLabel ?? '公式ページを開く'}
                              </a>
                            )}
                            {step.appPath && (
                              <Link
                                to={step.appPath}
                                className="buzz-btn-secondary !px-4 !py-2 text-xs"
                              >
                                {step.appLabel ?? 'BuzzItで開く'}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
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

          <div className="grid gap-4 md:grid-cols-2">
            <GuideBlock title="ばずらせ方（この媒体）" items={companion.viralPlaybook} accent />
            <div className="border border-neutral-200 bg-white p-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Users className="h-4 w-4" />
                フォロワーを増やす
              </h4>
              <ul className="space-y-2.5">
                {companion.followerGrowth.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {platformShowcase && (
            <section className="buzz-card-pad border border-[#6b4a3a]/15 bg-white">
              <PlatformShowcasePanel showcase={platformShowcase} platformName={companion.name} />
              <Link to="/magic-creator" className="buzz-btn-primary mt-6">
                <Sparkles className="h-4 w-4" />
                見本を参考に台本を作る
              </Link>
            </section>
          )}

          <GuideBlock title="やりがちな失敗" items={companion.commonMistakes} muted />
        </div>
  );
}
