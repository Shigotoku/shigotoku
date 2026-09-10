import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Compass,
  ExternalLink,
  Flame,
  Link2,
  Loader2,
  Map,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import {
  STORAGE_KEY,
  allChecklistIds,
  autoCompletedIds,
  faqs,
  hookPatterns,
  journeyPhases,
  quickStartRules,
  signalsFromSnapshot,
  weeklyRhythm,
  type ConnectionSnapshot,
} from '../data/growthRoadmap';
import { settingsPath } from '../lib/settingsUrls';
import {
  INDUSTRY_STORAGE_KEY,
  getIndustryTemplate,
  industryTemplates,
  resolveIndustryId,
  type IndustryId,
} from '../data/industryTemplates';
import {
  COMPANION_STORAGE_KEY,
  allCompanionStepIds,
  getPlatformCompanion,
  platformCompanions,
} from '../data/platformCompanions';
import { getPlatformShowcase, primaryPlatformToCompanionId } from '../data/platformShowcase';
import PlatformShowcasePanel from '../components/PlatformShowcasePanel';
import {
  fetchLineSteps,
  fetchSettings,
  fetchStoreMembers,
  type SettingsResponse,
} from '../lib/api';
import { useStore } from '../store/storeContext';

type MainTab = 'journey' | 'industry' | 'platforms' | 'playbook' | 'rhythm';

const mainTabs: Array<{ key: MainTab; label: string }> = [
  { key: 'journey', label: '30日ジャーニー' },
  { key: 'industry', label: '業種別テンプレ' },
  { key: 'platforms', label: 'SNS伴走ガイド' },
  { key: 'playbook', label: 'ばずらせ方' },
  { key: 'rhythm', label: '週間リズム・FAQ' },
];

function loadCompanionDone(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(COMPANION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function loadIndustry(): IndustryId | null {
  try {
    const raw = localStorage.getItem(INDUSTRY_STORAGE_KEY);
    if (!raw) return null;
    if (industryTemplates.some((t) => t.id === raw)) return raw as IndustryId;
    return null;
  } catch {
    return null;
  }
}

function emptySnapshot(): ConnectionSnapshot {
  return {
    metaConnected: false,
    lineConnected: false,
    slackConnected: false,
    publishModeReady: false,
    hasTeam: false,
    hasLineStep: false,
    hasDestinationUrl: false,
  };
}

export default function RoadmapPage() {
  const { stores, activeStoreId, refreshStores } = useStore();
  const [tab, setTab] = useState<MainTab>('journey');
  const [manualDone, setManualDone] = useState<Set<string>>(() => loadDone());
  const [autoIds, setAutoIds] = useState<Set<string>>(() => new Set());
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>(emptySnapshot);
  const [syncing, setSyncing] = useState(true);
  const [platformId, setPlatformId] = useState(platformCompanions[0]?.id ?? 'instagram');
  const [companionStageId, setCompanionStageId] = useState(
    platformCompanions[0]?.stages[0]?.id ?? '',
  );
  const [companionDone, setCompanionDone] = useState<Record<string, string[]>>(() => loadCompanionDone());
  const [activePhase, setActivePhase] = useState(journeyPhases[0]?.id ?? '');
  const [industryId, setIndustryId] = useState<IndustryId>(() => loadIndustry() ?? 'beauty');

  const activeStore = stores.find((s) => s.id === activeStoreId) ?? stores[0];
  const industry = getIndustryTemplate(industryId);

  const done = useMemo(() => {
    const next = new Set(manualDone);
    for (const id of autoIds) next.add(id);
    return next;
  }, [manualDone, autoIds]);

  const ids = useMemo(() => allChecklistIds(), []);
  const progress = ids.length === 0 ? 0 : Math.round((done.size / ids.length) * 100);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...manualDone]));
  }, [manualDone]);

  useEffect(() => {
    localStorage.setItem(INDUSTRY_STORAGE_KEY, industryId);
  }, [industryId]);

  useEffect(() => {
    void refreshStores().catch(() => {});
  }, [refreshStores]);

  useEffect(() => {
    if (loadIndustry()) return;
    const fromStore = resolveIndustryId(activeStore?.industry);
    if (activeStore?.industry) setIndustryId(fromStore);
  }, [activeStore?.id, activeStore?.industry]);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      setSyncing(true);
      const next = emptySnapshot();
      let settings: SettingsResponse | null = null;

      try {
        settings = await fetchSettings();
        next.metaConnected = !!settings.metaConnected;
        next.lineConnected = !!settings.lineChannelAccessToken?.trim();
        next.slackConnected = !!settings.slackWebhookUrl?.trim();
        next.hasDestinationUrl = !!settings.defaultDestinationUrl?.trim();
        const mode = settings.defaultPublishMode;
        next.publishModeReady =
          !!settings.autoModeEnabled ||
          mode === 'approval' ||
          mode === 'meta' ||
          mode === 'line' ||
          mode === 'auto' ||
          mode === 'gbp';
      } catch {
        /* 未ログインデモ等でもガイドは表示 */
      }

      try {
        const steps = await fetchLineSteps();
        next.hasLineStep = steps.steps.length > 0;
      } catch {
        /* ignore */
      }

      const storeId = activeStoreId ?? stores[0]?.id;
      if (storeId) {
        try {
          const team = await fetchStoreMembers(storeId);
          next.hasTeam = team.members.length > 1 || team.invitations.length > 0;
        } catch {
          /* ignore */
        }
      }

      if (cancelled) return;
      setSnapshot(next);
      setAutoIds(autoCompletedIds(signalsFromSnapshot(next)));
      setSyncing(false);

      if (settings?.industry && !loadIndustry()) {
        setIndustryId(resolveIndustryId(settings.industry));
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [activeStoreId, stores]);

  const toggle = (id: string) => {
    if (autoIds.has(id)) return;
    setManualDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const phase = journeyPhases.find((p) => p.id === activePhase) ?? journeyPhases[0];
  const companion = getPlatformCompanion(platformId) ?? platformCompanions[0];
  const platformShowcase = useMemo(
    () => getPlatformShowcase(platformId, industry),
    [platformId, industry],
  );
  const primaryPlatformId = primaryPlatformToCompanionId(industry.primaryPlatforms[0] ?? 'Instagram');
  const primaryShowcase = useMemo(
    () => getPlatformShowcase(primaryPlatformId, industry),
    [primaryPlatformId, industry],
  );
  const primaryPlatformName =
    getPlatformCompanion(primaryPlatformId)?.name ?? industry.primaryPlatforms[0] ?? 'Instagram';
  const companionStage =
    companion.stages.find((s) => s.id === companionStageId) ?? companion.stages[0];
  const companionStepIds = useMemo(() => {
    const c = getPlatformCompanion(platformId);
    return c ? allCompanionStepIds(c) : [];
  }, [platformId]);
  const companionDoneSet = useMemo(
    () => new Set(companionDone[platformId] ?? []),
    [companionDone, platformId],
  );
  const companionProgress =
    companionStepIds.length === 0
      ? 0
      : Math.round(
          (companionStepIds.filter((id) => companionDoneSet.has(id)).length /
            companionStepIds.length) *
            100,
        );

  useEffect(() => {
    localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify(companionDone));
  }, [companionDone]);

  useEffect(() => {
    const c = getPlatformCompanion(platformId);
    if (c && !c.stages.some((s) => s.id === companionStageId)) {
      setCompanionStageId(c.stages[0]?.id ?? '');
    }
  }, [platformId, companionStageId]);

  const toggleCompanionStep = (stepId: string) => {
    setCompanionDone((prev) => {
      const current = new Set(prev[platformId] ?? []);
      if (current.has(stepId)) current.delete(stepId);
      else current.add(stepId);
      return { ...prev, [platformId]: [...current] };
    });
  };

  const openCompanion = (id?: string) => {
    if (id) setPlatformId(id);
    setTab('platforms');
  };

  const phaseProgress = (phaseId: string) => {
    const items = journeyPhases.find((p) => p.id === phaseId)?.items ?? [];
    if (items.length === 0) return 0;
    const n = items.filter((i) => done.has(i.id)).length;
    return Math.round((n / items.length) * 100);
  };

  const connectionChips: Array<{ label: string; ok: boolean; path: string }> = [
    { label: 'Meta', ok: snapshot.metaConnected, path: settingsPath({ section: 'meta' }) },
    { label: 'LINE', ok: snapshot.lineConnected, path: settingsPath({ section: 'line' }) },
    { label: '投稿モード', ok: snapshot.publishModeReady, path: settingsPath({ section: 'publish-mode' }) },
    { label: '予約URL', ok: snapshot.hasDestinationUrl, path: settingsPath({ tab: 'business' }) },
    { label: 'スタッフ', ok: snapshot.hasTeam, path: '/team' },
    { label: 'LINEステップ', ok: snapshot.hasLineStep, path: '/line-crm' },
    { label: 'Slack', ok: snapshot.slackConnected, path: settingsPath({ section: 'slack' }) },
  ];

  const playbookHooks = industryId === 'general' ? hookPatterns : industry.hooks;
  const playbookPillars = industry.pillars;

  return (
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

      {tab === 'journey' && (
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
      )}

      {tab === 'industry' && (
        <div className="space-y-6">
          <section className="buzz-card-pad">
            <p className="buzz-section-label mb-2">{industry.label}</p>
            <h3 className="text-xl font-bold">業種に合わせた始め方</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">{industry.blurb}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoTile label="集中する媒体" value={industry.primaryPlatforms.join(' → ')} />
              <InfoTile label="推奨導線" value={industry.funnel} />
              <InfoTile label="見るべきKPI" value={industry.kpi} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="buzz-card-pad">
              <h4 className="font-bold">おすすめプロフィール例</h4>
              <p className="mt-4 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                名前欄
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{industry.profileNameExample}</p>
              <p className="mt-4 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                自己紹介
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {industry.bioExample}
              </p>
            </div>
            <div className="buzz-card-pad">
              <h4 className="mb-3 font-bold">この業種のスタート順</h4>
              <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-neutral-700">
                {industry.startOrder.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="buzz-btn-secondary" onClick={() => openCompanion()}>
                  SNS伴走ガイドへ
                </button>
                <Link to={settingsPath({ tab: 'sns' })} className="buzz-btn-secondary">
                  設定で連携
                </Link>
                <Link to="/magic-creator" className="buzz-btn-primary">
                  台本を作る
                </Link>
              </div>
            </div>
          </section>

          <section className="buzz-card-pad">
            <h4 className="mb-2 font-bold">今週の投稿ネタ（7本）</h4>
            <p className="mb-4 text-sm text-neutral-600">
              完璧な企画より、このリストを埋めるほうが続きます。BuzzIt のボイスドラフトに一言渡すだけで台本化できます。
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {industry.weekIdeas.map((idea, i) => (
                <div
                  key={idea}
                  className="flex gap-3 border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800"
                >
                  <span className="buzz-stat-value text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
                  <span className="leading-relaxed">{idea}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'platforms' && (
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
      )}

      {tab === 'playbook' && (
        <div className="space-y-6">
          <section className="buzz-card-pad">
            <p className="buzz-section-label mb-2 flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" />
              {industry.label} · Content pillars
            </p>
            <h3 className="mb-2 text-xl font-bold">投稿の中身は「3本柱」で迷わない</h3>
            <p className="mb-6 max-w-2xl text-sm text-neutral-600">
              {industry.blurb}
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {playbookPillars.map((pillar) => (
                <div key={pillar.id} className="border border-neutral-200 p-5">
                  <p className="text-[11px] font-semibold tracking-wider text-neutral-400">
                    {pillar.ratio}
                  </p>
                  <h4 className="mt-1 text-base font-bold">{pillar.name}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{pillar.description}</p>
                  <ul className="mt-4 space-y-2">
                    {pillar.examples.map((ex) => (
                      <li key={ex} className="flex gap-2 text-xs text-neutral-700 md:text-sm">
                        <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-400" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="buzz-card-pad">
            <h3 className="mb-2 text-xl font-bold">冒頭2〜3秒フックの型</h3>
            <p className="mb-6 max-w-2xl text-sm text-neutral-600">
              {industry.label}向けの言い回し例です。無音でも伝わるテロップ必須。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {playbookHooks.map((hook) => (
                <div key={hook.id} className="border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold tracking-wider text-[#6b4a3a]">{hook.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-800">{hook.example}</p>
                </div>
              ))}
            </div>
            <Link to="/magic-creator" className="buzz-btn-primary mt-6">
              <Sparkles className="h-4 w-4" />
              フック付き台本を生成する
            </Link>
          </section>

          {primaryShowcase && (
            <section className="buzz-card-pad border border-[#6b4a3a]/15 bg-white">
              <p className="buzz-section-label mb-4">
                {industry.label} · 主戦場 {primaryPlatformName}
              </p>
              <PlatformShowcasePanel
                showcase={primaryShowcase}
                platformName={primaryPlatformName}
                compact
              />
              <Link to="/magic-creator" className="buzz-btn-primary mt-6">
                <Sparkles className="h-4 w-4" />
                見本を参考に台本を作る
              </Link>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: '撮影スペック',
                body: '縦9:16 / 1080×1920 / 15〜30秒。カットは0.5〜2秒でテンポよく。顔出しは維持率が上がりやすい。',
              },
              {
                title: 'アルゴリズムが見るもの',
                body: '視聴完了率・再視聴・保存・DMシェア。いいねは参考程度。投稿後1時間の返信が効く。',
              },
              {
                title: '売上への変換',
                body: `最後に必ずCTA。${industry.funnel}`,
              },
            ].map((card) => (
              <div key={card.title} className="buzz-card-pad">
                <h4 className="font-bold">{card.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{card.body}</p>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === 'rhythm' && (
        <div className="space-y-6">
          <section className="buzz-card-pad">
            <h3 className="mb-2 text-xl font-bold">おすすめ週間リズム</h3>
            <p className="mb-6 text-sm text-neutral-600">
              「毎日がんばる」ではなく、曜日で役割を固定すると続きやすいです。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                    <th className="py-3 pr-4 font-semibold">いつ</th>
                    <th className="py-3 pr-4 font-semibold">やること</th>
                    <th className="py-3 font-semibold">BuzzIt</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyRhythm.map((row) => (
                    <tr key={row.day + row.focus} className="border-b border-neutral-100">
                      <td className="py-3 pr-4 font-medium text-neutral-900">{row.day}</td>
                      <td className="py-3 pr-4 text-neutral-600">{row.focus}</td>
                      <td className="py-3">
                        {row.path ? (
                          <Link
                            to={row.path}
                            className="inline-flex items-center gap-1 font-medium text-neutral-900 underline-offset-2 hover:underline"
                          >
                            {row.buzzit}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span className="text-neutral-500">{row.buzzit}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-bold">よくあるつまずき</h3>
            {faqs.map((item) => (
              <details key={item.q} className="buzz-card group open:shadow-sm">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-neutral-900 marker:content-none md:px-6">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <p className="border-t border-neutral-100 px-5 py-4 text-sm leading-relaxed text-neutral-600 md:px-6">
                  {item.a}
                </p>
              </details>
            ))}
          </section>

          <section className="border border-neutral-200 bg-gradient-to-r from-white to-[#f0ebe3] px-6 py-8 md:px-8">
            <h3 className="text-lg font-bold">迷ったら、今日はこれだけ（{industry.label}）</h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              {industry.startOrder.slice(0, 3).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={settingsPath({ tab: 'sns' })} className="buzz-btn-secondary">
                設定を開く
              </Link>
              <Link to="/magic-creator" className="buzz-btn-primary">
                クリエイターへ
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function isRecommendedPlatform(
  platformId: string,
  platformName: string,
  primary: string[],
): boolean {
  return primary.some((name) => {
    const n = name.toLowerCase();
    if (platformId === 'gbp' && (n.includes('google') || n.includes('マップ') || n.includes('gbp'))) {
      return true;
    }
    if (platformId === 'youtube-shorts' && (n.includes('youtube') || n.includes('shorts'))) {
      return true;
    }
    if (platformId === 'facebook-threads' && (n.includes('facebook') || n.includes('threads'))) {
      return true;
    }
    return platformName.toLowerCase().includes(n) || n.includes(platformName.toLowerCase().slice(0, 4));
  });
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-800">{value}</p>
    </div>
  );
}

function GuideBlock({
  title,
  items,
  accent,
  muted,
}: {
  title: string;
  items: string[];
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`border p-5 ${
        accent
          ? 'border-[#6b4a3a]/25 bg-[#faf6f2]'
          : muted
            ? 'border-neutral-200 bg-neutral-50'
            : 'border-neutral-200 bg-white'
      }`}
    >
      <h4 className="mb-3 text-sm font-bold">{title}</h4>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
