import { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEY, allChecklistIds, autoCompletedIds, hookPatterns, journeyPhases, signalsFromSnapshot, type ConnectionSnapshot } from '../../data/growthRoadmap';
import { settingsPath } from '../../lib/settingsUrls';
import { INDUSTRY_STORAGE_KEY, getIndustryTemplate, resolveIndustryId, type IndustryId } from '../../data/industryTemplates';
import { COMPANION_STORAGE_KEY, allCompanionStepIds, getPlatformCompanion, platformCompanions } from '../../data/platformCompanions';
import { getPlatformShowcase, primaryPlatformToCompanionId } from '../../data/platformShowcase';
import { fetchLineSteps, fetchSettings, fetchStoreMembers, type SettingsResponse } from '../../lib/api';
import { useStore } from '../../store/storeContext';
import { loadCompanionDone, loadDone, loadIndustry, emptySnapshot, type MainTab } from './roadmapHelpers';

/** ロードマップ画面の状態・同期処理（RoadmapPage から分離。各タブは useRoadmap() で参照） */
export function useRoadmapState() {
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

  return {
    stores,
    activeStoreId,
    refreshStores,
    tab,
    setTab,
    manualDone,
    setManualDone,
    autoIds,
    setAutoIds,
    snapshot,
    setSnapshot,
    syncing,
    setSyncing,
    platformId,
    setPlatformId,
    companionStageId,
    setCompanionStageId,
    companionDone,
    setCompanionDone,
    activePhase,
    setActivePhase,
    industryId,
    setIndustryId,
    activeStore,
    industry,
    done,
    ids,
    progress,
    toggle,
    phase,
    companion,
    platformShowcase,
    primaryPlatformId,
    primaryShowcase,
    primaryPlatformName,
    companionStage,
    companionStepIds,
    companionDoneSet,
    companionProgress,
    toggleCompanionStep,
    openCompanion,
    phaseProgress,
    connectionChips,
    playbookHooks,
    playbookPillars,
  };
}

export type RoadmapState = ReturnType<typeof useRoadmapState>;
