import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isSettingsSection, sectionTab, type SettingsTab } from '../../lib/settingsUrls';
import { fetchSettings, fetchSnsConnections, updateSettings, submitSlackIdea, fetchSlackIdeas, runAutoMode, startMetaOAuth, startGbpOAuth, fetchLineCostEstimate, fetchCustomerTags, testXApiConnection, type PublishMode, type LineCostEstimate, type CustomerTag } from '../../lib/api';
import { type BusinessEntityType } from '../../components/BusinessOverviewSection';
import { usePersona } from '../../store/personaContext';
import { useApp } from '../../store/appContext';
import { type PlanTier } from '../../types';

/** 設定画面の状態・取得・保存処理（SettingsPage から分離。各タブは useSettings() で参照） */
export function useSettingsState() {
  const { plan, setPlan } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [ayrshareProfileKey, setAyrshareProfileKey] = useState('');
  const [slackTeamId, setSlackTeamId] = useState('');
  const [autoModeEnabled, setAutoModeEnabled] = useState(false);
  const [lineChannelSecret, setLineChannelSecret] = useState('');
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState('');
  const [lineDestinationId, setLineDestinationId] = useState('');
  const [defaultDestinationUrl, setDefaultDestinationUrl] = useState('');
  const [defaultPublishMode, setDefaultPublishMode] = useState<PublishMode>('notify');
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaTokenExpiresAt, setMetaTokenExpiresAt] = useState('');
  const [lineWebhookUrl, setLineWebhookUrl] = useState('');
  const [snsConnections, setSnsConnections] = useState<Array<{ name: string; connected: boolean }>>([]);
  const [slackIdeas, setSlackIdeas] = useState<Array<{ id: string; text: string; status: string; scriptPreview: string }>>([]);
  const [newIdea, setNewIdea] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gbpConnected, setGbpConnected] = useState(false);
  const [gbpLocationName, setGbpLocationName] = useState('');
  const [hpbStoreUrl, setHpbStoreUrl] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [lineCost, setLineCost] = useState<LineCostEstimate | null>(null);
  const [customerTags, setCustomerTags] = useState<CustomerTag[]>([]);
  const [gbpReview, setGbpReview] = useState('');
  const [gbpReply, setGbpReply] = useState('');
  const [xConnected, setXConnected] = useState(false);
  const [xUsername, setXUsername] = useState('');
  const [xApiPostsThisMonth, setXApiPostsThisMonth] = useState(0);
  const [xApiMonthlyLimit, setXApiMonthlyLimit] = useState(500);
  const [xApiKey, setXApiKey] = useState('');
  const [xApiSecret, setXApiSecret] = useState('');
  const [xAccessToken, setXAccessToken] = useState('');
  const [xAccessSecret, setXAccessSecret] = useState('');
  const [xTesting, setXTesting] = useState(false);
  const [brandProfile, setBrandProfile] = useState('');
  const [industry, setIndustry] = useState('');
  const [entityType, setEntityType] = useState<BusinessEntityType>('');
  const [officeNumber, setOfficeNumber] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [xInsightsEnabled, setXInsightsEnabled] = useState(false);
  const [insightsLastSyncedAt, setInsightsLastSyncedAt] = useState('');
  const [insightsSyncing, setInsightsSyncing] = useState(false);

  const { activePersona } = usePersona();

  const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
    { id: 'personas', label: '配信キャラ・アカウント' },
    { id: 'business', label: '事業所' },
    { id: 'sns', label: 'SNS連携' },
    { id: 'staff', label: 'スタッフ' },
    { id: 'plan', label: 'プラン' },
    { id: 'advanced', label: '高度な設定' },
  ];
  const sectionParam = searchParams.get('section');
  const section = isSettingsSection(sectionParam) ? sectionParam : null;
  const tabParam = searchParams.get('tab');
  const activeTab: SettingsTab =
    (section ? sectionTab(section) : null) ??
    (SETTINGS_TABS.some((t) => t.id === tabParam) ? (tabParam as SettingsTab) : 'personas');
  const scrolledSectionRef = useRef<string | null>(null);
  const [snsPanel, setSnsPanel] = useState<string>(section ?? 'meta');
  useEffect(() => {
    if (section) setSnsPanel(section);
  }, [section]);
  const setTab = (id: SettingsTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    next.delete('meta');
    next.delete('section');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!section || activeTab !== 'sns') return;
    if (scrolledSectionRef.current === section) return;
    const el = document.getElementById(`settings-${section}`);
    if (!el) return;
    scrolledSectionRef.current = section;
    const scroll = () => el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(() => requestAnimationFrame(scroll));
  }, [section, activeTab]);

  useEffect(() => {
    const loadSettingsFromApi = () => {
      fetchSettings()
        .then((s) => {
          setPlan((s.devFullAccess ? 'enterprise' : s.plan) as PlanTier);
          setSlackWebhookUrl(s.slackWebhookUrl ?? '');
          setAyrshareProfileKey(s.ayrshareProfileKey ?? '');
          setSlackTeamId(s.slackTeamId ?? '');
          setAutoModeEnabled(!!s.autoModeEnabled);
          setLineChannelSecret(s.lineChannelSecret ?? '');
          setLineChannelAccessToken(s.lineChannelAccessToken ?? '');
          setLineDestinationId(s.lineDestinationId ?? '');
          setDefaultDestinationUrl(s.defaultDestinationUrl ?? '');
          setDefaultPublishMode(s.defaultPublishMode ?? 'notify');
          setMetaConnected(!!s.metaConnected);
          setMetaTokenExpiresAt(s.metaTokenExpiresAt ?? '');
          setLineWebhookUrl(s.lineWebhookUrl ?? '');
          setSnsConnections(s.snsConnections);
          setHpbStoreUrl(s.hpbStoreUrl ?? '');
          setGbpConnected(!!s.gbpConnected);
          setGbpLocationName(s.gbpLocationName ?? '');
          setNotifyEmail(s.notifyEmail ?? '');
          setXConnected(!!s.xConnected);
          setXUsername(s.xUsername ?? '');
          setXApiPostsThisMonth(s.xApiPostsThisMonth ?? 0);
          setXApiMonthlyLimit(s.xApiMonthlyLimit ?? 500);
          setBrandProfile(s.brandProfile ?? '');
          setIndustry(s.industry ?? '');
          setEntityType(s.businessEntityType ?? '');
          setOfficeNumber(s.officeNumber ?? '');
          setCardBrand(s.cardBrand ?? '');
          setCardLast4(s.cardLast4 ?? '');
          setInsightsEnabled(s.insightsEnabled !== false);
          setXInsightsEnabled(s.xInsightsEnabled === true);
          setInsightsLastSyncedAt(s.insightsLastSyncedAt ?? '');
        })
        .catch(() => {});
    };

    loadSettingsFromApi();
    const onPersonaChanged = () => loadSettingsFromApi();
    window.addEventListener('buzzit-persona-changed', onPersonaChanged);

    // Ayrshare / LINE 系は初期表示後に遅延取得（店舗・請求カードをブロックしない）
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 200);
    idle(() => {
      fetchSnsConnections()
        .then((r) => setSnsConnections(r.snsConnections))
        .catch(() => {});
      fetchSlackIdeas()
        .then((r) => setSlackIdeas(r.ideas))
        .catch(() => {});
      fetchLineCostEstimate()
        .then(setLineCost)
        .catch(() => {});
      fetchCustomerTags()
        .then((r) => setCustomerTags(r.tags))
        .catch(() => {});
    });

    const planParam = searchParams.get('plan') as PlanTier | null;
    const campaign = searchParams.get('campaign');
    if (planParam && ['line_lite', 'line_pro', 'free', 'starter', 'pro', 'growth', 'enterprise'].includes(planParam)) {
      setPlan(planParam);
      if (campaign === 'lstep500' && planParam === 'line_lite') {
        setMessage('Lステップ解約キャンペーン: LINE CRM Lite 初回3ヶ月 ¥500/月 が適用されます');
      }
    }

    const metaStatus = searchParams.get('meta');
    if (metaStatus === 'connected') {
      setMessage('Meta（Instagram / Facebook）を連携しました');
      setSearchParams({ tab: 'sns' }, { replace: true });
    } else if (metaStatus === 'error') {
      setMessage('Meta 連携に失敗しました。アプリ設定を確認してください');
      setSearchParams({ tab: 'sns' }, { replace: true });
    } else if (metaStatus === 'expired') {
      setMessage('Meta 連携の有効期限が切れました。再度お試しください');
      setSearchParams({ tab: 'sns' }, { replace: true });
    }

    return () => window.removeEventListener('buzzit-persona-changed', onPersonaChanged);
  }, [setPlan, searchParams, setSearchParams]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        plan,
        slackWebhookUrl,
        ayrshareProfileKey,
        slackTeamId,
        autoModeEnabled,
        lineChannelSecret,
        lineChannelAccessToken,
        lineDestinationId,
        defaultDestinationUrl,
        defaultPublishMode,
        hpbStoreUrl,
        gbpConnected: gbpConnected || !!gbpLocationName.trim(),
        gbpLocationName,
        notifyEmail,
        brandProfile,
        industry,
        ...(entityType ? { businessEntityType: entityType } : {}),
        officeNumber,
        insightsEnabled,
        xInsightsEnabled,
      });
      setMessage('設定を保存しました');
    } catch {
      setMessage('保存に失敗しました');
    }
    setSaving(false);
  };

  const handleSubmitIdea = async () => {
    if (!newIdea.trim()) return;
    try {
      await submitSlackIdea(newIdea);
      setNewIdea('');
      const r = await fetchSlackIdeas();
      setSlackIdeas(r.ideas);
      setMessage('Slack ネタを送信しました');
    } catch {
      setMessage('送信に失敗しました（Team プラン以上が必要な場合があります）');
    }
  };

  const handleAutoMode = async () => {
    try {
      const r = await runAutoMode();
      setMessage(`Auto Mode 実行: ${r.mission.title}`);
    } catch {
      setMessage('Auto Mode は Growth OS プランが必要です');
    }
  };

  const handleMetaConnect = async () => {
    try {
      const { url } = await startMetaOAuth();
      window.location.href = url;
    } catch {
      setMessage('Meta OAuth が未設定です。管理者に META_APP_ID を設定してもらってください');
    }
  };

  const handleXTestAndSave = async () => {
    setXTesting(true);
    setMessage(null);
    try {
      const result = await testXApiConnection({
        xApiKey: xApiKey.trim() || undefined,
        xApiSecret: xApiSecret.trim() || undefined,
        xAccessToken: xAccessToken.trim() || undefined,
        xAccessSecret: xAccessSecret.trim() || undefined,
      });
      setXConnected(true);
      setXUsername(result.username ?? '');
      setXApiKey('');
      setXApiSecret('');
      setXAccessToken('');
      setXAccessSecret('');
      setMessage(result.message);
      const s = await fetchSettings();
      setXApiPostsThisMonth(s.xApiPostsThisMonth ?? 0);
      setXApiMonthlyLimit(s.xApiMonthlyLimit ?? 500);
        setBrandProfile(s.brandProfile ?? '');
        setIndustry(s.industry ?? '');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'X API の接続確認に失敗しました');
    }
    setXTesting(false);
  };

  const handleXDisconnect = async () => {
    try {
      await updateSettings({ xDisconnect: true });
      setXConnected(false);
      setXUsername('');
      setMessage('X API 連携を解除しました');
    } catch {
      setMessage('X API 連携の解除に失敗しました');
    }
  };

  const handleGbpConnect = async () => {
    try {
      const { url } = await startGbpOAuth();
      window.location.href = url;
    } catch {
      setMessage('Google Business Profile 連携は Phase 4 で提供予定です（OAuth 設定後に有効化されます）');
    }
  };

  return {
    plan,
    setPlan,
    navigate,
    searchParams,
    setSearchParams,
    slackWebhookUrl,
    setSlackWebhookUrl,
    ayrshareProfileKey,
    setAyrshareProfileKey,
    slackTeamId,
    setSlackTeamId,
    autoModeEnabled,
    setAutoModeEnabled,
    lineChannelSecret,
    setLineChannelSecret,
    lineChannelAccessToken,
    setLineChannelAccessToken,
    lineDestinationId,
    setLineDestinationId,
    defaultDestinationUrl,
    setDefaultDestinationUrl,
    defaultPublishMode,
    setDefaultPublishMode,
    metaConnected,
    setMetaConnected,
    metaTokenExpiresAt,
    setMetaTokenExpiresAt,
    lineWebhookUrl,
    setLineWebhookUrl,
    snsConnections,
    setSnsConnections,
    slackIdeas,
    setSlackIdeas,
    newIdea,
    setNewIdea,
    message,
    setMessage,
    saving,
    setSaving,
    gbpConnected,
    setGbpConnected,
    gbpLocationName,
    setGbpLocationName,
    hpbStoreUrl,
    setHpbStoreUrl,
    notifyEmail,
    setNotifyEmail,
    lineCost,
    setLineCost,
    customerTags,
    setCustomerTags,
    gbpReview,
    setGbpReview,
    gbpReply,
    setGbpReply,
    xConnected,
    setXConnected,
    xUsername,
    setXUsername,
    xApiPostsThisMonth,
    setXApiPostsThisMonth,
    xApiMonthlyLimit,
    setXApiMonthlyLimit,
    xApiKey,
    setXApiKey,
    xApiSecret,
    setXApiSecret,
    xAccessToken,
    setXAccessToken,
    xAccessSecret,
    setXAccessSecret,
    xTesting,
    setXTesting,
    brandProfile,
    setBrandProfile,
    industry,
    setIndustry,
    entityType,
    setEntityType,
    officeNumber,
    setOfficeNumber,
    cardBrand,
    setCardBrand,
    cardLast4,
    setCardLast4,
    insightsEnabled,
    setInsightsEnabled,
    xInsightsEnabled,
    setXInsightsEnabled,
    insightsLastSyncedAt,
    setInsightsLastSyncedAt,
    insightsSyncing,
    setInsightsSyncing,
    activePersona,
    SETTINGS_TABS,
    sectionParam,
    section,
    tabParam,
    activeTab,
    scrolledSectionRef,
    snsPanel,
    setSnsPanel,
    setTab,
    handleSave,
    handleSubmitIdea,
    handleAutoMode,
    handleMetaConnect,
    handleXTestAndSave,
    handleXDisconnect,
    handleGbpConnect,
  };
}

export type SettingsState = ReturnType<typeof useSettingsState>;
