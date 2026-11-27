'use client';

import { useStudio } from '@/lib/studio-context';

export function PreviewPane() {
  const {
    previewOpen,
    video,
    selectedSceneIndex,
    setSelectedSceneIndex,
    activeProject,
    touchAction,
  } = useStudio();

  if (!previewOpen) return null;

  const scene = video?.scenes[selectedSceneIndex];

  return (
    <aside
      data-testid="preview-pane"
      className="flex h-full flex-col border-l border-[var(--line)] bg-[var(--panel)]"
      style={{ width: 'var(--preview-w)' }}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2 text-xs font-medium">
        <span>プレビュー / 過去の動画</span>
        <button
          type="button"
          className="text-[var(--accent)] disabled:opacity-40"
          disabled={!video}
          data-testid="add-reference-btn"
          onClick={() => touchAction('お手本への追加（モック）')}
        >
          お手本に追加
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div
          className="flex w-16 shrink-0 flex-col gap-2 overflow-y-auto border-r border-[var(--line)] p-2"
          data-testid="scene-thumbs"
        >
          {video?.scenes.map((s) => (
            <button
              key={s.index}
              type="button"
              data-testid={`scene-thumb-${s.index}`}
              className={`aspect-video w-full rounded border text-[9px] leading-tight ${
                selectedSceneIndex === s.index
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--line)] bg-white'
              }`}
              onClick={() => setSelectedSceneIndex(s.index)}
            >
              {s.index + 1}
            </button>
          ))}
          {!video && (
            <div className="text-[10px] text-[var(--muted)]">シーンなし</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <div
            data-testid="preview-frame"
            className="flex aspect-[9/16] max-h-[60vh] w-full flex-col items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4 text-center"
          >
            {scene ? (
              <>
                <div className="text-lg font-semibold">{scene.title}</div>
                {scene.subtitle ? (
                  <div className="mt-2 text-sm text-[var(--muted)]">{scene.subtitle}</div>
                ) : null}
                <div className="mt-4 text-xs text-[var(--muted)]">
                  {activeProject?.name ?? 'プロジェクト'} — v{video?.version}（{scene.durationSec}秒）
                </div>
              </>
            ) : (
              <>
                <b>ここに完成動画を表示します</b>
                <ol className="mt-2 list-decimal text-left text-xs text-[var(--muted)]">
                  <li>プロジェクトを作成</li>
                  <li>素材を追加</li>
                  <li>台本を作成</li>
                  <li>動画を生成</li>
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
