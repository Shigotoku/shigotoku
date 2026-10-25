'use client';

import { useAuth } from '@/lib/auth-context';
import { useStudio } from '@/lib/studio-context';
import type { ComposerStep } from '@deckit/domain';

const stepHeadings: Record<ComposerStep, string> = {
  1: '元資料を追加し、構成の材料を揃えます。',
  2: 'AI で章立てとスライド構成を作成します。',
  3: 'Google Slides を生成し、プレビューで確認します。',
  4: '文言とレイアウトを最終調整します。',
};

const steps: { id: ComposerStep; title: string; sub: string }[] = [
  { id: 1, title: '1. 元資料', sub: '資料を追加' },
  { id: 2, title: '2. 構成', sub: 'AIで構成' },
  { id: 3, title: '3. 生成', sub: 'Slides作成' },
  { id: 4, title: '4. 編集', sub: '最終調整' },
];

export function Composer() {
  const {
    step,
    setStep,
    projects,
    styles,
    activeProjectId,
    activeStyleId,
    setActiveProjectId,
    setActiveStyleId,
    activeProject,
    activeStyle,
    sources,
    actionPending,
    runMockOutline,
    runMockGenerate,
    setOpenModal,
    setPreviewOpen,
    previewOpen,
    touchAction,
  } = useStudio();
  const { user } = useAuth();

  const pageTitle = activeProject?.name ?? '新しい資料';

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]" data-testid="composer">
      <header className="border-b border-[var(--line)] bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]" data-testid="page-title">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{stepHeadings[step]}</p>
            <div
              className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]"
              data-testid="breadcrumb"
            >
              <span>DeckIt</span>
              <span aria-hidden>/</span>
              <span>{activeProject?.name ?? 'プロジェクト未選択'}</span>
              <span
                className="rounded-full border border-[#cce4e7] bg-[#f4fbfb] px-2 py-0.5 text-[var(--accent-2)]"
                data-testid="style-chip"
              >
                {activeStyle?.name ?? 'スタイル未選択'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {user?.email ? (
              <span className="max-w-[220px] truncate text-xs text-[var(--muted)]">{user.email}</span>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded border border-[var(--line)] bg-white px-3 py-1.5 text-xs"
                onClick={() => setPreviewOpen(!previewOpen)}
              >
                プレビュー
              </button>
              <button
                type="button"
                className="rounded border border-[var(--line)] bg-white px-3 py-1.5 text-xs disabled:opacity-40"
                disabled={!activeProject}
              >
                Driveで開く
              </button>
              <button
                type="button"
                data-testid="open-slides-btn"
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                disabled={!activeProject}
                onClick={() => touchAction('Google Slides で開く（モック）')}
              >
                Google Slidesで開く
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="stepper">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              data-testid={`step-${s.id}`}
              className={`rounded-lg border px-3 py-2 text-left text-xs ${
                step === s.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : step > s.id
                    ? 'border-[var(--line)] bg-[#f8faf9] text-[#5e756b]'
                    : 'border-[var(--line)] bg-white'
              }`}
              onClick={() => setStep(s.id)}
            >
              <strong className="block text-sm">{s.title}</strong>
              {s.sub}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--line)] bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold">プロジェクトと元資料</h3>
            <label className="mb-1 block text-xs text-[var(--muted)]">プロジェクト</label>
            <select
              data-testid="project-select"
              className="mb-3 w-full rounded border border-[var(--line)] px-2 py-2"
              value={activeProjectId ?? ''}
              onChange={(e) => setActiveProjectId(e.target.value || null)}
            >
              <option value="">選択してください</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div
              data-testid="source-dropzone"
              className="rounded-lg border-2 border-dashed border-[var(--line)] bg-[var(--soft)] p-6 text-center text-sm text-[var(--muted)]"
            >
              PDF / TXT / 画像をドロップ（モック）
              <div className="mt-2">
                <button type="button" className="text-[var(--accent)] text-xs">
                  ファイルを選ぶ
                </button>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm" data-testid="source-list">
              {sources.length === 0 ? (
                <li className="text-[var(--muted)]">元資料はまだありません</li>
              ) : (
                sources.map((f) => (
                  <li key={f.id} className="flex justify-between rounded bg-[var(--soft)] px-2 py-1">
                    <span>{f.name}</span>
                    <span className="text-xs text-[var(--muted)]">{f.mimeType}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-lg border border-[var(--line)] bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold">スタイルと条件</h3>
            <label className="mb-1 block text-xs text-[var(--muted)]">スタイル</label>
            <select
              data-testid="style-select"
              className="mb-3 w-full rounded border border-[var(--line)] px-2 py-2"
              value={activeStyleId ?? ''}
              onChange={(e) => setActiveStyleId(e.target.value || null)}
            >
              <option value="">スタイルを選択</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[var(--muted)]">枚数</label>
                <input type="number" defaultValue={8} min={1} max={40} className="w-full rounded border px-2 py-1.5" />
              </div>
              <div>
                <label className="text-[var(--muted)]">用途</label>
                <select className="w-full rounded border px-2 py-1.5">
                  <option>営業提案</option>
                  <option>事業報告</option>
                </select>
              </div>
            </div>
            <textarea
              className="mt-2 w-full rounded border border-[var(--line)] p-2 text-sm"
              rows={3}
              placeholder="例：院長向け営業提案。費用対効果と導入手順を重視。"
            />
          </section>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-white p-3">
          <p className="text-xs text-[var(--muted)]" data-testid="action-hint">
            {activeProject
              ? '元資料を確認し、構成を作成してください。'
              : '新しい資料を作るか、既存プロジェクトを選択してください。'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="outline-btn"
              className="rounded border border-[var(--line)] px-4 py-2 text-sm font-medium disabled:opacity-40"
              disabled={!activeProject || actionPending}
              onClick={runMockOutline}
            >
              構成を作る
            </button>
            <button
              type="button"
              data-testid="generate-btn"
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              disabled={!activeProject || actionPending}
              onClick={() => {
                if (step < 3) setStep(3);
                runMockGenerate();
              }}
            >
              スライドを生成
            </button>
            <button
              type="button"
              className="text-xs text-[var(--accent)]"
              onClick={() => setOpenModal('json')}
            >
              JSON（詳細）
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
