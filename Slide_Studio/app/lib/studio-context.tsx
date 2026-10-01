'use client';

import {
  buildMockBootstrap,
  mockDeck,
  mockSources,
  type BootstrapPayload,
  type ComposerStep,
  type DeckVersion,
  type Project,
  type SourceFile,
  type Style,
} from '@deckit/domain';
import { createProjectApi, fetchBootstrap } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { isMockDataMode } from '@/lib/config';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ModalId =
  | 'newProject'
  | 'guide'
  | 'settings'
  | 'styles'
  | 'references'
  | 'json'
  | null;

interface StudioState {
  bootstrap: BootstrapPayload | null;
  loadingBootstrap: boolean;
  bootstrapError: string | null;
  activeProjectId: string | null;
  activeStyleId: string | null;
  step: ComposerStep;
  sources: SourceFile[];
  deck: DeckVersion | null;
  selectedSlideIndex: number;
  previewOpen: boolean;
  openModal: ModalId;
  statusMessage: string;
  actionPending: boolean;
}

interface StudioContextValue extends StudioState {
  projects: Project[];
  styles: Style[];
  activeProject: Project | undefined;
  activeStyle: Style | undefined;
  refreshBootstrap: () => Promise<void>;
  setActiveProjectId: (id: string | null) => void;
  setActiveStyleId: (id: string | null) => void;
  setStep: (step: ComposerStep) => void;
  setPreviewOpen: (open: boolean) => void;
  setOpenModal: (id: ModalId) => void;
  setSelectedSlideIndex: (index: number) => void;
  createProject: (name: string) => Promise<void>;
  runMockOutline: () => void;
  runMockGenerate: () => void;
  touchAction: (label: string) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, mockMode } = useAuth();
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [step, setStep] = useState<ComposerStep>(1);
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [deck, setDeck] = useState<DeckVersion | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [openModal, setOpenModal] = useState<ModalId>(null);
  const [statusMessage, setStatusMessage] = useState('画面を表示しました');
  const [actionPending, setActionPending] = useState(false);
  const [extraProjects, setExtraProjects] = useState<Project[]>([]);

  const refreshBootstrap = useCallback(async () => {
    if (!mockMode && !user) {
      setLoadingBootstrap(false);
      setBootstrap(null);
      return;
    }

    setLoadingBootstrap(true);
    setBootstrapError(null);
    try {
      const data = await fetchBootstrap();
      setBootstrap(data);
      setActiveProjectId(data.activeProjectId);
      setActiveStyleId(data.activeStyleId);
      setStatusMessage(
        data.warnings[0] ?? '準備ができました。プロジェクトを選んでください。',
      );
    } catch (err) {
      if (isMockDataMode()) {
        const fallback = buildMockBootstrap();
        setBootstrap(fallback);
        setActiveProjectId(fallback.activeProjectId);
        setActiveStyleId(fallback.activeStyleId);
        setBootstrapError('サーバーに接続できませんでした。オフラインモックを表示しています。');
        setStatusMessage('オフラインモックを表示しています');
      } else {
        setBootstrap(null);
        setBootstrapError((err as Error).message);
        setStatusMessage('データを読み込めませんでした。再読み込みしてください。');
      }
    } finally {
      setLoadingBootstrap(false);
    }
  }, [mockMode, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!mockMode && !user) {
      setLoadingBootstrap(false);
      return;
    }
    void refreshBootstrap();
  }, [refreshBootstrap, user, mockMode, authLoading]);

  useEffect(() => {
    if (!activeProjectId) {
      setSources([]);
      return;
    }
    setSources(mockSources[activeProjectId] ?? []);
    if (activeProjectId === 'proj-onboarding' && !deck) {
      setDeck(mockDeck);
      setSelectedSlideIndex(0);
    }
  }, [activeProjectId, deck]);

  const projects = useMemo(() => {
    const base = bootstrap?.projects ?? [];
    const byId = new Map<string, Project>();
    for (const p of base) byId.set(p.id, p);
    for (const p of extraProjects) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [bootstrap?.projects, extraProjects]);

  useEffect(() => {
    if (!bootstrap?.projects?.length) return;
    const serverIds = new Set(bootstrap.projects.map((p) => p.id));
    setExtraProjects((prev) => prev.filter((p) => !serverIds.has(p.id)));
  }, [bootstrap?.projects]);

  const styles = bootstrap?.styles ?? [];

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeStyle = styles.find((s) => s.id === activeStyleId);

  const touchAction = useCallback((label: string) => {
    setStatusMessage(label);
  }, []);

  const createProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setActionPending(true);
      try {
        const created = await createProjectApi(trimmed, activeStyleId ?? undefined);
        const project: Project = {
          id: created.id,
          organizationId: bootstrap?.organization.id ?? 'org-demo',
          name: created.name,
          status: 'draft',
          updatedAt: new Date().toISOString(),
          styleId: activeStyleId ?? undefined,
        };
        setExtraProjects((prev) => [project, ...prev.filter((x) => x.id !== project.id)]);
        setActiveProjectId(created.id);
        setStep(1);
        setOpenModal(null);
        setStatusMessage(`プロジェクト「${trimmed}」を作成しました`);
        await refreshBootstrap();
        setActiveProjectId(created.id);
      } catch (e) {
        setStatusMessage((e as Error).message);
      } finally {
        setActionPending(false);
      }
    },
    [activeStyleId, bootstrap?.organization.id, refreshBootstrap],
  );

  const runMockOutline = useCallback(() => {
    setActionPending(true);
    setStatusMessage('構成を作成しています…');
    window.setTimeout(() => {
      setActionPending(false);
      setStep(2);
      setStatusMessage('構成の下書きができました（モック）');
    }, 400);
  }, []);

  const runMockGenerate = useCallback(() => {
    setActionPending(true);
    setStatusMessage('Google Slides を生成しています…');
    window.setTimeout(() => {
      setDeck(mockDeck);
      setStep(4);
      setActionPending(false);
      setStatusMessage('プレビューを更新しました（モック）');
    }, 600);
  }, []);

  const value: StudioContextValue = {
    bootstrap,
    loadingBootstrap,
    bootstrapError,
    activeProjectId,
    activeStyleId,
    step,
    sources,
    deck,
    selectedSlideIndex,
    previewOpen,
    openModal,
    statusMessage,
    actionPending,
    projects,
    styles,
    activeProject,
    activeStyle,
    refreshBootstrap,
    setActiveProjectId,
    setActiveStyleId,
    setStep,
    setPreviewOpen,
    setOpenModal,
    setSelectedSlideIndex,
    createProject,
    runMockOutline,
    runMockGenerate,
    touchAction,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioProvider');
  return ctx;
}
